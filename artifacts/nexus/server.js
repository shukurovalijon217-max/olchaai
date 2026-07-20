import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist/public");
const PORT = parseInt(process.env.PORT || "3000", 10);
const API_TARGET = process.env.API_TARGET || "https://olchaai-api-production.up.railway.app";

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

function proxyToApi(req, res) {
  const url = new URL(API_TARGET + req.url);
  const opts = {
    hostname: url.hostname, port: url.port || 443,
    path: url.pathname + url.search, method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname,
      "x-forwarded-host": req.headers.host || "",
      "x-forwarded-proto": "https",
    },
  };
  const proto = url.protocol === "https:" ? https : http;
  const proxyReq = proto.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (e) => {
    console.error("Proxy error:", e.message);
    res.writeHead(502).end("Bad Gateway");
  });
  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  let filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath).toLowerCase();

  const tryFile = (fp) => {
    try {
      const data = fs.readFileSync(fp);
      const mime = MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";
      const isHtml = mime === "text/html";
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": isHtml ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable",
        "Pragma": isHtml ? "no-cache" : undefined,
      });
      res.end(data);
      return true;
    } catch {
      return false;
    }
  };

  if (tryFile(filePath)) return;
  // SPA fallback
  if (!ext || ext === ".html") {
    const index = path.join(DIST, "index.html");
    if (tryFile(index)) return;
  }
  res.writeHead(404).end("Not Found");
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api/") || url === "/api") {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus static+proxy server on :${PORT}`);
  console.log(`API proxy → ${API_TARGET}`);
});
