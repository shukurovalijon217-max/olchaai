### ── Stage 1: dependencies ────────────────────────────────────────────
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Workspace manifests (cached layer)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Only the lib packages api-server actually depends on
COPY lib/db/package.json                          lib/db/
COPY lib/api-zod/package.json                     lib/api-zod/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/

# Artifact manifest
COPY artifacts/api-server/package.json artifacts/api-server/

RUN pnpm install --no-frozen-lockfile

### ── Stage 2: build ──────────────────────────────────────────────────
FROM deps AS builder

# Lib sources (esbuild bundles these directly — no tsc step needed)
COPY lib/db/                          lib/db/
COPY lib/api-zod/                     lib/api-zod/
COPY lib/integrations-openai-ai-server/ lib/integrations-openai-ai-server/

# API server source → esbuild bundle
COPY artifacts/api-server/ artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

### ── Stage 3: runtime ────────────────────────────────────────────────
FROM node:24-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Manifests only (for production install)
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/artifacts/api-server/package.json        ./artifacts/api-server/
COPY --from=builder /app/lib/db/package.json                       ./lib/db/
COPY --from=builder /app/lib/api-zod/package.json                  ./lib/api-zod/
COPY --from=builder /app/lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/

# Production deps (includes sharp native for linux/alpine)
RUN pnpm install --no-frozen-lockfile --prod

# Built bundle from esbuild
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

WORKDIR /app/artifacts/api-server

ENV NODE_ENV=production
ENV PORT=8080
# Heap: 512MB — API server with cluster workers + TF.js engine
# WEB_CONCURRENCY controls worker count (matches Railway vCPU count)
ENV NODE_OPTIONS=--max-old-space-size=512
ENV WEB_CONCURRENCY=2

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
