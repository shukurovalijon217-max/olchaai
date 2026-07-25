import http from "http";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const API_TARGET = process.env.API_TARGET || "https://olchaai-api-production.up.railway.app";
const DIST = path.join(__dirname, "dist", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg"]);

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendCompressed(req, res, content, mime, cacheControl) {
  const ext = path.extname(req.url.split("?")[0]).toLowerCase();
  const accept = req.headers["accept-encoding"] || "";
  const canGzip = COMPRESSIBLE.has(ext);

  if (canGzip && accept.includes("br")) {
    zlib.brotliCompress(content, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }, (err, buf) => {
      if (err) return sendRaw(res, content, mime, cacheControl);
      res.writeHead(200, { "Content-Type": mime, "Content-Encoding": "br", "Cache-Control": cacheControl, "Vary": "Accept-Encoding" });
      res.end(buf);
    });
  } else if (canGzip && accept.includes("gzip")) {
    zlib.gzip(content, { level: 6 }, (err, buf) => {
      if (err) return sendRaw(res, content, mime, cacheControl);
      res.writeHead(200, { "Content-Type": mime, "Content-Encoding": "gzip", "Cache-Control": cacheControl, "Vary": "Accept-Encoding" });
      res.end(buf);
    });
  } else {
    sendRaw(res, content, mime, cacheControl);
  }
}

function sendRaw(res, content, mime, cacheControl) {
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": cacheControl });
  res.end(content);
}

async function proxyToApi(req, res, body) {
  const url = `${API_TARGET}${req.url}`;
  const headers = { ...req.headers };
  delete headers["host"];
  delete headers["connection"];
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      redirect: "manual",
    });
    res.writeHead(upstream.status, Object.fromEntries(
      [...upstream.headers.entries()].filter(([k]) =>
        !["transfer-encoding", "connection"].includes(k.toLowerCase())
      )
    ));
    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad Gateway" }));
  }
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  // API proxy
  if (req.url.startsWith("/api")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      proxyToApi(req, res, body);
    });
    return;
  }

  // Static files with SPA fallback
  let filePath = path.join(DIST, req.url.split("?")[0]);

  // Directory → index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, "index.html");
  }

  try {
    const content = fs.readFileSync(filePath);
    const mime = getMime(filePath);
    const isAsset = filePath.includes("/assets/");
    const cacheControl = isAsset ? "public, max-age=31536000, immutable" : "no-cache";
    sendCompressed(req, res, content, mime, cacheControl);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Nexus serving on port ${PORT}`);
});
