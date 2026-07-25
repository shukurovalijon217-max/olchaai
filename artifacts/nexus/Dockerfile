### Full build — Railway build context = REPO ROOT
### Railway Dockerfile Path: artifacts/nexus/Dockerfile

FROM node:24-slim AS deps

RUN npm install -g pnpm@10 --no-fund --no-audit

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/api-client-react/package.json         lib/api-client-react/
COPY lib/api-client-react/tsconfig.json        lib/api-client-react/
COPY lib/integrations-openai-ai-react/package.json lib/integrations-openai-ai-react/
COPY lib/integrations-openai-ai-react/tsconfig.json lib/integrations-openai-ai-react/
COPY lib/api-zod/package.json                  lib/api-zod/
COPY lib/api-zod/tsconfig.json                 lib/api-zod/
COPY lib/object-storage-web/package.json       lib/object-storage-web/
COPY artifacts/nexus/package.json              artifacts/nexus/

RUN pnpm install --no-frozen-lockfile

### Stage 2: build
FROM deps AS builder

COPY lib/api-client-react/src/              lib/api-client-react/src/
COPY lib/integrations-openai-ai-react/src/  lib/integrations-openai-ai-react/src/
COPY lib/api-zod/src/                       lib/api-zod/src/

COPY artifacts/nexus/src/          artifacts/nexus/src/
COPY artifacts/nexus/public/       artifacts/nexus/public/
COPY artifacts/nexus/index.html    artifacts/nexus/
COPY artifacts/nexus/vite.config.ts artifacts/nexus/
COPY artifacts/nexus/components.json artifacts/nexus/
COPY artifacts/nexus/tsconfig.json  artifacts/nexus/

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @workspace/nexus run build

### Stage 3: runtime
FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/artifacts/nexus/dist ./dist
COPY artifacts/nexus/server.js ./server.js

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=512

EXPOSE 3000
CMD ["node", "server.js"]
