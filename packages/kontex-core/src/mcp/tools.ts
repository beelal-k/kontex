/**
 * MCP tool definitions — the 4 tools kontex exposes to AI assistants.
 */

export const TOOLS = [
  {
    name: "kontex_remember",
    description: `Store a memory about this codebase.
Call when: architectural decision made, non-obvious constraint discovered,
pattern established, convention confirmed by developer.
Do NOT call for: routine edits, temporary context, things already in KONTEX.md.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        content: { type: "string" as const, description: "The memory content to store" },
        type: { type: "string" as const, enum: ["decision", "pattern", "gotcha", "convention", "resource"], description: "Category of memory" },
        why_memorable: { type: "string" as const, description: "Why this outlives the current session" },
        confidence: { type: "number" as const, minimum: 0, maximum: 1, description: "Confidence level (0.0 - 1.0)" },
        affected_paths: { type: "array" as const, items: { type: "string" as const }, description: "File paths this memory is relevant to" },
      },
      required: ["content", "type", "why_memorable", "confidence"],
    },
  },
  {
    name: "kontex_invalidate",
    description: `Mark an existing memory as outdated.
Call when existing memory is discovered to be wrong.
Always follow with kontex_remember to store the correction.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        uri: { type: "string" as const, description: "URI of the memory entry to invalidate" },
        reason: { type: "string" as const, description: "Why this memory is no longer valid" },
      },
      required: ["uri", "reason"],
    },
  },
  {
    name: "kontex_log_decision",
    description: `Log a structured ADR. Call when the developer commits to an
architectural approach after discussion — not for suggestions, only decisions.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string" as const, description: "Short title for the decision" },
        context: { type: "string" as const, description: "What problem or situation prompted this decision" },
        decision: { type: "string" as const, description: "What was decided" },
        rationale: { type: "string" as const, description: "Why this approach was chosen" },
        alternatives: { type: "array" as const, items: { type: "string" as const }, description: "Other approaches considered" },
        consequences: { type: "string" as const, description: "Expected consequences" },
      },
      required: ["title", "context", "decision", "rationale"],
    },
  },
  {
    name: "kontex_find",
    description: `Semantic search across project memory.
Call before answering architecture or convention questions.
Do not guess what memory contains — search it.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const, description: "Natural language search query" },
        limit: { type: "number" as const, description: "Maximum number of results (default: 5)" },
      },
      required: ["query"],
    },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]["name"];
