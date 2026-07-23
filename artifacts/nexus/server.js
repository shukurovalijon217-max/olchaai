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

/* Simple in-memory file cache */
const fileCache = new Map();

function readFile(fp) {
  const hit = fileCache.get(fp);
  if (hit) return hit;
  const data  = fs.readFileSync(fp);
  const ext   = path.extname(fp).toLowerCase();
  const mime  = MIME[ext] || "application/octet-stream";
  const etag  = `"${crypto.createHash("md5").update(data).digest("hex").slice(0,10)}"`;
  const entry = { data, mime, etag };
  fileCache.set(fp, entry);
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
        "Cache-Control": (isHtml || isSW)
          ? "no-cache, must-revalidate"
          : "public, max-age=31536000, immutable",
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
