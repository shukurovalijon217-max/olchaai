const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 10000;
const API_TARGET = "https://olchaai-api.onrender.com";
const STATIC_DIR = path.join(__dirname, "dist", "public");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function proxyToApi(req, res) {
  const target = new url.URL(req.url, API_TARGET);
  const opts = {
    hostname: target.hostname,
    port: 443,
    path: target.pathname + (target.search || ""),
    method: req.method,
    headers: {
      ...req.headers,
      host: target.hostname,
    },
  };
  const proxy = https.request(opts, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  });
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Bad Gateway");
  });
  req.pipe(proxy);
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url).pathname;
  let filePath = path.join(STATIC_DIR, parsed);

  const tryFile = (fp) => {
    if (!fs.existsSync(fp)) return false;
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) return tryFile(path.join(fp, "index.html"));
    const ext = path.extname(fp).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    fs.createReadStream(fp).pipe(res);
    return true;
  };

  if (!tryFile(filePath)) {
    const index = path.join(STATIC_DIR, "index.html");
    if (fs.existsSync(index)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(index).pipe(res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url === "/api") {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Nexus proxy server listening on port ${PORT}`);
});
