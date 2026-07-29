### Nexus + API Server — pre-built, Railway qayta build qilmaydi (tez deploy)
### API server :8080 (internal), Nexus proxy $PORT (external)

FROM node:24-alpine AS runtime

# sharp uchun native build tools
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Nexus frontend static build
COPY artifacts/nexus/dist/      ./dist/
COPY artifacts/nexus/server.js  ./server.js

# API server bundle (esbuild, core bundled — faqat 3 ta static dep kerak)
RUN mkdir -p /app/api/dist
COPY artifacts/api-server/dist/ /app/api/dist/

# Faqat static import bo'lgan paketlarni install qilish (dynamic importlar kerak emas)
WORKDIR /app/api
RUN npm init -y && \
    npm install --no-save \
      "@google-cloud/storage@^7" \
      "@aws-sdk/client-s3@^3" \
      "@aws-sdk/s3-request-presigner@^3" \
      "sharp@^0.35" \
    2>&1 | tail -3

WORKDIR /app

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
