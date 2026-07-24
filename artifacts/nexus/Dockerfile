### Pre-built dist — build context = REPO ROOT
### Railway Dockerfile Path: artifacts/nexus/Dockerfile
### Railway Root Directory: (empty — repo root)
# v24 — repo-root COPY paths (server.js lives in artifacts/nexus/)
FROM node:24-alpine

WORKDIR /app/nexus

# Repo-root paths — Railway build context is the repo root
COPY artifacts/nexus/dist/public ./dist/public
COPY artifacts/nexus/server.js ./server.js
COPY artifacts/nexus/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
# Heap: 256MB — static file server, low memory footprint
ENV NODE_OPTIONS=--max-old-space-size=256

EXPOSE 3000

CMD ["node", "server.js"]
