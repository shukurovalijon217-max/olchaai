### Pre-built dist — build context = artifacts/nexus/
### Railway Dockerfile Path: artifacts/nexus/Dockerfile (Settings da belgilangan)
### Watch Paths: artifacts/nexus/**
# Deploy stamp: 2026-07-23-v16
FROM node:24-alpine

WORKDIR /app/nexus

# server.js FIRST — changing it invalidates all subsequent layers (incl. dist/public)
COPY server.js ./server.js
COPY package.json ./package.json

# dist/public AFTER server.js — cache busted whenever server.js changes
COPY dist/public ./dist/public

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
