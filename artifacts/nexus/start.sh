#!/bin/sh
# Start API server on port 8080 (internal), then Nexus proxy on $PORT (external)

echo "[start] API server starting on port 8080..."
PORT=8080 node --enable-source-maps /app/api/dist/index.mjs &
API_PID=$!

echo "[start] Nexus proxy starting on port ${PORT:-3000}..."
node /app/server.js &
NEXUS_PID=$!

# Monitor: if either process exits, kill the other and exit
# (Railway will restart the container automatically)
while true; do
  sleep 5
  # Check if API is still running
  if ! kill -0 $API_PID 2>/dev/null; then
    echo "[start] API server died — stopping container"
    kill $NEXUS_PID 2>/dev/null
    exit 1
  fi
  # Check if Nexus is still running
  if ! kill -0 $NEXUS_PID 2>/dev/null; then
    echo "[start] Nexus server died — stopping container"
    kill $API_PID 2>/dev/null
    exit 1
  fi
done
