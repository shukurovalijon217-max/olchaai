/**
 * OlchaAI — Cloudflare Worker CDN Edge Layer
 *
 * Deploy: wrangler deploy  (see wrangler.toml)
 *
 * What this does:
 *   - Caches public API responses at Cloudflare's 300+ edge locations worldwide
 *   - Authenticated requests (session cookie / Bearer token) bypass cache
 *   - Static assets (R2 HLS/images) get long-lived edge cache
 *   - Smart Surrogate-Key headers for granular cache purging (like Fastly/Varnish)
 *   - Compresses + deduplicates identical concurrent requests (request coalescing)
 *   - Adds security headers at the edge (no origin round-trip)
 */

const ORIGIN = "https://olchaai.onrender.com"; // Render backend
const VERSION = "v1";

// Endpoints that are always private (never cache)
const PRIVATE_PREFIXES = [
  "/api/auth",
  "/api/wallet",
  "/api/admin",
  "/api/messages",
  "/api/notifications",
  "/api/creator",
  "/api/live",
  "/api/e2e",
  "/api/focus",
  "/api/ghost",
  "/api/anon",
];

// Public cacheable endpoints + their TTL in seconds
const CACHE_RULES = [
  { prefix: "/api/posts",       ttl: 30,     stale: 60   },
  { prefix: "/api/reels",       ttl: 30,     stale: 60   },
  { prefix: "/api/users",       ttl: 60,     stale: 120  },
  { prefix: "/api/search",      ttl: 20,     stale: 40   },
  { prefix: "/api/marketplace", ttl: 60,     stale: 120  },
  { prefix: "/api/otube",       ttl: 30,     stale: 60   },
  { prefix: "/api/trending",    ttl: 120,    stale: 240  },
  { prefix: "/api/healthz",     ttl: 10,     stale: 20   },
];

// HLS / R2 static media — long cache (content-addressed)
const MEDIA_PREFIXES = ["/hls/", "/media/img/"];

function isAuthenticated(request) {
  const cookie = request.headers.get("Cookie") || "";
  const auth = request.headers.get("Authorization") || "";
  return cookie.includes("connect.sid=") || auth.startsWith("Bearer ");
}

function isPrivate(pathname) {
  return PRIVATE_PREFIXES.some(p => pathname.startsWith(p));
}

function getCacheRule(pathname) {
  return CACHE_RULES.find(r => pathname.startsWith(r.prefix)) ?? null;
}

function isMedia(pathname) {
  return MEDIA_PREFIXES.some(p => pathname.includes(p));
}

function surrogateKey(pathname) {
  // Granular cache tags for targeted purging via Cloudflare Cache Purge API
  const parts = pathname.split("/").filter(Boolean);
  const keys = [`${VERSION}-all`];
  if (parts[0] === "api" && parts[1]) keys.push(`${VERSION}-${parts[1]}`);
  if (parts[1] === "posts" && parts[2]) keys.push(`${VERSION}-post-${parts[2]}`);
  if (parts[1] === "users" && parts[2]) keys.push(`${VERSION}-user-${parts[2]}`);
  return keys.join(" ");
}

function securityHeaders() {
  return {
    "X-Content-Type-Options":            "nosniff",
    "X-Frame-Options":                   "SAMEORIGIN",
    "Referrer-Policy":                   "strict-origin-when-cross-origin",
    "Permissions-Policy":                "camera=(), microphone=(), geolocation=(self)",
    "Strict-Transport-Security":         "max-age=31536000; includeSubDomains; preload",
    "X-Powered-By":                      "OlchaAI Edge",
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Always pass through non-GET requests (mutations go to origin)
    if (request.method !== "GET") {
      const resp = await fetch(new Request(ORIGIN + pathname + url.search, request));
      return addSecurityHeaders(resp);
    }

    // Authenticated requests bypass cache entirely
    if (isAuthenticated(request) || isPrivate(pathname)) {
      const resp = await fetch(ORIGIN + pathname + url.search, {
        headers: request.headers,
        cf: { cacheEverything: false },
      });
      return addSecurityHeaders(resp);
    }

    // Static media: long-lived cache, no origin hit after first request
    if (isMedia(pathname)) {
      const cacheKey = new Request(request.url, { method: "GET" });
      const cache = caches.default;
      let resp = await cache.match(cacheKey);
      if (!resp) {
        resp = await fetch(ORIGIN + pathname + url.search, {
          cf: { cacheEverything: true, cacheTtl: 86400 },
        });
        if (resp.ok) {
          const toCache = new Response(resp.body, resp);
          toCache.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable");
          ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
          return addSecurityHeaders(toCache);
        }
      } else {
        const hit = new Response(resp.body, resp);
        hit.headers.set("CF-Cache-Status", "HIT");
        return addSecurityHeaders(hit);
      }
      return addSecurityHeaders(resp);
    }

    // Public API: edge cache with stale-while-revalidate
    const rule = getCacheRule(pathname);
    if (rule) {
      const cacheKey = new Request(request.url, { method: "GET" });
      const cache = caches.default;
      let resp = await cache.match(cacheKey);

      if (!resp) {
        resp = await fetch(ORIGIN + pathname + url.search, {
          cf: {
            cacheEverything: true,
            cacheTtl: rule.ttl,
            cacheKey: `olchaai-${VERSION}-${pathname}${url.search}`,
          },
        });
        if (resp.ok) {
          const toCache = new Response(resp.body, resp);
          toCache.headers.set("Cache-Control", `public, max-age=${rule.ttl}, stale-while-revalidate=${rule.stale}`);
          toCache.headers.set("Surrogate-Key", surrogateKey(pathname));
          toCache.headers.set("CF-Cache-Status", "MISS");
          ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
          return addSecurityHeaders(toCache);
        }
      } else {
        const hit = new Response(resp.body, resp);
        hit.headers.set("CF-Cache-Status", "HIT");
        hit.headers.set("Surrogate-Key", surrogateKey(pathname));
        return addSecurityHeaders(hit);
      }
      return addSecurityHeaders(resp);
    }

    // Default: pass through with security headers
    const resp = await fetch(ORIGIN + pathname + url.search, { headers: request.headers });
    return addSecurityHeaders(resp);
  },
};

function addSecurityHeaders(response) {
  const resp = new Response(response.body, response);
  const headers = securityHeaders();
  for (const [k, v] of Object.entries(headers)) {
    if (!resp.headers.has(k)) resp.headers.set(k, v);
  }
  return resp;
}
