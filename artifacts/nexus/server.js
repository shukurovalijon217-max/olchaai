import http from "http";
import https from "https";
import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { spawn } from "child_process";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT       = parseInt(process.env.PORT || "3000", 10);
/* olchaai-api is a SEPARATE Railway service — proxy directly, no loop */
const API_TARGET = (process.env.API_TARGET || "https://olchaai-api-production.up.railway.app").trim();
const GO_TARGET  = (process.env.GO_TARGET  || "https://olchaai-go-production.up.railway.app").trim();
const DIST       = path.join(__dirname, "dist", "public");

/* Build-time unique token */
const BUILD_ID = Date.now().toString(36);

/* ── Prevent unhandled rejections from crashing the process ── */
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message, err.stack);
});

/* ── Bundled API auto-start ───────────────────────────────────────────────
   When API_TARGET points to localhost (bundled mode), spawn the Express API
   as a child process. This runs regardless of what start.sh does, so it is
   immune to Docker layer-cache issues with the start script.          ── */
/* If the bundled API entry exists on disk, always start it on :3001
   regardless of API_TARGET env var (which might be overridden in Railway
   Variables to point to the old dead external service).                  */
const BUNDLED_API_PORT = "3001";
const apiEntry = path.join(__dirname, "api", "dist", "index.mjs");
const IS_BUNDLED = fs.existsSync(apiEntry);

if (IS_BUNDLED) {
  /* Force API_TARGET to localhost so the proxy always routes internally */
  process.env.API_TARGET = `http://localhost:${BUNDLED_API_PORT}`;
  console.log(`[nexus] Bundled API found — overriding API_TARGET to http://localhost:${BUNDLED_API_PORT}`);
  const apiEnv = { ...process.env, PORT: BUNDLED_API_PORT, SINGLE_PROCESS: "1" };
  const spawnApi = () => {
    const child = spawn(process.execPath, ["--enable-source-maps", apiEntry], {
      env: apiEnv, stdio: "inherit",
    });
    child.on("exit", (code) => {
      console.error(`[nexus] Bundled API exited (code=${code}) — restarting in 3s`);
      setTimeout(spawnApi, 3000);
    });
  };
  spawnApi(); // single controlled spawn with auto-restart
} else {
  console.warn(`[nexus] Bundled API entry not found at ${apiEntry} — proxy-only mode (API_TARGET=${API_TARGET})`);
}


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

function parseTarget(urlStr) {
  const u = new URL(urlStr);
  const isTls = u.protocol === "https:";
  const port  = u.port ? parseInt(u.port) : (isTls ? 443 : 80);
  return { hostname: u.hostname, port, isTls };
}

/* Safe response helper — never throws even if client already disconnected */
function safeReply(res, status, body) {
  try {
    if (!res.headersSent) {
      res.writeHead(status, { "Content-Type": "application/json" });
    }
    if (!res.writableEnded) {
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    }
  } catch (_) { /* client disconnected */ }
}

/* HTTP proxy — used only for /go/* (WebSocket upgrades use proxyWebSocket).
   REST API calls now go directly from the browser to olchaai-api via
   VITE_API_BASE_URL, so this is kept only as a fallback for any /api/*
   requests that still land on Nexus (e.g. server-side health checks). */
