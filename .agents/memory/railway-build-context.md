---
name: Railway Dockerfile build context and .dockerignore fix
description: Railway build context is always repo root; .dockerignore **/dist blocks pre-built dist/public; fix pattern for nexus deployment.
---

## The Rule

Railway's Dockerfile builder always uses **repo root** as build context, regardless of where the Dockerfile lives. `dockerfilePath` in `railway.json` only tells Railway *which file* is the Dockerfile, not where the build context is.

## Why It Broke

`.dockerignore` at repo root had `**/dist` which excluded `artifacts/nexus/dist/public` from the build context. Dockerfile used relative paths (`COPY dist/public`) which resolve from repo root — `dist/public` does not exist at repo root, only at `artifacts/nexus/dist/public`.

**Why V15 worked:** `.dockerignore` did not yet have `**/dist` at V15 deploy time. All subsequent deploys (V17+) failed because `**/dist` was added later.

## The Fix (v23)

**.dockerignore** — add exception after the wildcard:
```
**/dist
!artifacts/nexus/dist
```

**Dockerfile** — use full repo-root paths:
```dockerfile
COPY artifacts/nexus/dist/public ./dist/public
COPY artifacts/nexus/server.js ./server.js
COPY artifacts/nexus/package.json ./package.json
```

**railway.json** — DOCKERFILE builder + dockerfilePath + watchPatterns (no startCommand — use CMD in Dockerfile):
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile",
    "watchPatterns": ["artifacts/nexus/**", "lib/**"]
  },
  "deploy": {
    "healthcheckPath": "/healthz",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Why:**  NIXPACKS also fails for this repo because `package.json` has `workspace:*` dependencies that NIXPACKS can't resolve outside the monorepo root.

## Dynamic Bundle Hash Rewrite (server.js)

`getRealAssets()` in server.js scans `dist/public/assets/` and picks the **largest** `index-*.js` file, then rewrites `index.html` on startup. This permanently fixes stale Docker layer cache serving old `index.html` with wrong bundle hash.
