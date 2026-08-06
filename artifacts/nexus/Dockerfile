# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace manifests so pnpm can resolve the monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy nexus and all workspace library dependencies it needs
COPY artifacts/nexus/package.json ./artifacts/nexus/package.json
COPY lib/api-client-react/ ./lib/api-client-react/
COPY lib/api-zod/ ./lib/api-zod/
COPY lib/api-spec/ ./lib/api-spec/
COPY lib/integrations-openai-ai-react/ ./lib/integrations-openai-ai-react/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy nexus source
COPY artifacts/nexus/ ./artifacts/nexus/

# Build: runs `vite build && node scripts/check-bundle-api-url.mjs` via package.json
# ARG default is "" so relative /api/* paths are used — never set this to an absolute URL
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @workspace/nexus run build

# Explicit gate: fail the Docker build if an absolute API host URL is baked into
# any JS chunk.  This step is intentionally separate from the npm `build` script
# so that even if the vite build step is invoked directly (bypassing package.json),
# this check cannot be skipped.
RUN node artifacts/nexus/scripts/check-bundle-api-url.mjs

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Only copy what the server needs at runtime
COPY --from=builder /build/artifacts/nexus/dist ./dist
COPY --from=builder /build/artifacts/nexus/server.js ./server.js
COPY --from=builder /build/artifacts/nexus/start.sh ./start.sh

RUN chmod +x /app/start.sh

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "/app/server.js"]
