import type { Command } from "commander";
import { initProject } from "kontex-core";

export function registerInitCommand(program: Command): void {
  program.command("init").description("Initialize kontex in the current project")
    .option("--ai", "Run LLM extraction pass")
    .option("--no-hooks", "Skip git hook installation")
    .option("--force", "Re-run init even if .context/ exists")
    .action(async (opts) => {
      try { await initProject(process.cwd(), { ai: opts.ai, noHooks: opts.noHooks, force: opts.force }); }
      catch (e) { console.error("Init failed:", e instanceof Error ? e.message : e); process.exit(1); }
    });
}
