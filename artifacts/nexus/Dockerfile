### Pre-built dist — build context = REPO ROOT
# Deploy stamp: 2026-07-23-v13
FROM node:24-alpine

WORKDIR /app/nexus

# Cache-bust: change this value to force Railway to re-copy dist
ARG BUST=20260723v13

# Build context = repo root
COPY artifacts/nexus/dist/public ./dist/public
COPY artifacts/nexus/server.js ./server.js
COPY artifacts/nexus/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
