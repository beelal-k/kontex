import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { processShadowComments } from "../src/shadow";
import { loadAllEntries } from "../src/memory/read";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mockEmbeddings, setupTestDir, teardownTestDir } from "./helpers";

const TEST_DIR = join(import.meta.dir, "fixtures", "shadow-test");

mockEmbeddings();

beforeEach(() => setupTestDir(TEST_DIR));
afterEach(() => teardownTestDir(TEST_DIR));

describe("Shadow Parser (Copilot Fallback)", () => {
  test("processes valid shadow comments and clears the file", async () => {
    const shadowPath = join(TEST_DIR, ".context", "shadow.jsonl");
    const validLine1 = JSON.stringify({
      __kontex_memory: {
        type: "decision",
        content: "We use Postgres for all relational data.",
        confidence: 0.95,
        why_memorable: "Core architectural choice",
        affected_paths: ["src/db/"]
      }
    });

    // An invalid line to ensure it doesn't crash the parser
    const invalidLine = "not json";
    const validLine2 = JSON.stringify({
      __kontex_memory: {
        type: "pattern",
        content: "Use dependency injection for services.",
      }
    });

    writeFileSync(shadowPath, `${validLine1}\n${invalidLine}\n${validLine2}\n`, "utf8");

    await processShadowComments(TEST_DIR);

    // File should be cleared
    const newContent = readFileSync(shadowPath, "utf8");
    expect(newContent).toBe("");

    // Memories should be written to the store
    const entries = loadAllEntries(TEST_DIR);
    expect(entries.length).toBe(2);

    const postgresEntry = entries.find(e => e.content.includes("Postgres"));
    expect(postgresEntry).toBeDefined();
    expect(postgresEntry?.type).toBe("decision");
    expect(postgresEntry?.author).toBeString();
    expect(postgresEntry?.affected_paths).toEqual(["src/db/"]);

    const patternEntry = entries.find(e => e.content.includes("dependency injection"));
    expect(patternEntry).toBeDefined();
    expect(patternEntry?.type).toBe("pattern");
  });

  test("does nothing if shadow.jsonl is missing or empty", async () => {
    const shadowPath = join(TEST_DIR, ".context", "shadow.jsonl");

    // Missing
    await processShadowComments(TEST_DIR);
    expect(loadAllEntries(TEST_DIR).length).toBe(0);

    // Empty
    writeFileSync(shadowPath, "   \n\n ", "utf8");
    await processShadowComments(TEST_DIR);
    expect(loadAllEntries(TEST_DIR).length).toBe(0);
  });
});
