/**
 * Unified cache layer.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * all operations go through Upstash Redis (HTTP-based, works on Railway/Render).
 * Otherwise falls back to a fast in-process Map — suitable for single-instance dev.
 *
 * Switch to Redis:
 *   1. Create a free database at https://console.upstash.com
 *   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Railway Variables
 *   3. No code changes needed — this file auto-detects and switches.
 */
import { Redis } from "@upstash/redis";

// ── Redis client (lazy, only if env vars present) ────────────────────────────
// Strip accidental surrounding quotes that Railway sometimes adds to variable values
// e.g. `"https://..."` → `https://...`
function stripQuotes(s: string | undefined): string | undefined {
  if (!s) return s;
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const UPSTASH_URL   = stripQuotes(process.env["UPSTASH_REDIS_REST_URL"]);
const UPSTASH_TOKEN = stripQuotes(process.env["UPSTASH_REDIS_REST_TOKEN"]);

let redis: Redis | null = null;
if (UPSTASH_URL && UPSTASH_TOKEN) {
  try {
    redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
    console.log("[cache] Redis client constructed — running startup ping...");
  } catch (err) {
    console.error("[cache] Failed to initialize Redis — falling back to in-memory:", err);
  }
} else {
  console.log("[cache] In-memory mode (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable Redis)");
}

/**
 * Boot-time connectivity check.
 * Fires PING against Upstash and disables Redis on failure so the API
 * never crashes due to a bad credential or quote-wrapped env var.
 * Called immediately after module load (fire-and-forget).
 */
async function validateRedisConnection(): Promise<void> {
  if (!redis) return;
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      console.log("[cache] Redis ping OK — Upstash connection verified");
    } else {
      console.warn(`[cache] Redis ping returned unexpected value (${pong}) — staying in Redis mode`);
    }
  } catch (err) {
    console.error(
      "[cache] ⚠️  Redis startup ping FAILED — disabling Redis and falling back to in-memory cache.",
      "\n         Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.",
      "\n         Error:", err,
    );
    redis = null;
  }
}

// Run validation immediately; do not await — module load must stay synchronous.
// Any Redis errors during the ping are caught inside validateRedisConnection().
validateRedisConnection().catch((err) => {
  console.error("[cache] Unexpected error in validateRedisConnection:", err);
  redis = null;
});

// ── In-memory fallback ────────────────────────────────────────────────────────
type CacheEntry<T> = { data: T; expiresAt: number };
const store = new Map<string, CacheEntry<unknown>>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) store.delete(key);
  }
}, 60_000);

// ── Public API ────────────────────────────────────────────────────────────────

export async function cacheGetAsync<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const val = await redis.get<T>(key);
      return val ?? null;
    } catch { return null; }
  }
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.data;
}

export async function cacheSetAsync<T>(key: string, data: T, ttlMs: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, data, { px: ttlMs });
    } catch { /* non-fatal — fall through to in-memory */ }
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function cacheDelAsync(key: string): Promise<void> {
  if (redis) {
    try { await redis.del(key); }
    catch (err) { console.warn("[cache] Redis DEL failed, key:", key, err); }
  }
  store.delete(key);
}

/**
 * SCAN-based pattern delete. Upstash prod users often lack permission for the
 * KEYS command (NOPERM) — SCAN is allowed and non-blocking.
 */
async function redisDelPattern(pattern: string): Promise<void> {
  if (!redis) return;
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, { match: `${pattern}*`, count: 100 });
    if (keys.length) await redis.del(...(keys as string[]));
    cursor = String(next);
  } while (cursor !== "0");
}

export async function cacheDelPatternAsync(pattern: string): Promise<void> {
  if (redis) {
    try {
      await redisDelPattern(pattern);
    } catch (err) { console.warn("[cache] Redis DEL pattern failed, pattern:", pattern, err); }
  }
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
}

export async function cacheAside<T>(
  namespace: string,
  key: string,
  fn: () => Promise<T>,
  ttlSec = 30,
): Promise<T> {
  if (ttlSec <= 0) return fn();
  const full = `${namespace}:${key}`;
  const cached = await cacheGetAsync<T>(full);
  if (cached !== null && cached !== undefined) return cached;
  const data = await fn();
  // Never cache null/undefined — a missing record today may exist tomorrow
  // (e.g. user created just after a failed lookup, or a transient DB error)
  if (data !== null && data !== undefined) {
    await cacheSetAsync(full, data, ttlSec * 1000);
  }
  return data;
}

// ── Synchronous shims (kept for callers that don't await) ────────────────────
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
  // Also write to Redis async (fire-and-forget) when available
  if (redis) redis.set(key, data, { px: ttlMs }).catch(() => {});
}

export function cacheDel(key: string): void {
  store.delete(key);
  if (redis) redis.del(key).catch(() => {});
}

export function cacheDelPattern(pattern: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
  if (redis) {
    redisDelPattern(pattern).catch(() => {});
  }
}

export const isRedisActive = () => redis !== null;
