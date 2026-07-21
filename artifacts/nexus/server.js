import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist/public");
const PORT = parseInt(process.env.PORT || "3000", 10);
const API_TARGET = process.env.API_TARGET || "https://olchaai-api-production.up.railway.app";
const WS_URL = process.env.WS_URL || "wss://olchaai-go-production.up.railway.app/go/ws";

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade",
  "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "cf-worker",
  "x-forwarded-proto", "x-real-ip",
]);

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
    res.end(JSON.stringify({ status: "ok" }));
  } else if (url.startsWith("/api/") || url === "/api") {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus :${PORT} → ${API_TARGET}`);
});
