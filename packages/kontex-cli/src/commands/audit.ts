import type { Command } from "commander";
import { loadAllEntries } from "kontex-core";
import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline";

export function registerAuditCommand(program: Command): void {
  program.command("audit").description("Interactive review of stale and unverified entries").action(async () => {
    try {
      const cwd = process.cwd();
      const entries = loadAllEntries(cwd);
      const stale = entries.filter((e) => e.stale);
      const unverified = entries.filter((e) => !e.verified && !e.stale);

      if (stale.length === 0 && unverified.length === 0) { console.log("✓ Memory store is healthy."); return; }

      console.log(`\nkontex audit\n`);
      if (stale.length > 0) console.log(`⚠  ${stale.length} stale entries`);
      if (unverified.length > 0) console.log(`○  ${unverified.length} unverified entries`);
      console.log("\n---\n");

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

      for (const entry of stale) {
        console.log(`\n⚠ STALE: ${entry.uri} (${entry.type})`);
        console.log(`  ${entry.l0 || entry.content.slice(0, 100)}`);
        const action = await ask("  [d]elete  [k]eep  [v]iew  > ");
        if (action === "d") {
          if ((await ask("  Confirm? (y/n) > ")) === "y") {
            try { unlinkSync(join(cwd, ".context", `${entry.uri}.md`)); console.log("  ✓ Deleted"); } catch { console.log("  ✗ Not found"); }
          }
        } else if (action === "v") {
          try { console.log("\n" + readFileSync(join(cwd, ".context", `${entry.uri}.md`), "utf-8")); } catch { console.log("  ✗ Not found"); }
        }
      }

      for (const entry of unverified) {
        console.log(`\n○ UNVERIFIED: ${entry.uri} (${entry.type}, refs: ${entry.ref_count})`);
        console.log(`  ${entry.l0 || entry.content.slice(0, 100)}`);
        const action = await ask("  [d]elete  [p]romote  [k]eep  > ");
        if (action === "d") {
          if ((await ask("  Confirm? (y/n) > ")) === "y") {
            try { unlinkSync(join(cwd, ".context", `${entry.uri}.md`)); console.log("  ✓ Deleted"); } catch { console.log("  ✗ Not found"); }
          }
        } else if (action === "p") {
          try {
            const { default: matter } = await import("gray-matter");
            const filePath = join(cwd, ".context", `${entry.uri}.md`);
            const parsed = matter(readFileSync(filePath, "utf-8"));
            parsed.data.verified = true; parsed.data.updated = new Date().toISOString();
            const { writeFileSync } = await import("node:fs");
            writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), "utf-8");
            console.log("  ✓ Promoted");
          } catch { console.log("  ✗ Failed"); }
        }
      }
      rl.close();
      console.log("\n✓ Audit complete.\n");
    } catch (e) { console.error("Audit failed:", e instanceof Error ? e.message : e); process.exit(1); }
  });
}
