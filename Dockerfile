### AUTHORITATIVE RAILWAY DEPLOY FILE — do not create a second Dockerfile.
### Railway is configured to use THIS file (repo root). artifacts/nexus/Dockerfile
### was a duplicate and has been removed to prevent divergence and deploy breaks.
### Build context: REPO ROOT
### Multi-stage build: builder compiles frontend + API from source; runtime
### copies only the built output — a stale committed dist/ can never reach prod.

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /build

# Enable corepack and activate the exact pnpm version from package.json
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy workspace manifests + lock file first so the install layer is cached
# independently of source changes.
COPY package.json pnpm-workspace.yaml .npmrc pnpm-lock.yaml ./

# Copy every package.json in the workspace so pnpm can resolve the dependency
# graph before any source is present (maximises install-layer cache hits).
COPY scripts/package.json                                    scripts/
COPY lib/api-client-react/package.json                      lib/api-client-react/
COPY lib/api-spec/package.json                              lib/api-spec/
COPY lib/api-zod/package.json                               lib/api-zod/
COPY lib/db/package.json                                    lib/db/
COPY lib/integrations-openai-ai-react/package.json         lib/integrations-openai-ai-react/
COPY lib/integrations-openai-ai-server/package.json        lib/integrations-openai-ai-server/
COPY lib/object-storage-web/package.json                   lib/object-storage-web/
COPY artifacts/nexus/package.json                          artifacts/nexus/
COPY artifacts/api-server/package.json                     artifacts/api-server/

# Install all workspace dependencies (honours the lock file for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy root tsconfig files — nexus and api-server both extend tsconfig.base.json
# at the repo root via "../../tsconfig.base.json". Without these the Vite/tsc
# build fails with "parseConfigJsonFile: file not found" in the builder stage.
COPY tsconfig.json      ./
COPY tsconfig.base.json ./

# Copy source for the packages we actually need to build
COPY lib/           lib/
COPY scripts/       scripts/
COPY artifacts/nexus/        artifacts/nexus/
COPY artifacts/api-server/   artifacts/api-server/

# Build nexus frontend.
# VITE_API_BASE_URL must be empty so relative /api/* paths are used via the
# Nexus proxy — the post-build check-bundle-api-url.mjs script enforces this.
ENV VITE_API_BASE_URL=""
RUN pnpm --filter @workspace/nexus run build

# Build api-server bundle (esbuild, outputs to artifacts/api-server/dist/)
RUN pnpm --filter @workspace/api-server run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-slim

WORKDIR /app

# ── Nexus frontend — built from source, NOT from git working tree ─────────────
COPY --from=builder /build/artifacts/nexus/dist/     ./dist/
COPY --from=builder /build/artifacts/nexus/server.js ./server.js

# ── API server bundle — built from source, NOT from git working tree ──────────
COPY --from=builder /build/artifacts/api-server/dist/ /app/api/dist/

# ── File-based stubs (static, committed to git — never need building) ─────────
# @google-cloud/storage  → not used for R2 media; graceful no-op stub
# sharp                  → image resize; graceful no-op stub
# @aws-sdk/s3-request-presigner is bundled by esbuild — no npm install needed
RUN mkdir -p /app/api/node_modules/@google-cloud /app/api/node_modules/@upstash
COPY stubs/@google-cloud/storage/ /app/api/node_modules/@google-cloud/storage/
COPY stubs/sharp/                 /app/api/node_modules/sharp/
COPY stubs/@upstash/redis/        /app/api/node_modules/@upstash/redis/

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
