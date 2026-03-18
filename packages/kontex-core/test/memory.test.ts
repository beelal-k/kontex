import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { writeMemory, invalidateMemory, logDecision } from "../src/memory/write";
import { findMemories, loadAllEntries, loadEntry } from "../src/memory/read";
import { DEFAULT_CONFIG } from "../src/config";
import { getDatabase, closeDatabase } from "../src/storage/db";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dir, "fixtures", "memory-test");

// Mock the embeddings module to make tests lightning fast and avoid 23MB download every time
mock.module("../src/storage/embeddings.js", () => ({
  initEmbeddingModel: async () => {},
  // Simple deterministic pseudo-embedding based on string length to simulate vector variance
  embed: async (text: string) => {
    const arr = new Float32Array(384);
    arr.fill(Math.sin(text.length));
    return arr;
  },
}));

beforeEach(() => {
  mkdirSync(join(TEST_DIR, ".context", "memory", "decisions"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".context", "memory", "sessions"), { recursive: true });
  getDatabase(TEST_DIR); // init DB
});

afterEach(() => {
  closeDatabase();
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe("Memory Write Pipeline", () => {
  test("writes a verified memory when confidence is high", async () => {
    const result = await writeMemory(
      { content: "We use Bun for all new monorepos.", type: "convention", why_memorable: "Standardized across org", confidence: 0.9 },
      TEST_DIR,
      DEFAULT_CONFIG
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.uri).toStartWith("memory/conventions/");

    const entry = loadEntry(result.uri!, TEST_DIR);
    expect(entry).not.toBeNull();
    expect(entry?.verified).toBe(true);
    expect(entry?.content).toContain("We use Bun");
  });

  test("writes an unverified memory when confidence is borderline", async () => {
    const result = await writeMemory(
      { content: "I think we use standard fetch for HTTP.", type: "convention", why_memorable: "Seen in a few files", confidence: 0.7 },
      TEST_DIR,
      DEFAULT_CONFIG
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(false);
  });

  test("discards memory when confidence is too low", async () => {
    const result = await writeMemory(
      { content: "Not sure about this.", type: "gotcha", why_memorable: "Unclear", confidence: 0.2 },
      TEST_DIR,
      DEFAULT_CONFIG
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("below minimum");
  });

  test("blocks memory if it contains a secret", async () => {
    const result = await writeMemory(
      { content: "Connecting to db with password = 'supersecretpassword123'", type: "resource", why_memorable: "Db test", confidence: 0.9 },
      TEST_DIR,
      DEFAULT_CONFIG
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("blocked");
  });
});

describe("Memory Invalidation and ADRs", () => {
  test("invalidates an existing memory", async () => {
    const w = await writeMemory(
      { content: "Vue is the framework.", type: "decision", why_memorable: "For UI", confidence: 0.95 },
      TEST_DIR,
      DEFAULT_CONFIG
    );

    const inv = await invalidateMemory(w.uri!, "We switched to React.", TEST_DIR);
    expect(inv.success).toBe(true);

    const entry = loadEntry(w.uri!, TEST_DIR);
    expect(entry?.stale).toBe(true);
  });

  test("logs a structured ADR", async () => {
    const r = await logDecision({
      title: "Switch to Bun",
      context: "Node was too slow",
      decision: "We are migrating to Bun",
      rationale: "Speed and simplicity",
      alternatives: ["Deno", "Node"],
      consequences: "Faster CI",
      affected_paths: ["package.json"]
    }, TEST_DIR, DEFAULT_CONFIG);

    expect(r.success).toBe(true);
    expect(r.uri).toContain("decisions");

    const entry = loadEntry(r.uri!, TEST_DIR);
    expect(entry?.content).toContain("Switch to Bun");
    expect(entry?.content).toContain("Alternatives considered");
    expect(entry?.affected_paths).toEqual(["package.json"]);
  });
});

describe("Memory Read Pipeline", () => {
  test("loads multiple entries and validates frontmatter", async () => {
    await writeMemory({ content: "A1", type: "gotcha", why_memorable: "W1", confidence: 0.9 }, TEST_DIR, DEFAULT_CONFIG);
    await writeMemory({ content: "A2", type: "pattern", why_memorable: "W2", confidence: 0.9 }, TEST_DIR, DEFAULT_CONFIG);

    const entries = loadAllEntries(TEST_DIR);
    expect(entries.length).toBe(2);
    expect(entries.some(e => e.type === "gotcha")).toBe(true);
    expect(entries.some(e => e.type === "pattern")).toBe(true);
  });
});
