---
name: Privacy Policy page pattern
description: Where the GilosAI Privacy Policy lives and how it's linked
---

`/privacy` route renders `artifacts/nexus/src/pages/PrivacyPolicyPage.tsx` (modeled on the existing `/about` AboutPage layout/style). Content is real (data collection, storage, third-party sharing, user rights, contact), sourced from `privacy_policy.*` i18n keys (uz is source-of-truth, en written by hand).

**Why:** user requested a real, working Privacy Policy for GDPR/local-law compliance, not a placeholder — must actually describe how OlchaAI/GilosAI stores and protects data (hashed passwords, no third-party data sale, Stripe only for payments).

**How to apply:** linked in two places — LoginPage.tsx footer (next to the existing "Haqida"/About link) and SettingsPage.tsx privacy tab (as a `Link` row above the danger-zone/delete-account block). If new privacy-relevant features are added (e.g. new data collection), update the `privacy_policy.collect_text`/`share_text` keys to stay accurate.
