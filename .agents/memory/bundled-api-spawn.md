---
name: Bundled API spawn via server.js
description: Why the bundled Express API must be spawned from server.js, not start.sh, and how a leading space in API_TARGET caused a silent failure.
---

## Rule
Spawn the bundled Express API from `server.js` (child_process.spawn), not from `start.sh`.

## Why
`start.sh` is copied into the Docker image as a separate layer. That layer is aggressively cached by Railway's BuildKit even when the file content changes (because the `.dockerignore` historically excluded it, leaving a stale cached layer that persists across builds). `server.js` is also a direct build-context COPY but reliably reflects repo changes because it is earlier in the cache-bust chain.

A secondary root cause: Railway dashboard can inject leading spaces into variable values (e.g. `API_TARGET = " http://localhost:3001"`). The sh `case` pattern `http://localhost:*` never matched because of the space → `USE_BUNDLED_API` stayed 0 → API never started → all `/api/*` requests returned 502.

## How to apply
- `server.js` reads `API_TARGET` with `.trim()`.
- If `API_TARGET` matches `localhost` or `127.0.0.1`, `server.js` spawns `node api/dist/index.mjs` with `PORT=<port> SINGLE_PROCESS=1`.
- If the child exits, `server.js` calls `process.exit(1)` so Railway restarts the container.
- `start.sh` still exists but is a fallback; do not rely on it for critical startup logic.

## Docker layer cache note
- `.dockerignore` must explicitly allowlist every file that `COPY` uses in stage 3.
- Busting stage-3 cache: update `artifacts/nexus/dist/.build-stamp` — this makes `COPY artifacts/nexus/dist ./dist` a cache miss, invalidating all subsequent layers.
- Even with cache busting, `COPY start.sh` may be served from a very old cached layer if Railway's remote cache is keyed differently. Prefer putting logic in `server.js`.
