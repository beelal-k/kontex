/**
 * File watcher — monitors `.context/` for changes and triggers recompilation.
 */

import { watch } from "node:fs";
import { join } from "node:path";
import { compile } from "./memory/compile.js";
import { loadConfig } from "./config.js";
import { processShadowComments } from "./shadow.js";

export function startWatcher(workspaceRoot: string): () => void {
  const contextDir = join(workspaceRoot, ".context");
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let shadowTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = watch(contextDir, { recursive: true }, (eventType, filename) => {
    if (filename === "shadow.jsonl" || filename?.endsWith("shadow.jsonl")) {
      if (shadowTimer) clearTimeout(shadowTimer);
      shadowTimer = setTimeout(async () => {
        try { await processShadowComments(workspaceRoot); } catch { /* ignore */ }
      }, 500);
      return;
    }

    if (filename === "KONTEX.md" || filename?.endsWith("KONTEX.md") || filename?.includes(".kontex-index")) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try { await compile(workspaceRoot, loadConfig(workspaceRoot)); } catch { /* retry on next change */ }
    }, 500);
  });

  return () => { 
    if (debounceTimer) clearTimeout(debounceTimer); 
    if (shadowTimer) clearTimeout(shadowTimer);
    watcher.close(); 
  };
}
