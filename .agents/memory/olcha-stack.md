---
name: OlCha platform stack
description: Key architecture pointers for Go, Express, Nexus, and Expo artifacts
---

# OlCha Stack

**Artifacts:**
- Nexus web: `artifacts/nexus` → `/`
- Express API: `artifacts/api-server` → `/api/` (port 8080)
- Go real-time: `artifacts/olcha-go` → `/go/` (port 8099)
- Expo mobile: `artifacts/olcha-mobile`

**Go service:**
- Source: `artifacts/olcha-go/cmd/server/main.go`
- Build: `cd artifacts/olcha-go && go build -o bin/olcha-go ./cmd/server/`
- Must rebuild binary after any Go source change, then restart workflow `artifacts/olcha-go: Go Real-Time Service`
- WebSocket URL (browser): `${proto}://${window.location.host}/go/ws?userId=${userId}`

**API const in frontend:**
- `const API = import.meta.env.BASE_URL.replace(/\/$/, "")`

**Express patterns:**
- `res.status(X).json({}); return;` — Express 5 response pattern
- Never `console.log` — use `req.log` in routes, `logger` outside

**Wallet:**
- `balance` — UZS tiyin (÷100 = so'm), spending balance
- `earningsBalance` — creator earnings
- No generated hook for wallet — use manual fetch or add to OpenAPI spec

**Mobile app architecture (Expo, `olcha-mobile`):**
- Native devices: `(tabs)` screens (feed, reels, messages, profile, create) are the primary UI, wired to real API data via `@workspace/api-client-react` hooks + Bearer-token `AuthContext` (token in AsyncStorage).
- The old full-app WebView is demoted to `app/web.tsx`, a bridge screen (header+back, `path`/`title` params) reachable from native screens for flows not yet built natively.
- Web platform (`Platform.OS === "web"`) still renders the full IframeShell in `index.tsx`, unchanged.
- Native Bearer-token auth and the WebView's cookie-session auth are separate — no SSO bridge yet, so a user logged in natively is not logged into pages opened via `/web`.
- `POST /api/auth/register` requires `phone` server-side; any registration form (web or mobile) must collect and send it.

**Security:** `api-server/src/app.ts` has a global `res.json` override that recursively strips any `passwordHash` key from every `/api` response, as defense-in-depth on top of routes destructuring it out manually.

**Production has its own separate live database, distinct from dev.** `executeSql` with `environment: "production"` is read-only (SELECT only) against a replica — there is no writable connection string exposed to the agent for prod. To fix bad prod *data* (not schema), write an idempotent cleanup routine in server startup code (guarded so it only matches known-bad rows and no-ops once clean) and ship it via Publish; it then runs once against prod's own DB when the deployed server boots. Verify the same routine is a safe no-op in dev first.

**Why:** These pointers save rebuild steps and prevent common mistakes across sessions.
