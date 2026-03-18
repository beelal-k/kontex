import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { handlePreCommit } from "../src/hooks/pre-commit";
import { writeMemory } from "../src/memory/write";
import { DEFAULT_CONFIG } from "../src/config";
import { getDatabase, closeDatabase } from "../src/storage/db";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dir, "fixtures", "hooks-test");

mock.module("../src/storage/embeddings.js", () => ({
  initEmbeddingModel: async () => {},
  embed: async (t: string) => new Float32Array(384).fill(Math.sin(t.length)),
}));

beforeEach(() => {
  mkdirSync(join(TEST_DIR, ".context", "memory", "decisions"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".context", "memory", "sessions"), { recursive: true });
  getDatabase(TEST_DIR);
  // init git repo so compile can run without errors
  Bun.spawnSync(["git", "init"], { cwd: TEST_DIR });
  Bun.spawnSync(["git", "config", "user.email", "test@test.com"], { cwd: TEST_DIR });
  Bun.spawnSync(["git", "config", "user.name", "Test"], { cwd: TEST_DIR });
});

afterEach(() => {
  closeDatabase();
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe("Pre-commit hook handler", () => {
  test("generates queue file with affected memories", async () => {
    // 1. Write a memory that applies to specific paths
    const m = await writeMemory({
      content: "All API routes must return JSON.",
      type: "pattern",
      why_memorable: "API consistency",
      confidence: 0.95,
      affected_paths: ["src/api/"]
    }, TEST_DIR, DEFAULT_CONFIG);

    expect(m.success).toBe(true);

    // 2. Mock a pre-commit hook invocation with matching staged files
    await handlePreCommit("src/api/users.ts\nsrc/api/orders.ts", TEST_DIR);

    // 3. Verify queue file was written and contains the memory reference
    const queuePath = join(TEST_DIR, ".kontex-queue.json");
    expect(existsSync(queuePath)).toBe(true);
    
    const queue = JSON.parse(readFileSync(queuePath, "utf-8"));
    expect(queue.staged_files).toContain("src/api/users.ts");
    expect(queue.affected_memories).toContain(m.uri);
    expect(queue.commit_sha_pending).toBe(true);
  });

  test("does nothing if no files staged", async () => {
    await handlePreCommit("", TEST_DIR);
    expect(existsSync(join(TEST_DIR, ".kontex-queue.json"))).toBe(false);
  });
});

// Note: Post-commit is not tested extensively here because it relies closely on Vercel AI SDK and GitHub Models API network requests, which are tough to mock purely statically without over-engineering standard test doubles.
