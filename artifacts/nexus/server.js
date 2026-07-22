import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist/public");
const PORT = parseInt(process.env.PORT || "3000", 10);
const API_TARGET = process.env.API_TARGET || "https://olchaai-api-production.up.railway.app";
const WS_URL = process.env.WS_URL || "wss://olchaai-go-production.up.railway.app/go/ws";

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || "").trim();
const R2_BUCKET    = (process.env.R2_BUCKET_NAME  || "").trim();
const R2_ACCESS    = (process.env.R2_ACCESS_KEY_ID || "").trim();
const R2_SECRET    = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const R2_ENABLED   = !!(R2_ACCOUNT_ID && R2_BUCKET && R2_ACCESS && R2_SECRET);

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
};

const COMPRESSIBLE = new Set([
  "text/html", "application/javascript", "text/css", "application/json",
  "image/svg+xml", "text/plain", "application/xml", "application/manifest+json",
]);

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade",
  "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "cf-worker",
  "x-forwarded-proto", "x-real-ip",
]);

/* ── Keep-alive agent pool for upstream API calls ─────────────────── */
const apiUrl    = new URL(API_TARGET);
const keepAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  maxFreeSockets: 16,
  timeout: 20000,
  scheduling: "lifo",
});

/* ── Brotli + Gzip compression ────────────────────────────────────── */
const BROTLI_OPTS = { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } };

function compressSync(buf) {
  const gz = zlib.gzipSync(buf, { level: 6 });
  let br = null;
  try { br = zlib.brotliCompressSync(buf, BROTLI_OPTS); } catch {}
  return { gz, br };
}

/* ── Raw file cache: filePath → {etag, gz, br, plain, mime} ──────── */
const rawCache = new Map();

function readRaw(fp) {
  const hit = rawCache.get(fp);
  if (hit) return hit;
  const plain = fs.readFileSync(fp);
  const mime = MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";
  const etag = `"${crypto.createHash("md5").update(plain).digest("hex").slice(0, 10)}"`;
  let gz = null, br = null;
  if (COMPRESSIBLE.has(mime)) ({ gz, br } = compressSync(plain));
  const entry = { plain, gz, br, mime, etag };
  rawCache.set(fp, entry);
  return entry;
}

/* ── Patched cache: filePath → {etag, gz, br, plain, mime} ──────── */
/* patchJsBundle & HTML injection done ONCE per file, then cached    */
const patchedCache = new Map();

function patchJsBundle(buf) {
  let s = buf.toString("utf-8");
  s = s.replace(/\bgs=""/g, `gs="${API_TARGET}"`);
  s = s.replace(/\bLm=""/g, `Lm="${API_TARGET}"`);
  s = s.replace(/wss:\/\/olchaai-go\.onrender\.com\/go\/ws/g, WS_URL);
  return Buffer.from(s, "utf-8");
}

function getPatchedEntry(fp, rawEntry) {
  const hit = patchedCache.get(fp);
  if (hit) return hit;
  const patched = patchJsBundle(rawEntry.plain);
  const { gz, br } = compressSync(patched);
  const etag = `"${crypto.createHash("md5").update(patched).digest("hex").slice(0, 10)}"`;
  const entry = { plain: patched, gz, br, mime: rawEntry.mime, etag };
  patchedCache.set(fp, entry);
  return entry;
}

/* HTML injection cache */
const htmlCache = new Map();

function getPatchedHtml(fp, rawEntry) {
  const hit = htmlCache.get(fp);
  if (hit) return hit;
  let html = rawEntry.plain.toString("utf-8");
  const inject = `<script>window.__API_BASE__="${API_TARGET}";window.__WS_URL__="${WS_URL}";</script>`;
  const preconnect = `<link rel="preconnect" href="${API_TARGET}" crossorigin><link rel="dns-prefetch" href="${API_TARGET}">`;
  html = html.replace("</head>", preconnect + inject + "</head>");
  const plain = Buffer.from(html, "utf-8");
  const { gz, br } = compressSync(plain);
  const etag = `"${crypto.createHash("md5").update(plain).digest("hex").slice(0, 10)}"`;
  const entry = { plain, gz, br, mime: "text/html", etag };
  htmlCache.set(fp, entry);
  return entry;
}

/* ── R2 presigned URL with 30-min cache ──────────────────────────── */
const r2UrlCache = new Map(); // key → {url, exp}

function r2PresignedUrl(key, ttlSec = 3600) {
  const now = Date.now();
  const hit = r2UrlCache.get(key);
  if (hit && hit.exp > now + 60_000) return hit.url;

  const endpoint = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = "auto", service = "s3";
  const d = new Date();
  const dateStamp = d.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate   = d.toISOString().replace(/[:\-]/g, "").slice(0, 15) + "Z";
  const credScope  = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS}/${credScope}`;

  const qp = new URLSearchParams();
  qp.set("X-Amz-Algorithm",     "AWS4-HMAC-SHA256");
  qp.set("X-Amz-Credential",    credential);
  qp.set("X-Amz-Date",          amzDate);
  qp.set("X-Amz-Expires",       String(ttlSec));
  qp.set("X-Amz-SignedHeaders", "host");
  const sortedQs = [...qp.entries()].sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  const canonicalUri = `/${R2_BUCKET}/${key}`;
  const canonicalHeaders = `host:${endpoint}\n`;
  const canonicalRequest = ["GET", canonicalUri, sortedQs, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const strToSign = ["AWS4-HMAC-SHA256", amzDate, credScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");

  const hmac = (k, data) => crypto.createHmac("sha256", k).update(data).digest();
  const sigKey = hmac(
    hmac(hmac(hmac(Buffer.from("AWS4" + R2_SECRET), dateStamp), region), service),
    "aws4_request"
  );
  const sig = crypto.createHmac("sha256", sigKey).update(strToSign).digest("hex");
  const url = `https://${endpoint}/${R2_BUCKET}/${key}?${sortedQs}&X-Amz-Signature=${sig}`;
  r2UrlCache.set(key, { url, exp: now + ttlSec * 1000 });
  return url;
}