async function proxyHttp(req, res, body, target) {
  const url = `${target}${req.url}`;

  const headers = { ...req.headers };
  delete headers["host"];
  delete headers["transfer-encoding"];
  // Remove accept-encoding so olchaai-api returns plain (uncompressed) JSON.
  // If we forward it, olchaai-api returns gzip bytes that we'd need to decompress
  // before forwarding — simpler to just disable compression for proxy requests.
  delete headers["accept-encoding"];
  if (["GET", "HEAD", "DELETE", "OPTIONS"].includes(req.method)) {
    delete headers["content-length"];
  }
  const clientIp = req.socket?.remoteAddress ?? "unknown";
  const existingXff = headers["x-forwarded-for"];
  headers["x-forwarded-for"] = existingXff ? `${existingXff}, ${clientIp}` : clientIp;
  if (!headers["x-forwarded-proto"]) headers["x-forwarded-proto"] = "https";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      redirect: "manual",
      signal: controller.signal,
    });

    const buf = await upstream.arrayBuffer();

    const fwdHeaders = {};
    for (const [k, v] of upstream.headers.entries()) {
      const lk = k.toLowerCase();
      if (lk === "transfer-encoding" || lk === "connection" ||
          lk === "content-encoding" || lk === "content-length") continue;
      // Don't forward cache headers that cause Railway CDN to cache API responses.
      // A cached empty/stale body would be forwarded as 200+0bytes → Railway 502.
      if (req.url?.startsWith("/api")) {
        if (lk === "etag" || lk === "vary" || lk === "age" ||
            lk === "cache-control" || lk === "x-cache") continue;
      }
      fwdHeaders[k] = v;
    }
    fwdHeaders["content-length"] = String(buf.byteLength);
    // Force no-store for API responses so Railway CDN never caches them
    if (req.url?.startsWith("/api")) {
      fwdHeaders["cache-control"] = "private, no-store";
    }

    try {
      res.writeHead(upstream.status, fwdHeaders);
      if (!res.writableEnded) res.end(Buffer.from(buf));
    } catch (_) { /* client disconnected */ }

  } catch (err) {
    const detail = `${err?.constructor?.name}: ${err?.message}`;
    console.error(`[proxy-err] ${req.method} ${req.url}: ${detail}`);
    safeReply(res, 502, { error: "Bad Gateway" });
  } finally {
    clearTimeout(timer);
  }
}

/* WebSocket tunnel */
function proxyWebSocket(req, clientSocket, head, target) {
  const { hostname, port, isTls } = parseTarget(target);
  const connect = isTls ? tls.connect : net.connect;
  const options = isTls
    ? { host: hostname, port, servername: hostname }
    : { host: hostname, port };

  const upstream = connect(options, () => {
    const reqLine = `GET ${req.url} HTTP/1.1\r\n`;
    const hdrs = Object.entries({ ...req.headers, host: hostname })
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    upstream.write(`${reqLine}${hdrs}\r\n\r\n`);
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  upstream.on("error", (err) => {
    console.error("WS upstream error:", err.message);
    clientSocket.destroy();
  });
  clientSocket.on("error", () => upstream.destroy());
  clientSocket.on("close", () => upstream.destroy());
  upstream.on("close", () => clientSocket.destroy());
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    const bundleExists = fs.existsSync(path.join(__dirname, "api", "dist", "index.mjs"));
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      build: BUILD_ID,
      nexusPort: PORT,
      apiTarget: process.env.API_TARGET || API_TARGET,
      bundleExists,
      isBundledMode: IS_BUNDLED,
      nodeVer: process.version,
    }));
  }


  if (req.url.startsWith("/api")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("error", (e) => console.error("req error:", e.message));
    req.on("end", () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      proxyHttp(req, res, body, API_TARGET).catch((err) => {
        console.error("proxyHttp unhandled:", err.message);
        safeReply(res, 502, { error: "Bad Gateway" });
      });
    });
    return;
  }

  if (req.url.startsWith("/go")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      proxyHttp(req, res, body, GO_TARGET).catch((err) => {
        console.error("proxyHttp/go unhandled:", err.message);
        safeReply(res, 502, { error: "Bad Gateway" });
      });
    });
    return;
  }

  /* Static files with SPA fallback */
  let filePath = path.join(DIST, req.url.split("?")[0]);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, "index.html");
  }

  try {
    const content = fs.readFileSync(filePath);
    const mime    = getMime(filePath);
    const isAsset = filePath.includes("/assets/");

    if (isAsset) {
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    } else {
      const etag = `"${BUILD_ID}-${crypto.createHash("md5").update(content).digest("hex").slice(0,8)}"`;
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
        "Pragma": "no-cache",
        "Expires": "Thu, 01 Jan 1970 00:00:00 GMT",
        "ETag": etag,
        "Last-Modified": new Date().toUTCString(),
        "CF-Cache-Status": "BYPASS",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
        "Surrogate-Control": "no-store",
        "Surrogate-Key": `deploy-${BUILD_ID}`,
        "Vary": "Accept-Encoding",
        "Clear-Site-Data": '"cache"',
      });
    }
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/go")) {
    proxyWebSocket(req, socket, head, GO_TARGET);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Nexus serving on port ${PORT} [build=${BUILD_ID}]`);
});
