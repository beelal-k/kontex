# kontex

**Persistent, git-native memory for AI-assisted development.**

kontex is a local, privacy-first command-line tool and Model Context Protocol (MCP) server that gives AI coding assistants (like Cursor, Claude Code, and Windsurf) long-term memory about your project's architecture, conventions, and decisions.

Memory is stored as Markdown files in your repository (`.context/memory/`), version-controlled with your code, and intelligently surfaced to the AI exactly when needed.

## Features

- **🧠 Persistent Memory**: AI assistants can permanently remember architectural decisions, gotchas, and patterns.
- **🔍 Semantic Search**: Uses local embeddings (`all-MiniLM-L6-v2`) and SQLite vector search to instantly find relevant context.
- **🛡️ Quality Gate**: Built-in secrets scanner blocks API keys and passwords from ever entering memory. Deduplication prevents conflicting rules.
- **⚡ Git Integration**: Hooks into `commit` and `merge` to stay in sync with your codebase.
- **🤖 Auto-Extraction**: Optionally runs LLMs in the background on every commit to proactively extract and record new learnings.
- **🔌 MCP Native**: Exposes 4 powerful tools (`kontex_remember`, `kontex_invalidate`, `kontex_log_decision`, `kontex_find`) directly to any MCP-compatible AI.

## Installation & Setup

kontex is built with [Bun](https://bun.sh/).

1. **Install dependencies and build**
   ```bash
   bun install
   bun run build
   ```

2. **Initialize in your project**
   Navigate to any git repository and run:
   ```bash
   bunx kontex init
   ```
   This will:
   - Scaffold the `.context/` memory directory
   - Install git hooks (`pre-commit`, `post-commit`, `post-merge`)
   - Create `kontex.config.json`
   - Download the local embedding model (first time only)
   - Auto-register the MCP server with Claude Code, Cursor, and Windsurf

3. **Authenticate (Optional but recommended)**
   If you want kontex to automatically extract learnings from your commits in the background, you'll need to authenticate with GitHub (this uses free GitHub Models inference):
   ```bash
   bunx kontex login
   ```

## Configuration

Settings are stored in `kontex.config.json` at the root of your project workspace.

```json
{
  "llm": {
    "provider": "github-models", // or "openai", "ollama", "none"
    "model": "meta-llama/Llama-4-Scout-17B-16E-Instruct"
  },
  "hooks": {
    "postCommitExtract": true,   // Disable to turn off background AI inference
    "postMergeRecompile": true
  },
  "compile": {
    "tokenBudget": 3000          // Max tokens injected into the active prompt
  }
}
```

## How It Works

1. **The AI Learns**: During a session, the AI spots a new convention or makes an architectural decision. It calls `kontex_remember` (via MCP).
2. **Quality Gate**: kontex scans the memory for secrets, deduplicates it against existing memories, and saves it as a Markdown file in `.context/memory/`.
3. **Compilation**: Before every commit, kontex compiles all active memories into a single highly-optimized `KONTEX.md` file using a token-budget algorithm.
4. **Context Injection**: Your AI assistant reads `KONTEX.md` to instantly know the most relevant context for the files you are working on.

## CLI Commands

- `kontex init` — Initialize kontex in a project
- `kontex login` / `kontex logout` — Manage auth (uses macOS/Windows Keychain via `keytar`)
- `kontex status` — View the health of your memory store
- `kontex audit` — Interactive CLI to clean up outdated or unverified memories
- `kontex find <query>` — Semantic search from the terminal
- `kontex compile` — Manually regenerate `KONTEX.md`
- `kontex daemon start` — Run the weekly background compression maintenance task

## Directory Structure

```text
.context/
├── KONTEX.md               # The compiled, token-optimized context file read by AI
└── memory/
    ├── project.md          # Global project resource rules
    ├── conventions/        # Naming conventions, formatting specs
    ├── decisions/          # Architectural Decision Records (ADRs)
    ├── gotchas/            # Non-obvious traps and bug fixes
    ├── patterns/           # Reusable code patterns
    └── sessions/           # Auto-extracted daily commit learnings
```

## Security & Privacy

kontex runs entirely locally. Embeddings are generated entirely on your machine via Transformers.js. The only network calls made are:
1. `kontex login` (GitHub OAuth)
2. Post-commit background extraction (via GitHub Models or OpenAI, if enabled). If you use `ollama`, 100% of the stack is fully local.

No code is ever uploaded to a centralized server by kontex itself.

## License

MIT