/* ── Serve R2 object: stream via presigned URL ─────────────────────── */
function serveR2(key, req, res) {
  const presigned = r2PresignedUrl(key);
  const url = new URL(presigned);
  const reqHeaders = { host: url.hostname };
  const range = req.headers["range"];
  if (range) reqHeaders["range"] = range;

  const proxyReq = https.request({
    hostname: url.hostname, port: 443,
    path: url.pathname + url.search, method: "GET",
    headers: reqHeaders, agent: keepAgent,
  }, (proxyRes) => {
    const resHeaders = {
      "Content-Type": proxyRes.headers["content-type"] || "application/octet-stream",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Timing-Allow-Origin": "*",
    };
    if (proxyRes.headers["content-length"]) resHeaders["Content-Length"] = proxyRes.headers["content-length"];
    if (proxyRes.headers["content-range"])  resHeaders["Content-Range"]  = proxyRes.headers["content-range"];
    if (proxyRes.headers["etag"])           resHeaders["ETag"]           = proxyRes.headers["etag"];
    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (e) => {
    if (!res.headersSent) res.writeHead(502).end("R2 error");
  });
  proxyReq.end();
}

/* ── API reverse proxy ───────────────────────────────────────────── */
function proxyToApi(req, res) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
    }
    headers["host"] = apiUrl.hostname;
    headers["x-forwarded-host"] = req.headers.host || "";
    headers["x-forwarded-proto"] = "https";
    headers["accept-encoding"] = req.headers["accept-encoding"] || "gzip, deflate, br";
    if (body.length > 0) headers["content-length"] = String(body.length);

    const proxyReq = https.request({
      hostname: apiUrl.hostname, port: 443,
      path: req.url, method: req.method,
      headers, agent: keepAgent,
    }, (proxyRes) => {
      const resHeaders = {};
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (!HOP_BY_HOP.has(k.toLowerCase())) resHeaders[k] = v;
      }
      // Aggressive API caching for GET endpoints that allow it
      if (req.method === "GET" && !resHeaders["cache-control"]) {
        resHeaders["cache-control"] = "public, max-age=5, stale-while-revalidate=30";
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

/* ── Static file serving ─────────────────────────────────────────── */
function pickEncoding(req, entry) {
  const ae = req.headers["accept-encoding"] || "";
  if (entry.br && ae.includes("br"))   return { body: entry.br, enc: "br" };
  if (entry.gz && ae.includes("gz"))   return { body: entry.gz, enc: "gzip" };
  return { body: entry.plain, enc: null };
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  const tryFile = (fp) => {
    try {
      const raw = readRaw(fp);
      const { mime } = raw;
      const isHtml = mime === "text/html";
      const isJs   = mime === "application/javascript";

      const entry = isJs ? getPatchedEntry(fp, raw)
                  : isHtml ? getPatchedHtml(fp, raw)
                  : raw;

      if (!isHtml && !isJs && req.headers["if-none-match"] === entry.etag) {
        res.writeHead(304);
        res.end();
        return true;
      }

      const { body, enc } = pickEncoding(req, entry);

      const headers = {
        "Content-Type": mime,
        "Content-Length": body.length,
        "ETag": entry.etag,
        "Vary": "Accept-Encoding",
        "Cache-Control": isHtml
          ? "no-cache, must-revalidate"
          : "public, max-age=31536000, immutable",
      };
      if (enc) headers["Content-Encoding"] = enc;
      if (!isHtml) headers["Accept-Ranges"] = "bytes";

      res.writeHead(200, headers);
      res.end(body);
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

/* ── HTTP server ─────────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  const t0  = Date.now();
  const url = req.url || "/";

  // Security headers on every response
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  const done = res.end.bind(res);
  res.end = function(...args) {
    res.setHeader("Server-Timing", `total;dur=${Date.now() - t0}`);
    return done(...args);
  };

  if (url === "/healthz" || url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    res.end(JSON.stringify({ status: "ok", r2: R2_ENABLED, uptime: process.uptime() }));

  } else if (R2_ENABLED && url.startsWith("/api/storage/r2-serve/")) {
    const key = url.slice("/api/storage/r2-serve/".length).split("?")[0];
    if (!key) { res.writeHead(400).end("Bad key"); return; }
    serveR2(key, req, res);

  } else if (url.startsWith("/api/") || url === "/api") {
    proxyToApi(req, res);

  } else {
    serveStatic(req, res);
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout   = 70_000;
server.maxConnections   = 1000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus :${PORT} → ${API_TARGET} | R2=${R2_ENABLED} | brotli+gzip=on | pool=64`);
});
