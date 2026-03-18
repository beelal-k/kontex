import type { KontexConfig } from "./config.js";
import type { MemoryEntry, MemoryType, WriteResult, DedupResult, SearchResult, DecayResult, ADRInput } from "./types.js";

// Re-export all public types
export type { KontexConfig, MemoryEntry, MemoryType, WriteResult, DedupResult, SearchResult, DecayResult, ADRInput };

// Re-export core modules
export { loadConfig, writeConfig, DEFAULT_CONFIG } from "./config.js";
export { scanForSecrets } from "./secrets.js";
export { login, logout, getToken, isAuthenticated } from "./auth.js";
export { getDatabase, closeDatabase } from "./storage/db.js";
export { embed, initEmbeddingModel } from "./storage/embeddings.js";
export { writeMemory, invalidateMemory, logDecision } from "./memory/write.js";
export { findMemories, loadAllEntries, loadEntry } from "./memory/read.js";
export { compile } from "./memory/compile.js";
export { runDecay } from "./memory/decay.js";
export { createMCPServer } from "./mcp/server.js";
export { handlePreCommit } from "./hooks/pre-commit.js";
export { handlePostCommit } from "./hooks/post-commit.js";
export { handlePostMerge } from "./hooks/post-merge.js";
export { initProject } from "./init.js";
