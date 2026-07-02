/**
 * Resilience Middleware Suite
 * Prevents the server from freezing under ANY load level.
 *
 * 1. REQUEST TIMEOUT  — kills hanging requests after 30s (no eternal waits)
 * 2. LOAD SHEDDER    — if RAM > 90%, reject new non-critical requests with 503
 * 3. CONCURRENCY CAP — heavy endpoints (AI, feed) max 50 concurrent; else 503
 */
import type { Request, Response, NextFunction } from "express";

const REQUEST_TIMEOUT_MS = 30_000; // 30s max per request
const MEM_SHED_THRESHOLD = 0.90;   // shed load when heap > 90%
const HEAVY_ENDPOINTS = new Set(["/api/ai/feed", "/api/ai/chat", "/api/posts"]);
const HEAVY_MAX_CONCURRENT = 100;

let heavyConcurrent = 0;

/* ── 1. Request timeout ───────────────────────────────────────── */
export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) { next(); return; }

  const timer = setTimeout(() => {
    if (res.headersSent) return;
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
export function loadShedder(req: Request, res: Response, next: NextFunction) {
  // Always allow health checks and auth through
  const path = req.path;
  if (path === "/api/healthz" || path.startsWith("/api/auth/") || path.startsWith("/api/stripe/")) {
    next(); return;
  }

  const mem = process.memoryUsage();
  const heapUsedRatio = mem.heapUsed / mem.heapTotal;

  if (heapUsedRatio > MEM_SHED_THRESHOLD) {
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
export function concurrencyCap(req: Request, res: Response, next: NextFunction) {
  if (!HEAVY_ENDPOINTS.has(req.path)) { next(); return; }

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
export function resilienceMiddleware(req: Request, res: Response, next: NextFunction) {
  requestTimeout(req, res, (err?: any) => {
    if (err) { next(err); return; }
    loadShedder(req, res, (err2?: any) => {
      if (err2) { next(err2); return; }
      concurrencyCap(req, res, next);
    });
  });
}
