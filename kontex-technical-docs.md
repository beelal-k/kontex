# kontex — Technical Documentation

> Persistent, git-native memory for AI-assisted development.  
> Zero friction. No IDE required. Works everywhere git works.

**Version:** 1.0.0-spec  
**Status:** Pre-build  
**License:** MIT  
**Spec license:** CC0

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Principles](#2-core-principles)
3. [User Stories](#3-user-stories)
4. [Feature Specification](#4-feature-specification)
5. [Architecture](#5-architecture)
6. [The `.context/` Folder Spec](#6-the-context-folder-spec)
7. [Tiered Memory Model](#7-tiered-memory-model)
8. [MCP Server](#8-mcp-server)
9. [Git Hook System](#9-git-hook-system)
10. [Quality Gate](#10-quality-gate)
11. [KONTEX.md Compilation](#11-custommd-compilation)
12. [Configuration](#12-configuration)
13. [CLI Reference](#13-cli-reference)
14. [Tech Stack](#14-tech-stack)
15. [Monorepo Structure](#15-monorepo-structure)
16. [Security](#16-security)
17. [Caveats & Known Limitations](#17-caveats--known-limitations)
18. [Roadmap](#18-roadmap)

---

## 1. Product Overview

Every AI coding assistant starts every session with zero knowledge of your project. Developers re-explain architecture, decisions, and conventions repeatedly — to every tool, in every session, across every teammate. There is no institutional memory.

**kontex** solves this by maintaining a `.context/` folder inside your git repository. It is a versioned, structured memory store that:

- Updates itself automatically as developers work and commit
- Is shared across the entire team via standard `git pull`
- Is read by any AI tool that supports MCP (Claude Code, Cursor, Zed, Windsurf) or the `AGENTS.md`/`CLAUDE.md` standard
- Requires zero developer action after initial setup

### What kontex is

- A git-native memory layer for your codebase
- A local MCP server exposing memory read/write tools to AI assistants
- A git hook system that extracts knowledge from code changes automatically
- An open folder specification that any tool can implement

### What kontex is not

- Not a cloud service — everything runs locally
- Not locked to any AI tool or IDE
- Not another config file to maintain manually
- Not a session logger — it stores knowledge, not transcripts

---

## 2. Core Principles

**Zero friction above all else.** A developer who has installed kontex should never need to think about it. If a feature requires the developer to run a command, remember a workflow step, or make a decision, it must be redesigned.

**The memory belongs to the team, not the tool.** Everything lives in git. Every teammate gets it on `git pull`. No vendor owns it.

**Quality over quantity.** More context does not mean better AI responses — research shows bloated context files reduce task success rates. kontex is opinionated about what gets stored and how it gets surfaced.

**The spec is the moat, not the tooling.** The `.context/` folder format is an open standard. Any tool can read and write it. This makes kontex impossible to absorb by a single platform.

**Never block the developer.** Every expensive operation (LLM calls, embedding generation, compilation) runs asynchronously. The developer's git commit, terminal, and editor are never paused by kontex.

---

## 3. User Stories

### Epic 1 — Solo developer

**US-001** As a solo developer, I want AI assistants to remember my project's architecture across sessions so I don't have to re-explain it every time I open a new chat.

**US-002** As a solo developer, I want kontex to install with a single command so I can set it up in under 30 seconds.

**US-003** As a solo developer, I want kontex to run invisibly in the background so it doesn't add cognitive load to my workflow.

**US-004** As a solo developer, I want AI assistants to know which files I recently changed so their suggestions are contextually relevant to my current work.

**US-005** As a solo developer, I want past architectural decisions to be surfaced automatically when I'm working on related code so I don't accidentally contradict them.

**US-006** As a solo developer using Vim with Claude Code, I want kontex to work without any IDE extension because I don't use VS Code.

**US-007** As a solo developer, I want my project memory to travel with my repo so it works across multiple machines automatically.

---

### Epic 2 — Team developer

**US-008** As a team developer, I want my AI assistant to have the same project knowledge as my senior colleague's AI assistant so we get consistent answers.

**US-009** As a team developer, I want to benefit from architectural decisions made before I joined the project without reading months of Slack history.

**US-010** As a new team member, I want to clone a repo and immediately have AI assistance that understands the project's conventions and decisions.

**US-011** As a team developer, I want kontex to not create git conflicts when two teammates commit context updates simultaneously.

**US-012** As a team lead, I want architectural decisions to be captured automatically when my team commits code so we build up institutional knowledge without a documentation process.

**US-013** As a team developer, I want context updates from my work to automatically appear in my teammates' AI sessions after they `git pull`.

---

### Epic 3 — AI assistant behavior

**US-014** As a developer, I want the AI to automatically call memory tools when it makes decisions during our conversation so I never have to say "remember this".

**US-015** As a developer, I want the AI to correct outdated memory when it discovers something has changed, without me pointing it out.

**US-016** As a developer, I want the AI to search project memory before answering architecture questions so it doesn't reconstruct things it already knows.

**US-017** As a developer, I want low-quality or redundant memories to be automatically filtered out so the AI context doesn't become noisy over time.

**US-018** As a developer, I want the AI to store structured ADRs when we agree on an architectural approach, not just freeform notes.

---

### Epic 4 — Git hook integration

**US-019** As a developer, I want kontex to analyze my commits and extract learnings from code changes automatically so memory updates happen as a side effect of normal work.

**US-020** As a developer, I want git commits to complete instantly even when kontex is running LLM analysis in the background.

**US-021** As a developer, I want kontex's git hooks to install for all teammates automatically when they run `bun install`, just like Husky.

**US-022** As a developer, I want kontex to detect when I've modified files that are referenced in existing memory entries and flag those entries as potentially stale.

**US-023** As a developer, I want `.context/` updates to be committed automatically in a dedicated kontex commit so sharing memory requires no extra action from me.

---

### Epic 5 — Memory quality

**US-024** As a developer, I want duplicate memories to be silently deduplicated so the context store doesn't accumulate noise over time.

**US-025** As a developer, I want memories that are never referenced in AI sessions to eventually expire so the context stays lean.

**US-026** As a developer, I want credentials and secrets to be blocked from ever entering memory so I don't accidentally leak them to the team.

**US-027** As a developer, I want memory to be compressed over time so the `.context/` folder stays under 1MB in git.

**US-028** As a developer, I want to authenticate kontex with a single `kontex login` command using my existing GitHub account so I never need to find or paste an API key.

---

### Epic 6 — Multi-tool support

**US-029** As a developer using GitHub Copilot, I want kontex to work even though Copilot doesn't support MCP, via a shadow comment fallback.

**US-030** As a developer using multiple AI tools (Cursor in the morning, Claude Code in the afternoon), I want both tools to share the same project memory.

**US-031** As a developer using Zed, I want kontex to register as an MCP server automatically without me editing any config files.

**US-032** As a developer on a non-Bun project (Go, Python, Rails), I want kontex to work without a `package.json` in my repo.

---

## 4. Feature Specification

### F-001 — `kontex init`

One-time project setup command. Performs a structural scan of the project (reading `package.json`/`pyproject.toml`/`go.mod`/`README.md`/`git log`/folder structure), generates an initial `.context/` skeleton, installs git hooks, and writes a `kontex.config.json`. Optional `--ai` flag triggers an LLM extraction pass to generate the first `memory/project.md` and `decisions/` entries from the codebase.

Acceptance criteria:
- Runs in under 5 seconds without `--ai` flag
- Checks for existing GitHub auth token — prompts `kontex login` if not found
- Is idempotent — safe to run multiple times
- Installs hooks in a way that propagates to teammates via `bun install` (or equivalent `prepare` script for non-Bun projects)
- Creates `.gitignore` entries for `.kontex-index/` automatically

---

### F-002 — MCP Server

A local JSON-RPC 2.0 server communicating over stdio, exposing four tools to any MCP-capable AI assistant. Spawned automatically when an MCP-capable tool discovers it via its config file.

Tools exposed:

| Tool | Purpose | When AI should call it |
|---|---|---|
| `kontex_remember` | Write a new memory entry | After a decision, pattern, gotcha, or convention is established |
| `kontex_invalidate` | Mark an existing entry stale | When discovering existing memory is wrong or outdated |
| `kontex_log_decision` | Write a structured ADR | When an architectural decision is committed to by the developer |
| `kontex_find` | Semantic search across memory | Before answering architecture/convention questions |

Acceptance criteria:
- Responds to `initialize` in under 10ms
- Tool calls complete in under 200ms (excluding LLM calls, which are async)
- Works over stdio (default) and HTTP (optional)
- Auto-registers in Claude Code, Cursor, Zed, and Windsurf config files on first run
- Handles concurrent tool calls safely

---

### F-003 — Pre-commit Hook

A git pre-commit hook that runs synchronously before every commit. Reads `git diff --cached --name-only` to get the list of staged files. Cross-references staged paths against memory entries' `affected_paths` field. Writes a `.kontex-queue.json` file listing affected entries for the post-commit hook to process. Never blocks the commit — max execution time 100ms.

Acceptance criteria:
- Completes in under 100ms on any size repo
- Never fails the commit (exits 0 always)
- Works without Bun (shell script fallback)
- Produces a `.kontex-queue.json` for post-commit processing

---

### F-004 — Post-commit Hook

**Responsibility split:** `kontex compile` (fast, no LLM) runs in the pre-commit hook synchronously — `KONTEX.md` is always in the developer's own commit. The post-commit hook handles only the slow LLM extraction step, which produces knowledge that genuinely did not exist at commit time. When extraction completes, kontex makes its own dedicated commit scoped exclusively to `.context/`. This eliminates all race conditions — no `--amend`, no index inspection, no risk of absorbing unrelated staged files.

**Timing breakdown:**

| Operation | Hook | Time | Blocks terminal |
|---|---|---|---|
| Read staged files + cross-ref index | pre-commit | ~30ms | Yes — imperceptible |
| `kontex compile` → write `KONTEX.md` | pre-commit | ~250ms | Yes — imperceptible |
| `git add .context/KONTEX.md` | pre-commit | ~5ms | Yes — imperceptible |
| **developer's commit completes** | — | ~100ms | — |
| LLM diff extraction | post-commit | ~1–4s | **No — detached** |
| Write session memory file | post-commit | ~10ms | No |
| `git add .context/ && git commit` | post-commit | ~100ms | No |

Total terminal block time: **~385ms**. Imperceptible — `git commit` itself takes 50–200ms and developers do not notice sub-500ms additions.

**Post-commit flow:**

```bash
# spawned immediately after developer's commit — fully detached
nohup bunx kontex hook post-commit --sha $(git rev-parse HEAD) > /dev/null 2>&1 &
```

The background process:

1. Reads the full diff via `git show HEAD`
2. Calls the configured LLM to extract learnings: new patterns, implied decisions, established conventions
3. Routes results through the quality gate
4. Writes to `.context/memory/sessions/YYYY-MM-DD-{author-hash}.md`
5. Makes a dedicated kontex commit:

```bash
git add .context/
git commit --no-verify -m "chore(kontex): update memory [skip ci]"
```

The `--no-verify` flag prevents the pre-commit hook from re-running (which would trigger another extraction loop). The `[skip ci]` tag prevents CI pipelines from firing on a markdown-only context update.

**What the git log looks like:**

```
abc1234  feat: add CQRS to orders module        ← developer's commit
def5678  chore(kontex): update memory [skip ci]    ← kontex auto-commit, ~3s later
```

The kontex commit is visually distinct, scoped to one folder, and easy to ignore. This is the same pattern used by Dependabot, Renovate, and semantic-release — automated commits with a consistent prefix are a well-understood convention in modern repos.

**Optional: `squash: true` in config**

For teams that want a cleaner log, setting `squash: true` in `kontex.config.json` enables periodic `git rebase --autosquash` to fold kontex commits into their parent. This is opt-in, only runs on unpushed commits, and never rewrites pushed history.

Acceptance criteria:
- Terminal blocks for under 500ms total (pre-commit compile included)
- kontex auto-commit only ever touches `.context/` — no other files, ever
- No race condition possible — scoped `git add .context/` cannot absorb developer's staged files
- Developer never needs to make a manual commit for context updates
- `KONTEX.md` is always inside the developer's own commit (via pre-commit)
- Session memory is in the immediately following kontex auto-commit
- Background process runs silently (no terminal output unless `KONTEX_VERBOSE=1`)
- Session files namespaced by author hash to prevent merge conflicts
- `--no-verify` prevents infinite hook loop on the auto-commit
- `[skip ci]` tag prevents CI runs on context-only commits
- Handles LLM API failures gracefully (logs to `.kontex-log/`, does not retry indefinitely)
- Works without GitHub auth (skips LLM extraction, pre-commit compile still runs)

---

### F-005 — KONTEX.md Compilation

The `kontex compile` command regenerates `KONTEX.md` from the `.context/` store. Uses a token-budget algorithm to select which memory entries to include: L0 abstracts of all entries always included, L1 overviews included only for entries whose `affected_paths` overlap with files modified in the last 7 days (from `git log`), plus any entries tagged `global: true`.

Acceptance criteria:
- Output never exceeds configured token budget (default: 3000 tokens)
- Runs in under 500ms
- Is deterministic — same inputs always produce same output
- Appends a footer listing L2 entries available via `kontex_find` but not loaded
- Triggered automatically by: pre-commit hook (primary), MCP write operations, post-merge hook, file watcher

---

### F-006 — Quality Gate

Every write to `.context/` — whether from MCP tool calls or git hook extraction — passes through a three-stage quality gate.

Stage 1 — Secrets scan: blocks writes containing patterns matching credentials, API keys, connection strings, or private keys.

Stage 2 — Dedup and contradiction check: embeds the incoming content and runs cosine similarity against existing memories. Exact duplicates (similarity > 0.92) are silently discarded. Potential contradictions (similarity > 0.75 with conflicting claims) are returned to the AI as a conflict requiring `kontex_invalidate` first.

Stage 3 — Confidence routing: writes with `confidence >= 0.85` are committed as `verified: true`. Writes between `0.60` and `0.84` are committed as `verified: false` (used but deprioritised). Writes below `0.60` are discarded.

Acceptance criteria:
- Secrets scan runs in under 5ms
- Dedup check runs in under 50ms
- No developer action required at any stage
- All gate decisions are logged to `.kontex-log/quality.log` for debugging

---

### F-007 — Decay and Compression

A weekly background process (cron job installed by `kontex init`) that maintains memory health:

- Scans all `verified: false` entries — promotes those referenced in 3+ sessions, expires those untouched for 30 days
- Archives session files older than 7 days into LLM-compressed summaries appended to `memory/project.md`
- Flags entries whose `affected_paths` no longer exist in the repo as `stale: true`
- Enforces the 500KB size cap on `memory/sessions/` — triggers immediate compression if exceeded

Acceptance criteria:
- Runs without blocking any developer action
- Never deletes entries — only flags them (deletion is a human action via `kontex audit`)
- Compressed summaries are readable Markdown, not opaque blobs
- Total committed `.context/` stays under 1MB for typical projects

---

### F-008 — Shadow Comment Parser (Copilot Fallback)

For AI tools that do not support MCP (primarily GitHub Copilot), kontex installs a `.github/copilot-instructions.md` block instructing Copilot to append structured shadow comments to responses:

```
<!--kontex:{"type":"decision","content":"...","confidence":0.9,"why":"..."}-->
```

A file watcher monitors the VS Code chat log and Copilot conversation exports. When `<!--kontex:...-->` blocks are detected, they are parsed and routed through the same quality gate as MCP writes.

Acceptance criteria:
- Copilot instructions block injected automatically by `kontex init` if `.github/` exists
- Parser handles malformed JSON blocks gracefully (logs, does not crash)
- Same quality gate applies — no bypass because it's from Copilot

---

### F-009 — Local Embeddings

Semantic search and dedup checks use embeddings generated locally by default, requiring no API key and no network call. Uses `@xenova/transformers` with the `all-MiniLM-L6-v2` model (23MB, downloaded once on first `kontex init`).

Embeddings are stored in `.kontex-index/index.db` (a SQLite file with the `sqlite-vec` extension). This file is gitignored and rebuilds automatically from `.context/` on `kontex init`.

Acceptance criteria:
- First run downloads model once, subsequent runs use cache
- Embedding generation under 50ms per entry on any modern CPU
- Index rebuilds from scratch in under 10 seconds for up to 1000 entries
- Optional upgrade path to Ollama embeddings via config for teams requiring fully offline operation

---

### F-010 — Conflict-free Team Writes

Session files are namespaced by git author email: `memory/sessions/YYYY-MM-DD-alice.md`, `memory/sessions/YYYY-MM-DD-bob.md`. Two teammates committing on the same day never produce a merge conflict on session files.

`memory/project.md` and `memory/decisions/` are the only files that can theoretically conflict. These are treated as ADR-style documents — changes to them should go through a PR, not direct commits. kontex does not enforce this but documents the convention.

Acceptance criteria:
- Session files never conflict on `git merge` or `git pull`
- `KONTEX.md` is regenerated on `post-merge` hook (installed by `kontex init`)
- `.kontex-index/` is always gitignored and never causes conflicts

---

### F-011 — Zero-dependency Shell Fallback

For repositories that cannot use Bun (Go services, Python packages, C++ projects), kontex provides a standalone shell script implementation of the pre-commit and post-commit hooks. The shell version performs the structural scan and queues LLM calls but defers to the `kontex` binary (if available via PATH) for embedding and compilation.

Acceptance criteria:
- Shell hooks work with POSIX sh — no bash-isms
- Gracefully degrades if `kontex` binary not in PATH (skips LLM extraction, still writes queue)
- Documented setup for Go, Python, and Ruby projects

---

### F-012 — `kontex status`

A diagnostic command showing the current health of the memory store: entry counts by type and tier, last compile timestamp, last hook run, index freshness, and any stale or unverified entries awaiting promotion.

Acceptance criteria:
- Output is human-readable in under 200ms
- Shows warnings for: index out of sync, KONTEX.md older than 24 hours, sessions/ exceeding 500KB

---

### F-013 — `kontex audit` (Power User)

An interactive command listing all stale, low-confidence, and expired entries. Allows the developer to bulk-approve deletions, manually promote unverified entries, or view the full content of any entry. This is the only path to permanent deletion from `.context/`.

Acceptance criteria:
- Never runs automatically — always requires explicit invocation
- Confirmation required before any deletion
- Shows full content and metadata for each entry before any action

---

### F-014 — GitHub OAuth Authentication

One-time authentication via GitHub OAuth Device Flow. Kontex registers as a GitHub OAuth App, uses the device flow to obtain a token scoped to GitHub Models API access, and stores it in the OS native keychain. The flow is triggered automatically by `kontex init` if no token is found, or manually via `kontex login`.

The device flow:
1. kontex calls `POST https://github.com/login/device/code` with its `client_id`
2. GitHub returns a `user_code` and `verification_uri`
3. kontex displays the code and opens the browser automatically
4. Developer pastes the code at `github.com/login/device` and clicks Authorize
5. kontex polls `POST https://github.com/login/oauth/access_token` until authorized
6. Token stored in OS keychain via `keytar` — never written to disk as plaintext

Acceptance criteria:
- Entire flow completes in under 60 seconds on a typical connection
- Browser opens automatically — developer never has to copy a URL
- Token stored in OS keychain, never in `kontex.config.json`, never in git
- `kontex login` is idempotent — re-running replaces the existing token
- `kontex logout` removes the token from the keychain cleanly
- `kontex init` triggers the login flow automatically if no token is found
- All `github-models` LLM calls use this token transparently — no developer action after login
- Token revocation at `github.com/settings/applications` is respected on next API call

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  developer's day                        │
│                                                         │
│   writes code  →  git commit  →  AI chat session        │
└──────────┬────────────┬────────────────┬────────────────┘
           │            │                │
           ▼            ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐
│  file watcher│ │  git hooks   │ │    MCP server       │
│  (Bun.watch)  │ │  pre+post    │ │    (stdio)          │
│  .context/   │ │  commit      │ │    kontex_remember     │
│  → recompile │ │  → extract   │ │    kontex_invalidate   │
└──────┬───────┘ └──────┬───────┘ │    kontex_log_decision │
       │                │         │    kontex_find         │
       └────────┬────────┘         └──────────┬──────────┘
                │                             │
                ▼                             ▼
        ┌───────────────────────────────────────────┐
        │              quality gate                 │
        │   secrets scan → dedup → confidence       │
        └───────────────────────┬───────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │             .context/ (git)               │
        │   memory/  ·  resources/  ·  skills/      │
        │   KONTEX.md  (compiled)                   │
        └───────────────────────┬───────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │          .kontex-index/ (gitignored)          │
        │        sqlite-vec · embeddings             │
        └───────────────────────────────────────────┘
```

### Component responsibilities

**kontex-core** — the engine. Quality gate, MCP server, compilation logic, embedding, storage, hook handlers, GitHub OAuth auth. All other packages import from here.

**kontex-cli** — thin commander wrapper over kontex-core. Provides `kontex login`, `kontex logout`, `kontex init`, `kontex compile`, `kontex find`, `kontex status`, `kontex audit`, `kontex daemon`.

**kontex hooks** — shell scripts + Bun runners for pre-commit, post-commit, and post-merge. Installed by `kontex init` into `.git/hooks/`. Propagated to teammates via `prepare` script.

---

## 6. The `.context/` Folder Spec

This is an open specification. Any tool can read and write it.

```
.context/
├── memory/
│   ├── project.md              # L1: project overview, stack, architecture
│   ├── decisions/
│   │   ├── 001-{slug}.md       # one file per ADR
│   │   ├── 002-{slug}.md
│   │   └── ...
│   └── sessions/
│       ├── YYYY-MM-DD-{author-hash}.md   # per-author, per-day session summaries
│       └── archive/            # compressed historical sessions
├── resources/
│   ├── openapi.yaml            # API contracts, schemas
│   ├── schema.prisma           # DB schema snapshots
│   └── ...
├── skills/
│   ├── testing-patterns.md     # how this team writes tests
│   ├── error-handling.md       # error handling conventions
│   └── ...
└── KONTEX.md                   # compiled output — do not edit manually
```

### Memory file frontmatter schema

Every file in `memory/` uses YAML frontmatter:

```yaml
---
uri: memory/decisions/001-cqrs-orders          # unique identifier
type: decision                                  # decision | pattern | gotcha | convention | resource
created: 2026-01-14T10:23:00Z
updated: 2026-03-10T14:05:00Z
author: alice@example.com
confidence: 0.94
verified: true
stale: false
global: false                                   # if true, always included in KONTEX.md
affected_paths:                                 # file paths this memory is relevant to
  - src/orders/
ref_count: 14                                   # times loaded into an AI session
tags:
  - cqrs
  - nestjs
  - orders
---

# L0
Orders module uses CQRS via @nestjs/cqrs. All state changes via domain events.

# L1
## Why CQRS for orders

The orders module requires strict auditability of all state changes for compliance
reasons. CQRS with event sourcing gives us a full history of every order state
transition in the EventStore table.

Command handlers live in `src/orders/commands/`. Query handlers in
`src/orders/queries/`. Domain events in `src/orders/events/`.

Do not use direct repository writes in the orders module — all mutations go
through command handlers.

# L2
[full session notes, meeting details, raw research — only accessed via kontex_find]
```

### Decision file (ADR) schema

```yaml
---
uri: memory/decisions/001-cqrs-orders
type: decision
created: 2026-01-14T10:23:00Z
---

# L0
Used CQRS + event sourcing for the orders module. Decision: 2026-01-14.

# L1
## Context
Orders required strict state audit trail for compliance. Direct DB writes
made this impossible without significant extra instrumentation.

## Decision
Use @nestjs/cqrs with event sourcing. All mutations via command handlers.
Events stored in append-only EventStore table.

## Alternatives considered
- Audit log table alongside normal writes (rejected: dual-write complexity)
- MongoDB change streams (rejected: team unfamiliar, ops overhead)

## Consequences
+ Full audit history with zero extra code
+ Easy CQRS replay for debugging
- New team members need to learn the pattern
- Slightly more boilerplate per feature
```

---

## 7. Tiered Memory Model

kontex organises all memory into three tiers. The tiers control what gets surfaced to the AI and when.

### L0 — Abstract (~100 tokens)

A single sentence or short paragraph. The key fact, decision name, or constraint. Always loaded into the AI's context via `KONTEX.md` — it is the index of everything kontex knows.

Purpose: lets the AI know what knowledge exists so it can call `kontex_find` to go deeper.

### L1 — Overview (~500–2000 tokens)

Architecture context, usage patterns, when-to-use guidance, consequences and trade-offs. Loaded for entries whose `affected_paths` overlap with recently-modified files.

Purpose: gives the AI enough context to answer questions and write code correctly without loading the full detail.

### L2 — Detail (unlimited)

Raw session logs, full meeting notes, complete research, verbose specs. Never auto-loaded. Accessible only via `kontex_find` semantic search.

Purpose: deep reference when the AI needs to answer a specific question that L0/L1 doesn't fully cover.

### Compilation logic

```
KONTEX.md = 
  L0 of ALL entries (always)
  + L1 of entries where affected_paths ∩ git-recently-modified ≠ ∅
  + L1 of entries where global: true
  + L1 of entries created in last 7 days
  (stop when token budget reached, lowest ref_count entries dropped first)
  + footer listing available L2 entries
```

---

## 8. MCP Server

### Protocol

JSON-RPC 2.0 over stdio. The server is spawned as a child process by the AI tool. Communication is via stdin/stdout pipes. No ports, no network, no configuration beyond the initial registration.

### Auto-registration

On `kontex init`, kontex writes its entry into every AI tool config file found on the machine:

| Tool | Config file |
|---|---|
| Claude Code | `~/.claude/claude_desktop_config.json` |
| Cursor | `{workspace}/.cursor/mcp.json` |
| Zed | `~/.config/zed/settings.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Registration entry written:

```json
{
  "mcpServers": {
    "kontex": {
      "command": "bunx",
      "args": ["kontex", "mcp"],
      "env": {
        "KONTEX_WORKSPACE": "/absolute/path/to/project"
      }
    }
  }
}
```

### Handshake sequence

```
AI  → { "jsonrpc":"2.0", "method":"initialize", "id":1,
         "params": { "protocolVersion":"2024-11-05",
                     "clientInfo": { "name":"claude-code" } } }

kontex → { "result": { "protocolVersion":"2024-11-05",
                    "capabilities": { "tools":{} },
                    "serverInfo": { "name":"kontex","version":"1.0.0" } } }

AI  → { "method":"notifications/initialized" }

AI  → { "method":"tools/list", "id":2 }

kontex → { "result": { "tools": [ ...4 tool definitions... ] } }
```

### Tool: `kontex_remember`

```typescript
{
  name: "kontex_remember",
  description: `Store a memory about this codebase.
  Call when: architectural decision made, non-obvious constraint discovered,
  pattern established, convention confirmed by developer.
  Do NOT call for: routine edits, temporary context, things already in KONTEX.md.`,
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string" },
      type: {
        type: "string",
        enum: ["decision", "pattern", "gotcha", "convention", "resource"]
      },
      why_memorable: {
        type: "string",
        description: "Why this outlives the current session"
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      affected_paths: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["content", "type", "why_memorable", "confidence"]
  }
}
```

### Tool: `kontex_invalidate`

```typescript
{
  name: "kontex_invalidate",
  description: `Mark an existing memory as outdated.
  Call when existing memory is discovered to be wrong.
  Always follow with kontex_remember to store the correction.`,
  inputSchema: {
    type: "object",
    properties: {
      uri: { type: "string" },
      reason: { type: "string" }
    },
    required: ["uri", "reason"]
  }
}
```

### Tool: `kontex_log_decision`

```typescript
{
  name: "kontex_log_decision",
  description: `Log a structured ADR. Call when the developer commits to an
  architectural approach after discussion — not for suggestions, only decisions.`,
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      context: { type: "string" },
      decision: { type: "string" },
      rationale: { type: "string" },
      alternatives: { type: "array", items: { type: "string" } },
      consequences: { type: "string" }
    },
    required: ["title", "context", "decision", "rationale"]
  }
}
```

### Tool: `kontex_find`

```typescript
{
  name: "kontex_find",
  description: `Semantic search across project memory.
  Call before answering architecture or convention questions.
  Do not guess what memory contains — search it.`,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number", default: 5 }
    },
    required: ["query"]
  }
}
```

### Wire format example

```
→ stdin to kontex:
{"jsonrpc":"2.0","method":"tools/call","id":7,
 "params":{"name":"kontex_remember",
           "arguments":{"content":"Orders uses CQRS via @nestjs/cqrs",
                        "type":"decision",
                        "why_memorable":"Affects all orders feature development",
                        "confidence":0.94,
                        "affected_paths":["src/orders/"]}}}

← stdout from kontex:
{"jsonrpc":"2.0","id":7,
 "result":{"content":[{"type":"text",
                        "text":"Written: memory/decisions/cqrs-orders.md (verified: true)"}]}}
```

### System prompt injected into AI sessions

This block is prepended to every AI session via `KONTEX.md`:

```markdown
## Project memory (kontex)

You have access to a persistent memory store for this codebase.

**On session start:** Read KONTEX.md in this workspace before answering
any codebase questions. It contains compiled project context.

**Write proactively, not constantly.** Call kontex_remember only for:
- Architectural decisions that were committed to (not just discussed)
- Non-obvious constraints or gotchas discovered in the code
- Patterns established that apply across the codebase
- Conventions confirmed by the developer

Never call kontex_remember for routine edits or things already in KONTEX.md.

**Correct stale memory immediately.** If KONTEX.md contains something
outdated, call kontex_invalidate on that entry, then kontex_remember with
the correction.

**Search before answering.** For architecture and convention questions,
call kontex_find before responding. Do not reconstruct from code what
memory already knows.
```

---

## 9. Git Hook System

### Installation

```bash
kontex init
# installs .git/hooks/pre-commit, post-commit, and post-merge
# adds to package.json: "scripts": { "prepare": "kontex hooks install" }
# teammates get hooks on: bun install
```

For non-Bun repos, a shell-based installer:

```bash
# In any repo without package.json:
kontex hooks install
# Writes shell scripts directly to .git/hooks/
```

### Pre-commit hook

Runs synchronously. Must complete in under 100ms. Never exits with a non-zero code.

```bash
#!/bin/sh
# .git/hooks/pre-commit

STAGED=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

# Write queue file for post-commit to pick up
# This is a pure Bun script call, fast (<10ms cold start)
bunx kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true

exit 0
```

What `kontex hook pre-commit` does:

1. Reads staged file list
2. Queries `.kontex-index/` for memory entries with overlapping `affected_paths`
3. Writes `.kontex-queue.json`:

```json
{
  "staged_files": ["src/orders/cqrs/handlers.ts"],
  "affected_memories": ["memory/decisions/001-cqrs-orders"],
  "commit_sha_pending": true,
  "timestamp": "2026-03-16T10:30:00Z"
}
```

4. Exits. The commit proceeds.

### Post-commit hook

Runs after the commit is written. Spawns a fully detached background process. The developer's terminal is returned immediately.

```bash
#!/bin/sh
# .git/hooks/post-commit

# Detach completely — developer gets terminal back instantly
nohup bunx kontex hook post-commit \
  --sha "$(git rev-parse HEAD)" \
  --author "$(git log -1 --format='%ae')" \
  > /dev/null 2>&1 &

exit 0
```

What the background `kontex hook post-commit` process does:

```
1. Read .kontex-queue.json
2. Read full diff: git show HEAD --stat + git diff HEAD~1 HEAD
3. If GitHub auth token present:
     Call configured LLM via GitHub Models API (default: Llama 4 Scout)
     Extract: new patterns, implied decisions, stale flags
     Route through quality gate
     Write to .context/memory/sessions/YYYY-MM-DD-{author-hash}.md
4. Run kontex compile → regenerate KONTEX.md
5. Make dedicated kontex commit:
     git add .context/
     git commit --no-verify -m "chore(kontex): update memory [skip ci]"
6. Clean up .kontex-queue.json
7. Write run log to .kontex-log/hooks.log
```

### Post-merge hook

Runs after `git pull` or `git merge`. Recompiles `KONTEX.md` from the newly-received `.context/` files. Rebuilds `.kontex-index/` for any new memory entries not yet embedded.

```bash
#!/bin/sh
# .git/hooks/post-merge
nohup bunx kontex hook post-merge > /dev/null 2>&1 &
exit 0
```

### LLM extraction prompt (post-commit)

```
You are analyzing a git commit to extract knowledge for a persistent
project memory store.

Commit diff:
{diff}

Existing memory context (L0 of all entries):
{existing_l0}

Extract learnings from this commit. For each learning, determine:
- Is this a new architectural decision implied by the code structure?
- Is this a coding pattern being established?
- Is this a non-obvious constraint or gotcha visible in the code?
- Does this commit make any existing memory entry potentially stale?

Return JSON only:
{
  "new_memories": [
    {
      "content": "...",
      "type": "decision|pattern|gotcha|convention",
      "why_memorable": "...",
      "confidence": 0.0-1.0,
      "affected_paths": ["..."]
    }
  ],
  "stale_uris": ["memory/decisions/001-...", ...]
}

If nothing worth persisting is found, return: {"new_memories":[],"stale_uris":[]}
Be conservative. Most commits should return empty new_memories.
```

---

## 10. Quality Gate

Every write to `.context/` passes through all three stages. Order is strict — stage 1 failure prevents stage 2 from running.

### Stage 1 — Secrets scanner

Pattern-based. Runs in-process, no external calls, under 5ms.

Blocked patterns:

```typescript
const SECRET_PATTERNS = [
  /['"]\w{32,}['"]/,                              // generic long token
  /api[_-]?key\s*[:=]\s*['"]?\w+/i,              // api key assignment
  /secret[_-]?key\s*[:=]\s*['"]?\w+/i,           // secret key
  /password\s*[:=]\s*['"]?[^\s'"]{8,}/i,          // password assignment
  /postgres:\/\/[^@]+:[^@]+@/,                    // postgres connection string
  /mysql:\/\/[^@]+:[^@]+@/,                       // mysql connection string
  /mongodb\+srv:\/\/[^@]+:[^@]+@/,               // mongodb connection string
  /sk-[a-zA-Z0-9]{40,}/,                          // OpenAI key
  /ghp_[a-zA-Z0-9]{36}/,                          // GitHub personal token
  /AKIA[A-Z0-9]{16}/,                             // AWS access key
]
```

On detection: write is blocked, error returned to caller with the matched pattern name (not the matched value). Write is logged to `.kontex-log/security.log`.

### Stage 2 — Dedup and contradiction

```typescript
async function dedupCheck(incoming: string): Promise<DedupResult> {
  const embedding = await embed(incoming)

  const similar = db.prepare(`
    SELECT uri, content, verified, confidence,
           1 - (embedding <-> ?) AS similarity
    FROM memories
    ORDER BY embedding <-> ?
    LIMIT 5
  `).all(embedding, embedding)

  const top = similar[0]

  if (!top) return { status: 'clear' }

  // Exact duplicate
  if (top.similarity > 0.92) {
    return { status: 'duplicate', existing_uri: top.uri }
  }

  // Potential contradiction — same topic, conflicting claim
  if (top.similarity > 0.75) {
    return {
      status: 'conflict',
      existing_uri: top.uri,
      existing_content: top.content,
      message: `Similar memory exists at ${top.uri}. If this supersedes it, call kontex_invalidate first.`
    }
  }

  return { status: 'clear' }
}
```

### Stage 3 — Confidence routing

| Confidence | Verified | Action |
|---|---|---|
| ≥ 0.85 | `true` | Write immediately |
| 0.60 – 0.84 | `false` | Write, deprioritised in compile |
| < 0.60 | — | Discard silently |

Unverified entries (`verified: false`):
- Are included in `kontex_find` results with a lower relevance boost
- Are excluded from L1 loading in `KONTEX.md` until verified
- Auto-promote to `verified: true` after `ref_count >= 3`
- Auto-expire after 30 days if `ref_count == 0`

---

## 11. KONTEX.md Compilation

`kontex compile` produces `KONTEX.md` from the `.context/` store. This file is the primary interface between the memory store and the AI assistant.

### Algorithm

```typescript
async function compile(workspaceRoot: string, config: Config): Promise<void> {
  const recentFiles = getRecentlyModifiedFiles(workspaceRoot, 7) // git log
  const allEntries = loadAllEntries(workspaceRoot)

  let tokenCount = 0
  const sections: string[] = []

  // Always include: system prompt block
  const systemPrompt = buildSystemPrompt()
  sections.push(systemPrompt)
  tokenCount += estimateTokens(systemPrompt)

  // Always include: L0 of all verified entries
  const l0Section = buildL0Index(allEntries.filter(e => e.verified))
  sections.push(l0Section)
  tokenCount += estimateTokens(l0Section)

  // Include L1 of relevant entries (relevance = path overlap + recency + global flag)
  const relevant = allEntries
    .filter(e => e.verified)
    .filter(e => e.global || isRecentlyTouched(e, recentFiles) || isRecentlyCreated(e, 7))
    .sort((a, b) => b.ref_count - a.ref_count) // highest-used first

  for (const entry of relevant) {
    const l1 = extractL1(entry)
    const tokens = estimateTokens(l1)

    if (tokenCount + tokens > config.compile.tokenBudget) break

    sections.push(l1)
    tokenCount += tokens
  }

  // Footer: list L2-only entries available via kontex_find
  const l2Available = allEntries.filter(e => !sections.some(s => s.includes(e.uri)))
  if (l2Available.length > 0) {
    sections.push(buildL2Footer(l2Available))
  }

  const output = sections.join('\n\n---\n\n')
  fs.writeFileSync(path.join(workspaceRoot, '.context', 'KONTEX.md'), output)
}
```

### Output structure

```markdown
## Project memory (kontex)
[system prompt — AI instructions for using memory tools]

---

## Memory index (L0)
- `memory/decisions/001-cqrs-orders` — Orders uses CQRS via @nestjs/cqrs. Decision: 2026-01-14.
- `memory/decisions/002-postgres` — PostgreSQL over MongoDB. JSONB for flexible fields.
- `memory/skills/testing-patterns` — Tests use jest + supertest. No mocking of DB layer.
[... all verified entries as one-liners ...]

---

## Active context (L1)
[full L1 sections for recently-touched entries]

---

## Available detail
The following entries have full detail accessible via kontex_find:
- `memory/decisions/001-cqrs-orders` — search "CQRS orders event sourcing"
- `memory/sessions/2026-03-10-alice` — search "March 10 payments integration"
```

---

## 12. Configuration

`kontex.config.json` is created by `kontex init` in the workspace root. All values have sensible defaults — a developer who never edits this file gets a working setup. The only required step before configuration is `kontex login`.

```json
{
  "compile": {
    "tokenBudget": 3000,
    "alwaysInclude": ["memory/project.md"],
    "excludePaths": ["memory/sessions/archive/"]
  },
  "embedding": {
    "provider": "local",
    "model": "Xenova/all-MiniLM-L6-v2"
  },
  "llm": {
    "provider": "github-models",
    "model": "meta-llama/Llama-4-Scout-17B-16E-Instruct"
  },
  "quality": {
    "minConfidence": 0.60,
    "autoVerifyThreshold": 0.85,
    "deduplicateThreshold": 0.92,
    "contradictionThreshold": 0.75
  },
  "hooks": {
    "postCommitExtract": true,
    "postMergeRecompile": true,
    "maxBackgroundRetries": 2
  },
  "secrets": {
    "scan": true,
    "extraPatterns": []
  },
  "decay": {
    "sessionArchiveDays": 7,
    "unverifiedExpireDays": 30,
    "maxSessionsDirKB": 500
  }
}
```

No `apiKey` field — auth is handled via `kontex login` using GitHub OAuth. The token is stored in the OS keychain, never in the config file, never in git.

### Embedding providers

| Provider | Default | Network required | Notes |
|---|---|---|---|
| `local` | Yes | No (after first download) | `all-MiniLM-L6-v2`, 23MB, cached in `~/.cache/kontex/` |
| `ollama` | No | No (local server) | For teams requiring fully offline operation |

### LLM providers

| Provider | Default model | Auth | Notes |
|---|---|---|---|
| `github-models` | `meta-llama/Llama-4-Scout-17B-16E-Instruct` | `kontex login` (GitHub OAuth) | **Default** — free tier, no API key |
| `github-models` | `openai/gpt-4o-mini` | `kontex login` | Stronger summaries, same auth |
| `github-models` | `openai/gpt-4.1-mini` | `kontex login` | Best quality on GitHub Models |
| `ollama` | `llama3.2:3b` | None | Fully offline, lower quality |
| `openai` | `gpt-4o-mini` | `apiKey` in config | Bring your own key |
| `anthropic` | `claude-haiku-4-5` | `apiKey` in config | Bring your own key |
| `none` | — | None | Disables LLM extraction entirely |

**Switching models** — edit `kontex.config.json` only:

```json
{
  "llm": {
    "provider": "github-models",
    "model": "openai/gpt-4.1-mini"
  }
}
```

No re-authentication needed — all `github-models` variants use the same GitHub OAuth token from `kontex login`.

**Bring your own key** — for teams who want to use a specific provider outside GitHub Models:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

Setting `provider: "none"` is the correct choice for teams that cannot send code to any external API. kontex still functions — hooks run, compile runs, MCP tools work — but post-commit LLM extraction is skipped.

---

## 13. CLI Reference

### `kontex login`

```
kontex login

What it does:
  Authenticates kontex with GitHub using the OAuth Device Flow.
  Opens a browser window automatically.

  1. Contacts GitHub to generate a one-time device code
  2. Displays the code and opens github.com/login/device in the browser
  3. Developer pastes the code and clicks Authorize
  4. Token is stored in the OS keychain — never in files, never in git
  5. All subsequent LLM calls use this token via GitHub Models API

Example output:
  Visit: https://github.com/login/device
  Code:  ABCD-1234

  Waiting for authorization...
  ✓ Authenticated as @username
  ✓ GitHub Models access confirmed

Notes:
  - Run once per machine, not per project
  - Token never expires unless revoked at github.com/settings/applications
  - Re-run to switch GitHub accounts
  - kontex init prompts this automatically if no token is found
```

### `kontex logout`

```
kontex logout

Removes the GitHub OAuth token from the OS keychain.
Does not affect .context/ or any project files.
```

### `kontex init`

```
kontex init [options]

Options:
  --ai          Run LLM extraction pass to generate initial memory
  --no-hooks    Skip git hook installation
  --force       Re-run init even if .context/ already exists

What it does:
  1. Checks for GitHub auth token — runs kontex login flow if missing
  2. Scans project structure (package.json, README, git log, folder layout)
  3. Creates .context/ folder structure
  4. Writes kontex.config.json with detected stack
  5. Installs git hooks (pre-commit, post-commit, post-merge)
  6. Adds prepare script to package.json (if present)
  7. Downloads embedding model (first time only, ~23MB, cached globally)
  8. Runs kontex compile to generate initial KONTEX.md
  9. Auto-registers in Claude Code / Cursor / Zed / Windsurf configs
  10. Adds .kontex-index/ to .gitignore
```

### `kontex compile`

```
kontex compile [options]

Options:
  --budget <tokens>    Override token budget for this run

What it does:
  Regenerates .context/KONTEX.md from current .context/ store.
  Uses git log to determine recently-modified files for L1 relevance.
  Respects tokenBudget from kontex.config.json.
```

### `kontex find <query>`

```
kontex find "CQRS orders event sourcing"

Options:
  --limit <n>    Number of results (default: 5)
  --tier <tier>  Filter by tier: l0 | l1 | l2

What it does:
  Semantic search across all .context/ entries.
  Returns ranked results with similarity scores.
  Rebuilds .kontex-index/ if out of sync.
```

### `kontex status`

```
kontex status

Output:
  Auth: @username (GitHub · token valid)
  Memory entries: 47 (42 verified, 5 unverified)
  Decisions: 12 | Patterns: 8 | Gotchas: 6 | Conventions: 15 | Resources: 6
  KONTEX.md: compiled 2 hours ago (3 entries active, 44 in index)
  LLM: github-models / meta-llama/Llama-4-Scout-17B-16E-Instruct
  Index: in sync
  Sessions dir: 124KB / 500KB
  Last hook: post-commit 14 minutes ago
  Warnings: none
```

### `kontex audit`

```
kontex audit

Interactive. Shows:
  - Stale entries (affected_paths no longer exist)
  - Unverified entries older than 14 days with ref_count = 0
  - Entries pending promotion (ref_count >= 3, still unverified)

Actions per entry:
  [d] delete   [p] promote   [k] keep   [v] view full content
```

### `kontex daemon`

```
kontex daemon [start|stop|status]

Starts the background compression daemon.
Installed as a cron job by kontex init.
Runs weekly. Also runs immediately if sessions/ exceeds 500KB.
```

### `kontex hooks install`

```
kontex hooks install

Installs pre-commit, post-commit, and post-merge hooks into .git/hooks/.
Safe to run in any git repo regardless of language/framework.
```

### `kontex mcp`

```
kontex mcp

Starts the MCP server on stdio.
Not meant to be run manually — spawned by AI tools via their MCP config.
```

---

## 14. Tech Stack

### Runtime
- **Bun >= 1.1** — single runtime for all packages. Chosen over Node.js specifically because the IDE extension is scrapped — the original constraint forcing Node.js is gone. Bun cold-starts in ~5ms vs Node's ~80ms, which matters directly on every git commit where the pre-commit hook runs. `bun:sqlite`, `Bun.watch`, and `bun test` are built-in, eliminating `better-sqlite3`, `chokidar`, and `vitest` as dependencies entirely.

### Core packages

| Package | Purpose |
|---|---|
| `@modelcontextprotocol/sdk` | MCP server protocol implementation |
| `bun:sqlite` | Built-in SQLite driver — zero config, no native compilation |
| `sqlite-vec` | Vector similarity extension for SQLite (C extension, pre-built binaries per platform) |
| `@xenova/transformers` | Local embedding model (all-MiniLM-L6-v2) |
| `ai` (Vercel AI SDK) | Provider-agnostic LLM calls — GitHub Models, OpenAI, Anthropic, Ollama |
| `@ai-sdk/openai` | OpenAI-compatible provider — used for GitHub Models API (same interface) |
| `@octokit/oauth-device` | GitHub OAuth Device Flow implementation |
| `keytar` | OS keychain access (macOS Keychain, Windows Credential Manager, libsecret on Linux) |
| `commander` | CLI argument parsing |
| `gray-matter` | YAML frontmatter parsing for memory files |
| `tiktoken` | Token counting for compile budget |

Dropped vs previous Node.js stack: `better-sqlite3`, `chokidar`, `tsx`, `tsup`, `vitest` — all replaced by Bun built-ins.

### Build tooling

| Tool | Purpose |
|---|---|
| `bun build` | TypeScript bundler — built-in, replaces tsup/esbuild |
| `bun test` | Test runner — built-in, replaces vitest |
| `bun compile` | Produces single self-contained binary for CLI distribution |
| `turborepo` | Monorepo build orchestration (works natively with Bun workspaces) |
| `changesets` | Versioning and changelog |

### Workspace management

Bun workspaces replace `pnpm-workspace.yaml`. The root `package.json` declares workspaces:

```json
{
  "workspaces": ["packages/*"]
}
```

`bun install` across the whole monorepo runs 10–25x faster than npm/pnpm. Turborepo still handles the build graph — Bun workspaces and Turborepo are complementary.

### Why these choices

**Bun over Node.js** — the IDE extension is gone, so the VS Code extension host constraint (hardcoded Node.js) no longer exists. Bun's ~5ms cold start vs Node's ~80ms is a real win specifically for git hooks that run on every commit. Built-in SQLite, file watcher, and test runner reduce the dependency surface by 5 packages.

**`bun:sqlite` over `better-sqlite3`** — `better-sqlite3` is a native C++ addon that must compile per platform. On CI, Alpine Linux, and new machines it frequently breaks. `bun:sqlite` is built into the runtime — zero compilation, zero platform headaches.

**`Bun.watch` over `chokidar`** — built-in, same API surface, one fewer dependency.

**`bun test` over `vitest`** — built-in, Jest-compatible API, no config needed.

**`bun compile` for CLI distribution** — produces a single self-contained executable with Bun bundled inside. Developers on machines without Bun can still run `kontex` as a binary.

**`sqlite-vec` still required** — this is a C extension regardless of runtime. Pre-built binaries are shipped for macOS (Intel + ARM), Linux (x64 + ARM64), and Windows (x64). Loaded via `db.loadExtension()` on `bun:sqlite`.

**GitHub Models as default LLM provider** — every developer who uses any AI coding tool has a GitHub account. The OAuth Device Flow (`@octokit/oauth-device`) is the same browser-redirect flow developers have seen in VS Code, Zed, and Cursor. No new account, no credit card, no API key. GitHub Models gives free tier access to Llama 4 Scout and other models under the same auth.

**Llama 4 Scout as default model** — 2,600 tokens/second, 10M context window, strong on code analysis tasks, cheapest option on GitHub Models at $0.11/$0.34 per 1M tokens. Fast enough for the post-commit background process to complete before the developer pushes. Developers who want stronger summaries can switch to `openai/gpt-4.1-mini` in config — same GitHub OAuth auth, no extra steps.

**`@octokit/oauth-device`** — GitHub's official OAuth Device Flow library. Handles the full flow: device code request, browser open, polling, token exchange. Battle-tested across thousands of developer tools.

**`keytar`** — stores the GitHub OAuth token in the OS native keychain (macOS Keychain, Windows Credential Manager, libsecret on Linux). The token never touches disk as a plaintext file, never enters the project directory, never gets committed.

**Vercel AI SDK** — unified interface over GitHub Models, OpenAI, Anthropic, Ollama. GitHub Models uses the OpenAI-compatible API format, so `@ai-sdk/openai` with a custom `baseURL` handles it natively. Swapping providers is a config change, not a code change.

---

## 15. Monorepo Structure

```
kontex/
├── packages/
│   ├── kontex-core/
│   │   ├── src/
│   │   │   ├── mcp/
│   │   │   │   ├── server.ts       # MCP server bootstrap
│   │   │   │   ├── tools.ts        # tool definitions
│   │   │   │   └── handlers.ts     # tool call implementations
│   │   │   ├── memory/
│   │   │   │   ├── write.ts        # quality gate + write
│   │   │   │   ├── read.ts         # kontex_find semantic search
│   │   │   │   ├── compile.ts      # KONTEX.md generation
│   │   │   │   └── decay.ts        # compression + stale detection
│   │   │   ├── hooks/
│   │   │   │   ├── pre-commit.ts   # pre-commit handler
│   │   │   │   └── post-commit.ts  # post-commit background process
│   │   │   ├── storage/
│   │   │   │   ├── db.ts           # SQLite + sqlite-vec setup
│   │   │   │   ├── embeddings.ts   # transformers.js wrapper
│   │   │   │   └── migrations/
│   │   │   ├── init.ts             # kontex init logic
│   │   │   ├── auth.ts             # GitHub OAuth device flow + keychain
│   │   │   ├── compile.ts          # KONTEX.md compiler
│   │   │   ├── secrets.ts          # credential scanner
│   │   │   ├── watcher.ts          # Bun.watch watcher
│   │   │   └── config.ts           # config loading
│   │   ├── test/
│   │   │   ├── fixtures/
│   │   │   │   └── mock-llm.ts     # deterministic LLM mock
│   │   │   ├── memory/
│   │   │   ├── hooks/
│   │   │   └── mcp/
│   │   └── package.json
│   │
│   └── kontex-cli/
│       ├── src/
│       │   ├── index.ts
│       │   └── commands/
│       │       ├── login.ts
│       │       ├── logout.ts
│       │       ├── init.ts
│       │       ├── compile.ts
│       │       ├── find.ts
│       │       ├── status.ts
│       │       ├── audit.ts
│       │       ├── daemon.ts
│       │       ├── hooks.ts
│       │       └── mcp.ts
│       └── package.json
│
├── hooks/
│   ├── pre-commit.sh           # shell fallback for repos without Bun
│   ├── post-commit.sh
│   └── post-merge.sh
│
├── turbo.json
├── package.json                # root workspace (Bun workspaces)
├── bunfig.toml                 # Bun config
├── tsconfig.base.json
└── .changeset/
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Branching strategy

```
main          always releasable, protected
dev           integration branch — PRs merge here first
feat/*        feature branches → PR into dev
fix/*         bug fixes → PR directly into main
```

### Commit convention

```
feat(core): add kontex_invalidate MCP tool
feat(hooks): post-commit background extraction
fix(compile): token budget off-by-one on L1 inclusion
fix(secrets): false positive on JWT bearer tokens
docs: add MCP wire format examples
chore(deps): bump @modelcontextprotocol/sdk to 1.3.0
test(quality): add contradiction detection fixtures
```

---

## 16. Security

### Secrets scanning

Every write to `.context/` is scanned for credential patterns before storage. The scanner runs synchronously as Stage 1 of the quality gate. There is no bypass.

Custom patterns can be added via `kontex.config.json`:

```json
{
  "secrets": {
    "extraPatterns": [
      "COMPANY_INTERNAL_TOKEN_[A-Z0-9]{32}"
    ]
  }
}
```

### What kontex sends to external APIs

When `llm.provider` is not `none`, the post-commit background process sends to GitHub Models API:

1. The git diff of the committed files (code content)
2. The L0 index of existing memory entries (project context)

**kontex never sends:** file contents outside the diff, environment variables, contents of `.env` files, or secrets (blocked by scanner).

GitHub Models API is operated by Microsoft/GitHub. Data handling is governed by GitHub's privacy policy. For teams that cannot send any code to external APIs: set `llm.provider: "none"`. All other features continue to work.

### Auth token storage

The GitHub OAuth token obtained via `kontex login` is stored exclusively in the OS native keychain — macOS Keychain, Windows Credential Manager, or libsecret on Linux. It is never written to disk as plaintext, never placed in the project directory, and never committed to git. It can be revoked at any time at `github.com/settings/applications`.

### `.kontex-index/` and gitignore

The vector index contains embeddings of memory content — mathematical representations that can theoretically be used to reconstruct approximate original text. This file is always gitignored. It never leaves the developer's local machine.

---

## 17. Caveats & Known Limitations

### `sqlite-vec` native extension compatibility

`sqlite-vec` is a C extension loaded into SQLite via `db.loadExtension()`. Pre-built binaries are shipped for macOS (Intel + ARM), Linux (x64 + ARM64), and Windows (x64). Alpine Linux and other musl-based systems require building from source. CI/CD environments without the correct binary will fall back to exact-match search (no semantic similarity) until the index is rebuilt on a compatible machine.

### GitHub Models rate limits

GitHub Models enforces a hard 8,000 token input limit per request regardless of the model's actual context window. Large diffs (600+ lines) are truncated before being sent. Only the first 8,000 tokens of a diff are analysed — for large refactoring commits, some extractable knowledge may be missed. Mitigation: smaller, more focused commits produce better memory extraction.

The free tier allows 150 requests per day for most models. A developer making 20 commits per day uses 20 requests — well within limits. If a team's usage exceeds the free tier, switching to `provider: "openai"` with a bring-your-own key avoids the limit entirely.

### GitHub Models availability by region

GitHub Models availability depends on account entitlement and region. Developers in regions where GitHub Models is not yet available should switch to `provider: "ollama"` for local operation or `provider: "openai"` with their own key.

### Context quality with Llama 4 Scout

Scout is fast and capable for code analysis but generates slightly weaker L0/L1 prose summaries compared to GPT-4.1-mini or Claude Haiku. For teams where summary quality matters, switching to `openai/gpt-4.1-mini` in `kontex.config.json` uses the same GitHub OAuth auth with no extra steps. Quality difference is minor — most developers won't notice.

### Merge conflicts on `memory/project.md`

While session files never conflict (author-namespaced), `memory/project.md` and `memory/decisions/*.md` can have git merge conflicts if two developers edit them simultaneously. kontex documents the convention (these files should be PRed, not directly committed) but does not enforce it technically. A future version may add a merge driver.

### First-run embedding model download

The first `kontex init` downloads the `all-MiniLM-L6-v2` embedding model (23MB) to `~/.cache/kontex/models/`. This requires an internet connection on first setup. Subsequent runs use the cached model — the download never happens again. The model is shared across all projects on the machine. Corporate networks with strict egress policies may need to whitelist `huggingface.co` or use `provider: "ollama"` instead.

### Token budget does not account for AI tool overhead

The `tokenBudget` in `kontex.config.json` controls the size of `KONTEX.md` only. The AI tool adds its own system prompt, conversation history, and tool definitions on top. On tools with tight context windows, the effective budget for `KONTEX.md` may be lower than configured. Recommended starting value: 2500 tokens on older models, 3000 on models with 128k+ context windows.

---

## 18. Roadmap

### v1.0 — Memory (current spec)

- [ ] `kontex login` — GitHub OAuth Device Flow authentication
- [ ] GitHub Models API integration (Llama 4 Scout default)
- [ ] OS keychain token storage via `keytar`
- [ ] MCP server with 4 tools
- [ ] Pre-commit hook (sync, <100ms, never blocks)
- [ ] Post-commit hook (async background extraction)
- [ ] Post-merge hook (recompile on pull)
- [ ] Quality gate (secrets + dedup + confidence)
- [ ] Tiered memory (L0 / L1 / L2)
- [ ] KONTEX.md compiler with token budget
- [ ] Local embeddings via transformers.js
- [ ] Shadow comment parser (Copilot fallback)
- [ ] Decay and compression daemon
- [ ] `kontex init`, `kontex compile`, `kontex find`, `kontex status`, `kontex audit`
- [ ] Auto-registration in Claude Code / Cursor / Zed / Windsurf
- [ ] Shell fallback hooks for non-Bun repos
- [ ] Conflict-free team writes (author-namespaced sessions)
- [ ] Open spec published at `kontexspec.dev`

### v2.0 — Policy

- [ ] `policy.yaml` — declarative rules for what AI can/cannot do per repo
- [ ] Per-branch context isolation (`feature/payments` gets scoped memory)
- [ ] `kontex diff` — what changed in `.context/` since last release
- [ ] Monorepo support (scoped `.context/` per package)
- [ ] `kontex merge-context` — promote branch memory to main on PR merge
- [ ] Stale entry PR annotations ("this decision may be outdated")

### v3.0 — Orchestration

- [ ] `registry.yaml` — cross-repo context indexing
- [ ] Agent manifests — define agent capabilities per repo
- [ ] Permissions layer — scope what each agent can read/write
- [ ] `kontex audit` web UI
- [ ] Team analytics — which memories are most referenced, which decay fastest
- [ ] JetBrains MCP integration

---

*kontex is MIT licensed. The `.context/` folder specification is CC0 — no rights reserved. Any tool may implement it.*
