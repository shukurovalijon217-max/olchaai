#!/bin/sh
# Start Nexus proxy (and optionally the bundled API server if API_TARGET is localhost)

# ── IS_API_SERVICE mode ────────────────────────────────────────────────────────
# When IS_API_SERVICE=1 this container IS the Express API (not a Nexus frontend).
# Just run the API directly on Railway's assigned PORT. No Nexus, no monitoring loop.
if [ "${IS_API_SERVICE:-0}" = "1" ]; then
  echo "[start] Running as standalone Express API service on PORT=${PORT}"
  export SINGLE_PROCESS=1
  exec node --enable-source-maps /app/api/dist/index.mjs
fi

# ── Normal Nexus mode ──────────────────────────────────────────────────────────
# Only start the bundled API server when API_TARGET points to localhost.
# When Railway Variables override API_TARGET to an external service, skip the bundle.
USE_BUNDLED_API=0
# Trim leading/trailing whitespace from API_TARGET (Railway dashboard can inject spaces)
API_TARGET=$(printf '%s' "${API_TARGET:-http://localhost:3001}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
case "$API_TARGET" in
  http://localhost:*|http://127.0.0.1:*)
    USE_BUNDLED_API=1
    ;;
esac

if [ "$USE_BUNDLED_API" = "1" ]; then
  echo "[start] API server starting on port 3001 (bundled, single-process)..."
  PORT=3001 SINGLE_PROCESS=1 node --enable-source-maps /app/api/dist/index.mjs &
  API_PID=$!
  echo "[start] Waiting for API server to be ready..."
  sleep 3
fi

echo "[start] Nexus proxy starting on port ${PORT:-3000}..."
node /app/server.js &
NEXUS_PID=$!

# Monitor: if Nexus exits, restart container.
# If bundled API exits (and we need it), restart container.
while true; do
  sleep 5

  if ! kill -0 $NEXUS_PID 2>/dev/null; then
    echo "[start] Nexus server died — stopping container"
    [ "$USE_BUNDLED_API" = "1" ] && kill $API_PID 2>/dev/null
    exit 1
  fi

  if [ "$USE_BUNDLED_API" = "1" ]; then
    if ! kill -0 $API_PID 2>/dev/null; then
      echo "[start] Bundled API server died — stopping container"
      kill $NEXUS_PID 2>/dev/null
      exit 1
    fi
  fi
done
