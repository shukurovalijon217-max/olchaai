---
name: Railway migration lessons
description: How OlchaAI was migrated from Render to Railway and what broke/fixed along the way.
---

## Key facts

- 5 Railway services: olchaai-db (PG), olchaai-nexus (static+proxy), olchaai-api (Dockerfile), olchaai-go (Go), olchaai-ai-core (Nixpacks)
- DB public URL: crossover.proxy.rlwy.net:15013/railway
- Railway Nexus start command: `node server.js` (artifacts/nexus/server.js)

## Critical lessons

### GitHub Contents API push causes 150+ Railway deploys
Pushing dist files one-by-one via GitHub Contents API triggered a separate Railway auto-deploy per file. This caused a massive deploy queue and Railway served stale files for 30+ minutes. **Fix: push all dist files in one batch commit, or build on Railway.**

### Vite VITE_API_BASE_URL is compile-time only
`import.meta.env.VITE_API_BASE_URL` is inlined at build time. If built with `""`, the compiled bundle has literal `gs=""` (the minified variable). Runtime injection via `window.__API_BASE__` does NOT retroactively fix already-compiled `const API = ""` assignments scattered across all page files.

### Patching the minified bundle directly works
When Railway served an old dist built with empty API URL, the fix was to download `index-BswmG5-m.js` from GitHub via Contents API, replace `gs=""` → `gs="https://..."` (confirmed unique: only 1 occurrence) and re-push. This patched the serving bundle without a rebuild.

### Railway/Cloudflare blocks /api/* path via domain
`olchaai.com/api/*` went through Cloudflare → Railway Nexus → proxy → Railway API. The proxy forwarded CF-specific headers (`cf-connecting-ip`, `cf-ray`, etc.) which caused Railway's own Cloudflare layer to return 403. Fix in new server.js: strip all `cf-*` and hop-by-hop headers before proxying.

**Why:** Railway's edge infrastructure uses Cloudflare Workers internally. Receiving `cf-connecting-ip` on an inbound request to an internal service confuses the routing layer.

### server.js body buffering required for proxy correctness
Old `req.pipe(proxyReq)` with Cloudflare in the middle caused body/content-length mismatches. New server.js buffers body with `chunks = []; req.on("data")` before forwarding with correct `content-length`.

## Working production URLs
- Nexus: https://olchaai-nexus-production.up.railway.app (and olchaai.com)
- API: https://olchaai-api-production.up.railway.app
- Go: wss://olchaai-go-production.up.railway.app/go/ws
- AI Core: https://olchaai-ai-core-production.up.railway.app
