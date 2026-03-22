import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { handleRemember, handleInvalidate, handleLogDecision, handleFind } from "../src/mcp/handlers";
import { DEFAULT_CONFIG } from "../src/config";
import { join } from "node:path";
import { mockEmbeddings, setupTestDir, teardownTestDir } from "./helpers";

const TEST_DIR = join(import.meta.dir, "fixtures", "mcp-test");

mockEmbeddings();

beforeEach(() => setupTestDir(TEST_DIR));
afterEach(() => teardownTestDir(TEST_DIR));

describe("MCP Handlers", () => {
  test("handleRemember adds a memory and responds with success", async () => {
    const res = await handleRemember({
      content: "We format our code with Prettier width 100.",
      type: "convention",
      why_memorable: "Important config",
      confidence: 0.99
    }, TEST_DIR);

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("Written: memory/conventions/");
    expect(res.content[0].text).toContain("verified: true");
  });

  test("handleRemember fails on missing fields", async () => {
    const res = await handleRemember({ content: "Incomplete" }, TEST_DIR);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Missing required fields");
  });

  test("handleInvalidate marks memory stale", async () => {
    // Write first
    const r1 = await handleRemember({
      content: "Temp rule.", type: "gotcha", why_memorable: "temp", confidence: 0.9
    }, TEST_DIR);
    const uriMatch = r1.content[0].text.match(/(memory\/gotchas\/[\w-]+)/);
    const uri = uriMatch![1];

    // Invalidate
    const res = await handleInvalidate({ uri, reason: "No longer temp" }, TEST_DIR);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("Invalidated: " + uri);
  });

  test("handleLogDecision structural creation", async () => {
    const res = await handleLogDecision({
      title: "Use Redis",
      context: "Cache is slow",
      decision: "Redis for all caches",
      rationale: "It is fast"
    }, TEST_DIR);

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("Decision logged");
  });

  test("handleFind returns formatted results", async () => {
    // Write a few
    await handleRemember({ content: "PostgreSQL is our primary DB.", type: "decision", why_memorable: "db core", confidence: 0.9 }, TEST_DIR);
    
    const res = await handleFind({ query: "PostgreSQL" }, TEST_DIR);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("PostgreSQL is our primary DB.");
  });
});
