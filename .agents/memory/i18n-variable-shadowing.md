---
name: i18n t() variable shadowing
description: Local variables named `t` (loop vars, lookup results) silently shadow the i18next t() translation function within their scope
---

When wiring hardcoded strings to `t()` during an i18n sweep, watch for a local `const t = SOME_LOOKUP[x] ?? {...}` inside a `.map()` callback or other nested scope — it shadows the outer `const { t } = useTranslation()`. Any `t("key")` call added inside that shadowed scope compiles to calling the lookup object/value, not the translator, and TypeScript reports "expression is not callable" rather than a i18n-specific error.

**Why:** Found in `AdminPage.tsx` where a per-row `const t = TYPE_LABEL[row.contentType] ?? {...}` (icon/label/color object) shadowed the real `t`, breaking a later `t("admin.content_table.active")` call added in the same map body.

**How to apply:** Before adding `t("...")` calls inside a nested callback, grep the enclosing function for other single-letter/short variable names (`t`, `d`, etc.) that might collide — rename the local variable (e.g. `typeInfo`) rather than avoiding `t()`. Also check for stray old identifiers (e.g. a module-level `ACTION_LABEL` const renamed to a `getActionLabel(t, type)` helper) that still have call sites using the old name — `tsc` catches these as "Cannot find name", not a runtime i18n bug.
