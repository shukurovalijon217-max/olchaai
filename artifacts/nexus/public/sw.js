/* GilosAI Service Worker — global edge cache + offline shell */
const CACHE_VERSION = "gilos-v4";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;
const IMG_CACHE     = `${CACHE_VERSION}-img`;

/* App shell: cached on first load */
const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/apple-touch-icon.png",
];

/* API routes using stale-while-revalidate (serve cache instantly, update in bg) */
const SWR_API_ROUTES = [
  "/api/posts",
  "/api/reels",
  "/api/stories",
  "/api/users",
  "/api/notifications",
  "/api/search",
  "/api/live",
  "/api/groups",
  "/api/marketplace",
];

/* ── Install: pre-cache app shell ─────────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: delete old caches ─────────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) =>
            (k.startsWith("olcha-") || k.startsWith("gilos-")) &&
            k !== STATIC_CACHE && k !== API_CACHE && k !== IMG_CACHE
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch strategy ──────────────────────────────────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes("fonts.googleapis.com") &&
    !url.hostname.includes("fonts.gstatic.com")
  ) return;

  /* JS/CSS/fonts (Vite hash filenames → immutable cache) */
  if (
    /\.(js|css|woff2?|ttf|otf)(\?.*)?$/.test(url.pathname) ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* Images: cache-first, long TTL — images rarely change */
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirstWithTTL(request, IMG_CACHE, 7 * 24 * 3600));
    return;
  }

  /* Public feed/list API: stale-while-revalidate (sekin internetda darhol javob) */
  if (
    url.pathname.startsWith("/api/") &&
    SWR_API_ROUTES.some((r) => url.pathname.startsWith(r))
  ) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  /* Other API: network-first, 2-minute offline fallback */
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, 120));
    return;
  }

  /* HTML navigation: network-first, fallback to cached shell */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }
});

/* ── Push: show notification when server sends one ───────────── */
self.addEventListener("push", (event) => {
  let payload = { title: "OlchaAI", body: "Yangi xabar", icon: "/favicon.png", url: "/" };
  try { if (event.data) payload = { ...payload, ...JSON.parse(event.data.text()) }; } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/favicon.png",
      badge: "/favicon.png",
      data: { url: payload.url || "/" },
      vibrate: [100, 50, 100],
    })
  );
});

/* ── Notification click: open/focus the relevant page ────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const match = clients.find((c) => c.url.includes(self.location.origin));
      if (match) { match.focus(); match.postMessage({ type: "PUSH_NAVIGATE", url }); }
      else self.clients.openWindow(url);
    })
  );
});

/* ────────────────────── Cache helpers ──────────────────────── */

/** Cache-first: serve from cache; fetch and cache if missing */
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

/** Cache-first with TTL check (seconds) */
async function cacheFirstWithTTL(request, cacheName, maxAgeSeconds) {
  const cached = await caches.match(request);
  if (cached) {
    const date = cached.headers.get("date");
    if (!date || (Date.now() - new Date(date).getTime()) / 1000 < maxAgeSeconds) {
      return cached;
    }
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (cached) return cached;
    return new Response("", { status: 503 });
  }
}

/**
 * Stale-while-revalidate:
 * - Slow/no internet → returns cached response INSTANTLY
 * - Then updates cache in background when network available
 * - This is the key strategy for slow connections!
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // If we have cache, return it immediately and update in background
  if (cached) {
    event.waitUntil(fetchPromise);
    return cached;
  }

  // No cache yet: wait for network
  const response = await fetchPromise;
  if (response) return response;

  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

/** Network-first with stale fallback */
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
      } else {
        return cached; // No date header, return anyway for offline
      }
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
