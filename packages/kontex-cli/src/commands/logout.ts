import type { Command } from "commander";
import { logout } from "kontex-core";

export function registerLogoutCommand(program: Command): void {
  program.command("logout").description("Remove GitHub OAuth token from the OS keychain").action(async () => {
    try { await logout(); } catch (e) { console.error("Logout failed:", e instanceof Error ? e.message : e); process.exit(1); }
  });
}
