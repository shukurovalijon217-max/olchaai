---
name: BullMQ queue setup
description: BullMQ queues in api-server — setup details, known gap (not wired into routes yet)
---

## Rule
`queue.ts` exports 3 BullMQ queues. They are initialized but NOT yet used by route handlers — routes still call `sendNotification()` inline.

**Why:** BullMQ was added as infrastructure. Wiring it into routes is Task #107.

**How to apply:**
- When adding a new notification-sending route, use `enqueueNotification()` not `sendNotification()` directly.
- Native Redis URL is constructed: `rediss://default:TOKEN@HOST:6380` from `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- In dev (no Redis), all queues fall back to `setImmediate` fire-and-forget silently.
- `bullReady` boolean exported to check if BullMQ is active.
