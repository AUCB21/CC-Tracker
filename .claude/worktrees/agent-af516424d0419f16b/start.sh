#!/usr/bin/env sh
# Runs `next start` and shuts it down after IDLE_TIMEOUT seconds with no heartbeat.
# The layout pings /api/heartbeat every 10s while the tab is visible, so "no
# heartbeat" ~= "no open+visible tab". Configuration precedence:
#   1. CLI env:  IDLE_TIMEOUT=120 ./start.sh
#   2. .env.local line: IDLE_TIMEOUT=60
#   3. built-in default: 60s
# POLL is the check interval in seconds (default 5).
set -e

# Pull IDLE_TIMEOUT from .env.local unless already set in the environment.
if [ -z "${IDLE_TIMEOUT:-}" ] && [ -f .env.local ]; then
  IDLE_TIMEOUT=$(sed -n -E 's/^IDLE_TIMEOUT=[[:space:]]*([0-9]+).*/\1/p' .env.local | tail -1)
fi
IDLE_TIMEOUT=${IDLE_TIMEOUT:-60}
POLL=${POLL:-5}
FILE=".heartbeat"

# Seed the timestamp so the server gets a grace window before the first ping.
: > "$FILE"

# Direct node invocation (not `npm start`) so $PID is the actual server process,
# not an npm wrapper that would leak the child on kill.
node ./node_modules/next/dist/bin/next start &
PID=$!
trap 'kill $PID 2>/dev/null; exit 0' INT TERM

while kill -0 "$PID" 2>/dev/null; do
  sleep "$POLL"
  MTIME=$(stat -c %Y "$FILE" 2>/dev/null || stat -f %m "$FILE")
  NOW=$(date +%s)
  IDLE_FOR=$((NOW - MTIME))
  if [ "$IDLE_FOR" -ge "$IDLE_TIMEOUT" ]; then
    echo ""
    echo "[start.sh] idle for ${IDLE_FOR}s (>= ${IDLE_TIMEOUT}s), shutting down"
    kill "$PID" 2>/dev/null || true
    break
  fi
done

wait "$PID" 2>/dev/null || true
