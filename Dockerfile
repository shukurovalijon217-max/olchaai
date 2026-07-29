### Nexus + API Server — pre-built, Railway qayta build qilmaydi
### API :8080 (internal), Nexus $PORT (external)

FROM node:24-slim AS runtime

# sharp prebuilt binary uchun libvips runtime (Debian slim da bor)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libvips42 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Nexus frontend
COPY artifacts/nexus/dist/      ./dist/
COPY artifacts/nexus/server.js  ./server.js

# API server bundle (esbuild)
RUN mkdir -p /app/api
COPY artifacts/api-server/dist/ /app/api/dist/

# Static ESM deps (bundlelanmagan, runtime kerak)
WORKDIR /app/api
RUN npm install --no-save --prefer-offline \
      @google-cloud/storage \
      @aws-sdk/client-s3 \
      @aws-sdk/s3-request-presigner \
      sharp \
    2>&1 | tail -2

WORKDIR /app

# Start script
COPY artifacts/nexus/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV API_TARGET=http://localhost:8080
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["/app/start.sh"]
