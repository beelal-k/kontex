import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { compile } from "../src/memory/compile";
import { DEFAULT_CONFIG } from "../src/config";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dir, "fixtures", "compile-test");

beforeEach(() => {
  mkdirSync(join(TEST_DIR, ".context", "memory", "decisions"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".context", "memory", "sessions"), { recursive: true });
  Bun.spawnSync(["git", "init"], { cwd: TEST_DIR });
  Bun.spawnSync(["git", "config", "user.email", "test@test.com"], { cwd: TEST_DIR });
  Bun.spawnSync(["git", "config", "user.name", "Test"], { cwd: TEST_DIR });
});

afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); });

describe("compile", () => {
  test("generates KONTEX.md with system prompt", async () => {
    await compile(TEST_DIR, DEFAULT_CONFIG);
    const output = readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8");
    expect(output).toContain("## Project memory (kontex)");
    expect(output).toContain("kontex_remember");
  });

  test("includes L0 index of memory entries", async () => {
    writeFileSync(join(TEST_DIR, ".context", "memory", "decisions", "001-test.md"),
      `---\nuri: memory/decisions/001-test\ntype: decision\ncreated: ${new Date().toISOString()}\nconfidence: 0.95\nverified: true\nstale: false\nglobal: false\naffected_paths: []\nref_count: 0\ntags: []\n---\n\n# L0\nTest decision.\n\n# L1\nWe decided to use this.\n`);
    await compile(TEST_DIR, DEFAULT_CONFIG);
    const output = readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8");
    expect(output).toContain("memory/decisions/001-test");
  });

  test("produces empty index message when no entries exist", async () => {
    await compile(TEST_DIR, DEFAULT_CONFIG);
    expect(readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8")).toContain("No memory entries yet");
  });

  test("is deterministic", async () => {
    writeFileSync(join(TEST_DIR, ".context", "memory", "decisions", "001-test.md"),
      `---\nuri: memory/decisions/001-test\ntype: decision\ncreated: 2026-01-01T00:00:00Z\nconfidence: 0.95\nverified: true\nstale: false\nglobal: true\naffected_paths: []\nref_count: 5\ntags: []\n---\n\n# L0\nDeterministic test.\n\n# L1\nThis tests determinism.\n`);
    await compile(TEST_DIR, DEFAULT_CONFIG);
    const o1 = readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8");
    await compile(TEST_DIR, DEFAULT_CONFIG);
    expect(readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8")).toBe(o1);
  });

  test("excludes stale entries", async () => {
    writeFileSync(join(TEST_DIR, ".context", "memory", "decisions", "002-stale.md"),
      `---\nuri: memory/decisions/002-stale\ntype: decision\ncreated: 2026-01-01T00:00:00Z\nconfidence: 0.95\nverified: true\nstale: true\naffected_paths: []\nref_count: 0\ntags: []\n---\n\n# L0\nShould not appear.\n`);
    await compile(TEST_DIR, DEFAULT_CONFIG);
    expect(readFileSync(join(TEST_DIR, ".context", "KONTEX.md"), "utf-8")).not.toContain("memory/decisions/002-stale");
  });
});
