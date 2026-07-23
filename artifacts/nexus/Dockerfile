### Pre-built dist — build context = REPO ROOT (Railway rootDirectory not set)
### Railway clones repo root as build context regardless of where railway.json lives.
# Deploy stamp: 2026-07-23-v12
FROM node:24-alpine

WORKDIR /app/nexus

# Build context = repo root, so paths start from repo root
COPY artifacts/nexus/dist/public ./dist/public
COPY artifacts/nexus/server.js ./server.js
COPY artifacts/nexus/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
