const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 10000;
const API_TARGET = "https://olchaai-api.onrender.com";
const STATIC_DIR = path.join(__dirname, "dist", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".webp": "image/webp",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".txt":  "text/plain",
  ".xml":  "application/xml",
  ".webmanifest": "application/manifest+json",
};

function proxyToApi(req, res) {
  const parsed = url.parse(req.url);
  const opts = {
    hostname: "olchaai-api.onrender.com",
    port: 443,
    path: parsed.path,
    method: req.method,
    headers: { ...req.headers, host: "olchaai-api.onrender.com" },
    timeout: 30000,
  };

  const proxy = https.request(opts, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res, { end: true });
  });

  proxy.on("timeout", () => {
    proxy.destroy();
    if (!res.headersSent) {
      res.writeHead(504);
      res.end("Gateway Timeout");
    }
  });

  proxy.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway");
    }
  });

  req.pipe(proxy, { end: true });
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url).pathname || "/";
  const safePath = path.normalize(parsed).replace(/^(\.\.[\/\\])+/, "");
  let filePath = path.join(STATIC_DIR, safePath);

  const tryPath = (fp) => {
    try {
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) return tryPath(path.join(fp, "index.html"));
      const ext = path.extname(fp).toLowerCase();
      const mime = MIME[ext] || "application/octet-stream";
      const etag = `"${stat.size}-${stat.mtimeMs}"`;
      if (req.headers["if-none-match"] === etag) {
        res.writeHead(304);
        res.end();
        return true;
      }
      const maxAge = ext === ".html" ? 0 : 31536000;
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": ext === ".html" ? "no-cache" : `public, max-age=${maxAge}, immutable`,
        "ETag": etag,
      });
      fs.createReadStream(fp).pipe(res, { end: true });
      return true;
    } catch {
      return false;
    }
  };

  if (!tryPath(filePath)) {
    const index = path.join(STATIC_DIR, "index.html");
    try {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      fs.createReadStream(index).pipe(res, { end: true });
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

const server = http.createServer((req, res) => {
  try {
    if (req.url === "/health" || req.url === "/ping") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }
    if (req.url.startsWith("/api/") || req.url === "/api") {
      proxyToApi(req, res);
    } else {
      serveStatic(req, res);
    }
  } catch (err) {
    console.error("Request error:", err.message);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.timeout = 35000;

server.listen(PORT, () => {
  console.log(`[nexus] proxy+static server on port ${PORT}`);
  console.log(`[nexus] static dir: ${STATIC_DIR}`);
  console.log(`[nexus] api proxy: ${API_TARGET}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
