### Nexus + API Server — pre-built, Railway qayta build qilmaydi (tez deploy)
### API server :8080 (internal), Nexus proxy $PORT (external)

FROM node:24-alpine AS runtime

WORKDIR /app

# Nexus frontend static build
COPY artifacts/nexus/dist/      ./dist/
COPY artifacts/nexus/server.js  ./server.js

# API server bundle (esbuild, self-contained — no npm install needed)
RUN mkdir -p /app/api/dist
COPY artifacts/api-server/dist/ /app/api/dist/

# Start script
COPY artifacts/nexus/start.sh   /app/start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=http://localhost:8080
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["/app/start.sh"]
