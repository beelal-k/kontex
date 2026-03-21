/**
 * Memory write pipeline — the core of the quality gate.
 *
 * Every write passes through three stages:
 *   1. Secrets scan (blocks credentials)
 *   2. Dedup + contradiction check (cosine similarity)
 *   3. Confidence routing (verified / unverified / discard)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import matter from "gray-matter";
import { scanForSecrets } from "../secrets.js";
import { embed } from "../storage/embeddings.js";
import { getDatabase } from "../storage/db.js";
import type { KontexConfig } from "../config.js";
import type { MemoryType, WriteResult, DedupResult, ADRInput } from "../types.js";

// ─── Public API ────────────────────────────────────────────────────────────

export async function writeMemory(
  entry: {
    content: string;
    type: MemoryType;
    why_memorable: string;
    confidence: number;
    affected_paths?: string[];
  },
  workspaceRoot: string,
  config: KontexConfig,
): Promise<WriteResult> {
  const logPath = join(workspaceRoot, ".kontex-log", "quality.log");

  // Stage 1: Secrets scan
  const secretResult = scanForSecrets(entry.content, config.secrets.extraPatterns);
  if (secretResult.blocked) {
    logQualityEvent(logPath, "BLOCKED", `Secret detected: ${secretResult.pattern}`);
    logSecurityEvent(workspaceRoot, secretResult.pattern!);
    return { success: false, error: `Write blocked: content contains a secret (pattern: ${secretResult.pattern})` };
  }

  // Stage 2: Dedup check
  const db = getDatabase(workspaceRoot);
  const dedupResult = await dedupCheck(entry.content, db, config);
  if (dedupResult.status === "duplicate") {
    logQualityEvent(logPath, "DEDUP", `Duplicate of ${dedupResult.existing_uri}`);
    return { success: false, error: `Duplicate: too similar to ${dedupResult.existing_uri}` };
  }
  if (dedupResult.status === "conflict") {
    logQualityEvent(logPath, "CONFLICT", `Conflicts with ${dedupResult.existing_uri}`);
    return { success: false, error: dedupResult.message!, conflict: dedupResult };
  }

  // Stage 3: Confidence routing
  if (entry.confidence < config.quality.minConfidence) {
    logQualityEvent(logPath, "DISCARDED", `Confidence ${entry.confidence} below ${config.quality.minConfidence}`);
    return { success: false, error: `Discarded: confidence ${entry.confidence} below minimum ${config.quality.minConfidence}` };
  }

  const verified = entry.confidence >= config.quality.autoVerifyThreshold;
  const uri = generateUri(entry.type, entry.content);
  const now = new Date().toISOString();
  const author = await getGitAuthor(workspaceRoot);

  const frontmatter = {
    uri, type: entry.type, created: now, updated: now, author,
    confidence: entry.confidence, verified, stale: false, global: false,
    affected_paths: entry.affected_paths ?? [], ref_count: 0,
    tags: extractTags(entry.content),
  };

  const l0 = entry.content.split("\n")[0]?.slice(0, 200) ?? entry.content.slice(0, 200);
  const l1 = entry.why_memorable ? `## Why\n\n${entry.why_memorable}\n\n${entry.content}` : entry.content;
  const fileContent = matter.stringify(`# L0\n${l0}\n\n# L1\n${l1}\n\n# L2\n[Session context]\n`, frontmatter);

  const filePath = join(workspaceRoot, ".context", `${uri}.md`);
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
  writeFileSync(filePath, fileContent, "utf-8");

  await indexMemoryEntry(uri, entry.content, entry.type, verified, entry.confidence, entry.affected_paths ?? [], db, l0, l1, "");
  logQualityEvent(logPath, "WRITTEN", `${uri} (verified: ${verified})`);
  return { success: true, uri, verified };
}

export async function invalidateMemory(uri: string, reason: string, workspaceRoot: string): Promise<WriteResult> {
  const filePath = join(workspaceRoot, ".context", `${uri}.md`);
  if (!existsSync(filePath)) return { success: false, error: `Entry not found: ${uri}` };

  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  parsed.data.stale = true;
  parsed.data.updated = new Date().toISOString();
  writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");

  const db = getDatabase(workspaceRoot);
  db.prepare("UPDATE memories SET stale = 1, updated_at = datetime('now') WHERE uri = ?").run(uri);

  logQualityEvent(join(workspaceRoot, ".kontex-log", "quality.log"), "INVALIDATED", `${uri}: ${reason}`);
  return { success: true, uri };
}

export async function logDecision(adr: ADRInput, workspaceRoot: string, _config: KontexConfig): Promise<WriteResult> {
  const decisionsDir = join(workspaceRoot, ".context", "memory", "decisions");
  if (!existsSync(decisionsDir)) mkdirSync(decisionsDir, { recursive: true });

  const { readdirSync } = await import("node:fs");
  const existing = readdirSync(decisionsDir).filter((f) => f.endsWith(".md"));
  const highestNum = existing.reduce((max, filename) => {
    const match = filename.match(/^(\d+)-/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const nextNum = String(highestNum + 1).padStart(3, "0");
  const slug = slugify(adr.title);
  const uri = `memory/decisions/${nextNum}-${slug}`;
  const now = new Date().toISOString();
  const author = await getGitAuthor(workspaceRoot);

  const frontmatter = {
    uri, type: "decision" as const, created: now, updated: now, author,
    confidence: 0.95, verified: true, stale: false, global: false,
    affected_paths: adr.affected_paths ?? [], ref_count: 0,
    tags: extractTags(adr.title + " " + adr.decision),
  };

  const alternativesSection = adr.alternatives?.length ? `\n\n## Alternatives considered\n${adr.alternatives.map((a) => `- ${a}`).join("\n")}` : "";
  const consequencesSection = adr.consequences ? `\n\n## Consequences\n${adr.consequences}` : "";
  const l0 = `${adr.title}. Decision: ${now.slice(0, 10)}.`;
  const body = `# L0\n${l0}\n\n# L1\n## Context\n${adr.context}\n\n## Decision\n${adr.decision}\n\n## Rationale\n${adr.rationale}${alternativesSection}${consequencesSection}\n`;

  const fileContent = matter.stringify(body, frontmatter);
  const filePath = join(workspaceRoot, ".context", `${uri}.md`);
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
  writeFileSync(filePath, fileContent, "utf-8");

  const db = getDatabase(workspaceRoot);
  const adrContent = `${adr.title} ${adr.decision} ${adr.context}`;
  await indexMemoryEntry(uri, adrContent, "decision", true, 0.95, adr.affected_paths ?? [], db, l0, body, "");
  return { success: true, uri, verified: true };
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function dedupCheck(content: string, db: import("bun:sqlite").Database, config: KontexConfig): Promise<DedupResult> {
  try {
    const embedding = await embed(content);
    const embeddingBuffer = Buffer.from(embedding.buffer);
    const similar = db.prepare(`
      SELECT m.uri, m.content, m.verified, m.confidence, vec_distance_cosine(e.embedding, ?) AS distance
      FROM memory_embeddings e JOIN memories m ON m.uri = e.uri ORDER BY distance ASC LIMIT 5
    `).all(embeddingBuffer) as Array<{ uri: string; content: string; verified: number; confidence: number; distance: number }>;

    if (!similar.length) return { status: "clear" };
    const top = similar[0];
    const similarity = 1 - top.distance;
    if (similarity > config.quality.deduplicateThreshold) return { status: "duplicate", existing_uri: top.uri };
    if (similarity > config.quality.contradictionThreshold) return { status: "conflict", existing_uri: top.uri, existing_content: top.content, message: `Similar memory exists at ${top.uri}. If this supersedes it, call kontex_invalidate first.` };
    return { status: "clear" };
  } catch (err) {
    console.warn(`kontex: dedup check failed (embedding or DB error) — skipping duplicate detection.\n  Error: ${err instanceof Error ? err.message : String(err)}`);
    return { status: "clear" };
  }
}

async function indexMemoryEntry(
  uri: string,
  content: string,
  type: MemoryType,
  verified: boolean,
  confidence: number,
  affectedPaths: string[],
  db: import("bun:sqlite").Database,
  l0: string = "",
  l1: string = "",
  l2: string = "",
): Promise<void> {
  db.prepare(
    `INSERT OR REPLACE INTO memories (uri, content, type, l0, l1, l2, verified, confidence, affected_paths, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(uri, content, type, l0, l1, l2, verified ? 1 : 0, confidence, JSON.stringify(affectedPaths));
  try {
    const embedding = await embed(content);
    db.prepare(`INSERT OR REPLACE INTO memory_embeddings (uri, embedding) VALUES (?, ?)`).run(uri, Buffer.from(embedding.buffer));
  } catch (err) {
    console.warn(`kontex: failed to index embedding for ${uri} — semantic search will not find this entry.\n  Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

let uriCounter = 0;
function generateUri(type: MemoryType, content: string): string {
  const slug = slugify(content.split("\n")[0]?.slice(0, 60) ?? "entry");
  const uniqueSuffix = `${Date.now().toString(36)}-${(uriCounter++).toString(36)}`;
  return `memory/${type}s/${slug}-${uniqueSuffix}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function extractTags(content: string): string[] {
  const words = content.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && w.length < 20);
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word]) => word);
}

async function getGitAuthor(workspaceRoot: string): Promise<string> {
  try {
    const proc = Bun.spawn(["git", "config", "user.email"], { cwd: workspaceRoot, stdout: "pipe" });
    return (await new Response(proc.stdout).text()).trim() || "unknown";
  } catch { return "unknown"; }
}

function logQualityEvent(logPath: string, event: string, message: string): void {
  const logDir = dirname(logPath);
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  appendFileSync(logPath, `[${new Date().toISOString()}] ${event}: ${message}\n`, "utf-8");
}

function logSecurityEvent(workspaceRoot: string, pattern: string): void {
  logQualityEvent(join(workspaceRoot, ".kontex-log", "security.log"), "SECRET_BLOCKED", pattern);
}
