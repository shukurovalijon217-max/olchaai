### Pre-built dist — build context = artifacts/nexus/
### Railway Dockerfile Path: artifacts/nexus/Dockerfile
### Watch Paths: artifacts/nexus/**
# Deploy stamp: 2026-07-23-v17
FROM node:24-alpine

WORKDIR /app/artifacts/nexus

# ARG CACHEBUST forces Docker to invalidate COPY layers below when value changes
ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

# server.js first — its change also invalidates dist/public layer
COPY server.js ./server.js
COPY package.json ./package.json

# dist/public — busted by CACHEBUST arg and server.js change
COPY dist/public ./dist/public

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
