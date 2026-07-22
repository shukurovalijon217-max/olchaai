### ── Stage 1: install dependencies ──────────────────────────────────
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Lib package manifests that Nexus depends on
COPY lib/api-client-react/package.json         lib/api-client-react/
COPY lib/integrations-openai-ai-react/package.json lib/integrations-openai-ai-react/

# Nexus manifest
COPY artifacts/nexus/package.json artifacts/nexus/

RUN pnpm install --no-frozen-lockfile

### ── Stage 2: build ──────────────────────────────────────────────────
FROM deps AS builder

# Lib sources (Vite resolves these via workspace symlinks)
COPY lib/api-client-react/         lib/api-client-react/
COPY lib/integrations-openai-ai-react/ lib/integrations-openai-ai-react/

# Nexus source
COPY artifacts/nexus/ artifacts/nexus/

# VITE_API_BASE_URL set at build time via Railway Variables
# Build stamp to bust Docker layer cache: 2026-07-22-v1
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @workspace/nexus run build

### ── Stage 3: runtime ────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app/artifacts/nexus

# Copy built static files and server
COPY --from=builder /app/artifacts/nexus/dist ./dist
COPY --from=builder /app/artifacts/nexus/server.js ./server.js
COPY --from=builder /app/artifacts/nexus/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
