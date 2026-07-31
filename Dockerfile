### Nexus + bundled API — combined Railway deploy
### Build context: REPO ROOT
### Stage 1 builds the API server with real node_modules (no stubs).
### Stage 2 serves Nexus (pre-built dist) + spawns the bundled API on :3001.

FROM node:24-slim AS api-builder

RUN npm install -g pnpm@10 --no-fund --no-audit

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Workspace lib manifests (API server depends on these)
COPY lib/db/package.json                            lib/db/
COPY lib/db/tsconfig.json                           lib/db/
COPY lib/api-zod/package.json                       lib/api-zod/
COPY lib/api-zod/tsconfig.json                      lib/api-zod/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY lib/integrations-openai-ai-server/tsconfig.json lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json              artifacts/api-server/

RUN pnpm install --no-frozen-lockfile

# Workspace lib source
COPY lib/db/src/                            lib/db/src/
COPY lib/api-zod/src/                       lib/api-zod/src/
COPY lib/integrations-openai-ai-server/src/ lib/integrations-openai-ai-server/src/

# API server source + build script
COPY artifacts/api-server/src/      artifacts/api-server/src/
COPY artifacts/api-server/build.mjs artifacts/api-server/
COPY artifacts/api-server/tsconfig.json artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

### Stage 2 — lean runtime image
FROM node:24-slim AS runtime

WORKDIR /app

# Nexus frontend static build — use pre-built dist committed to git so Railway
# never has to rebuild the frontend (fast deploys, consistent output).
COPY artifacts/nexus/dist/     ./dist/
COPY artifacts/nexus/server.js ./server.js

# API bundle (built fresh in stage 1)
COPY --from=api-builder /app/artifacts/api-server/dist /app/api/dist

# Externalized npm packages the API bundle imports at runtime
# (@aws-sdk, @google-cloud, firebase-admin, sharp, etc. are not inlined by esbuild)
COPY --from=api-builder /app/artifacts/api-server/node_modules /app/api/node_modules
COPY --from=api-builder /app/node_modules                       /app/node_modules

ENV NODE_ENV=production
ENV PORT=3000
# API runs bundled on :3001 inside the same container;
# server.js auto-detects localhost and spawns it.
ENV API_TARGET=http://localhost:3001
# Fallback session secret — override in Railway Variables with a strong random value
ENV SESSION_SECRET=olchaai-railway-fallback-2024-secret-key
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
# server.js detects IS_BUNDLED=true, spawns /app/api/dist/index.mjs on :3001,
# then starts the Nexus static/proxy server on :3000.
CMD ["node", "/app/server.js"]
