#!/bin/sh
# Start API server on port 8080 (internal), then Nexus proxy on $PORT (external)
set -e

echo "[start] API server starting on port 8080..."
PORT=8080 node --enable-source-maps /app/api/dist/index.mjs &
API_PID=$!

echo "[start] Nexus proxy starting on port ${PORT:-3000}..."
node /app/server.js &
NEXUS_PID=$!

# If either process dies, kill both and exit
wait -n 2>/dev/null || true
kill $API_PID $NEXUS_PID 2>/dev/null
wait
