/**
 * Per-user + per-IP advanced rate limiting
 * Layers:
 *   1. Per-user: 300 req/min (authenticated)
 *   2. Per-IP global: 600 req/min (unauthenticated)
 *   3. Sensitive endpoints (auth/register/login): 10 req/min per IP
 *   4. Burst detection: 40+ requests in 5s → temporary 30s block
 *   5. Write endpoint throttle: POST/PUT/PATCH/DELETE 60/min per user
 */
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

interface Window {
  count: number;
  windowStart: number;
  burstCount: number;
  burstStart: number;
  blockedUntil?: number;
}

const userWindows   = new Map<number, Window>();
const ipWindows     = new Map<string, Window>();
const ipAuthWindows = new Map<string, Window>();
const userWriteWin  = new Map<number, Window>();

const WINDOW_MS      = 60_000;
const BURST_MS       = 5_000;
const USER_LIMIT     = 300;
const IP_LIMIT       = 600;
const AUTH_LIMIT     = 10;
const BURST_LIMIT    = 40;
const WRITE_LIMIT    = 60;
const BLOCK_DURATION = 30_000;

/* ── Auth / sensitive endpoint patterns ─────────────────────── */
const AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify",
];

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.socket?.remoteAddress ?? "unknown";
}

function tick(win: Window, limit: number, now: number): { allowed: boolean; remaining: number } {
  if (win.blockedUntil && win.blockedUntil > now) {
    return { allowed: false, remaining: 0 };
  }
  if (win.blockedUntil && win.blockedUntil <= now) {
    win.blockedUntil = undefined;
  }

  // Reset main window
  if (now - win.windowStart > WINDOW_MS) {
    win.count = 0;
    win.windowStart = now;
  }
  win.count++;

  // Burst detection
  if (now - win.burstStart > BURST_MS) {
    win.burstCount = 0;
    win.burstStart = now;
  }
  win.burstCount++;

  if (win.burstCount > BURST_LIMIT) {
    win.blockedUntil = now + BLOCK_DURATION;
    return { allowed: false, remaining: 0 };
  }

  if (win.count > limit) {
    return { allowed: false, remaining: Math.max(0, limit - win.count) };
  }

  return { allowed: true, remaining: Math.max(0, limit - win.count) };
}

function getOrCreate(map: Map<unknown, Window>, key: unknown): Window {
  let w = map.get(key as any);
  if (!w) {
    const now = Date.now();
    w = { count: 0, windowStart: now, burstCount: 0, burstStart: now };
    map.set(key as any, w);
  }
  return w;
}

/* ── Cleanup stale entries every 5 minutes ───────────────────── */
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [k, v] of userWindows)   { if (v.windowStart < cutoff && !v.blockedUntil) userWindows.delete(k); }
  for (const [k, v] of ipWindows)     { if (v.windowStart < cutoff && !v.blockedUntil) ipWindows.delete(k); }
  for (const [k, v] of ipAuthWindows) { if (v.windowStart < cutoff) ipAuthWindows.delete(k); }
  for (const [k, v] of userWriteWin)  { if (v.windowStart < cutoff) userWriteWin.delete(k); }
}, 5 * 60_000);

/* ── Middleware ───────────────────────────────────────────────── */
export function userRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now    = Date.now();
  const ip     = getIp(req);
  const userId = (req.session as { userId?: number })?.userId;
  const path   = req.path ?? "/";
  const method = req.method ?? "GET";

  // 1. Sensitive auth endpoint: 10/min per IP
  if (AUTH_PATHS.some(p => path.startsWith(p))) {
    const win = getOrCreate(ipAuthWindows, ip);
    const { allowed, remaining } = tick(win, AUTH_LIMIT, now);
    if (!allowed) {
      logger.warn({ ip, path }, "Rate limit: auth endpoint exceeded");
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "Juda ko'p urinish. 1 daqiqadan keyin qayta urining." });
      return;
    }
    res.setHeader("X-RateLimit-Remaining", remaining);
    next(); return;
  }

  // 2. Per-user rate limit (authenticated)
  if (userId) {
    const win = getOrCreate(userWindows, userId);
    const { allowed, remaining } = tick(win, USER_LIMIT, now);
    if (!allowed) {
      logger.warn({ userId, path }, "Rate limit: user limit exceeded");
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "Juda ko'p so'rov. Biroz kuting." });
      return;
    }
    res.setHeader("X-RateLimit-Remaining", remaining);

    // 3. Write throttle per user
    if (WRITE_METHODS.has(method)) {
      const wwin = getOrCreate(userWriteWin, userId);
      const { allowed: wAllowed } = tick(wwin, WRITE_LIMIT, now);
      if (!wAllowed) {
        logger.warn({ userId, method, path }, "Rate limit: user write limit exceeded");
        res.status(429).json({ error: "Yozish chastotasi oshib ketdi. Biroz kuting." });
        return;
      }
    }

    next(); return;
  }

  // 4. Per-IP limit (unauthenticated)
  const win = getOrCreate(ipWindows, ip);
  const { allowed, remaining } = tick(win, IP_LIMIT, now);
  if (!allowed) {
    logger.warn({ ip, path }, "Rate limit: IP limit exceeded");
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Juda ko'p so'rov. Biroz kuting." });
    return;
  }
  res.setHeader("X-RateLimit-Remaining", remaining);
  next();
}
