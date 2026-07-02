---
name: HMAC Bearer Auth
description: Mobile API token format — HMAC-signed, breaking change from old plain userId tokens
---

## Location
`artifacts/api-server/src/lib/security.ts`

## Token format
`{userId}:{hmac16chars}` — HMAC-SHA256 of userId using SESSION_SECRET, truncated to 16 chars hex

## Functions
- `signMobileToken(userId: number): string` — creates a signed Bearer token
- `verifyMobileToken(token: string): number | null` — verifies and returns userId or null

## Usage in app.ts
```ts
const { verifyMobileToken } = require("./lib/security");
const uid = verifyMobileToken(auth.slice(7)); // strip "Bearer "
```

## Rate limiting
IP-based rate limiter also in `security.ts` — 300 req/min per IP, returns 429 on excess

## BREAKING CHANGE
Old mobile tokens were plain `userId` strings. New format is `userId:hmac16chars`.
Any existing mobile sessions will fail auth after this change is deployed.

**Why:** Plain userId tokens are trivially forgeable — any user could impersonate any other user by changing the token string.
**How to apply:** When adding new mobile login endpoints, always call `signMobileToken(userId)` and return the result as the Bearer token.
