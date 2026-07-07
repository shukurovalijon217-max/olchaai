type CacheEntry<T> = { data: T; expiresAt: number };
const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}

export function cacheDelPattern(pattern: string): void {
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
  const cached = cacheGet<T>(full);
  if (cached !== null) return cached;
  const data = await fn();
  cacheSet(full, data, ttlSec * 1000);
  return data;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) store.delete(key);
  }
}, 60_000);
