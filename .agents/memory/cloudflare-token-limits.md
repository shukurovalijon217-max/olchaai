---
name: Cloudflare token limits & R2 caching
description: What the project's Cloudflare API token can/can't do, and how R2 media edge caching actually works.
---

# Cloudflare token limits & R2 media caching

- The `CLOUDFLARE_API_TOKEN` in Replit Secrets is effectively read-only for rules: it can list zones/rulesets and write Zone Settings, but CANNOT create/edit Transform Rules or Page Rules ("request is not authorized").
- The `CLOUDFLARE_ZONE_ID` secret held a stale/wrong value; the correct zone for olchaai.com is `adc4577f3065cbe37a59a8929658ed02`. The setup script now auto-discovers the zone from R2_PUBLIC_URL hostname, so a stale ID doesn't block it.
- **R2 custom domains are served via Cloudflare Workers internally, so Cache Rules (`http_request_cache_settings`) do NOT affect their responses** — `cf-cache-status` stays DYNAMIC. Only a Response Header Transform Rule injects `Cache-Control` on them.
- The Transform Rule "R2 media immutable cache headers" (`http.host eq "media.olchaai.com"` → set `Cache-Control: public, max-age=31536000, immutable`) was created manually in the dashboard on 2026-08-04 and verified live via curl.

**Why:** repeated 403s wasted cycles; the user could not/would not mint a token with Transform Rules Edit — manual dashboard creation was the workable path.
**How to apply:** any future Cloudflare rule automation must first probe token write permissions (a create attempt distinguishes "not authorized" vs quota errors); prefer asking the user to act in the dashboard when the token is read-only.
