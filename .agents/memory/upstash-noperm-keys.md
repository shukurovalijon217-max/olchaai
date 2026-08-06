---
name: Upstash Redis NOPERM for KEYS command
description: Production Upstash Redis user cannot run KEYS; pattern-based cache invalidation silently fails in prod.
---

The production Upstash Redis credential rejects the `KEYS` command with `NOPERM`. Any cache-invalidation helper built on `redis.keys(pattern)` silently no-ops in production (errors are caught and only logged), so feed/list caches go stale until TTL.

**Why:** Discovered while debugging a publish 500 — Railway logs showed `[cache] Redis DEL pattern failed ... NOPERM ... 'keys'` on every post creation.

**How to apply:** Never use KEYS for invalidation against Upstash; use SCAN or tracked key sets. When "new content doesn't appear until later" is reported in prod, check for this first.
