# OlCha — AI-powered super social platform

OlCha (olchaai.com) is an AI-powered social network: a feed-based platform (posts, reels, stories, marketplace, live, messaging) layered with a set of unique "Funksiyalar Hub" (Feature Hub) AI/privacy features not found on other social networks.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080, mounted at `/api`)
- `pnpm --filter @workspace/nexus run dev` — run the Nexus web frontend (mounted at `/`)
- `pnpm --filter @workspace/ai-core run dev` — run the AI Core service (moderation, analytics, orchestrator; port 9000)
- `cd artifacts/olcha-go && go build -o bin/olcha-go ./cmd/server/` — rebuild the Go real-time service after any Go source change, then restart its workflow (port 8099, mounted at `/go`)
- `pnpm run typecheck` — full typecheck across all packages (libs first, then artifacts)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (`lib/api-spec/openapi.yaml`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only); if this hangs on a TTY prompt in this sandbox, fall back to a targeted `psql "$DATABASE_URL" -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..."`
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- Web: React + Vite (`artifacts/nexus`)
- Mobile: Expo (`artifacts/olcha-mobile`)
- Real-time/presence: Go (`artifacts/olcha-go`)
- AI service: Node (`artifacts/ai-core`) — moderation, sentiment/content analysis, feed personalization signals
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (CJS bundle)
- Payments: Stripe (creator subscriptions/plans, premium tiers)
- AI: OpenAI (`OPENAI_API_KEY` used directly, not via Replit AI proxy)

## Where things live

- `artifacts/nexus` — main web app (feed, reels, marketplace, messaging, Feature Hub, settings)
- `artifacts/api-server/src/routes` — Express route modules, one file per domain (posts, users, auth, messages, search, ai, admin, focusShield, ghost/presence, anonInbox, etc.)
- `artifacts/api-server/src/lib` — shared server helpers (e.g. `midnightVisibility.ts`)
- `artifacts/ai-core` — standalone AI service (moderation queue, analytics, orchestrator heartbeat)
- `artifacts/olcha-go/cmd/server/main.go` — Go real-time/presence service source
- `artifacts/olcha-mobile` — Expo mobile client
- `lib/db/src/schema` — Drizzle schema, source of truth for the DB shape
- `lib/api-spec/openapi.yaml` — source of truth for the API contract; run codegen after editing
- `artifacts/nexus/src/lib/i18n.ts` — all UI copy, keyed by namespace (e.g. `featurehub.*`), with `uz` as the source-of-truth language and `en` maintained by hand; other languages auto-translate and fall back to `en` per-key when a key is missing

## Architecture decisions

