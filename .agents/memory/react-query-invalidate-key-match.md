---
name: React Query invalidateQueries key must match active query params
description: Generated getXQueryKey(params) calls used for cache invalidation must pass the exact same params object the live hook used, or invalidation silently no-ops.
---

`invalidateQueries({ queryKey: getListXQueryKey() })` only matches cache entries whose key is identical. If the component's live query hook was called with params (e.g. `{ limit: 20 }`), the generated key includes those params, so calling the generated key-helper with no args produces a different key and invalidation does nothing — no error, just stale data after a mutation.

**Why:** Found while wiring an optimistic follow/unfollow mutation in Nexus's Reels page — the mutation succeeded and the DB was correct, but the list didn't refresh because the invalidation key omitted the `limit` param the page's query actually used.

**How to apply:** When invalidating a query after a mutation, pass the exact same params object to the `getXQueryKey()` helper as the params used by the live `useX(params)` hook in that component. If unsure, grep the component for its query hook call to confirm the params shape.
