### Stage 1: install dependencies
FROM node:24-slim AS deps

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/api-client-react/package.json         lib/api-client-react/
COPY lib/integrations-openai-ai-react/package.json lib/integrations-openai-ai-react/
COPY lib/api-zod/package.json                  lib/api-zod/
COPY artifacts/nexus/package.json              artifacts/nexus/

RUN pnpm install --no-frozen-lockfile

### Stage 2: build
FROM deps AS builder

COPY lib/api-client-react/src/    lib/api-client-react/src/
COPY lib/api-client-react/tsconfig.json lib/api-client-react/

COPY lib/integrations-openai-ai-react/ lib/integrations-openai-ai-react/

COPY lib/api-zod/src/             lib/api-zod/src/
COPY lib/api-zod/tsconfig.json    lib/api-zod/

COPY artifacts/nexus/src/         artifacts/nexus/src/
COPY artifacts/nexus/public/      artifacts/nexus/public/
COPY artifacts/nexus/index.html   artifacts/nexus/
COPY artifacts/nexus/vite.config.ts artifacts/nexus/
COPY artifacts/nexus/components.json artifacts/nexus/
COPY artifacts/nexus/tsconfig.json  artifacts/nexus/
COPY artifacts/nexus/server.js    artifacts/nexus/

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @workspace/nexus run build

### Stage 3: runtime
FROM node:24-slim AS runtime

WORKDIR /app

COPY --from=builder /app/artifacts/nexus/dist   ./dist
COPY --from=builder /app/artifacts/nexus/server.js ./server.js
COPY --from=builder /app/artifacts/nexus/package.json ./package.json

RUN npm install --omit=dev express 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
