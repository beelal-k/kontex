import type { Command } from "commander";
import { HOOK_TEMPLATES } from "kontex-core";
import { writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

export function registerHooksCommand(program: Command): void {
  program.command("hooks").argument("<action>", "install").description("Manage git hooks").action((action: string) => {
    if (action !== "install") { console.error(`Unknown action: ${action}`); process.exit(1); }
    const cwd = process.cwd();
    if (!existsSync(join(cwd, ".git"))) { console.error("Not a git repository."); process.exit(1); }

    const hooksDir = join(cwd, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });

    for (const [name, content] of Object.entries(HOOK_TEMPLATES)) {
      const p = join(hooksDir, name);
      writeFileSync(p, content + "\n", "utf-8");
      chmodSync(p, 0o755);
    }
    console.log("✓ Installed git hooks (pre-commit, post-commit, post-merge)");
  });
}
