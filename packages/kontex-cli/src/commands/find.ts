import type { Command } from "commander";
import { findMemories } from "kontex-core";

export function registerFindCommand(program: Command): void {
  program.command("find <query>").description("Semantic search across memory")
    .option("--limit <n>", "Number of results", parseInt, 5)
    .action(async (query: string, opts) => {
      try {
        const results = await findMemories(query, opts.limit, process.cwd());
        if (results.length === 0) { console.log("No matching memories found."); return; }
        console.log(`\nFound ${results.length} result(s):\n`);
        for (const [i, r] of results.entries()) {
          console.log(`${i + 1}. ${r.verified ? "✓" : "○"} ${r.uri} (${r.type}, similarity: ${r.similarity.toFixed(2)})`);
          console.log(`   ${r.content.slice(0, 150).replace(/\n/g, " ")}\n`);
        }
      } catch (e) { console.error("Search failed:", e instanceof Error ? e.message : e); process.exit(1); }
    });
}
