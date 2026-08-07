const REQUEST_TIMEOUT_MS = 30_000; // 30s max per request
const RSS_SHED_THRESHOLD_MB = 800; // shed load when RSS > 800 MB (absolute, not heap ratio)
const HEAVY_ENDPOINTS = new Set(["/api/ai/feed", "/api/ai/chat", "/api/posts"]);
const HEAVY_MAX_CONCURRENT = 100;
let heavyConcurrent = 0;
/* ── 1. Request timeout ───────────────────────────────────────── */
export function requestTimeout(req, res, next) {
    if (res.headersSent) {
        next();
        return;
    }
    const timer = setTimeout(() => {
        if (res.headersSent)
            return;
        res.status(503).json({
            error: "Request timed out",
            message: "Server band — iltimos qayta urinib ko'ring",
            retryAfterMs: 5_000,
        });
    }, REQUEST_TIMEOUT_MS);
    // Clear timeout when response is finished (normal or error)
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
}
/* ── 2. Load shedder ──────────────────────────────────────────── */
export function loadShedder(req, res, next) {
    // Always allow health checks and auth through
    const path = req.path;
    if (path === "/api/healthz" || path.startsWith("/api/auth/") || path.startsWith("/api/stripe/")) {
        next();
        return;
    }
    const mem = process.memoryUsage();
    const rssMb = mem.rss / 1024 / 1024;
    if (rssMb > RSS_SHED_THRESHOLD_MB) {
        res.status(503)
            .setHeader("Retry-After", "5")
            .json({
            error: "Server overloaded",
            message: "Server juda band — 5 soniya kutib qayta urinib ko'ring",
            retryAfterMs: 5_000,
        });
        return;
    }
    next();
}
/* ── 3. Heavy-endpoint concurrency cap ───────────────────────── */
export function concurrencyCap(req, res, next) {
    if (!HEAVY_ENDPOINTS.has(req.path)) {
        next();
        return;
    }
    if (heavyConcurrent >= HEAVY_MAX_CONCURRENT) {
        res.status(503)
            .setHeader("Retry-After", "2")
            .json({
            error: "Too many concurrent requests",
            message: "Server band — 2 soniya kutib qayta urinib ko'ring",
            retryAfterMs: 2_000,
        });
        return;
    }
    heavyConcurrent++;
    res.on("finish", () => { heavyConcurrent = Math.max(0, heavyConcurrent - 1); });
    res.on("close", () => { heavyConcurrent = Math.max(0, heavyConcurrent - 1); });
    next();
}
/* ── Combined: all three in one call ─────────────────────────── */
export function resilienceMiddleware(req, res, next) {
    requestTimeout(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }
        loadShedder(req, res, (err2) => {
            if (err2) {
                next(err2);
                return;
            }
            concurrencyCap(req, res, next);
        });
    });
}
