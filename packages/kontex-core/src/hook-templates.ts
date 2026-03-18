/**
 * Git hook shell script templates — single source of truth.
 *
 * Both `kontex init` (in init.ts) and `kontex hooks install` (in the CLI)
 * reference these templates so the installed hooks are always identical.
 */

/**
 * Generates the three git hook scripts that kontex installs.
 * Priority: bunx first (works in any project with bun), then kontex binary.
 */
export const HOOK_TEMPLATES: Record<string, string> = {
  "pre-commit": [
    "#!/bin/sh",
    '# kontex pre-commit hook — reads staged files, writes queue, runs compile.',
    '# Never blocks the commit.',
    'STAGED=$(git diff --cached --name-only 2>/dev/null)',
    'if [ -z "$STAGED" ]; then exit 0; fi',
    'if command -v bunx >/dev/null 2>&1; then',
    '  bunx kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true',
    'elif command -v kontex >/dev/null 2>&1; then',
    '  kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true',
    'fi',
    'exit 0',
  ].join("\n"),

  "post-commit": [
    "#!/bin/sh",
    '# kontex post-commit hook — spawns background LLM extraction.',
    'SHA=$(git rev-parse HEAD 2>/dev/null)',
    'AUTHOR=$(git log -1 --format=\'%ae\' 2>/dev/null)',
    'if [ -z "$SHA" ]; then exit 0; fi',
    'if command -v bunx >/dev/null 2>&1; then',
    '  nohup bunx kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &',
    'elif command -v kontex >/dev/null 2>&1; then',
    '  nohup kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &',
    'fi',
    'exit 0',
  ].join("\n"),

  "post-merge": [
    "#!/bin/sh",
    '# kontex post-merge hook — recompiles KONTEX.md after pull/merge.',
    'if command -v bunx >/dev/null 2>&1; then',
    '  nohup bunx kontex hook post-merge > /dev/null 2>&1 &',
    'elif command -v kontex >/dev/null 2>&1; then',
    '  nohup kontex hook post-merge > /dev/null 2>&1 &',
    'fi',
    'exit 0',
  ].join("\n"),
};
