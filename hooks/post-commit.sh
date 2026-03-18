#!/bin/sh
# kontex post-commit hook — spawns background LLM extraction.
SHA=$(git rev-parse HEAD 2>/dev/null)
AUTHOR=$(git log -1 --format='%ae' 2>/dev/null)
if [ -z "$SHA" ]; then exit 0; fi
if command -v bunx >/dev/null 2>&1; then
  nohup bunx kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &
elif command -v kontex >/dev/null 2>&1; then
  nohup kontex hook post-commit --sha "$SHA" --author "$AUTHOR" > /dev/null 2>&1 &
fi
exit 0
