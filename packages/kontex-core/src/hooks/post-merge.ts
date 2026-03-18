/**
 * Post-merge hook handler — recompile + reindex after git pull/merge.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config.js";
import { compile } from "../memory/compile.js";
import { loadAllEntries } from "../memory/read.js";
import { getDatabase } from "../storage/db.js";
import { embed } from "../storage/embeddings.js";

export async function handlePostMerge(workspaceRoot: string): Promise<void> {
  if (!existsSync(join(workspaceRoot, ".context"))) return;
  const config = loadConfig(workspaceRoot);
  await compile(workspaceRoot, config);
  await rebuildIndex(workspaceRoot);
}

async function rebuildIndex(workspaceRoot: string): Promise<void> {
  try {
    const db = getDatabase(workspaceRoot);
    const entries = loadAllEntries(workspaceRoot);
    const existing = new Set((db.prepare("SELECT uri FROM memories").all() as Array<{ uri: string }>).map((r) => r.uri));

    for (const entry of entries) {
      if (existing.has(entry.uri)) continue;
      db.prepare(`INSERT OR REPLACE INTO memories (uri, content, type, l0, l1, l2, confidence, verified, stale, global, ref_count, author, affected_paths, tags, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
        entry.uri, entry.content, entry.type, entry.l0, entry.l1, entry.l2, entry.confidence,
        entry.verified ? 1 : 0, entry.stale ? 1 : 0, entry.global ? 1 : 0,
        entry.ref_count, entry.author, JSON.stringify(entry.affected_paths), JSON.stringify(entry.tags),
      );
      try {
        const embedding = await embed(entry.content);
        db.prepare("INSERT OR REPLACE INTO memory_embeddings (uri, embedding) VALUES (?, ?)").run(entry.uri, Buffer.from(embedding.buffer));
      } catch { /* skip */ }
    }
  } catch { /* non-critical */ }
}
