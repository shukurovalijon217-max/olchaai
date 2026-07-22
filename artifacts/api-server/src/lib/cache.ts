/**
 * Lightweight in-memory TTL + LRU cache.
 * Eliminates repeated DB round-trips on hot read paths.
 *
 * Exports:
 *   cacheAside(namespace, key, loader, ttlSec) — read-through helper
 *   cacheDel(namespace, key)                   — single key invalidation
 *   cacheDelPattern(namespaceOrPattern, prefix?) — prefix invalidation (overloaded)
 *   cacheGet<T>(key)                            — flat global cache get
 *   cacheSet(key, value, ttlMs)                 — flat global cache set
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache<T> {
  private map = new Map<string, Entry<T>>();
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  del(key: string): void { this.map.delete(key); }

  delPrefix(prefix: string): void {
    for (const k of this.map.keys()) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }

  clear(): void { this.map.clear(); }
  size(): number { return this.map.size; }
}

/* ── Shared cache buckets ─────────────────────────────────────────────── */
export const feedCache     = new LRUCache<unknown>(200);
export const profileCache  = new LRUCache<unknown>(300);
export const trendingCache = new LRUCache<unknown>(50);
export const notifCache    = new LRUCache<unknown>(500);
export const convoCache    = new LRUCache<unknown>(300);
const globalCache          = new LRUCache<unknown>(1000);

export const TTL = {
  FEED:     45_000,
  PROFILE:  5 * 60_000,
  TRENDING: 60_000,
  NOTIF:    30_000,
  CONVO:    20_000,
  SEARCH:   30_000,
} as const;

/* ── Namespace → bucket mapping ──────────────────────────────────────── */
const ALL_BUCKETS: LRUCache<unknown>[] = [feedCache, profileCache, trendingCache, notifCache, convoCache, globalCache];

const buckets: Record<string, LRUCache<unknown>> = {
  posts:     feedCache,
  feed:      feedCache,
  profile:   profileCache,
  trending:  trendingCache,
  notif:     notifCache,
  convo:     convoCache,
  reels:     feedCache,
  stories:   feedCache,
  users:     profileCache,
  global:    globalCache,
};

function getBucket(ns: string): LRUCache<unknown> {
  return buckets[ns] ?? globalCache;
}

/* ── cacheAside — read-through helper ───────────────────────────────── */
export async function cacheAside<T>(
  namespace: string,
  key: string,
  loader: () => Promise<T>,
  ttlSec: number,
): Promise<T> {
  if (ttlSec <= 0) return loader();
  const bucket = getBucket(namespace);
  const hit = bucket.get(key) as T | undefined;
  if (hit !== undefined) return hit;
  const value = await loader();
  bucket.set(key, value as unknown, ttlSec * 1_000);
  return value;
}

/* ── Invalidation helpers ────────────────────────────────────────────── */
export function cacheDel(namespace: string, key: string): void {
  getBucket(namespace).del(key);
}

/**
 * Overloaded:
 *   cacheDelPattern("prefix:")               — search all buckets (legacy 1-arg)
 *   cacheDelPattern("namespace", "prefix:")  — search named bucket only
 */
export function cacheDelPattern(namespaceOrPattern: string, prefix?: string): void {
  if (prefix === undefined) {
    /* Legacy 1-arg mode: scan every bucket */
    for (const b of ALL_BUCKETS) b.delPrefix(namespaceOrPattern);
  } else {
    getBucket(namespaceOrPattern).delPrefix(prefix);
  }
}

/* ── Flat global cache helpers (compat for reels.ts / media.ts) ─────── */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  return globalCache.get(key) as T | undefined;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  globalCache.set(key, value as unknown, ttlMs);
}
