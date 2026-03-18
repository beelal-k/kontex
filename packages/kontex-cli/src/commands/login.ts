import type { Command } from "commander";
import { login } from "kontex-core";

export function registerLoginCommand(program: Command): void {
  program.command("login").description("Authenticate with GitHub using OAuth Device Flow").action(async () => {
    try { await login(); } catch (e) { console.error("Login failed:", e instanceof Error ? e.message : e); process.exit(1); }
  });
}
