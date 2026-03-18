/**
 * Post-commit hook handler — background LLM extraction.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { loadConfig } from "../config.js";
import { getToken } from "../auth.js";
import { writeMemory } from "../memory/write.js";
import { compile } from "../memory/compile.js";
import { loadAllEntries } from "../memory/read.js";
import type { KontexConfig } from "../config.js";
import type { ExtractionResult } from "../types.js";

export async function handlePostCommit(commitSha: string, authorEmail: string, workspaceRoot: string): Promise<void> {
  const config = loadConfig(workspaceRoot);
  const logPath = join(workspaceRoot, ".kontex-log", "hooks.log");
  try {
    logHookEvent(logPath, "POST_COMMIT_START", commitSha);
    if (!config.hooks.postCommitExtract || config.llm.provider === "none") {
      await compileAndCommit(workspaceRoot, config);
      return;
    }

    let token: string | null = null;
    if (config.llm.provider === "github-models") {
      token = await getToken();
      if (!token) { await compileAndCommit(workspaceRoot, config); return; }
    }

    const diff = await getCommitDiff(commitSha, workspaceRoot);
    if (!diff.trim()) return;

    const entries = loadAllEntries(workspaceRoot);
    const existingL0 = entries.filter((e) => e.verified && !e.stale).map((e) => `- ${e.uri}: ${e.l0}`).join("\n");
    const extraction = await extractKnowledge(diff, existingL0, config, token);

    if (extraction) {
      for (const m of extraction.new_memories) {
        await writeMemory({ content: m.content, type: m.type, why_memorable: m.why_memorable, confidence: m.confidence, affected_paths: m.affected_paths }, workspaceRoot, config);
      }
      await writeSessionFile(commitSha, authorEmail, extraction, workspaceRoot);
      if (extraction.stale_uris.length > 0) {
        const { invalidateMemory } = await import("../memory/write.js");
        for (const uri of extraction.stale_uris) await invalidateMemory(uri, `Flagged stale by commit ${commitSha.slice(0, 7)}`, workspaceRoot);
      }
    }
    await compileAndCommit(workspaceRoot, config);
    logHookEvent(logPath, "COMPLETE", commitSha);
  } catch (error) { logHookEvent(logPath, "ERROR", String(error)); }
  finally {
    const queuePath = join(workspaceRoot, ".kontex-queue.json");
    if (existsSync(queuePath)) try { unlinkSync(queuePath); } catch { /* ignore */ }
  }
}

async function extractKnowledge(diff: string, existingL0: string, config: KontexConfig, token: string | null): Promise<ExtractionResult | null> {
  try {
    const { createLLMModel } = await import("../llm.js");
    const { generateText } = await import("ai");
    const truncatedDiff = diff.slice(0, 24000);
    const prompt = `You are analyzing a git commit to extract knowledge for a persistent project memory store.\n\nCommit diff:\n${truncatedDiff}\n\nExisting memory context (L0):\n${existingL0}\n\nExtract learnings. Return JSON only:\n{"new_memories":[{"content":"...","type":"decision|pattern|gotcha|convention","why_memorable":"...","confidence":0.0-1.0,"affected_paths":["..."]}],"stale_uris":["..."]}\n\nIf nothing worth persisting, return: {"new_memories":[],"stale_uris":[]}\nBe conservative.`;

    const model = await createLLMModel(config, token);
    if (!model) return null;

    const result = await generateText({ model, prompt, maxTokens: 1000, temperature: 0.1 });
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) as ExtractionResult : null;
  } catch { return null; }
}

async function writeSessionFile(commitSha: string, authorEmail: string, extraction: ExtractionResult, workspaceRoot: string): Promise<void> {
  const sessionsDir = join(workspaceRoot, ".context", "memory", "sessions");
  if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const authorHash = createHash("md5").update(authorEmail).digest("hex").slice(0, 8);
  const filePath = join(sessionsDir, `${date}-${authorHash}.md`);

  const commitBody = `\n### Commit ${commitSha.slice(0, 7)}\n\n${extraction.new_memories.map((m) => `- **${m.type}** (${m.confidence.toFixed(2)}): ${m.content}`).join("\n") || "No new memories."}\n`;

  if (existsSync(filePath)) {
    // Append only the commit body — no duplicate frontmatter
    appendFileSync(filePath, commitBody, "utf-8");
  } else {
    const header = `---\nauthor: ${authorEmail}\ndate: ${date}\nuri: memory/sessions/${date}-${authorHash}\ntype: resource\nconfidence: 0.7\nverified: false\nstale: false\nglobal: false\naffected_paths: []\nref_count: 0\ntags: ["session"]\n---\n\n## Session: ${date}\n`;
    writeFileSync(filePath, header + commitBody, "utf-8");
  }
}

async function getCommitDiff(sha: string, workspaceRoot: string): Promise<string> {
  try { const proc = Bun.spawn(["git", "show", sha, "--stat", "--patch"], { cwd: workspaceRoot, stdout: "pipe" }); return await new Response(proc.stdout).text(); }
  catch { return ""; }
}

async function compileAndCommit(workspaceRoot: string, config: KontexConfig): Promise<void> {
  if (!existsSync(join(workspaceRoot, ".context"))) return;
  await compile(workspaceRoot, config);
  try {
    Bun.spawnSync(["git", "add", ".context/"], { cwd: workspaceRoot });
    const status = Bun.spawnSync(["git", "diff", "--cached", "--quiet", ".context/"], { cwd: workspaceRoot });
    if (status.exitCode !== 0) Bun.spawnSync(["git", "commit", "--no-verify", "-m", "chore(kontex): update memory [skip ci]"], { cwd: workspaceRoot });
  } catch { /* non-critical */ }
}

function logHookEvent(logPath: string, event: string, message: string): void {
  const logDir = dirname(logPath);
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  appendFileSync(logPath, `[${new Date().toISOString()}] ${event}: ${message}\n`, "utf-8");
}
