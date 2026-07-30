### Nexus frontend — pre-built, Railway tez deploy
### server.js API serverni tashqi olchaai-api servisiga proxy qiladi
FROM node:24-slim

WORKDIR /app

# Nexus frontend
COPY artifacts/nexus/dist/      ./dist/
COPY artifacts/nexus/server.js  ./server.js

ENV NODE_ENV=production
ENV PORT=3000
# Fallback secret — override in Railway Variables with a strong random value
ENV SESSION_SECRET=olchaai-railway-fallback-2024-secret-key
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["node", "/app/server.js"]
