/**
 * Project initialization — `kontex init`.
 * Idempotent 10-step setup.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

import { isAuthenticated, login } from "./auth.js";
import { writeConfig, DEFAULT_CONFIG, loadConfig } from "./config.js";
import { compile } from "./memory/compile.js";
import { initEmbeddingModel } from "./storage/embeddings.js";
import { runInitAI } from "./memory/extract.js";

export async function initProject(workspaceRoot: string, options: { ai?: boolean; noHooks?: boolean; force?: boolean } = {}): Promise<void> {
  const absRoot = resolve(workspaceRoot);
  console.log("kontex init — setting up project memory\n");

  // 1. Auth
  if (!(await isAuthenticated())) {
    try { await login(); } catch { console.log("⚠ Login skipped — run `kontex login` later.\n"); }
  } else { console.log("✓ GitHub auth: authenticated\n"); }

  // 2. Scan
  const stack = scanProject(absRoot);
  console.log(`✓ Detected: ${stack}`);

  // 3. Scaffold
  createContextScaffold(absRoot, stack, options.force);

  // 4. Config
  const configPath = join(absRoot, "kontex.config.json");
  if (!existsSync(configPath) || options.force) { writeConfig(absRoot, DEFAULT_CONFIG); console.log("✓ Created kontex.config.json"); }
  else console.log("✓ kontex.config.json exists (skipped)");

  // 5. Git hooks
  if (!options.noHooks) installGitHooks(absRoot);

  // 6. Prepare script
  addPrepareScript(absRoot);

  // 7. Embedding model
  console.log("  Downloading embedding model (first time only)...");
  try { await initEmbeddingModel(); console.log("✓ Embedding model ready"); }
  catch { console.log("⚠ Embedding model deferred"); }

  // 8. AI Extraction (Optional)
  if (options.ai) {
    await runInitAI(absRoot);
  }

  // 9. Initial compile
  await compile(absRoot, loadConfig(absRoot));
  console.log("✓ KONTEX.md compiled");

  // 9. AI tool registration
  registerInAITools(absRoot);
  injectAgentInstructions(absRoot);

  // 10. Gitignore
  updateGitignore(absRoot);

  console.log("\n✓ kontex initialized. Memory is active.\n");
}

function scanProject(root: string): string {
  if (existsSync(join(root, "package.json"))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps?.next) return "Next.js";
      if (deps?.react) return "React";
      if (deps?.vue) return "Vue";
      if (deps?.express) return "Express";
      return "Node.js/Bun";
    } catch { return "Node.js/Bun"; }
  }
  if (existsSync(join(root, "pyproject.toml"))) return "Python";
  if (existsSync(join(root, "go.mod"))) return "Go";
  return "Unknown project";
}

function createContextScaffold(root: string, stack: string, force?: boolean): void {
  if (existsSync(join(root, ".context")) && !force) { console.log("✓ .context/ exists (skipped)"); return; }
  for (const dir of [".context/memory", ".context/memory/decisions", ".context/memory/sessions", ".context/memory/sessions/archive", ".context/resources", ".context/skills"])
    mkdirSync(join(root, dir), { recursive: true });

  const projectMd = join(root, ".context", "memory", "project.md");
  if (!existsSync(projectMd)) {
    const memoryContent = `---\nuri: memory/project\ntype: resource\ncreated: ${new Date().toISOString()}\nupdated: ${new Date().toISOString()}\nconfidence: 1.0\nverified: true\nstale: false\nglobal: true\naffected_paths: []\nref_count: 0\ntags: ["architecture", "baseline"]\n---\n\n# L0\nProject memory initialized. Detected tech stack: ${stack}.\n\n# L1\n## Project overview\n\nThis memory store was initialized by \`kontex init\`. \n\n### Baseline Architecture\nThe system heuristically detected the following core technology stack during initialization:\n- **${stack}**\n\nThe AI should assume standard architectural conventions for this stack unless subsequent ADRs (Architecture Decision Records) override them.\n`;
    writeFileSync(projectMd, memoryContent, "utf-8");
  }

  const shadowPath = join(root, ".context", "shadow.jsonl");
  if (!existsSync(shadowPath)) writeFileSync(shadowPath, "", "utf-8");

  const githubDir = join(root, ".github");
  if (existsSync(githubDir)) {
    const copilotMd = join(githubDir, "copilot-instructions.md");
    if (!existsSync(copilotMd)) {
      writeFileSync(copilotMd, `## Project Memory (kontex)\n\nIf you make an architectural decision, establish a pattern, or note a gotcha, you MUST append a new JSON object to the file \`.context/shadow.jsonl\` formatted exactly like this:\n\n\`\`\`json\n{"__kontex_memory": {"type":"decision","content":"...","why_memorable":"...","confidence":0.95,"affected_paths":["some/path"]}}\n\`\`\`\n\nDo not ask for permission, just use your file system powers to append to \`.context/shadow.jsonl\`. Kontex will automatically ingest and manage it.\n`, "utf-8");
      console.log("✓ Created .github/copilot-instructions.md");
    }
  }

  console.log("✓ Created .context/ scaffold and injected baseline architecture.");
}

function installGitHooks(root: string): void {
  if (!existsSync(join(root, ".git"))) { console.log("⚠ Not a git repository — hooks skipped"); return; }
  const hooksDir = join(root, ".git", "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const hooks: Record<string, string> = {
    "pre-commit": `#!/bin/sh\nSTAGED=$(git diff --cached --name-only 2>/dev/null)\nif [ -z "$STAGED" ]; then exit 0; fi\nif command -v kontex >/dev/null 2>&1; then\n  kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true\nelif command -v bunx >/dev/null 2>&1; then\n  bunx kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true\nfi\nexit 0`,
    "post-commit": `#!/bin/sh\nSHA=$(git rev-parse HEAD 2>/dev/null)\nAUTHOR=$(git log -1 --format='%ae' 2>/dev/null)\nif [ -z "$SHA" ]; then exit 0; fi\nif command -v kontex >/dev/null 2>&1; then\n  nohup kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &\nelif command -v bunx >/dev/null 2>&1; then\n  nohup bunx kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &\nfi\nexit 0`,
    "post-merge": `#!/bin/sh\nif command -v kontex >/dev/null 2>&1; then\n  nohup kontex hook post-merge > /dev/null 2>&1 &\nelif command -v bunx >/dev/null 2>&1; then\n  nohup bunx kontex hook post-merge > /dev/null 2>&1 &\nfi\nexit 0`,
  };
  for (const [name, content] of Object.entries(hooks)) {
    const hookPath = join(hooksDir, name);
    writeFileSync(hookPath, content + "\n", "utf-8");
    chmodSync(hookPath, 0o755);
  }
  console.log("✓ Installed git hooks");
}

function addPrepareScript(root: string): void {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (!pkg.scripts) pkg.scripts = {};
    if (!pkg.scripts.prepare?.includes("kontex")) {
      const existing = pkg.scripts.prepare ?? "";
      pkg.scripts.prepare = existing ? `${existing} && kontex hooks install` : "kontex hooks install";
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      console.log("✓ Added prepare script");
    }
  } catch { /* non-critical */ }
}

