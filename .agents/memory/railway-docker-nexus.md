---
name: Railway Docker build for Nexus
description: How to correctly deploy Nexus to Railway using Docker builder (not Railpack)
---

## Rule
Use root `Dockerfile` with `node:24-slim` (NOT Alpine). Railpack cannot deploy Nexus correctly.

**Why:** Railpack's runtime stage doesn't copy `artifacts/nexus/server.js` from the build context. Alpine (musl libc) also causes `@rollup/rollup-linux-x64-musl` missing error during Vite build since pnpm-lock.yaml has glibc binaries.

**How to apply:**
1. Root `Dockerfile` must exist → Railway uses Docker builder automatically
2. Use `node:24-slim` in all stages (Debian glibc, matches lockfile)
3. `.dockerignore` must NOT exclude `artifacts/nexus` or `lib/api-client-react` or `lib/integrations-openai-ai-react`
4. `VITE_*` env vars are build-time ARGs — any change requires a new deploy
5. `VITE_WS_URL` must point to Railway Go service: `wss://olchaai-go-production.up.railway.app/go/ws`
6. `VITE_AI_CORE_URL` must point to Railway AI Core (not Render)

## Key pitfalls discovered
- `.dockerignore` was written for API server only — it excluded `artifacts/nexus` (line 27) and all lib packages used by Nexus
- Railpack ignores `railpack.json` start command for monorepos — it copies files from build context but skips subdirectory files in runtime image
- Railpack root `package.json` `build` script is always used (not railpack.json `build.cmd` in nested format)
- Alpine rollup binary mismatch: pnpm lockfile has `@rollup/rollup-linux-x64-gnu`, Alpine needs `*-musl`
