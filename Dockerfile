### Nexus production image — pre-built dist fayllarni ishlatadi
### (Railway source dan qayta build qilmaydi, git da committed dist ishlatiladi)
FROM node:24-slim AS runtime

WORKDIR /app

# Pre-built static files + proxy server
COPY artifacts/nexus/dist        ./dist
COPY artifacts/nexus/server.js   ./server.js
COPY artifacts/nexus/package.json ./package.json

RUN npm install --omit=dev express 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=https://olchaai-api-production.up.railway.app
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws

EXPOSE 3000

CMD ["node", "server.js"]
