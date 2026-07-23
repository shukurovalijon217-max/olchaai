### Pre-built dist — build context = artifacts/nexus/
### Railway Dockerfile Path: artifacts/nexus/Dockerfile
# v19 — back to working v15 base; server.js startup patcher handles index.html hash
FROM node:24-alpine

WORKDIR /app/nexus

COPY server.js ./server.js
COPY package.json ./package.json
COPY dist/public ./dist/public

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
