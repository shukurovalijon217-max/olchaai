### Nexus + API Server — pre-built, npm install YO'Q (stub modules)
### API :8080 (internal), Nexus $PORT (external)
FROM node:24-slim

WORKDIR /app

# Nexus frontend
COPY artifacts/nexus/dist/      ./dist/
COPY artifacts/nexus/server.js  ./server.js

# API server bundle
RUN mkdir -p /app/api/dist
COPY artifacts/api-server/dist/ /app/api/dist/

# Static ESM import stubs (npm install o'rniga — tezroq build)
RUN mkdir -p /app/api/node_modules/@google-cloud \
             /app/api/node_modules/@aws-sdk \
             /app/api/node_modules/sharp
COPY docker/stubs/@google-cloud/storage /app/api/node_modules/@google-cloud/storage/
COPY docker/stubs/@aws-sdk/client-s3    /app/api/node_modules/@aws-sdk/client-s3/
COPY docker/stubs/@aws-sdk/s3-request-presigner /app/api/node_modules/@aws-sdk/s3-request-presigner/
COPY docker/stubs/sharp                 /app/api/node_modules/sharp/

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