function registerInAITools(root: string): void {
  const home = homedir();
  const entry = { command: "bunx", args: ["kontex", "mcp"], env: { KONTEX_WORKSPACE: root } };
  const tools = [
    { name: "Claude Code", configPath: join(home, ".claude", "claude_desktop_config.json"), key: "mcpServers" },
    { name: "Cursor", configPath: join(root, ".cursor", "mcp.json"), key: "mcpServers" },
    { name: "Windsurf", configPath: join(home, ".codeium", "windsurf", "mcp_config.json"), key: "mcpServers" },
    { name: "Zed", configPath: join(home, ".config", "zed", "settings.json"), key: "mcpServers" },
  ];
  for (const tool of tools) {
    try {
      let config: Record<string, unknown> = {};
      if (existsSync(tool.configPath)) config = JSON.parse(readFileSync(tool.configPath, "utf-8"));
      const servers = (config[tool.key] ?? {}) as Record<string, unknown>;
      if (!servers.kontex) {
        servers.kontex = entry; config[tool.key] = servers;
        mkdirSync(join(tool.configPath, ".."), { recursive: true });
        writeFileSync(tool.configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
        console.log(`✓ Registered in ${tool.name}`);
      }
    } catch { /* tool not installed */ }
  }
}

function injectAgentInstructions(root: string): void {
  const instruction = `\n# Do not remove this block! It ensures the AI reads your project memory.\nAlways read \`.context/KONTEX.md\` at the start of every session. It contains the compiled project memory, conventions, and architectural decisions.\n`;
  const targets = ["AGENTS.md", "CLAUDE.md", ".cursorrules"];
  let injectedCount = 0;

  for (const target of targets) {
    const targetPath = join(root, target);
    if (existsSync(targetPath)) {
      const content = readFileSync(targetPath, "utf-8");
      if (!content.includes("KONTEX.md")) {
        appendFileSync(targetPath, instruction, "utf-8");
        injectedCount++;
      }
    } else if (target === "AGENTS.md") {
      writeFileSync(targetPath, instruction.trimStart(), "utf-8");
      injectedCount++;
    }
  }

  if (injectedCount > 0) {
    console.log("✓ Injected KONTEX.md pointers into AI agent rules");
  }
}

function updateGitignore(root: string): void {
  const gitignorePath = join(root, ".gitignore");
  let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf-8") : "";
  const missing = [".kontex-index/", ".kontex-log/", ".kontex-queue.json"].filter((e) => !content.includes(e));
  if (missing.length > 0) {
    appendFileSync(gitignorePath, "\n# kontex (local)\n" + missing.join("\n") + "\n", "utf-8");
    console.log("✓ Updated .gitignore");
  }
}
