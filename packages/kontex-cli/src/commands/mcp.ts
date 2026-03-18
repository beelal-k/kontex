import type { Command } from "commander";
import { createMCPServer } from "kontex-core";

export function registerMcpCommand(program: Command): void {
  program.command("mcp").description("Start the MCP server (used by AI tools)").action(async () => {
    try { await createMCPServer(process.env.KONTEX_WORKSPACE || process.cwd()); }
    catch (e) { console.error("MCP server failed:", e instanceof Error ? e.message : e); process.exit(1); }
  });
}
