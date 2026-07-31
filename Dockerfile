### Nexus + bundled API — Railway deploy
### Build context: REPO ROOT
### Uses pre-built dists committed to git.
### Installs real AWS SDK (R2 uploads) + sharp (image resize).
### Stubs @google-cloud/storage (Replit object storage, not critical for R2).

FROM node:24-slim

WORKDIR /app

# ── Nexus frontend (pre-built, committed to git) ─────────────────
COPY artifacts/nexus/dist/     ./dist/
COPY artifacts/nexus/server.js ./server.js

# ── API server bundle (pre-built with esbuild, committed to git) ──
COPY artifacts/api-server/dist/ /app/api/dist/

# ── Install real packages the API bundle imports at load-time ─────
# @aws-sdk/s3-request-presigner → R2 presigned upload/download URLs
# sharp                         → image resize/optimisation
# Both have small installs / prebuilt binaries; no compilation needed.
RUN cd /app/api \
 && npm init -y --quiet \
 && npm install --no-save --loglevel=error \
      @aws-sdk/s3-request-presigner \
      sharp

# ── Stub @google-cloud/storage (only used for Replit object storage) ─
# Not needed for R2 media uploads; stub prevents import crash at startup.
RUN node -e "
const fs = require('fs');
const dir = '/app/api/node_modules/@google-cloud/storage';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/index.js', \`
'use strict';
class GCSFile {
  save() { return Promise.resolve(); }
  exists() { return Promise.resolve([false]); }
  getMetadata() { return Promise.resolve([{}]); }
  delete() { return Promise.resolve(); }
  createReadStream() {
    const { Readable } = require('stream');
    return new Readable({ read() { this.push(null); } });
  }
  createWriteStream() {
    const { Writable } = require('stream');
    return new Writable({ write(_c, _e, cb) { cb(); } });
  }
}
class GCSBucket {
  file() { return new GCSFile(); }
  getFiles() { return Promise.resolve([[]]); }
}
class Storage {
  bucket() { return new GCSBucket(); }
}
module.exports = { Storage };
\`);
fs.writeFileSync(dir + '/package.json', JSON.stringify({
  name: '@google-cloud/storage', version: '0.0.1', main: 'index.js'
}));
console.log('GCS stub written');
"

ENV NODE_ENV=production
ENV PORT=3000
# API runs bundled on :3001 inside the same container.
ENV API_TARGET=http://localhost:3001
# Override SESSION_SECRET in Railway Variables with a strong random value.
ENV SESSION_SECRET=olchaai-railway-fallback-2024-secret-key
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["node", "/app/server.js"]
