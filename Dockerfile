### AUTHORITATIVE RAILWAY DEPLOY FILE — do not create a second Dockerfile.
### Railway is configured to use THIS file (repo root). artifacts/nexus/Dockerfile
### was a duplicate and has been removed to prevent divergence and deploy breaks.
### Build context: REPO ROOT
### Pre-built dists from git + one pure-JS npm install + file-based stubs.
### No pnpm, no multi-stage, no binary downloads → fast reliable build.

FROM node:24-slim

WORKDIR /app

# ── Nexus frontend (pre-built, committed to git) ─────────────────
COPY artifacts/nexus/dist/     ./dist/
COPY artifacts/nexus/server.js ./server.js

# ── API server bundle (pre-built with esbuild, committed to git) ──
COPY artifacts/api-server/dist/ /app/api/dist/

# ── File-based stubs (committed to git, zero network calls) ───────
# @google-cloud/storage  → not used for R2 media; graceful no-op stub
# sharp                  → image resize; graceful no-op stub
# @aws-sdk/s3-request-presigner is now bundled by esbuild — no npm install needed
RUN mkdir -p /app/api/node_modules/@google-cloud /app/api/node_modules
COPY stubs/@google-cloud/storage/ /app/api/node_modules/@google-cloud/storage/
COPY stubs/sharp/                 /app/api/node_modules/sharp/

ENV NODE_ENV=production
ENV PORT=3000
# API runs bundled on :3001 inside the same container.
ENV API_TARGET=http://localhost:3001
# Override SESSION_SECRET in Railway Variables with a strong random value.
ENV SESSION_SECRET=olchaai-railway-fallback-2024-secret-key
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["node", "/app/server.js"]
