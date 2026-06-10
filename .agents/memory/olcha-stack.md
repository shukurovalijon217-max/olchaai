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

**Why:** These pointers save rebuild steps and prevent common mistakes across sessions.
