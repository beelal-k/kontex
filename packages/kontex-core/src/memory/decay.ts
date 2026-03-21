/**
 * Decay and compression — weekly maintenance for memory health.
 * Never deletes entries — only flags them. Deletion is via `kontex audit`.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import matter from "gray-matter";
import type { KontexConfig } from "../config.js";
import type { DecayResult } from "../types.js";

export async function runDecay(workspaceRoot: string, config: KontexConfig): Promise<DecayResult> {
  const result: DecayResult = { promoted: [], expired: [], archived: [], flaggedStale: [] };
  const memoryDir = join(workspaceRoot, ".context", "memory");
  if (!existsSync(memoryDir)) return result;

  await promoteEntries(memoryDir, result);
  await expireEntries(memoryDir, config.decay.unverifiedExpireDays, result);
  await archiveSessions(memoryDir, config.decay.sessionArchiveDays, result);
  await flagStaleEntries(memoryDir, workspaceRoot, result);
  await enforceSessionsSizeCap(memoryDir, config.decay.maxSessionsDirKB, result);
  return result;
}

async function promoteEntries(memoryDir: string, result: DecayResult): Promise<void> {
  for (const filePath of collectMemoryFiles(memoryDir)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = matter(raw);
      if (!parsed.data.verified && (parsed.data.ref_count ?? 0) >= 3) {
        parsed.data.verified = true;
        parsed.data.updated = new Date().toISOString();
        writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
        result.promoted.push(parsed.data.uri ?? basename(filePath));
      }
    } catch { /* skip */ }
  }
}

async function expireEntries(memoryDir: string, expireDays: number, result: DecayResult): Promise<void> {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - expireDays);
  for (const filePath of collectMemoryFiles(memoryDir)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = matter(raw);
      if (!parsed.data.verified && (parsed.data.ref_count ?? 0) === 0 && new Date(parsed.data.updated ?? parsed.data.created) < cutoff) {
        parsed.data.stale = true;
        parsed.data.updated = new Date().toISOString();
        writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
        result.expired.push(parsed.data.uri ?? basename(filePath));
      }
    } catch { /* skip */ }
  }
}

async function archiveSessions(memoryDir: string, archiveDays: number, result: DecayResult): Promise<void> {
  const sessionsDir = join(memoryDir, "sessions");
  const archiveDir = join(sessionsDir, "archive");
  if (!existsSync(sessionsDir)) return;
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - archiveDays);
  for (const file of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".md")) continue;
    const filePath = join(sessionsDir, file.name);
    try {
      if (statSync(filePath).mtime < cutoff) {
        const archiveDest = join(archiveDir, file.name);
        const finalDest = existsSync(archiveDest)
          ? join(archiveDir, file.name.replace(".md", `-${Date.now()}.md`))
          : archiveDest;
        writeFileSync(finalDest, readFileSync(filePath, "utf-8"), "utf-8");
        writeFileSync(filePath, `---\narchived: true\narchived_at: ${new Date().toISOString()}\n---\nArchived to archive/${basename(finalDest)}\n`, "utf-8");
        result.archived.push(file.name);
      }
    } catch { /* skip */ }
  }
}

async function flagStaleEntries(memoryDir: string, workspaceRoot: string, result: DecayResult): Promise<void> {
  for (const filePath of collectMemoryFiles(memoryDir)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = matter(raw);
      if (parsed.data.stale) continue;
      const paths: string[] = parsed.data.affected_paths ?? [];
      if (paths.length > 0 && paths.every((p) => !existsSync(join(workspaceRoot, p)))) {
        parsed.data.stale = true;
        parsed.data.updated = new Date().toISOString();
        writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
        result.flaggedStale.push(parsed.data.uri ?? basename(filePath));
      }
    } catch { /* skip */ }
  }
}

async function enforceSessionsSizeCap(memoryDir: string, maxSizeKB: number, result: DecayResult): Promise<void> {
  const sessionsDir = join(memoryDir, "sessions");
  if (!existsSync(sessionsDir)) return;
  let totalKB = getDirSize(sessionsDir) / 1024;
  if (totalKB <= maxSizeKB) return;
  const archiveDir = join(sessionsDir, "archive");
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

  const files = readdirSync(sessionsDir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith(".md"))
    .map((f) => ({ name: f.name, path: join(sessionsDir, f.name), mtime: statSync(join(sessionsDir, f.name)).mtime }))
    .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

  for (const file of files) {
    if (totalKB <= maxSizeKB) break;
    totalKB -= statSync(file.path).size / 1024;
    const archiveDest = join(archiveDir, file.name);
    const finalDest = existsSync(archiveDest)
      ? join(archiveDir, file.name.replace(".md", `-${Date.now()}.md`))
      : archiveDest;
    writeFileSync(finalDest, readFileSync(file.path, "utf-8"), "utf-8");
    writeFileSync(file.path, `---\narchived: true\n---\nCompressed due to size cap.\n`, "utf-8");
    result.archived.push(file.name);
  }
}

function collectMemoryFiles(dir: string): string[] {
  const files: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory() && item.name !== "archive") files.push(...collectMemoryFiles(fullPath));
    else if (item.isFile() && item.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

function getDirSize(dir: string): number {
  let total = 0;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isFile()) total += statSync(join(dir, item.name)).size;
  }
  return total;
}
