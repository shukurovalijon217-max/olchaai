---
name: Raw i18n key leaks and silent translation fallback
description: Two recurring i18n bug patterns in Nexus — arrays storing translation keys in a `label` field that some render sites forget to wrap in t(), and ensureTranslation() permanently caching a failed AI-translation batch as if it succeeded.
---

## Pattern 1: array `label` fields holding i18n keys, not display text

Some option/config arrays (e.g. category lists, permission-level lists, wizard steps) store the i18n **key** in a field literally named `label` (e.g. `{ id: "all", label: "groups.perms.all" }`). Any render site that does `{opt.label}` instead of `{t(opt.label)}` prints the raw dotted key on screen — this is what users report as "some random text/key" appearing in the UI.

**Why:** it's an easy mistake because `label` reads like "the display string," so new call sites naturally skip `t()`.

**How to apply:** when you see an array literal whose objects have a `label` field, check whether the values look like dotted i18n keys (e.g. `"namespace.thing"`) rather than real UI strings. If so, grep every usage site of that array/field for `.label` and confirm each one is wrapped in `t(...)` — including inside small shared sub-components (e.g. a `PermSelect`/`ToggleRow`-style helper) that receive `options` as a prop and may need their own `useTranslation()` call.

## Pattern 2: ensureTranslation() silently bakes in English on API failure

In `artifacts/nexus/src/lib/i18n.ts`, `ensureTranslation(langCode)` fetches AI-translated UI bundles per language and caches them in `localStorage` (`olcha_trans_v2_<lang>`). Previously, if `/api/translate-ui-batch` failed for a given batch (network error, non-200, missing `translated` field), the code fell back to returning the original **English** batch — and then cached the merged result to localStorage unconditionally, and also called `i18n.addResourceBundle` which makes `i18n.hasResourceBundle()` return true forever for that language in-session. Net effect: a single transient API failure permanently "poisons" that language's cache with English text, so the user sees pages stuck in English (or a mix) after selecting a different language, with no error surfaced and no automatic retry until the cache version constant is bumped.

**Why:** partial failure was treated the same as success for caching purposes.

**How to apply:** only persist the merged translation bundle to `localStorage` if every batch in the `Promise.all` succeeded; still apply the (possibly partial) in-memory bundle via `addResourceBundle` for the current session, but let a later attempt retry from a clean cache instead of a poisoned one. If you touch this function again, consider also surfacing a toast/log on batch failure so it's not silent.
