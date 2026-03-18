#!/bin/sh
# kontex post-merge hook — recompiles KONTEX.md after pull/merge.
if command -v bunx >/dev/null 2>&1; then
  nohup bunx kontex hook post-merge > /dev/null 2>&1 &
elif command -v kontex >/dev/null 2>&1; then
  nohup kontex hook post-merge > /dev/null 2>&1 &
fi
exit 0
