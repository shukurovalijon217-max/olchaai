---
name: Safari red "!" address bar icon
description: What the small red/pink circled exclamation mark before the URL in iOS Safari's address bar actually means, and how to diagnose it.
---

The small red/pink filled circle with "!" positioned just left of the domain text in iOS Safari's address bar (distinct from the plain "Not Secure" HTTP label and from the Reader-mode "AA" icon) is Safari's **Fraudulent Website Warning residual indicator** (Safari's Safe Browsing feature, backed by Google/Tencent Safe Browsing lists). It appears after Safari showed a full-page "Deceptive Website Warning" and the user chose to proceed anyway; it persists as a reminder on that device/tab.

**Why:** New domains (fresh SSL cert, no history/reputation yet) are commonly auto-flagged by Safe Browsing heuristics shortly after going live, then cleared within ~1-2 days once nothing malicious is found. The live flag and the cached-on-device icon can be out of sync — check the live status independently before assuming the site is still flagged.

**How to apply:** To verify current status (not the cached device state), check `https://transparencyreport.google.com/safe-browsing/search?url=<domain>` via a web fetch/explore call. If it says "No unsafe content found" but the user's phone still shows the icon, it's a stale local cache — advise clearing Safari history/website data (Settings > Safari > Clear History and Website Data) or waiting for Safari's periodic list re-sync; this is a client-side artifact, not something fixable from app/server code. Do not confuse this with actual TLS certificate chain problems — verify those separately via `openssl s_client -showcerts`.
