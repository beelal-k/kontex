#!/bin/sh
# kontex post-merge hook (POSIX sh — no bash-isms)
# Recompiles KONTEX.md after git pull / git merge.

if command -v bunx >/dev/null 2>&1; then
  nohup bunx kontex hook post-merge > /dev/null 2>&1 &
elif command -v kontex >/dev/null 2>&1; then
  nohup kontex hook post-merge > /dev/null 2>&1 &
fi

exit 0
