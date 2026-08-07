---
name: Go realtime WebSocket auth
description: The Go service /go/ws now requires an HMAC token; deploy coordination rules to avoid breaking prod realtime.
---

# Go realtime WebSocket auth

## The rule
`/go/ws` rejects connections without a valid `?token=userId:hmac16` (HMAC-SHA256 of userId keyed by SESSION_SECRET, hex, first 16 chars — exact mirror of api-server `signMobileToken`). Origin allowlist: olchaai.com/www, localhost, *.replit.dev, *.up.railway.app; empty Origin (native apps) allowed. Web clients fetch the token from `GET /api/auth/realtime-token` (cached in `artifacts/nexus/src/lib/realtimeToken.ts`).

**Why:** Before this, userId came raw from the query string — anyone could impersonate any user in live chat/streams. Closed before public launch (2026-08-07).

**How to apply:**
- Any new WS client (web/mobile) must append `&token=`; mobile already passes its login token (same format).
- SESSION_SECRET must be IDENTICAL on the api service and the Go service (both fall back to the same built-in string when unset/<16 chars). If one has it set and the other doesn't, all realtime silently breaks with 401s.
- **Deploy Go + web bundle together.** Do not mirror main→replit-agent (or deploy the Go service) until SESSION_SECRET parity on Railway service `olchaai-go-production` is verified — old web clients without tokens will be rejected by a new Go build.
- Still open: `/go/notify` is unauthenticated and CORS is `*` (follow-up task exists).
