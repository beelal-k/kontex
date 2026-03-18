/**
 * KONTEX.md compiler — generates the compiled context file from `.context/`.
 *
 * Token-budget algorithm: L0 always → L1 by relevance → L2 footer.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllEntries } from "./read.js";
import type { KontexConfig } from "../config.js";
import type { MemoryEntry } from "../types.js";

export async function compile(workspaceRoot: string, config: KontexConfig): Promise<void> {
  const allEntries = loadAllEntries(workspaceRoot);
  const recentFiles = await getRecentlyModifiedFiles(workspaceRoot, 7);

  let tokenCount = 0;
  const sections: string[] = [];

  const systemPrompt = buildSystemPrompt();
  sections.push(systemPrompt);
  tokenCount += estimateTokens(systemPrompt);

  const verifiedEntries = allEntries.filter((e) => e.verified && !e.stale);
  const l0Section = buildL0Index(verifiedEntries);
  sections.push(l0Section);
  tokenCount += estimateTokens(l0Section);

  const relevant = verifiedEntries
    .filter((e) => e.global || isRecentlyTouched(e, recentFiles) || isRecentlyCreated(e, 7))
    .sort((a, b) => b.ref_count - a.ref_count);

  const includedUris = new Set<string>();
  for (const entry of relevant) {
    const l1Content = formatL1Section(entry);
    const tokens = estimateTokens(l1Content);
    if (tokenCount + tokens > config.compile.tokenBudget) break;
    sections.push(l1Content);
    tokenCount += tokens;
    includedUris.add(entry.uri);
  }

  const l2Available = allEntries.filter((e) => !e.stale && !includedUris.has(e.uri));
  if (l2Available.length > 0) sections.push(buildL2Footer(l2Available));

  const output = sections.join("\n\n---\n\n");
  writeFileSync(join(workspaceRoot, ".context", "KONTEX.md"), output, "utf-8");
}

function buildSystemPrompt(): string {
  return `## Project memory (kontex)

You have access to a persistent memory store for this codebase.

**On session start:** Read KONTEX.md in this workspace before answering
any codebase questions. It contains compiled project context.

**Write proactively, not constantly.** Call kontex_remember only for:
- Architectural decisions that were committed to (not just discussed)
- Non-obvious constraints or gotchas discovered in the code
- Patterns established that apply across the codebase
- Conventions confirmed by the developer

Never call kontex_remember for routine edits or things already in KONTEX.md.

**Correct stale memory immediately.** If KONTEX.md contains something
outdated, call kontex_invalidate on that entry, then kontex_remember with
the correction.

**Search before answering.** For architecture and convention questions,
call kontex_find before responding. Do not reconstruct from code what
memory already knows.`;
}

function buildL0Index(entries: MemoryEntry[]): string {
  if (entries.length === 0) return "## Memory index (L0)\n\nNo memory entries yet.";
  const lines = entries.map((e) => `- \`${e.uri}\` — ${e.l0 || e.content.split("\n")[0]?.slice(0, 100)}`);
  return `## Memory index (L0)\n\n${lines.join("\n")}`;
}

function formatL1Section(entry: MemoryEntry): string {
  return `### ${entry.uri} (${entry.type})\n\n${entry.l1 || entry.content}`;
}

function buildL2Footer(entries: MemoryEntry[]): string {
  const lines = entries.slice(0, 20).map((e) => `- \`${e.uri}\` — search "${e.l0 || e.content.split("\n")[0]?.slice(0, 80)}"`);
  return `## Available detail\n\nThe following entries have full detail accessible via kontex_find:\n${lines.join("\n")}`;
}

function isRecentlyTouched(entry: MemoryEntry, recentFiles: string[]): boolean {
  if (!entry.affected_paths.length || !recentFiles.length) return false;
  return entry.affected_paths.some((ap) => recentFiles.some((rf) => rf.startsWith(ap) || ap.startsWith(rf)));
}

function isRecentlyCreated(entry: MemoryEntry, days: number): boolean {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return new Date(entry.created) >= cutoff;
}

async function getRecentlyModifiedFiles(workspaceRoot: string, days: number): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "log", "--since", `${days}.days.ago`, "--name-only", "--pretty=format:"], { cwd: workspaceRoot, stdout: "pipe" });
    const output = await new Response(proc.stdout).text();
    return [...new Set(output.split("\n").map((l) => l.trim()).filter(Boolean))];
  } catch { return []; }
}

function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }
