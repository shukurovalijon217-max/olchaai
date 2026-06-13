
// ── Exchange rates: 1 USD = X major units of each currency ──────────────────
export const USD_TO_MAJOR: Record<string, number> = {
  USD: 1,        EUR: 0.92,    GBP: 0.79,
  RUB: 91.5,     CNY: 7.24,    KRW: 1340,
  JPY: 154,      TRY: 32.5,    KZT: 450,
  AED: 3.67,     AZN: 1.70,    GEL: 2.67,
  PLN: 3.96,     CHF: 0.90,    CAD: 1.37,
  AUD: 1.54,     SGD: 1.34,    HKD: 7.82,
  SEK: 10.55,    NOK: 10.72,   DKK: 6.89,
  CZK: 22.8,     HUF: 358,     ILS: 3.74,
  MXN: 17.2,     NZD: 1.64,    PHP: 58.5,
  THB: 35.8,     BRL: 5.11,    INR: 84,
  ZAR: 18.9,     MYR: 4.73,    TWD: 32.4,
  UZS: 12800,
};

// Minor units per 1 major unit (e.g., $1 = 100 cents)
export const CURRENCY_SUBUNITS: Record<string, number> = {
  USD: 100, EUR: 100, GBP: 100, RUB: 100, CNY: 100,
  TRY: 100, KZT: 100, AED: 100, AZN: 100, GEL: 100,
  PLN: 100, CHF: 100, CAD: 100, AUD: 100, SGD: 100,
  HKD: 100, SEK: 100, NOK: 100, DKK: 100, CZK: 100,
  HUF: 100, ILS: 100, MXN: 100, NZD: 100, PHP: 100,
  THB: 100, BRL: 100, INR: 100, ZAR: 100, MYR: 100,
  TWD: 100, KRW: 1, JPY: 1, UZS: 1,
};

// Stripe-supported currencies (subscription capable)
const STRIPE_SUPPORTED = new Set([
  "usd","eur","gbp","rub","cny","krw","jpy","try","kzt","aed","azn","gel","pln",
  "aud","cad","chf","hkd","sgd","sek","nok","dkk","czk","huf","ils","mxn",
  "nzd","php","thb","brl","inr","zar","myr","twd",
]);

export function isStripeSupported(currency: string): boolean {
  return STRIPE_SUPPORTED.has(currency.toLowerCase());
}

// Convert USD cents → target currency subunits (for Stripe price_data)
export function usdCentsToSubunits(usdCents: number, targetCurrency: string): number {
  const cur = targetCurrency.toUpperCase();
  const rate = USD_TO_MAJOR[cur] ?? 1;
  const sub = CURRENCY_SUBUNITS[cur] ?? 100;
  return Math.ceil((usdCents / 100) * rate * sub);
}

// UZS tiyin → USD major (for wallet display)
export function tiyinToUSD(tiyin: number): number {
  return (tiyin / 100) / (USD_TO_MAJOR.UZS ?? 12800);
}

// Detect preferred currency from Accept-Language header
export function currencyFromAcceptLanguage(header: string | undefined): string {
  if (!header) return "USD";
  const MAP: Record<string, string> = {
    "uz": "UZS",    "ru": "RUB",    "ko": "KRW",
    "ja": "JPY",    "zh": "CNY",    "tr": "TRY",
    "de": "EUR",    "fr": "EUR",    "it": "EUR",
    "es": "EUR",    "pt": "EUR",    "nl": "EUR",
    "pl": "PLN",    "kk": "KZT",    "az": "AZN",
    "ka": "GEL",    "ar": "AED",    "en": "USD",
    "en-gb": "GBP", "en-au": "AUD", "en-ca": "CAD",
    "zh-tw": "TWD",
  };
  for (const part of header.split(",")) {
    const lang = part.split(";")[0].trim().toLowerCase();
    if (MAP[lang]) return MAP[lang];
    const primary = lang.split("-")[0];
    if (MAP[primary]) return MAP[primary];
  }
  return "USD";
}
