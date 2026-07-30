### Combined build — Nexus frontend + Express API server
### Railway Dockerfile Path: artifacts/nexus/Dockerfile
### Build context: REPO ROOT

FROM node:24-slim AS deps

RUN npm install -g pnpm@10 --no-fund --no-audit

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Nexus frontend deps
COPY lib/api-client-react/package.json         lib/api-client-react/
COPY lib/api-client-react/tsconfig.json        lib/api-client-react/
COPY lib/integrations-openai-ai-react/package.json lib/integrations-openai-ai-react/
COPY lib/integrations-openai-ai-react/tsconfig.json lib/integrations-openai-ai-react/
COPY lib/api-zod/package.json                  lib/api-zod/
COPY lib/api-zod/tsconfig.json                 lib/api-zod/
COPY lib/object-storage-web/package.json       lib/object-storage-web/
COPY artifacts/nexus/package.json              artifacts/nexus/

# API server deps (workspace libs)
COPY lib/db/package.json                       lib/db/
COPY lib/db/tsconfig.json                      lib/db/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY lib/integrations-openai-ai-server/tsconfig.json lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json         artifacts/api-server/

RUN pnpm install --no-frozen-lockfile

### Stage 2: build both
FROM deps AS builder

# Shared libs source
COPY lib/api-client-react/src/              lib/api-client-react/src/
COPY lib/integrations-openai-ai-react/src/  lib/integrations-openai-ai-react/src/
COPY lib/api-zod/src/                       lib/api-zod/src/
COPY lib/object-storage-web/src/            lib/object-storage-web/src/
COPY lib/db/src/                            lib/db/src/
COPY lib/integrations-openai-ai-server/src/ lib/integrations-openai-ai-server/src/

# Build Nexus frontend
COPY artifacts/nexus/src/           artifacts/nexus/src/
COPY artifacts/nexus/public/        artifacts/nexus/public/
COPY artifacts/nexus/index.html     artifacts/nexus/
COPY artifacts/nexus/vite.config.ts artifacts/nexus/
COPY artifacts/nexus/components.json artifacts/nexus/
COPY artifacts/nexus/tsconfig.json  artifacts/nexus/

ARG VITE_API_BASE_URL="https://olchaai-api-production.up.railway.app"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Explicitly pass the URL in the build command to prevent Docker layer cache from
# reusing a stale build that was compiled with VITE_API_BASE_URL=""
RUN VITE_API_BASE_URL="${VITE_API_BASE_URL}" pnpm --filter @workspace/nexus run build

# Build API server (esbuild bundles all workspace libs)
COPY artifacts/api-server/src/      artifacts/api-server/src/
COPY artifacts/api-server/build.mjs artifacts/api-server/
COPY artifacts/api-server/tsconfig.json artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

### Stage 3: runtime
FROM node:24-alpine AS runtime

WORKDIR /app

# Nexus frontend static build
COPY --from=builder /app/artifacts/nexus/dist ./dist
COPY artifacts/nexus/server.js ./server.js

# API server bundle
RUN mkdir -p /app/api
COPY --from=builder /app/artifacts/api-server/dist /app/api/dist

# API server runtime node_modules (externalized packages: firebase-admin, etc.)
COPY --from=builder /app/artifacts/api-server/node_modules /app/api/node_modules
COPY --from=builder /app/node_modules /app/node_modules

# Start script
COPY artifacts/nexus/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000
# API runs internally on 8080, Nexus proxy points to it
ENV API_TARGET=http://localhost:8080
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["/app/start.sh"]
