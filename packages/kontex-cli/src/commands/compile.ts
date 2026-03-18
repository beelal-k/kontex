import type { Command } from "commander";
import { compile, loadConfig } from "kontex-core";

export function registerCompileCommand(program: Command): void {
  program.command("compile").description("Regenerate .context/KONTEX.md")
    .option("--budget <tokens>", "Override token budget", parseInt)
    .action(async (opts) => {
      try {
        const config = loadConfig(process.cwd());
        if (opts.budget) config.compile.tokenBudget = opts.budget;
        await compile(process.cwd(), config);
        console.log("✓ KONTEX.md compiled");
      } catch (e) { console.error("Compile failed:", e instanceof Error ? e.message : e); process.exit(1); }
    });
}
