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
const WS_URL = process.env.WS_URL || "wss://olchaai-go-production.up.railway.app/go/ws";

// R2 credentials (optional — if set, r2-serve is handled here directly, no API hop)
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

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade",
  "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "cf-worker",
  "x-forwarded-proto", "x-real-ip",
]);

/* ── Manual AWS Signature V4 presigned GET URL for R2 ─────────────── */
function r2PresignedUrl(key, ttlSec = 3600) {
  const endpoint = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region   = "auto";
  const service  = "s3";
  const now      = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate   = now.toISOString().replace(/[:\-]/g, "").slice(0, 15) + "Z";

  const credScope  = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS}/${credScope}`;

  const qp = new URLSearchParams();
  qp.set("X-Amz-Algorithm",     "AWS4-HMAC-SHA256");
  qp.set("X-Amz-Credential",    credential);
  qp.set("X-Amz-Date",          amzDate);
  qp.set("X-Amz-Expires",       String(ttlSec));
  qp.set("X-Amz-SignedHeaders", "host");
  // sort canonical query string
  const sortedQs = [...qp.entries()].sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  const canonicalUri     = `/${R2_BUCKET}/${key}`;
  const canonicalHeaders = `host:${endpoint}\n`;
  const canonicalRequest = [
    "GET", canonicalUri, sortedQs,
    canonicalHeaders, "host", "UNSIGNED-PAYLOAD",
  ].join("\n");

  const strToSign = [
    "AWS4-HMAC-SHA256", amzDate, credScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const sigKey = hmac(
    hmac(hmac(hmac(Buffer.from("AWS4" + R2_SECRET), dateStamp), region), service),
    "aws4_request"
  );
  const sig = crypto.createHmac("sha256", sigKey).update(strToSign).digest("hex");

  return `https://${endpoint}/${R2_BUCKET}/${key}?${sortedQs}&X-Amz-Signature=${sig}`;
}

/* ── Serve R2 object: stream via presigned URL ─────────────────────── */
function serveR2(key, req, res) {
  const presigned = r2PresignedUrl(key);
  const url = new URL(presigned);

  const rangeHeader = req.headers["range"];
  const reqHeaders = { host: url.hostname };
  if (rangeHeader) reqHeaders["range"] = rangeHeader;

  const opts = {
    hostname: url.hostname, port: 443,
    path: url.pathname + url.search, method: "GET",
    headers: reqHeaders,
  };

  const proxyReq = https.request(opts, (proxyRes) => {
    const resHeaders = {
      "Content-Type": proxyRes.headers["content-type"] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    };
    if (proxyRes.headers["content-length"]) resHeaders["Content-Length"] = proxyRes.headers["content-length"];
    if (proxyRes.headers["content-range"]) resHeaders["Content-Range"] = proxyRes.headers["content-range"];
    if (proxyRes.headers["accept-ranges"]) resHeaders["Accept-Ranges"] = proxyRes.headers["accept-ranges"];
    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (e) => {
    console.error("R2 proxy error:", e.message);
    if (!res.headersSent) res.writeHead(502).end("R2 error");
  });
  proxyReq.end();
}

function patchJsBundle(buf) {
  let s = buf.toString("utf-8");
  s = s.replace(/\bgs=""/g, `gs="${API_TARGET}"`);
  s = s.replace(/\bLm=""/g, `Lm="${API_TARGET}"`);
  s = s.replace(/wss:\/\/olchaai-go\.onrender\.com\/go\/ws/g, WS_URL);
  return Buffer.from(s, "utf-8");
}

function proxyToApi(req, res) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = new URL(API_TARGET + req.url);

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
    }
    headers["host"] = url.hostname;
    headers["x-forwarded-host"] = req.headers.host || "";
    headers["x-forwarded-proto"] = "https";
    if (body.length > 0) headers["content-length"] = String(body.length);

    const opts = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method: req.method,
      headers,
    };

    const proxyReq = https.request(opts, (proxyRes) => {
      const resHeaders = {};
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (!HOP_BY_HOP.has(k.toLowerCase())) resHeaders[k] = v;
      }
      res.writeHead(proxyRes.statusCode, resHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (e) => {
      console.error("Proxy error:", e.message);
      if (!res.headersSent) res.writeHead(502).end("Bad Gateway");
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath).toLowerCase();

  const tryFile = (fp) => {
    try {
      let data = fs.readFileSync(fp);
      const mime = MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";
      const isHtml = mime === "text/html";
      const isJs = mime === "application/javascript";

      if (isJs) data = patchJsBundle(data);

      if (isHtml) {
        let html = data.toString("utf-8");
        const inject = `<script>window.__API_BASE__="${API_TARGET}";window.__WS_URL__="${WS_URL}";</script>`;
        html = html.replace("</head>", inject + "</head>");
        data = Buffer.from(html, "utf-8");
      }

      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": data.length,
        "Cache-Control": isHtml ? "no-cache, no-store, must-revalidate" :
          isJs ? "no-cache" : "public, max-age=31536000, immutable",
      });
      res.end(data);
      return true;
    } catch {
      return false;
    }
  };

  if (tryFile(filePath)) return;
  if (!ext || ext === ".html") {
    if (tryFile(path.join(DIST, "index.html"))) return;
  }
  res.writeHead(404).end("Not Found");
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", r2: R2_ENABLED }));

  // R2 media serve — if R2 credentials are in env, handle here directly
  // (avoids Railway API hop and works even when API server is being deployed)
  } else if (R2_ENABLED && url.startsWith("/api/storage/r2-serve/")) {
    // Extract key: /api/storage/r2-serve/uploads/xxx.mp4 → uploads/xxx.mp4
    const key = url.slice("/api/storage/r2-serve/".length).split("?")[0];
    if (!key) { res.writeHead(400).end("Bad key"); return; }
    serveR2(key, req, res);

  } else if (url.startsWith("/api/") || url === "/api") {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus :${PORT} → ${API_TARGET} | R2_ENABLED=${R2_ENABLED}`);
});
