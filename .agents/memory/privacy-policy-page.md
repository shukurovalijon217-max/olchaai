---
name: Privacy Policy page pattern
description: Where the GilosAI Privacy Policy lives and how it's linked
---

`/privacy` route renders `artifacts/nexus/src/pages/PrivacyPolicyPage.tsx` (modeled on the existing `/about` AboutPage layout/style). Content is real (data collection, storage, cross-border transfer, retention period, cookies, user rights, children's privacy, breach notification, policy changes, contact), sourced from `privacy_policy.*` i18n keys (uz is source-of-truth, en written by hand, other 98 langs auto-translate via the existing bundle-translate pipeline).

**Why:** user requested a real, working Privacy Policy that also satisfies international privacy law expectations (GDPR EU, CCPA California, Uzbekistan's Law on Personal Data) — not a bare-minimum stub. Requires the standard GDPR-adjacent disclosure set: legal basis/rights (access, rectification, erasure, portability, objection, right to complain to a supervisory authority), cross-border transfer safeguards, retention period, cookie disclosure, children's-data exclusion (<13), and a 72-hour breach-notification commitment.

**How to apply:** linked in two places — LoginPage.tsx footer (next to "Haqida"/About) and SettingsPage.tsx privacy tab (as a `Link` row above the danger-zone/delete-account block). If new privacy-relevant features are added (e.g. new data collection, new third-party processor), update the matching `privacy_policy.*` keys in uz.json/en.json to stay accurate — don't let the policy drift from actual behavior.
