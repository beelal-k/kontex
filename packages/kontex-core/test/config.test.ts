import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, writeConfig, DEFAULT_CONFIG } from "../src/config";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dir, "fixtures", "config-test");

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); });

describe("loadConfig", () => {
  test("returns defaults when no config file exists", () => {
    expect(loadConfig(TEST_DIR)).toEqual(DEFAULT_CONFIG);
  });

  test("merges partial config with defaults", () => {
    writeFileSync(join(TEST_DIR, "kontex.config.json"), JSON.stringify({ compile: { tokenBudget: 5000 } }));
    const config = loadConfig(TEST_DIR);
    expect(config.compile.tokenBudget).toBe(5000);
    expect(config.compile.alwaysInclude).toEqual(["memory/project.md"]);
    expect(config.llm.provider).toBe("github-models");
  });

  test("handles invalid JSON gracefully", () => {
    writeFileSync(join(TEST_DIR, "kontex.config.json"), "not json");
    expect(loadConfig(TEST_DIR)).toEqual(DEFAULT_CONFIG);
  });

  test("resolves environment variables in apiKey", () => {
    process.env.TEST_API_KEY = "test-key-value";
    writeFileSync(join(TEST_DIR, "kontex.config.json"), JSON.stringify({ llm: { provider: "openai", model: "gpt-4o-mini", apiKey: "${TEST_API_KEY}" } }));
    expect(loadConfig(TEST_DIR).llm.apiKey).toBe("test-key-value");
    delete process.env.TEST_API_KEY;
  });

  test("preserves nested defaults on partial override", () => {
    writeFileSync(join(TEST_DIR, "kontex.config.json"), JSON.stringify({ quality: { minConfidence: 0.7 } }));
    const config = loadConfig(TEST_DIR);
    expect(config.quality.minConfidence).toBe(0.7);
    expect(config.quality.autoVerifyThreshold).toBe(0.85);
    expect(config.quality.deduplicateThreshold).toBe(0.92);
  });
});

describe("writeConfig", () => {
  test("writes and reads back correctly", () => {
    writeConfig(TEST_DIR, DEFAULT_CONFIG);
    expect(loadConfig(TEST_DIR)).toEqual(DEFAULT_CONFIG);
  });
});
