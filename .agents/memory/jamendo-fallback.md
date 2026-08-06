---
name: Jamendo music fallback
description: Jamendo fallback verification, client_id gotchas, and forced-provider test param
---

# Jamendo music fallback

- The public sandbox client_id `b6747d04` is permanently rate-limited ("Usage limits are exceeded") — it returns `results_count: 0` with HTTP 200, so failures look like empty searches, not errors. A real JAMENDO_CLIENT_ID secret is required.
- Jamendo Client ID is 8 hex chars; the 32-char value on the devportal is the Client *Secret* and yields "Invalid Client Id: Your credential is not authorized." Users often paste the wrong one — check length.
- `/api/music/search?provider=jamendo` forces the Jamendo path (bypasses Audius) for testing the fallback without Audius being down.
- Jamendo results carry direct CDN URLs (`https://prod-*.storage.jamendo.com/...`) in `preview` — played directly, not proxied through /api/music/stream.

**Why:** verified 2026-08-06 — natural fallback (Audius empty → Jamendo) and forced path both return `source:"jamendo"` with 40 results.
**How to apply:** if music search "returns nothing" for a Jamendo-served query, first check whether the workflow process actually has the current JAMENDO_CLIENT_ID (a workflow restart issued too soon after a secret update can keep the stale value — restart again and check `/proc/<pid>/environ`).
