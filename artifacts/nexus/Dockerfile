### Pre-built dist — build context = artifacts/nexus/
### Railway Dockerfile Path: artifacts/nexus/Dockerfile (Settings da belgilangan)
# v22 — exact V15 config that worked; dynamic bundle hash rewrite in server.js
FROM node:24-alpine

WORKDIR /app/nexus

# dist/public FIRST (V15 order) — server.js getRealAssets() picks largest bundle
COPY dist/public ./dist/public
COPY server.js ./server.js
COPY package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
# Heap: 256MB — static file server, low memory footprint
ENV NODE_OPTIONS=--max-old-space-size=256

EXPOSE 3000

CMD ["node", "server.js"]
