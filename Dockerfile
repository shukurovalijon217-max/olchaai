### Nexus + bundled API — Railway deploy
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

# ── Real package: @aws-sdk/s3-request-presigner ───────────────────
# Pure JavaScript, no native compilation, no binary download.
# Required for R2 presigned upload/download URLs.
RUN cd /app/api \
 && npm init -y --quiet \
 && npm install --no-save --loglevel=error @aws-sdk/s3-request-presigner

# ── File-based stubs (committed to git, zero network calls) ───────
# @google-cloud/storage  → Replit object storage (not used for R2 media)
# sharp                  → image resize (graceful no-op stub)
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
