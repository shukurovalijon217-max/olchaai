---
name: Rebranding a brand string across a monorepo
description: Pitfalls when renaming a product brand name (e.g. "OlCha" -> "OlchaAI") that appears in UI text, code identifiers, filenames, and third-party service records.
---

A brand-name find/replace is not just a text edit when the name also leaks into:

- **Code identifiers and filenames** (e.g. a hook named `useOlChaData.ts` exporting `useOlChaData`). A plain `sed` on file contents fixes the import statement's text but not the physical filename — the build breaks with `Cannot find module` until the file itself is renamed to match. Always typecheck after a bulk rename and fix cascading file/identifier mismatches.
- **Third-party service records looked up by name**, e.g. Stripe products found via `stripe.products.search({ query: "name:'<Brand> Premium'" })`. If the brand string in the search query is renamed in code but the live Stripe product's actual `name` field is not renamed via the Stripe API, the lookup stops matching and the code creates a duplicate product on next run instead of reusing the existing one. Treat any such search-by-name integration as needing an explicit, confirmed API rename (destructive) in lockstep with the code text change — never rename just one side.
- **Fabricated/mock data that happens to contain the old brand name** (e.g. a hardcoded fallback trending tag `{ tag: "OldBrand", postCount: 124 }`) is a separate "fake data" problem, not a branding problem — renaming the tag string alone doesn't fix the underlying fake-stats concern; flag it separately for a product decision.

**How to apply:** when asked to rebrand a name repo-wide, do a full-repo grep first, bulk-replace safe display/text/comment strings, but treat filenames, code identifiers, and any third-party API name lookups as separate steps requiring verification (typecheck / build) or explicit user confirmation before changing.
