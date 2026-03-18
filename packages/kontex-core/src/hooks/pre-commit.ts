/**
 * Pre-commit hook handler. Must complete < 100ms. Never blocks the commit.
 */

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDatabase } from "../storage/db.js";
import { compile } from "../memory/compile.js";
import { loadConfig } from "../config.js";
import type { HookQueue } from "../types.js";

export async function handlePreCommit(stagedFiles: string, workspaceRoot: string): Promise<void> {
  const files = stagedFiles.split(/[\n\s]+/).map((f) => f.trim()).filter(Boolean);
  if (files.length === 0) return;

  const affectedMemories = findAffectedMemories(files, workspaceRoot);
  const queue: HookQueue = { staged_files: files, affected_memories: affectedMemories, commit_sha_pending: true, timestamp: new Date().toISOString() };
  writeFileSync(join(workspaceRoot, ".kontex-queue.json"), JSON.stringify(queue, null, 2), "utf-8");

  const config = loadConfig(workspaceRoot);
  if (existsSync(join(workspaceRoot, ".context"))) {
    await compile(workspaceRoot, config);
    try { Bun.spawnSync(["git", "add", ".context/KONTEX.md"], { cwd: workspaceRoot }); } catch { /* non-critical */ }
  }
}

function findAffectedMemories(stagedFiles: string[], workspaceRoot: string): string[] {
  try {
    const db = getDatabase(workspaceRoot);
    const allMemories = db.prepare("SELECT uri, affected_paths FROM memories WHERE stale = 0").all() as Array<{ uri: string; affected_paths: string }>;
    const affected: string[] = [];
    for (const m of allMemories) {
      const paths: string[] = JSON.parse(m.affected_paths || "[]");
      if (paths.some((mp) => stagedFiles.some((sf) => sf.startsWith(mp) || mp.startsWith(sf)))) affected.push(m.uri);
    }
    return affected;
  } catch { return []; }
}
