#!/bin/sh
# kontex pre-commit hook (POSIX sh — no bash-isms)
# Reads staged files, writes queue, runs compile. Never blocks the commit.

STAGED=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

# Try Bun runner first, fall back to binary in PATH
if command -v bunx >/dev/null 2>&1; then
  bunx kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true
elif command -v kontex >/dev/null 2>&1; then
  kontex hook pre-commit --staged "$STAGED" 2>/dev/null || true
fi

exit 0
