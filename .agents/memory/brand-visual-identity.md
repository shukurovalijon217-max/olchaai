---
name: OlchaAI brand visual identity spec
description: Per-letter wordmark color spec and favicon design constraints for the OlchaAI brand — read before touching logo, favicon, or OG/meta assets.
---

The brand name is "OlChaAI" (O-l-C-h-a-A-I) with a fixed per-letter color treatment, not a single flat color: O = purple, l = red-gold, C (uppercase) = purple, h = red, a = shimmering silver-gold, "AI" = neon shimmer. This is centralized in one shared wordmark component so every usage (header, sidebar, login, 404 page) stays in sync — never re-implement the gradient/text styling inline at a second call site.

Plain running UI copy (button labels, sentences like "Sign in to OlchaAI") intentionally keeps standard "OlchaAI" casing/coloring — the stylized per-letter treatment is reserved for the dedicated wordmark/logo component, to avoid jarring mixed-case text inside sentences.

The favicon/app-icon must never have a solid black square background — this was an explicit user complaint about the previous icon (black square + red sphere + ring). Because a full 7-letter wordmark is illegible at favicon size, the favicon uses a simplified single-letter/ring mark instead of literally rendering the wordmark, with a transparent background.

**Why:** the user's original complaint was specifically that the brand appeared inconsistently ("OlCha" / "OlcaAI") and looked unwanted (black-square favicon) both in-app and in Google search results — search/OG appearance is driven by `<title>`/`og:title`/`twitter:title` meta tags and `favicon`/`opengraph` image files, which are independent of in-app component styling and must be fixed separately (see `rebranding-brand-string.md` for the general rebrand-pitfalls checklist).

**How to apply:** when editing anything logo/brand-related, reuse the existing shared wordmark component instead of hand-rolling colors; when editing favicon/OG assets, regenerate from a transparent-background source (SVG rasterized with `convert -background none`) and verify `<title>`/OG meta tags say the full correct brand name in every HTML entry point (web app, any secondary web artifact).
