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
const UPSTASH_URL   = process.env["UPSTASH_REDIS_REST_URL"];
const UPSTASH_TOKEN = process.env["UPSTASH_REDIS_REST_TOKEN"];

let redis: Redis | null = null;
if (UPSTASH_URL && UPSTASH_TOKEN) {
  redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  console.log("[cache] Redis mode active (Upstash)");
} else {
  console.log("[cache] In-memory mode (set UPSTASH_REDIS_REST_URL to enable Redis)");
}

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
  if (redis) { try { await redis.del(key); } catch {} }
  store.delete(key);
}

export async function cacheDelPatternAsync(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(`${pattern}*`);
      if (keys.length) await redis.del(...keys);
    } catch {}
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
    redis.keys(`${pattern}*`).then(keys => {
      if (keys.length) redis!.del(...keys).catch(() => {});
    }).catch(() => {});
  }
}

export const isRedisActive = () => redis !== null;
