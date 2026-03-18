import type { Command } from "commander";
import { writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

export function registerHooksCommand(program: Command): void {
  program.command("hooks").argument("<action>", "install").description("Manage git hooks").action((action: string) => {
    if (action !== "install") { console.error(`Unknown action: ${action}`); process.exit(1); }
    const cwd = process.cwd();
    if (!existsSync(join(cwd, ".git"))) { console.error("Not a git repository."); process.exit(1); }

    const hooksDir = join(cwd, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });

    const hooks: Record<string, string> = {
      "pre-commit": `#!/bin/sh\nSTAGED=$(git diff --cached --name-only 2>/dev/null)\nif [ -z "$STAGED" ]; then exit 0; fi\nif command -v bunx >/dev/null 2>&1; then\n  bunx kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true\nelif command -v kontex >/dev/null 2>&1; then\n  kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true\nfi\nexit 0`,
      "post-commit": `#!/bin/sh\nSHA=$(git rev-parse HEAD 2>/dev/null)\nAUTHOR=$(git log -1 --format='%ae' 2>/dev/null)\nif [ -z "$SHA" ]; then exit 0; fi\nif command -v bunx >/dev/null 2>&1; then\n  nohup bunx kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &\nelif command -v kontex >/dev/null 2>&1; then\n  nohup kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &\nfi\nexit 0`,
      "post-merge": `#!/bin/sh\nif command -v bunx >/dev/null 2>&1; then\n  nohup bunx kontex hook post-merge > /dev/null 2>&1 &\nelif command -v kontex >/dev/null 2>&1; then\n  nohup kontex hook post-merge > /dev/null 2>&1 &\nfi\nexit 0`,
    };

    for (const [name, content] of Object.entries(hooks)) {
      const p = join(hooksDir, name);
      writeFileSync(p, content + "\n", "utf-8");
      chmodSync(p, 0o755);
    }
    console.log("✓ Installed git hooks (pre-commit, post-commit, post-merge)");
  });
}
