---
name: OTube collab/challenges API contracts
description: Non-obvious field names for reel collaborators and challenges endpoints — easy to get wrong when wiring frontend to these routes.
---

- `POST /api/reels/collaborators` invites by **username handle**, not a user id: body is `{ inviteeHandle: string, permission?: "view"|"edit" }` (route resolves `inviteeHandle` to a user row server-side). List is owner-scoped: `GET /api/reels/collaborators` returns only the current session user's own invites (no `:reelId` in the path). Remove is `DELETE /api/reels/collaborators/:id` where `:id` is the collaborator-row id, not the reel id or invitee id.
- `POST /api/challenges` requires `{ name, hashtag, category }` — NOT `title`/`description`. `description` is optional; sending `title` instead of `name` gets a 400 "name, hashtag, category talab qilinadi".
- There is no dedicated "total views" aggregate endpoint for a creator. To sum a user's total reel views, fetch `GET /api/reels?userId=<id>&limit=<n>` and reduce `viewsCount` client-side — this is the pattern used for the OTube revenue/settings drawer.

**Why:** these were the actual causes of 404/400s during OTube Collab-tab and Challenges-CTA integration; the OpenAPI examples in this area historically drifted from the older mock code they replaced.
