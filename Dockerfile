### Nexus + bundled API — Railway deploy
### Build context: REPO ROOT
### Uses pre-built dists committed to git; creates thin stubs for
### the 3 external packages the API bundle imports at load-time.
### Login, social, and database features all work; R2/GCS storage
### operations degrade gracefully until real packages are added.

FROM node:24-slim

WORKDIR /app

# ── Nexus frontend (pre-built, committed to git) ─────────────────
COPY artifacts/nexus/dist/     ./dist/
COPY artifacts/nexus/server.js ./server.js

# ── API server bundle (pre-built with esbuild, committed to git) ──
COPY artifacts/api-server/dist/ /app/api/dist/

# ── Stub the 3 externalized packages the bundle imports at startup ─
# The bundle's static imports are:
#   import { Storage }     from "@google-cloud/storage"
#   import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
#   import sharp           from "sharp"
# None of these are needed for login / social / feed / auth flows.
RUN node - <<'EOF'
const fs = require('fs');

const pkgs = {
  "@google-cloud/storage": {
    code: `
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
`,
    pkg: { name: '@google-cloud/storage', version: '0.0.1', main: 'index.js' },
  },
  "@aws-sdk/s3-request-presigner": {
    code: `
'use strict';
module.exports = { getSignedUrl: async () => '' };
`,
    pkg: { name: '@aws-sdk/s3-request-presigner', version: '0.0.1', main: 'index.js' },
  },
  "sharp": {
    code: `
'use strict';
function sharp() {
  const chain = {
    resize() { return chain; },
    webp()   { return chain; },
    jpeg()   { return chain; },
    png()    { return chain; },
    toBuffer() { return Promise.resolve(Buffer.alloc(0)); },
    toFile()   { return Promise.resolve({ size: 0 }); },
  };
  return chain;
}
sharp.default = sharp;
module.exports = sharp;
`,
    pkg: { name: 'sharp', version: '0.0.1', main: 'index.js' },
  },
};

for (const [name, { code, pkg }] of Object.entries(pkgs)) {
  const dir = '/app/api/node_modules/' + name;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + '/index.js', code.trim() + '\n');
  fs.writeFileSync(dir + '/package.json', JSON.stringify(pkg, null, 2));
}
console.log('stubs written');
EOF

ENV NODE_ENV=production
ENV PORT=3000
# API runs bundled on :3001; server.js detects localhost and spawns it.
ENV API_TARGET=http://localhost:3001
# Override SESSION_SECRET in Railway Variables with a strong random value.
ENV SESSION_SECRET=olchaai-railway-fallback-2024-secret-key
ENV WS_URL=wss://olchaai-go-production.up.railway.app/go/ws
ENV NODE_OPTIONS=--max-old-space-size=768

EXPOSE 3000
CMD ["node", "/app/server.js"]
