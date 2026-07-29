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
const API_TARGET = process.env.API_TARGET || "https://olchaai-api.onrender.com";

/* If API_TARGET points to localhost, spawn the API server in-process */
if (API_TARGET.startsWith("http://127.0.0.1:") || API_TARGET.startsWith("http://localhost:")) {
  const apiPort = API_TARGET.replace(/.*:(\d+).*/, "$1");
  const apiEntry = path.join(__dirname, "api", "dist", "index.mjs");
  if (fs.existsSync(apiEntry)) {
    let restartDelay = 2000;
    function startApi() {
      console.log(`[nexus] Spawning API server on port ${apiPort}…`);
      const api = spawn(process.execPath, ["--enable-source-maps", "--no-warnings", apiEntry], {
        env: { ...process.env, PORT: apiPort, NODE_PATH: path.join(__dirname, "api", "node_modules") },
        stdio: ["ignore", "inherit", "inherit"],
        cwd: path.join(__dirname, "api"),
      });
      api.on("exit", (code, signal) => {
        console.error(`[nexus] API exited code=${code} signal=${signal} — restarting in ${restartDelay}ms`);
        setTimeout(() => { startApi(); }, restartDelay);
        restartDelay = Math.min(restartDelay * 2, 30000); // exponential backoff cap 30s
      });
      api.on("error", (err) => console.error("[nexus] API spawn error:", err.message));
    }
    startApi();
  } else {
    console.warn("[nexus] API entry not found at", apiEntry, "— /api/* will return 502");
  }
}
const GO_TARGET  = process.env.GO_TARGET  || "https://olchaai-go-production.up.railway.app";
const DIST       = path.join(__dirname, "dist", "public");

/* Build-time unique token — changes every deploy so Cloudflare sees a new ETag */
const BUILD_ID = Date.now().toString(36);

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

/* Parse a URL into { hostname, port, isTls } */
function parseTarget(urlStr) {
  const u = new URL(urlStr);
  const isTls = u.protocol === "https:";
  const port  = u.port ? parseInt(u.port) : (isTls ? 443 : 80);
  return { hostname: u.hostname, port, isTls };
}

/* HTTP proxy (for /api and /go regular requests) */
async function proxyHttp(req, res, body, target) {
  const url = `${target}${req.url}`;
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

/* WebSocket tunnel — forward the raw upgrade handshake + bidirectional pipe */
function proxyWebSocket(req, clientSocket, head, target) {
  const { hostname, port, isTls } = parseTarget(target);

  const connect = isTls ? tls.connect : net.connect;
  const options = isTls
    ? { host: hostname, port, servername: hostname }
    : { host: hostname, port };

  const upstream = connect(options, () => {
    /* Reconstruct the HTTP/1.1 upgrade request verbatim */
    const reqLine = `GET ${req.url} HTTP/1.1\r\n`;
    const headers = Object.entries({ ...req.headers, host: hostname })
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    upstream.write(`${reqLine}${headers}\r\n\r\n`);
    if (head && head.length) upstream.write(head);

    /* Bidirectional pipe */
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

const server = http.createServer(async (req, res) => {
  /* Health check */
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, build: BUILD_ID }));
  }

  /* API proxy → olchaai-api */
  if (req.url.startsWith("/api")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      proxyHttp(req, res, body, API_TARGET);
    });
    return;
  }

  /* Go service HTTP proxy → olchaai-go */
  if (req.url.startsWith("/go")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      proxyHttp(req, res, body, GO_TARGET);
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

/* WebSocket upgrade proxy → olchaai-go */
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
