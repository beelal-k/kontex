/**
 * Shared type definitions for kontex-core.
 *
 * All memory-related types, result types, and input schemas live here
 * to avoid circular dependencies between modules.
 */

// ─── Memory Types ──────────────────────────────────────────────────────────

export type MemoryType = "decision" | "pattern" | "gotcha" | "convention" | "resource";

export interface MemoryEntry {
  /** Unique identifier, e.g. "memory/decisions/001-cqrs-orders" */
  uri: string;
  type: MemoryType;
  content: string;
  created: string;
  updated: string;
  author: string;
  confidence: number;
  verified: boolean;
  stale: boolean;
  global: boolean;
  affected_paths: string[];
  ref_count: number;
  tags: string[];
  /** Raw L0 text — single sentence abstract */
  l0: string;
  /** Raw L1 text — overview section */
  l1: string;
  /** Raw L2 text — full detail (only loaded on demand) */
  l2: string;
}

// ─── Quality Gate Results ──────────────────────────────────────────────────

export interface SecretsScanResult {
  blocked: boolean;
  pattern?: string;
}

export type DedupStatus = "clear" | "duplicate" | "conflict";

export interface DedupResult {
  status: DedupStatus;
  existing_uri?: string;
  existing_content?: string;
  message?: string;
}

export interface WriteResult {
  success: boolean;
  uri?: string;
  verified?: boolean;
  error?: string;
  /** Set when dedup detects a conflict requiring invalidation first */
  conflict?: DedupResult;
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface SearchResult {
  uri: string;
  type: MemoryType;
  content: string;
  similarity: number;
  verified: boolean;
  tier: "l0" | "l1" | "l2";
}

// ─── ADR Input ─────────────────────────────────────────────────────────────

export interface ADRInput {
  title: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
  consequences?: string;
  affected_paths?: string[];
}

// ─── Decay ─────────────────────────────────────────────────────────────────

export interface DecayResult {
  promoted: string[];
  expired: string[];
  archived: string[];
  flaggedStale: string[];
}

// ─── Hook Queue ────────────────────────────────────────────────────────────

export interface HookQueue {
  staged_files: string[];
  affected_memories: string[];
  commit_sha_pending: boolean;
  timestamp: string;
}

// ─── LLM Extraction ───────────────────────────────────────────────────────

export interface ExtractedMemory {
  content: string;
  type: MemoryType;
  why_memorable: string;
  confidence: number;
  affected_paths: string[];
}

export interface ExtractionResult {
  new_memories: ExtractedMemory[];
  stale_uris: string[];
}