- **Funksiyalar Hub (Feature Hub) features are real, schema-backed features, not client-only toggles.** Each of the 12 features either reuses an existing table/column or adds one, with server-side enforcement (visibility filtering, muting, scheduled delivery, etc.) gated by a per-user preference toggle. `grow_together` and `social_aura` are an intentional, architect-approved exception and remain locked "coming soon."
- **i18n fallback strategy:** i18next `fallbackLng: "en"` means any auto-translated language bundle missing a key silently falls back to English for that key — new keys don't require bumping the translation cache version unless doing a broad content overhaul.
- **Midnight Confessions posts (`midnightOnly` on `posts`) are hidden from everyone, including the author, outside the 23:00–05:00 local window** (per-user `users.timezone`, UTC fallback) — this matches the literal feature description ("posts only visible 23:00–05:00") rather than giving the author a standing exemption. The admin moderation route intentionally ignores this filter so moderators always see everything.
- **Focus Shield mutes notifications, it does not block message delivery** — messages from non-allowlisted senders during the configured hours are still stored and delivered, only the notify/sound signal is suppressed.
- Cross-service routing goes through the shared reverse proxy (`localhost:80`), path-scoped per artifact (`/api`, `/go`, `/` for web). Never call service ports directly, and never add per-artifact CORS/proxy configs to reach another artifact.
- **Mobile (`olcha-mobile`) is native-first on native devices.** The `(tabs)` screens (feed, reels, messages, profile, create) are the primary UI on iOS/Android, all wired to real API data via `@workspace/api-client-react` hooks and a Bearer-token `AuthContext`. The old full-app WebView now lives at `app/web.tsx` (a bridge screen with header/back, accepts `path`/`title` params) and is only reachable from within native screens for flows not yet natively built. On web (`Platform.OS === "web"`), `index.tsx` still renders the full IframeShell unchanged.
- **Mobile auth and the WebView bridge use two separate session mechanisms** — native screens authenticate with a Bearer token (`AuthContext`, stored in AsyncStorage), while `app/web.tsx` loads the Nexus web app which uses cookie-based sessions. A user logged in natively is not automatically logged into pages opened via `/web` — there is no SSO bridge between them yet. Worth solving if WebView usage grows.
- **Server responses are defense-in-depth scrubbed of `passwordHash`** via a global `res.json` override in `api-server/src/app.ts` (recursively strips any `passwordHash` key before sending). Individual routes should still destructure it out explicitly, but this guarantees it can never leak even if a route forgets.
- **OTube (video hub) AI Studio, Collab tab, Challenges CTA, and Revenue are all real, schema/endpoint-backed features** — no mocked timers or `Math.random` placeholders remain. AI Dubbing and Collab "Version History" are intentionally labeled "Tez orada" (coming soon), not faked.
- **Poll votes (`PollWidget` in `FeedCard.tsx`) are real** — fetched from `GET /api/posts/:id/votes` on mount and submitted via `{userId, optionIndex}`; the UI reverts optimistic state if the server call fails.
- **Wallet deposits go through real Stripe Checkout, never an instant fake credit.** `POST /wallet/deposit` creates a real Checkout session (only for `visa`/`mastercard`/`global` — `click`/`payme` are labeled "Tez orada", no real integration exists); the wallet is only credited by `POST /wallet/deposit/confirm` after Stripe confirms the session is actually paid, and that confirm step is idempotent (won't double-credit if called twice).
- **Wallet withdrawals are held, not instantly paid out.** `POST /wallet/withdraw` immediately deducts the balance (hold) but inserts the transaction as `status: "pending"` with a JSON `metadata` breakdown (`fromPersonal`/`fromEarnings`/`fromAdRevenue`/`commission`/`accountDetails`) since there is no automated payout rail (Click/Payme/bank transfer) — same disabled-provider gate as deposit. An admin must review and resolve it via `GET/PATCH /api/admin/wallet/withdrawals` (approve → `completed` + commission applied to the platform's own admin wallet ledger; reject → refund from `metadata` + `cancelled`). Both actions are guarded against double-processing an already-resolved request. `AdminPage.tsx` Finance tab has a withdrawal review list mirroring the existing payout-request UI.

## Product

OlCha is a full social feed platform (posts, reels, stories, live, marketplace, groups, messaging, notifications) plus a "Funksiyalar Hub" of 12 distinctive features: Sound Notifications, Time Capsule (delayed message delivery), Anonymous Question Box, Mirror Mode (view your own profile as a stranger), Ghost Mode (temporary invisible presence), Energy Broadcast (24h energy-level status), Emotion Radar (pre-post sentiment check), Echo Chamber Detector (feed diversity warning), Focus Shield (scoped notification muting), Midnight Confessions (posts only visible 23:00–05:00), and two locked "coming soon" features (Grow Together, Social Aura).

## User preferences

- User communicates in Uzbek; keep responses in Uzbek — plain, structured, non-technical where possible.
- `uz` is the source-of-truth language for all UI copy; write `en` by hand alongside it, let other languages auto-translate with fallback.

## Gotchas

- `drizzle-kit push` / `push --force` hang on a TTY prompt in this sandbox — use a targeted `psql "$DATABASE_URL" -c "ALTER TABLE ..."` instead for one-off column additions, then keep `lib/db/src/schema` in sync by hand.
- There is pre-existing schema drift: a few live DB columns on `posts` (e.g. `scheduled_at`, `hot_take`, `aura_score`, `audio_trim_start/end` as `real`) are not yet reflected in `lib/db/src/schema/posts.ts`. Not caused by recent work — worth reconciling in a future pass.
- The Playwright-based e2e testing tool (`runTest`) has repeatedly hit "Maximum testing iterations (10) reached" in this environment, even for minimal login-only smoke tests. When this happens, fall back to full curl-based verification (auth cookie flow + direct endpoint checks) plus `pnpm run typecheck` and workflow log inspection.
- `POST /api/posts` expects `authorId` in the request body (not derived from the session) — pass it explicitly when testing via curl.
- `POST /api/auth/register` requires `phone` (validated, min 9 digits) in addition to `username`/`displayName`/`email`/`password` — any new client-side registration form (web or mobile) must collect and send it or the request 400s.
- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`, and rebuild the Go binary after any change under `artifacts/olcha-go`, before restarting workflows.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
