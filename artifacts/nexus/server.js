import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist/public");
const PORT = parseInt(process.env.PORT || "3000", 10);
const API_TARGET = process.env.API_TARGET || "https://olchaai-api-production.up.railway.app";

/* On startup: patch index.html to use whatever index-*.js / index-*.css is
   actually present in dist/public/assets/. This survives Docker layer cache
   mismatches where index.html gets cached with a stale bundle hash. */
(function patchIndexHtml() {
  try {
    const assetsDir = path.join(DIST, "assets");
    const files     = fs.readdirSync(assetsDir);
    const jsFile    = files.find(f => /^index-[^.]+\.js$/.test(f));
    const cssFile   = files.find(f => /^index-[^.]+\.css$/.test(f));
    if (!jsFile && !cssFile) return;

    const indexPath = path.join(DIST, "index.html");
    let html = fs.readFileSync(indexPath, "utf8");
    const original = html;

    if (jsFile)  html = html.replace(/\/assets\/index-[^"']+\.js/g,  `/assets/${jsFile}`);
    if (cssFile) html = html.replace(/\/assets\/index-[^"']+\.css/g, `/assets/${cssFile}`);

    if (html !== original) {
      fs.writeFileSync(indexPath, html, "utf8");
      console.log(`[startup] patched index.html → js:${jsFile} css:${cssFile}`);
    } else {
      console.log(`[startup] index.html already correct (js:${jsFile} css:${cssFile})`);
    }
  } catch (e) {
    console.error("[startup] patchIndexHtml failed:", e.message);
  }
}());

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".ttf":  "font/ttf",
  ".txt":  "text/plain",
  ".xml":  "application/xml",
  ".webmanifest": "application/manifest+json",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mp3":  "audio/mpeg",
};

const HOP_BY_HOP = new Set([
  "connection","keep-alive","proxy-authenticate","proxy-authorization",
  "te","trailers","transfer-encoding","upgrade",
  "cf-connecting-ip","cf-ipcountry","cf-ray","cf-visitor","cf-worker",
  "x-forwarded-proto","x-real-ip",
]);

/* Keep-alive agent for upstream API */
const apiUrl    = new URL(API_TARGET);
const keepAgent = new https.Agent({
  keepAlive: true, maxSockets: 64, maxFreeSockets: 16,
  timeout: 20000, scheduling: "lifo",
});

/* Simple in-memory file cache — HTML files are never cached (always read fresh) */
const fileCache = new Map();

/* Scan assets/ once and cache the real main bundle filenames */
let _realJs  = null;
let _realCss = null;
function getRealAssets() {
  if (_realJs !== null) return { js: _realJs, css: _realCss };
  try {
    const assetsDir = path.join(DIST, "assets");
    const files = fs.readdirSync(assetsDir);
    /* Pick the largest index-*.js (the main bundle, not a chunk) */
    let biggest = 0;
    for (const f of files) {
      if (/^index-[^.]+\.js$/.test(f)) {
        const sz = fs.statSync(path.join(assetsDir, f)).size;
        if (sz > biggest) { biggest = sz; _realJs = f; }
      }
    }
    _realCss = files.find(f => /^index-[^.]+\.css$/.test(f)) || null;
  } catch { /* ignore */ }
  return { js: _realJs, css: _realCss };
}

function readFile(fp) {
  const ext    = path.extname(fp).toLowerCase();
  const isHtml = ext === ".html";
  if (!isHtml) {
    const hit = fileCache.get(fp);
    if (hit) return hit;
  }
  let data = fs.readFileSync(fp);
  const mime = MIME[ext] || "application/octet-stream";

  /* For HTML: rewrite stale bundle hash → actual asset on disk */
  if (isHtml) {
    const { js, css } = getRealAssets();
    let html = data.toString("utf8");
    if (js)  html = html.replace(/\/assets\/index-[^"']+\.js/g,  `/assets/${js}`);
    if (css) html = html.replace(/\/assets\/index-[^"']+\.css/g, `/assets/${css}`);
    data = Buffer.from(html, "utf8");
  }

  const etag  = `"${crypto.createHash("md5").update(data).digest("hex").slice(0,10)}"`;
  const entry = { data, mime, etag };
  if (!isHtml) fileCache.set(fp, entry);
  return entry;
}

/* API reverse proxy */
function proxyToApi(req, res) {
  const chunks = [];
  req.on("data", c => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
    }
    headers["host"] = apiUrl.hostname;
    headers["x-forwarded-host"]  = req.headers.host || "";
    headers["x-forwarded-proto"] = "https";
    delete headers["accept-encoding"];
    if (body.length > 0) headers["content-length"] = String(body.length);

    const proxyReq = https.request({
      hostname: apiUrl.hostname, port: 443,
      path: req.url, method: req.method,
      headers, agent: keepAgent,
    }, proxyRes => {
      const resHeaders = {};
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (!HOP_BY_HOP.has(k.toLowerCase())) resHeaders[k] = v;
      }
      res.writeHead(proxyRes.statusCode, resHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", () => {
      if (!res.headersSent) res.writeHead(502).end("Bad Gateway");
    });
    proxyReq.setTimeout(25000, () => {
      proxyReq.destroy();
      if (!res.headersSent) res.writeHead(504).end("Gateway Timeout");
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

/* Static file serving */
function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  const tryFile = (fp) => {
    try {
      const { data, mime, etag } = readFile(fp);
      const isHtml = mime.startsWith("text/html");
      const isAsset = urlPath.startsWith("/assets/");

      if (isAsset && req.headers["if-none-match"] === etag) {
        res.writeHead(304);
        res.end();
        return true;
      }

      const isSW = urlPath === "/sw.js" || urlPath === "/service-worker.js";
      const headers = {
        "Content-Type": mime,
        "Content-Length": data.length,
        "ETag": etag,
        "Cache-Control": isHtml
          ? "no-store, no-cache, must-revalidate, max-age=0"
          : isSW
          ? "no-store, no-cache, must-revalidate, max-age=0"
          : "public, max-age=31536000, immutable",
        ...(isHtml ? { "Pragma": "no-cache", "Expires": "0" } : {}),
      };
      if (!isHtml) headers["Accept-Ranges"] = "bytes";

      res.writeHead(200, headers);
      res.end(data);
      return true;
    } catch {
      return false;
    }
  };

  const filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  if (tryFile(filePath)) return;
  if (!ext || ext === ".html") {
    if (tryFile(path.join(DIST, "index.html"))) return;
  }
  res.writeHead(404).end("Not Found");
}

/* HTTP server */
const server = http.createServer((req, res) => {
  const url = req.url || "/";

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  if (url === "/healthz" || url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else if (url.startsWith("/api/") || url === "/api") {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout   = 70_000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus :${PORT} → ${API_TARGET} | dist=${DIST}`);
});
