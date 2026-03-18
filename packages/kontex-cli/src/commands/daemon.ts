import type { Command } from "commander";
import { runDecay, loadConfig } from "kontex-core";

export function registerDaemonCommand(program: Command): void {
  program.command("daemon").argument("[action]", "start | stop | status", "start").description("Background compression daemon").action(async (action: string) => {
    const cwd = process.cwd();
    if (action === "start") {
      console.log("Running decay cycle...\n");
      const result = await runDecay(cwd, loadConfig(cwd));
      console.log(`Promoted: ${result.promoted.length}\nExpired: ${result.expired.length}\nArchived: ${result.archived.length}\nFlagged stale: ${result.flaggedStale.length}`);
      console.log("\n✓ Decay cycle complete.");
    } else if (action === "status") {
      console.log("Daemon status: manual mode");
    } else if (action === "stop") {
      console.log("Daemon stopped.");
    } else { console.error(`Unknown action: ${action}`); process.exit(1); }
  });
}
