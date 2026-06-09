# OlCha Go — Real-Time Microservice

High-performance Go service powering OlCha's real-time features.

## Tech stack
- **Language**: Go 1.25
- **WebSocket**: `gorilla/websocket` — persistent connections for live notifications
- **DB**: `lib/pq` — PostgreSQL (optional, falls back gracefully)
- **Logging**: `rs/zerolog` structured JSON logs
- **CORS**: `rs/cors`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/go/health` | Health check |
| GET | `/go/stats` | WebSocket connection stats |
| GET | `/go/trending` | Trending hashtags (DB or mock) |
| POST | `/go/rank` | Feed ranking (OlCha ranking formula) |
| POST | `/go/notify` | Push real-time event to user(s) via WS |
| WS | `/go/ws?userId=N` | WebSocket connection for user N |

## Feed Ranking Formula

OlCha Go uses a custom ranking algorithm combining:
- **Wilson score** (statistical lower bound on like rate)
- **Engagement velocity** (likes×1 + comments×3 + shares×5 normalized by views)
- **Recency decay** (exponential half-life of 12 hours)

Score = (wilson×0.4 + engRate×0.3 + decay×0.3) × 1000

## Build

```bash
cd artifacts/olcha-go
go build -o bin/olcha-go ./cmd/server/
./bin/olcha-go
```

## Environment

- `PORT` — listen port (default: 8082)
- `DATABASE_URL` — PostgreSQL connection string (optional)
