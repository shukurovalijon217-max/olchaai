---
name: In-memory LRU cache module
description: api-server cache.ts — LRU TTL cache with namespace buckets and compat helpers
---

## API surface

```ts
cacheAside(namespace, key, loader, ttlSec)  // read-through
cacheDel(namespace, key)                     // single key
cacheDelPattern(patternOrNs, prefix?)       // 1 arg = all buckets (legacy); 2 args = named bucket
cacheGet<T>(key)                            // flat global cache (async)
cacheSet(key, value, ttlMs)                 // flat global cache (async)
```

## Namespace → bucket mapping
- posts / feed / reels → feedCache (200 slots)
- profile / users → profileCache (300 slots)
- trending → trendingCache (50 slots)
- notif → notifCache (500 slots)
- convo → convoCache (300 slots)
- unknown / global → globalCache (1000 slots)

## TTL constants (in cache.ts)
- FEED: 45s, PROFILE: 5min, TRENDING: 60s, NOTIF: 30s, CONVO: 20s, SEARCH: 30s

## Already cached routes
- GET /posts — 15s TTL for anonymous public feed (viewerId=none, offset<60)
- GET /conversations — 20s TTL per userId
- Reels, stories, users: cacheAside used, cacheDelPattern on mutations

**Why:** Cross-region DB latency can be ~100ms+. Caching hot reads drops response time to <50ms for cache hits.

## Backward compat note
Old callers use `cacheDelPattern("prefix:")` (1 arg) — still works via all-bucket scan.
New code should prefer `cacheDelPattern("namespace", "prefix:")` for precision.
