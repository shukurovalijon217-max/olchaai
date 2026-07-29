/* GILOS Service Worker — v5: HTML never cached */
const CACHE_VERSION = "gilos-v5";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;

/* Only non-HTML static assets pre-cached */
const SHELL_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/apple-touch-icon.png",
];

/* ── Install ─────────────────────────────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: wipe ALL old caches ──────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch strategy ──────────────────────────────────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  /* HTML navigation — ALWAYS network, never cache */
  if (request.mode === "navigate" ||
      url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin !== self.location.origin &&
      !url.hostname.includes("fonts.googleapis.com") &&
      !url.hostname.includes("fonts.gstatic.com")) return;

  /* API: network-first */
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, 30));
    return;
  }

  /* Hashed JS/CSS/fonts: cache-first (safe — content-hashed filenames) */
  if (/\.(js|css|woff2?|ttf|otf)(\?.*)?$/.test(url.pathname) ||
      url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* Images: cache-first */
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const date = cached.headers.get("date");
      if (date) {
        const age = (Date.now() - new Date(date).getTime()) / 1000;
        if (age < maxAgeSeconds) return cached;
      }
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
