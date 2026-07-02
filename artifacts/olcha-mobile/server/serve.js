/**
 * OlCha Mobile — Production server
 * - /status         → healthcheck (always 200)
 * - /               → mobile app landing page (App Store / Google Play links)
 * - /manifest       → expo manifest (if static-build exists)
 * - everything else → static files (if static-build exists)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const port = parseInt(process.env.PORT || "3000", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif":  "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

// ── Landing page HTML ──────────────────────────────────────────────
function buildLandingPage(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"] || req.headers["host"] || "";
  const webUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : `${proto}://${host.replace(/\/olcha-mobile.*$/, "")}`;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>OlCha Mobile</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      background:#060d1a;color:#eef2f8;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:400px;width:100%;text-align:center}
    .logo{width:96px;height:96px;border-radius:24px;
      background:linear-gradient(135deg,#7857ff,#ff5a7e);
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 20px;font-size:44px;box-shadow:0 8px 32px #7857ff44}
    h1{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px}
    .sub{color:#7a8fa8;font-size:15px;margin-bottom:36px;line-height:1.5}
    .btn{display:flex;align-items:center;justify-content:center;gap:10px;
      width:100%;padding:16px;border-radius:16px;font-size:16px;
      font-weight:700;text-decoration:none;margin-bottom:12px;
      transition:transform .15s,opacity .15s}
    .btn:active{transform:scale(.97);opacity:.9}
    .btn-ios{background:#fff;color:#000}
    .btn-android{background:#01875f;color:#fff}
    .btn-web{background:#7857ff22;color:#7857ff;
      border:1.5px solid #7857ff44}
    .divider{color:#7a8fa8;font-size:13px;margin:8px 0 16px;
      display:flex;align-items:center;gap:8px}
    .divider::before,.divider::after{content:"";flex:1;
      height:1px;background:#ffffff12}
    .badge{display:inline-flex;align-items:center;gap:6px;
      background:#7857ff15;border:1px solid #7857ff30;
      color:#a78bfa;font-size:12px;font-weight:600;
      padding:4px 10px;border-radius:20px;margin-bottom:20px}
    .badge::before{content:"●";color:#7857ff;font-size:8px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🌟</div>
    <div class="badge">LIVE — Jonli</div>
    <h1>OlCha</h1>
    <p class="sub">AI bilan boshqariladigan ijtimoiy platforma.<br/>
      Bir signal. Bir koinot.</p>

    <a href="https://apps.apple.com/search?term=olcha" class="btn btn-ios">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M16.5 11.8c0-2.8 2.3-4.2 2.4-4.2-1.3-1.9-3.4-2.2-4.1-2.2-1.7-.2-3.4 1-4.3 1-.9 0-2.3-1-3.8-1-1.9 0-3.7 1.1-4.7 2.9-2 3.5-.5 8.6 1.4 11.4 1 1.4 2.1 2.9 3.6 2.9 1.4-.1 2-.9 3.7-.9 1.7 0 2.2.9 3.7.8 1.6 0 2.6-1.4 3.5-2.8.7-1 1.3-2 1.6-3.2-3.6-1.4-3.5-5.7 0-5.7z" fill="currentColor"/>
        <path d="M13.8 4.6c.8-1 1.3-2.3 1.2-3.6-1.2.1-2.6.8-3.5 1.8-.7.9-1.3 2.2-1.1 3.5 1.3.1 2.6-.6 3.4-1.7z" fill="currentColor"/>
      </svg>
      App Store — iOS
    </a>

    <a href="https://play.google.com/store/search?q=olcha" class="btn btn-android">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 2.5L11.5 11 3 19.5V2.5z" fill="currentColor" opacity=".6"/>
        <path d="M14.5 8L3 2.5l7.5 8.5L14.5 8z" fill="currentColor"/>
        <path d="M14.5 14L10.5 11 3 19.5l11.5-5.5z" fill="currentColor" opacity=".8"/>
        <path d="M17 11c0 .8-.4 1.5-1 2l-1.5-2 1.5-2c.6.5 1 1.2 1 2z" fill="currentColor" opacity=".9"/>
      </svg>
      Google Play — Android
    </a>

    <div class="divider">yoki</div>

    <a href="${webUrl}" class="btn btn-web">
      🌐 &nbsp;Brauzerda ochish
    </a>
  </div>
</body>
</html>`;
}

// ── Manifest (if static-build exists) ─────────────────────────────
function serveManifest(platform, res) {
  const p = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(p)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found: ${platform}` }));
    return;
  }
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(fs.readFileSync(p, "utf-8"));
}

// ── Static file ────────────────────────────────────────────────────
function serveStatic(urlPath, res) {
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safe);
  if (!filePath.startsWith(STATIC_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not Found"); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
  res.end(fs.readFileSync(filePath));
}

// ── Server ─────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Strip base path prefix
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // Health check — always 200
  if (pathname === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "olcha-mobile" }));
    return;
  }

  // Expo manifest request
  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      serveManifest(platform, res);
      return;
    }
  }

  // Root → landing page
  if (pathname === "/" || pathname === "") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(buildLandingPage(req));
    return;
  }

  // Static files (from Expo build)
  serveStatic(pathname, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`OlCha Mobile server on port ${port}`);
});
