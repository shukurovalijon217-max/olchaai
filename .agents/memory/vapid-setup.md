---
name: VAPID Web Push setup
description: Browser Web Push notification keys and endpoint
---

## Keys
- `VAPID_PUBLIC_KEY` — env var (shared), safe to expose to browsers
- `VAPID_PRIVATE_KEY` — secret, never expose
- `VAPID_SUBJECT` — falls back to `mailto:admin@gilosai.com` if not set

## Public key endpoint
GET /api/notifications/vapid-key → `{"publicKey": "..."}`
Frontend calls this to register a push subscription.

## Push subscription flow
1. Frontend fetches VAPID public key
2. `navigator.serviceWorker.ready.pushManager.subscribe({userVisibleOnly:true, applicationServerKey})`
3. POST /api/notifications/push-subscribe with the subscription object
4. Server calls `web-push` library with the stored subscription on events

**Why:** Web Push requires VAPID authentication so browsers trust the push server identity.
