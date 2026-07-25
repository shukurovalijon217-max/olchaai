import http from "http";
import fs from "fs";
import path from "path";
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

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
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
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": isAsset
        ? "public, max-age=31536000, immutable"
        : "no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0",
      ...(isAsset ? {} : {
        "Pragma": "no-cache",
        "Expires": "0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
        "Surrogate-Control": "no-store",
      }),
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Nexus serving on port ${PORT}`);
});
