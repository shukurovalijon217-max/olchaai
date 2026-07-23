### Pre-built dist approach — Railway build context is artifacts/nexus/
### so all COPY paths are relative to that directory.
# Deploy stamp: 2026-07-23-v10
FROM node:24-alpine

WORKDIR /app/nexus

COPY dist ./dist
COPY server.js ./server.js
COPY package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
