/**
 * Shared test setup helpers for kontex-core tests.
 * Eliminates repeated beforeEach/afterEach boilerplate across test files.
 */

import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mock } from "bun:test";
import { getDatabase, closeDatabase } from "../src/storage/db";

const MEMORY_SUBDIRS = ["conventions", "decisions", "gotchas", "patterns", "sessions", "sessions/archive"];

/**
 * Registers the deterministic embedding mock. Call once at the top of a test file.
 * Uses string-length-based sine values to produce stable, distinct vectors without
 * downloading the 23MB embedding model.
 */
export function mockEmbeddings(): void {
  mock.module("../src/storage/embeddings.js", () => ({
    initEmbeddingModel: async () => {},
    embed: async (text: string) => {
      const arr = new Float32Array(384);
      arr.fill(Math.sin(text.length));
      return arr;
    },
  }));
}

/**
 * Sets up a clean isolated test directory with all required subdirectories and an
 * initialized DB. Closes any pre-existing DB for the same path first.
 * Call in beforeEach.
 */
export function setupTestDir(testDir: string): void {
  closeDatabase(testDir);
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  for (const sub of MEMORY_SUBDIRS) {
    mkdirSync(join(testDir, ".context", "memory", sub), { recursive: true });
  }
  mkdirSync(join(testDir, ".kontex-index"), { recursive: true });
  mkdirSync(join(testDir, ".kontex-log"), { recursive: true });
  getDatabase(testDir);
}

/**
 * Closes the DB and removes the test directory. Call in afterEach.
 */
export function teardownTestDir(testDir: string): void {
  closeDatabase(testDir);
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
}
