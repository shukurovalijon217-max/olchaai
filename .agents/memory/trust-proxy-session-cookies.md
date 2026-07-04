---
name: trust proxy required for secure session cookies
description: Express apps behind Replit's reverse proxy silently drop secure/sameSite=none session cookies without app.set("trust proxy", 1) — breaks all login-gated features in production only.
---

If Express `cookie.secure` is set based on `isProd` (or `sameSite: "none"` in prod for cross-site cookie needs), `app.set("trust proxy", 1)` must be called too, or `req.secure` stays `false` behind the TLS-terminating proxy and `express-session` silently refuses to set the cookie at all in production — dev is unaffected since `secure` is false there.

**Why:** Diagnosed via curl against a production deploy: registration returned 201 but no app session `Set-Cookie` appeared (only the infra's own affinity cookie), so the very next authenticated call 401'd. Dev worked perfectly end-to-end, which is what made this confusing — the bug only manifests in the production/proxied environment, never locally.

**How to apply:** Whenever a login flow, chat feature, or any authenticated endpoint works in dev but silently 401s only in production (with registration/login itself returning success), check for missing `trust proxy` before assuming the feature's own code is broken. Add `app.set("trust proxy", 1)` immediately after `express()` is constructed.
