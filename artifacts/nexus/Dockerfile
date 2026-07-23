### Pre-built dist approach — no builder stage needed
### Vite build runs locally; dist is committed to repo and copied directly.
### This avoids Railway Docker layer cache issues with workspace packages.
# Deploy stamp: 2026-07-23-v9
FROM node:24-alpine AS runtime

WORKDIR /app/artifacts/nexus

COPY artifacts/nexus/dist ./dist
COPY artifacts/nexus/server.js ./server.js
COPY artifacts/nexus/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
