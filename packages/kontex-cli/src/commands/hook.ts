import type { Command } from "commander";
import { handlePreCommit, handlePostCommit } from "kontex-core";

export function registerHookCommand(program: Command): void {
  const hookCmd = program.command("hook").description("Internal: called by git hooks");

  hookCmd.command("pre-commit").option("--staged <files>", "Staged files").action(async (opts) => {
    try { await handlePreCommit(opts.staged ?? "", process.cwd()); } catch { /* never fail */ }
  });

  hookCmd.command("post-commit").option("--sha <sha>", "Commit SHA").option("--author <email>", "Author").action(async (opts) => {
    try { await handlePostCommit(opts.sha ?? "", opts.author ?? "", process.cwd()); } catch { /* background */ }
  });

  hookCmd.command("post-merge").action(async () => {
    try { const { handlePostMerge } = await import("kontex-core"); await handlePostMerge(process.cwd()); } catch { /* background */ }
  });
}
