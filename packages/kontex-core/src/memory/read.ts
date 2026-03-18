/**
 * Memory read — semantic search and entry loading.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { embed } from "../storage/embeddings.js";
import { getDatabase } from "../storage/db.js";
import type { MemoryEntry, SearchResult } from "../types.js";

export async function findMemories(query: string, limit: number = 5, workspaceRoot: string): Promise<SearchResult[]> {
  const db = getDatabase(workspaceRoot);
  try { return await vectorSearch(query, limit, db); }
  catch { return keywordSearch(query, limit, db); }
}

export function loadAllEntries(workspaceRoot: string): MemoryEntry[] {
  const memoryDir = join(workspaceRoot, ".context", "memory");
  if (!existsSync(memoryDir)) return [];
  const entries: MemoryEntry[] = [];
  collectEntries(memoryDir, workspaceRoot, entries);
  return entries;
}

export function loadEntry(uri: string, workspaceRoot: string): MemoryEntry | null {
  const filePath = join(workspaceRoot, ".context", `${uri}.md`);
  return existsSync(filePath) ? parseMemoryFile(filePath, workspaceRoot) : null;
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function vectorSearch(query: string, limit: number, db: import("bun:sqlite").Database): Promise<SearchResult[]> {
  const queryEmbedding = await embed(query);
  const results = db.prepare(`
    SELECT m.uri, m.content, m.type, m.verified, vec_distance_cosine(e.embedding, ?) AS distance
    FROM memory_embeddings e JOIN memories m ON m.uri = e.uri WHERE m.stale = 0 ORDER BY distance ASC LIMIT ?
  `).all(Buffer.from(queryEmbedding.buffer), limit) as Array<{ uri: string; content: string; type: string; verified: number; distance: number }>;

  return results.map((row) => ({
    uri: row.uri, type: row.type as SearchResult["type"], content: row.content,
    similarity: 1 - row.distance, verified: row.verified === 1, tier: "l1" as const,
  }));
}

function keywordSearch(query: string, limit: number, db: import("bun:sqlite").Database): SearchResult[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return [];
  const conditions = keywords.map(() => "LOWER(content) LIKE ?").join(" AND ");
  const params = keywords.map((k) => `%${k}%`);
  const results = db.prepare(`
    SELECT uri, content, type, verified, confidence FROM memories
    WHERE stale = 0 AND (${conditions}) ORDER BY ref_count DESC, confidence DESC LIMIT ?
  `).all(...params, limit) as Array<{ uri: string; content: string; type: string; verified: number; confidence: number }>;

  return results.map((row, i) => ({
    uri: row.uri, type: row.type as SearchResult["type"], content: row.content,
    similarity: 1 - i * 0.1, verified: row.verified === 1, tier: "l1" as const,
  }));
}

function collectEntries(dir: string, workspaceRoot: string, entries: MemoryEntry[]): void {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) collectEntries(fullPath, workspaceRoot, entries);
    else if (item.name.endsWith(".md")) { const e = parseMemoryFile(fullPath, workspaceRoot); if (e) entries.push(e); }
  }
}

function parseMemoryFile(filePath: string, workspaceRoot: string): MemoryEntry | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data;
    const { l0, l1, l2 } = splitTiers(parsed.content);
    const relPath = relative(join(workspaceRoot, ".context"), filePath).replace(/\.md$/, "");
    return {
      uri: data.uri ?? relPath, type: data.type ?? "convention", content: parsed.content,
      created: data.created ?? new Date().toISOString(), updated: data.updated ?? new Date().toISOString(),
      author: data.author ?? "unknown", confidence: data.confidence ?? 0.5,
      verified: data.verified ?? false, stale: data.stale ?? false, global: data.global ?? false,
      affected_paths: data.affected_paths ?? [], ref_count: data.ref_count ?? 0,
      tags: data.tags ?? [], l0, l1, l2,
    };
  } catch { return null; }
}

function splitTiers(content: string): { l0: string; l1: string; l2: string } {
  const sections = content.split(/^# (L[012])\s*$/m);
  let l0 = "", l1 = "", l2 = "";
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]?.trim();
    if (s === "L0" && sections[i + 1]) l0 = sections[i + 1].trim();
    else if (s === "L1" && sections[i + 1]) l1 = sections[i + 1].trim();
    else if (s === "L2" && sections[i + 1]) l2 = sections[i + 1].trim();
  }
  if (!l0 && !l1 && !l2) { l0 = content.trim().split("\n")[0]?.slice(0, 200) ?? ""; l1 = content.trim(); }
  return { l0, l1, l2 };
}
