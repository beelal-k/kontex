/**
 * MCP server — JSON-RPC 2.0 over stdio.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "./tools.js";
import { handleRemember, handleInvalidate, handleLogDecision, handleFind } from "./handlers.js";

export async function createMCPServer(workspaceRoot: string): Promise<void> {
  const server = new Server({ name: "kontex", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const toolArgs = (args ?? {}) as Record<string, unknown>;
    switch (name) {
      case "kontex_remember": return handleRemember(toolArgs, workspaceRoot);
      case "kontex_invalidate": return handleInvalidate(toolArgs, workspaceRoot);
      case "kontex_log_decision": return handleLogDecision(toolArgs, workspaceRoot);
      case "kontex_find": return handleFind(toolArgs, workspaceRoot);
      default: return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
