import type { Command } from "commander";
import { loadConfig, loadAllEntries, isAuthenticated } from "kontex-core";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function registerStatusCommand(program: Command): void {
  program.command("status").description("Show memory store health").action(async () => {
    try {
      const cwd = process.cwd();
      const config = loadConfig(cwd);
      const entries = loadAllEntries(cwd);

      console.log(`Auth: ${(await isAuthenticated()) ? "authenticated" : "not authenticated — run \`kontex login\`"}`);
      const verified = entries.filter((e) => e.verified);
      console.log(`Memory entries: ${entries.length} (${verified.length} verified, ${entries.length - verified.length} unverified)`);

      const types = new Map<string, number>();
      for (const e of entries) types.set(e.type, (types.get(e.type) ?? 0) + 1);
      if (types.size) console.log(`Types: ${[...types.entries()].map(([t, c]) => `${t}: ${c}`).join(" | ")}`);

      const customMd = join(cwd, ".context", "KONTEX.md");
      if (existsSync(customMd)) { const s = statSync(customMd); console.log(`KONTEX.md: compiled ${timeSince(s.mtime)}`); }
      else console.log("KONTEX.md: not found — run `kontex compile`");

      console.log(`LLM: ${config.llm.provider} / ${config.llm.model}`);

      const stale = entries.filter((e) => e.stale);
      if (stale.length > 0) console.log(`\n⚠ ${stale.length} stale entries — run \`kontex audit\``);
    } catch (e) { console.error("Status failed:", e instanceof Error ? e.message : e); process.exit(1); }
  });
}

function timeSince(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
