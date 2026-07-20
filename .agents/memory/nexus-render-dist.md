---
name: Nexus dist pre-built for Render
description: Render build for Nexus only runs pnpm install, not Vite build. dist must be pushed to GitHub.
---

## Rule
Nexus `buildCommand` in render.yaml is `npx --yes pnpm@10.26.1 install --no-frozen-lockfile` — no Vite build step. The pre-built `artifacts/nexus/dist/` is committed to GitHub and Render serves it directly via `node artifacts/nexus/server.cjs`.

## .env.production config
Always build Nexus with `artifacts/nexus/.env.production` containing:
```
VITE_API_BASE_URL=
VITE_AI_CORE_URL=
VITE_WS_URL=wss://olchaai-go.onrender.com/go/ws
```

**Why:**
- `VITE_API_BASE_URL=""` → all REST API calls become `/api/...` (relative) → go through Nexus proxy (server.cjs proxies `/api/*` to olchaai-api.onrender.com) → session cookies work same-site
- `VITE_WS_URL` must be explicit wss:// URL → WebSocket connects directly to Go real-time service (server.cjs has no WS proxy)
- Without .env.production: VITE_API_BASE_URL is undefined at build time → bundle uses `${undefined}/api/...` → crashes silently

## How to apply
After any frontend source change:
1. `cd artifacts/nexus && pnpm run build`
2. Commit `artifacts/nexus/dist/` + source files to GitHub via Trees API
