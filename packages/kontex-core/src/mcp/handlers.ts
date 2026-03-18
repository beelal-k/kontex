/**
 * MCP tool call handlers — wired to the memory engine.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { writeMemory, invalidateMemory, logDecision } from "../memory/write.js";
import { findMemories } from "../memory/read.js";
import { compile } from "../memory/compile.js";
import { loadConfig } from "../config.js";
import type { MemoryType, ADRInput } from "../types.js";

interface MCPToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export async function handleRemember(args: Record<string, unknown>, workspaceRoot: string): Promise<MCPToolResponse> {
  const { content, type, why_memorable, confidence, affected_paths } = args as {
    content: string; type: MemoryType; why_memorable: string; confidence: number; affected_paths?: string[];
  };
  if (!content || !type || !why_memorable || confidence === undefined) return errorResponse("Missing required fields");

  const config = loadConfig(workspaceRoot);
  const result = await writeMemory({ content, type, why_memorable, confidence, affected_paths: affected_paths ?? [] }, workspaceRoot, config);
  if (!result.success) return errorResponse(result.error ?? "Write failed");

  await compile(workspaceRoot, config);
  return textResponse(`Written: ${result.uri} (verified: ${result.verified})`);
}

export async function handleInvalidate(args: Record<string, unknown>, workspaceRoot: string): Promise<MCPToolResponse> {
  const { uri, reason } = args as { uri: string; reason: string };
  if (!uri || !reason) return errorResponse("Missing required fields: uri, reason");

  const result = await invalidateMemory(uri, reason, workspaceRoot);
  if (!result.success) return errorResponse(result.error ?? "Invalidation failed");

  await compile(workspaceRoot, loadConfig(workspaceRoot));
  return textResponse(`Invalidated: ${uri}. Use kontex_remember to store the correction.`);
}

export async function handleLogDecision(args: Record<string, unknown>, workspaceRoot: string): Promise<MCPToolResponse> {
  const adr: ADRInput = {
    title: args.title as string, context: args.context as string,
    decision: args.decision as string, rationale: args.rationale as string,
    alternatives: args.alternatives as string[] | undefined,
    consequences: args.consequences as string | undefined,
  };
  if (!adr.title || !adr.context || !adr.decision || !adr.rationale) return errorResponse("Missing required fields");

  const config = loadConfig(workspaceRoot);
  const result = await logDecision(adr, workspaceRoot, config);
  if (!result.success) return errorResponse(result.error ?? "Decision logging failed");

  await compile(workspaceRoot, config);
  return textResponse(`Decision logged: ${result.uri}`);
}

export async function handleFind(args: Record<string, unknown>, workspaceRoot: string): Promise<MCPToolResponse> {
  const query = args.query as string;
  const limit = (args.limit as number) ?? 5;
  if (!query) return errorResponse("Missing required field: query");

  const results = await findMemories(query, limit, workspaceRoot);
  if (results.length === 0) return textResponse("No matching memories found.");

  const { getDatabase } = await import("../storage/db.js");
  const db = getDatabase(workspaceRoot);
  for (const r of results) {
    db.prepare("UPDATE memories SET ref_count = ref_count + 1 WHERE uri = ?").run(r.uri);
    syncRefCountToFile(r.uri, workspaceRoot, db);
  }

  const formatted = results.map((r, i) =>
    `${i + 1}. **${r.uri}** (${r.type}, similarity: ${r.similarity.toFixed(2)}, verified: ${r.verified})\n   ${r.content.slice(0, 300)}`
  ).join("\n\n");
  return textResponse(formatted);
}

function syncRefCountToFile(uri: string, workspaceRoot: string, db: import("bun:sqlite").Database): void {
  try {
    const filePath = join(workspaceRoot, ".context", `${uri}.md`);
    if (!existsSync(filePath)) return;
    const row = db.prepare("SELECT ref_count FROM memories WHERE uri = ?").get(uri) as { ref_count: number } | null;
    if (!row) return;
    const raw = readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    parsed.data.ref_count = row.ref_count;
    writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
  } catch { /* non-critical — DB is the primary source, file will sync on next decay cycle */ }
}

function textResponse(text: string): MCPToolResponse { return { content: [{ type: "text", text }] }; }
function errorResponse(text: string): MCPToolResponse { return { content: [{ type: "text", text }], isError: true }; }
