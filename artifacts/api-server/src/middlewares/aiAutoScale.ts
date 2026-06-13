/**
 * AI Auto-Scale Middleware
 * Handles: per-user rate limiting, global RPS tracking,
 * memory pressure detection, connection throttling.
 * Runs transparently — billions of users never notice it.
 */
import type { Request, Response, NextFunction } from "express";

/* ─── Config ──────────────────────────────────────────────────────── */
const USER_MAX_RPS = 30;          // per-user requests per second
const USER_BURST_MAX = 60;        // token bucket max
const USER_REFILL_INTERVAL_MS = 1000;
const GLOBAL_WARNING_RPS = 2000;  // log warning above this
const GLOBAL_CRITICAL_RPS = 5000; // shed non-auth traffic above this
const MEMORY_WARN_MB = 400;
const MEMORY_CRITICAL_MB = 600;
const METRICS_WINDOW_MS = 10_000; // 10-second rolling window

/* ─── In-memory state ─────────────────────────────────────────────── */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  blocked: boolean;
  blockedUntil: number;
}

const userBuckets = new Map<string, TokenBucket>();
const requestTimestamps: number[] = [];   // rolling window for global RPS
let peakRps = 0;
let totalRequests = 0;
let throttledRequests = 0;
let activeConnections = 0;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function refillBucket(bucket: TokenBucket): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / USER_REFILL_INTERVAL_MS) * USER_MAX_RPS;
  bucket.tokens = Math.min(bucket.tokens + refill, USER_BURST_MAX);
  bucket.lastRefill = now;
}

function getOrCreateBucket(key: string): TokenBucket {
  let b = userBuckets.get(key);
  if (!b) {
    b = { tokens: USER_BURST_MAX, lastRefill: Date.now(), blocked: false, blockedUntil: 0 };
    userBuckets.set(key, b);
  }
  return b;
}

function currentRps(): number {
  const now = Date.now();
  const cutoff = now - METRICS_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < cutoff) {
    requestTimestamps.shift();
  }
  return Math.round((requestTimestamps.length / METRICS_WINDOW_MS) * 1000);
}

function memoryUsageMB(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

// Periodic cleanup of stale buckets (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of userBuckets.entries()) {
    if (now - bucket.lastRefill > 120_000) userBuckets.delete(key);
  }
}, 60_000);

/* ─── Main middleware ─────────────────────────────────────────────── */
export function aiAutoScaleMiddleware(req: Request, res: Response, next: NextFunction): void {
  totalRequests++;
  activeConnections++;
  res.on("finish", () => activeConnections--);

  const now = Date.now();
  requestTimestamps.push(now);

  const rps = currentRps();
  if (rps > peakRps) peakRps = rps;

  const memMB = memoryUsageMB();

  // Critical memory pressure — shed lowest-priority traffic
  if (memMB > MEMORY_CRITICAL_MB) {
    const session = (req as any).session;
    if (!session?.userId && !req.path.includes("/auth")) {
      throttledRequests++;
      res.status(503).setHeader("Retry-After", "5").json({
        error: "Server temporarily overloaded",
        message: "AI Auto-Scale: memory pressure — please retry in 5s",
        retryAfterMs: 5000,
      });
      return;
    }
  }

  // Global RPS critical — throttle anonymous
  if (rps > GLOBAL_CRITICAL_RPS) {
    const session = (req as any).session;
    if (!session?.userId) {
      throttledRequests++;
      res.status(429).setHeader("Retry-After", "2").json({
        error: "Too many requests",
        message: "AI Auto-Scale: global rate limit active — please retry shortly",
        retryAfterMs: 2000,
      });
      return;
    }
  }

  // Per-user rate limiting
  const userId = (req as any).session?.userId;
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const bucketKey = userId ? `u:${userId}` : `ip:${ip}`;

  const bucket = getOrCreateBucket(bucketKey);
  refillBucket(bucket);

  // Unblock if time expired
  if (bucket.blocked && now > bucket.blockedUntil) {
    bucket.blocked = false;
    bucket.tokens = USER_MAX_RPS;
  }

  if (bucket.blocked) {
    throttledRequests++;
    const waitMs = bucket.blockedUntil - now;
    res.status(429).setHeader("Retry-After", String(Math.ceil(waitMs / 1000))).json({
      error: "Rate limit exceeded",
      message: `AI Auto-Scale: too many requests — wait ${Math.ceil(waitMs / 1000)}s`,
      retryAfterMs: waitMs,
    });
    return;
  }

  if (bucket.tokens < 1) {
    throttledRequests++;
    bucket.blocked = true;
    bucket.blockedUntil = now + 5000; // block for 5s
    res.status(429).setHeader("Retry-After", "5").json({
      error: "Rate limit exceeded",
      message: "AI Auto-Scale: keling, tinchlaning — juda ko'p so'rov yubordingiz. 5 soniyadan so'ng qayta urinib ko'ring.",
      retryAfterMs: 5000,
    });
    return;
  }

  bucket.tokens--;

  // Attach scale metrics to response headers (useful for monitoring)
  res.setHeader("X-RPS", String(rps));
  res.setHeader("X-Mem-MB", String(memMB));

  next();
}

/* ─── Metrics export ──────────────────────────────────────────────── */
export function getScaleMetrics() {
  const rps = currentRps();
  const memMB = memoryUsageMB();
  const totalHeapMB = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
  const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const uptime = Math.round(process.uptime());

  const memPressure: "ok" | "warn" | "critical" =
    memMB > MEMORY_CRITICAL_MB ? "critical"
      : memMB > MEMORY_WARN_MB ? "warn" : "ok";

  const rpsPressure: "ok" | "warn" | "critical" =
    rps > GLOBAL_CRITICAL_RPS ? "critical"
      : rps > GLOBAL_WARNING_RPS ? "warn" : "ok";

  const health: "healthy" | "degraded" | "overloaded" =
    memPressure === "critical" || rpsPressure === "critical" ? "overloaded"
      : memPressure === "warn" || rpsPressure === "warn" ? "degraded" : "healthy";

  return {
    health,
    rps: { current: rps, peak: peakRps, warnAt: GLOBAL_WARNING_RPS, criticalAt: GLOBAL_CRITICAL_RPS, pressure: rpsPressure },
    memory: { heapUsedMB: memMB, heapTotalMB: totalHeapMB, rssMB, warnAt: MEMORY_WARN_MB, criticalAt: MEMORY_CRITICAL_MB, pressure: memPressure },
    connections: { active: activeConnections },
    requests: { total: totalRequests, throttled: throttledRequests, throttleRate: totalRequests > 0 ? Math.round((throttledRequests / totalRequests) * 10000) / 100 : 0 },
    buckets: { active: userBuckets.size },
    uptime,
  };
}
