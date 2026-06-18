---
name: Marketplace i18n coverage
description: Which marketplace pages are i18n-complete and key patterns for adding new strings.
---

## Rule
All marketplace pages (MarketplacePage, SellPage, MyShopPage, SellerProfilePage, ProductDetailPage) must use `t("key")` for every user-visible string — no hardcoded Uzbek or any language literals.

**Why:** Language switcher in SettingsPage calls `i18nInst.changeLanguage(code)`. If a string is hardcoded, it stays in Uzbek regardless of language selection.

## Key namespaces
- `market.*` — marketplace home, categories, stats, CTA, add listing
- `sell.*` — sell/listing form fields
- `seller.*` — seller profile page (contact, no_products, all_by)
- `myshop.*` — my shop management page

## Language fallback chain
- `uz` is the canonical/complete source of truth
- All other languages fall back to `en` for missing keys (`fallbackLng: "en"`)
- `sell.desc_ph` exists in uz/en/ru; es/fr/zh/de/tr fall back to en — acceptable

## SectionHeader pattern
`SectionHeader` is an inline component in MarketplacePage.tsx — it needs its own `const { t } = useTranslation()` since it doesn't inherit from the parent function scope.

## i18n file location
`artifacts/nexus/src/lib/i18n.ts` — uz section lines ~1–98 (source of truth), en ~99–139, then ru/es/fr/zh/de/tr/mn.
