# Cloudflare Transform Rule — Edge Cache for R2 Media

## Status: ✅ **LIVE — activated 2026-08-04 via Cloudflare dashboard**

The rule "R2 media immutable cache headers" is **Active** on zone `olchaai.com`
(created manually in the dashboard because the `CLOUDFLARE_API_TOKEN` Replit Secret
lacks the **Zone.Transform Rules: Edit** permission needed by the script).

Verified via curl on 2026-08-04:
```
$ curl -sI https://media.olchaai.com/uploads/032f4c3b-b2e1-49c9-ac37-45f1668cbede.jpg | grep -i cache-control
cache-control: public, max-age=31536000, immutable
```
Confirmed on multiple media files. Edge caching is now active with **zero code-path
dependency** — every response from `media.olchaai.com` carries the header regardless
of how the file was uploaded.

---

## What the rule does

Injects `Cache-Control: public, max-age=31536000, immutable` on **every** response
from `media.olchaai.com`. Because R2 custom domains are served via Cloudflare Workers
internally, Cache Rules (which are already in place) do **not** affect those responses —
only a Response Header Transform Rule does.

---

## Correct zone details

| Field | Value |
|-------|-------|
| Zone name | `olchaai.com` |
| Zone ID | `adc4577f3065cbe37a59a8929658ed02` |
| Media hostname | `media.olchaai.com` |

> **Note:** The `CLOUDFLARE_ZONE_ID` Replit Secret currently holds an old/wrong value
> (`6f4765ab…`). The script auto-discovers the correct zone at runtime, so this does not
> block the script — but the secret should be updated to `adc4577f3065cbe37a59a8929658ed02`.

---

## Option A — Re-run the script (recommended)

1. In the Cloudflare dashboard, go to **My Profile → API Tokens → Create Token → Create Custom Token**
2. Name: `GilosAI Deploy`
3. Permissions:
   - Zone | **Transform Rules** | Edit
   - Zone | **Zone** | Read
4. Zone Resources: Include → Specific zone → **olchaai.com**
5. Create the token, paste it into Replit Secrets as `CLOUDFLARE_API_TOKEN`
6. Run:
   ```bash
   pnpm tsx artifacts/api-server/scripts/setup-cf-cache-rule.ts
   ```

Expected output:
```
Token status: active
Auto-discovered zone: adc4577f3065cbe37a59a8929658ed02 (olchaai.com)
Existing http_response_headers_transform ruleset: <id>   ← or "Created new ruleset"
Created new Cache-Control rule — done.

✓ Cloudflare will now inject:
  Cache-Control: public, max-age=31536000, immutable
  on all responses from media.olchaai.com
```

---

## Option B — Cloudflare Dashboard (no script)

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **olchaai.com**
2. Left sidebar: **Rules → Transform Rules**
3. Click **Modify Response Header**
4. Click **Create rule**
5. Fill in:
   - **Rule name:** `R2 media immutable cache headers`
   - **When incoming requests match…** → Custom filter expression:
     ```
     (http.host eq "media.olchaai.com")
     ```
   - **Then…** → Set static → Header name: `Cache-Control` → Value:
     ```
     public, max-age=31536000, immutable
     ```
6. Click **Deploy**

---

## Verify

After the rule is active, run:
```bash
curl -sI https://media.olchaai.com/uploads/032f4c3b-b2e1-49c9-ac37-45f1668cbede.jpg | grep -i cache-control
```

Expected:
```
cache-control: public, max-age=31536000, immutable
```

---

## Existing Cache Rule (already active)

A Cache Rule (`http_request_cache_settings`) with ruleset ID `4435c59b54f14424b896f7f20af41a84`
and rule ID `6c352f71c3bf4b1988fa9a80f368b271` is already in place:

```json
{
  "description": "Cache R2 Media",
  "expression": "(http.host eq \"media.olchaai.com\")",
  "action": "set_cache_settings",
  "action_parameters": {
    "cache": true,
    "edge_ttl": { "mode": "override_origin", "default": 31536000 },
    "browser_ttl": { "mode": "override_origin", "default": 31536000 }
  },
  "enabled": true
}
```

This sets the Cloudflare **edge TTL** but does NOT modify response headers visible to
browsers/clients for R2 custom-domain responses. The Transform Rule above is still needed
to inject the `Cache-Control` header that clients and CDN validators inspect.
