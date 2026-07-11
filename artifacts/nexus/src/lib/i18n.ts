import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export type LangCode =
  | "uz" | "en" | "ru" | "zh" | "ar" | "es" | "fr" | "hi" | "pt" | "de"
  | "ja" | "ko" | "it" | "tr" | "nl" | "pl" | "fa" | "bn" | "id" | "vi"
  | "th" | "uk" | "sv" | "no" | "da" | "fi" | "el" | "cs" | "hu" | "ro"
  | "he" | "ms" | "sw" | "tl" | "az" | "kk" | "ky" | "tk" | "tg" | "mn"
  | "af" | "am" | "be" | "bg" | "bs" | "ca" | "cy" | "et" | "eu" | "ga"
  | "gl" | "gu" | "ha" | "hr" | "hy" | "ig" | "is" | "jv" | "ka" | "km"
  | "kn" | "ku" | "lb" | "lo" | "lt" | "lv" | "mg" | "mi" | "mk" | "ml"
  | "mr" | "mt" | "my" | "ne" | "ny" | "pa" | "ps" | "rw" | "si" | "sk"
  | "sl" | "sm" | "sn" | "so" | "sq" | "sr" | "st" | "su" | "ta" | "te"
  | "ur" | "xh" | "yo" | "zu" | "eo" | "fy" | "yi" | "sd" | "or" | "as";

export const LANGUAGES: { code: LangCode; name: string; native: string; flag: string; rtl?: boolean }[] = [
  { code: "uz", name: "Uzbek", native: "O'zbek", flag: "🇺🇿" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", rtl: true },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "fa", name: "Persian", native: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "id", name: "Indonesian", native: "Indonesia", flag: "🇮🇩" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱", rtl: true },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪" },
  { code: "tl", name: "Filipino", native: "Filipino", flag: "🇵🇭" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan", flag: "🇦🇿" },
  { code: "kk", name: "Kazakh", native: "Қазақша", flag: "🇰🇿" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча", flag: "🇰🇬" },
  { code: "tk", name: "Turkmen", native: "Türkmen", flag: "🇹🇲" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "mn", name: "Mongolian", native: "Монгол", flag: "🇲🇳" },
  { code: "af", name: "Afrikaans", native: "Afrikaans", flag: "🇿🇦" },
  { code: "am", name: "Amharic", native: "አማርኛ", flag: "🇪🇹" },
  { code: "be", name: "Belarusian", native: "Беларуская", flag: "🇧🇾" },
  { code: "bg", name: "Bulgarian", native: "Български", flag: "🇧🇬" },
  { code: "bs", name: "Bosnian", native: "Bosanski", flag: "🇧🇦" },
  { code: "ca", name: "Catalan", native: "Català", flag: "🇪🇸" },
  { code: "cy", name: "Welsh", native: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "et", name: "Estonian", native: "Eesti", flag: "🇪🇪" },
  { code: "eu", name: "Basque", native: "Euskara", flag: "🇪🇸" },
  { code: "ga", name: "Irish", native: "Gaeilge", flag: "🇮🇪" },
  { code: "gl", name: "Galician", native: "Galego", flag: "🇪🇸" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "ha", name: "Hausa", native: "Hausa", flag: "🇳🇬" },
  { code: "hr", name: "Croatian", native: "Hrvatski", flag: "🇭🇷" },
  { code: "hy", name: "Armenian", native: "Հայերեն", flag: "🇦🇲" },
  { code: "ig", name: "Igbo", native: "Igbo", flag: "🇳🇬" },
  { code: "is", name: "Icelandic", native: "Íslenska", flag: "🇮🇸" },
  { code: "jv", name: "Javanese", native: "Basa Jawa", flag: "🇮🇩" },
  { code: "ka", name: "Georgian", native: "ქართული", flag: "🇬🇪" },
  { code: "km", name: "Khmer", native: "ខ្មែរ", flag: "🇰🇭" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ku", name: "Kurdish", native: "Kurdî", flag: "🇮🇶", rtl: true },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch", flag: "🇱🇺" },
  { code: "lo", name: "Lao", native: "ລາວ", flag: "🇱🇦" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻" },
  { code: "mg", name: "Malagasy", native: "Malagasy", flag: "🇲🇬" },
  { code: "mi", name: "Māori", native: "Te Reo Māori", flag: "🇳🇿" },
  { code: "mk", name: "Macedonian", native: "Македонски", flag: "🇲🇰" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "mt", name: "Maltese", native: "Malti", flag: "🇲🇹" },
  { code: "my", name: "Burmese", native: "မြန်မာ", flag: "🇲🇲" },
  { code: "ne", name: "Nepali", native: "नेपाली", flag: "🇳🇵" },
  { code: "ny", name: "Chichewa", native: "Chichewa", flag: "🇲🇼" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ps", name: "Pashto", native: "پښتو", flag: "🇦🇫", rtl: true },
  { code: "rw", name: "Kinyarwanda", native: "Ikinyarwanda", flag: "🇷🇼" },
  { code: "si", name: "Sinhala", native: "සිංහල", flag: "🇱🇰" },
  { code: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", name: "Slovenian", native: "Slovenščina", flag: "🇸🇮" },
  { code: "sm", name: "Samoan", native: "Gagana Samoa", flag: "🇼🇸" },
  { code: "sn", name: "Shona", native: "ChiShona", flag: "🇿🇼" },
  { code: "so", name: "Somali", native: "Soomaali", flag: "🇸🇴" },
  { code: "sq", name: "Albanian", native: "Shqip", flag: "🇦🇱" },
  { code: "sr", name: "Serbian", native: "Српски", flag: "🇷🇸" },
  { code: "st", name: "Sesotho", native: "Sesotho", flag: "🇱🇸" },
  { code: "su", name: "Sundanese", native: "Basa Sunda", flag: "🇮🇩" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰", rtl: true },
  { code: "xh", name: "Xhosa", native: "isiXhosa", flag: "🇿🇦" },
  { code: "yo", name: "Yoruba", native: "Yorùbá", flag: "🇳🇬" },
  { code: "zu", name: "Zulu", native: "isiZulu", flag: "🇿🇦" },
  { code: "eo", name: "Esperanto", native: "Esperanto", flag: "🌍" },
  { code: "fy", name: "Frisian", native: "Frysk", flag: "🇳🇱" },
  { code: "yi", name: "Yiddish", native: "ייִדיש", flag: "🇮🇱", rtl: true },
  { code: "sd", name: "Sindhi", native: "سنڌي", flag: "🇵🇰", rtl: true },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "as", name: "Assamese", native: "অসমীয়া", flag: "🇮🇳" },
];

export const RTL_LANGS = new Set(LANGUAGES.filter(l => l.rtl).map(l => l.code));

import uzTranslations from "../locales/uz.json";
import enTranslations from "../locales/en.json";

type TranslationShape = typeof enTranslations;


// ── flatten / unflatten helpers ───────────────────────────────────────────
function flattenObj(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flattenObj(v as Record<string, unknown>, key));
    } else {
      acc[key] = String(v ?? "");
    }
    return acc;
  }, {} as Record<string, string>);
}

function unflattenObj(flat: Record<string, string>): Record<string, unknown> {
  return Object.entries(flat).reduce((acc, [k, v]) => {
    const parts = k.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = acc;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = v;
    return acc;
  }, {} as Record<string, unknown>);
}

const TRANS_CACHE_VER = "v5";

// ── resources ──────────────────────────────────────────────────────────────
const resources: Record<string, { translation: TranslationShape }> = {
  uz: { translation: uzTranslations as TranslationShape },
  en: { translation: enTranslations as TranslationShape },
};

// Pre-load cached translation for the stored language so there's no flash on reload
try {
  const storedLang = localStorage.getItem("gilos_lang_user");
  if (storedLang && storedLang !== "uz" && storedLang !== "en") {
    const raw = localStorage.getItem(`gilos_trans_${TRANS_CACHE_VER}_${storedLang}`);
    if (raw) {
      resources[storedLang] = { translation: JSON.parse(raw) as TranslationShape };
    }
  }
} catch { /* ignore */ }

// Foydalanuvchi o'zi tanlagan til (faqat Settings orqali o'rnatiladi)
// Agar saqlanmagan bo'lsa — doim uz
const _savedLang = (() => {
  try { return localStorage.getItem("gilos_lang_user") || "uz"; } catch { return "uz"; }
})();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: _savedLang,
    fallbackLng: "uz",
    interpolation: { escapeValue: false },
    nonExplicitSupportedLngs: true,
  });

export function applyRTL(lang: string) {
  const isRTL = RTL_LANGS.has(lang as LangCode);
  document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
}

i18n.on("languageChanged", (lng) => {
  applyRTL(lng);
});

applyRTL(i18n.language);

// ── ensureTranslation ──────────────────────────────────────────────────────
/**
 * Ensures `langCode` has a full translation bundle.
 * - uz / en: already bundled at build time → instant return.
 * - Other langs: checks localStorage cache first, then fetches via
 *   the AI batch-translate endpoint and caches the result.
 */
export async function ensureTranslation(langCode: string): Promise<void> {
  if (langCode === "uz" || langCode === "en") return;
  if (i18n.hasResourceBundle(langCode, "translation")) return;

  const cacheKey = `gilos_trans_${TRANS_CACHE_VER}_${langCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Record<string, unknown>;
      i18n.addResourceBundle(langCode, "translation", parsed, true, true);
      return;
    } catch { /* corrupt cache, re-fetch */ }
  }

  // Flatten the English base translation
  const flat = flattenObj(enTranslations as unknown as Record<string, unknown>);

  // One HTTP call — server handles batching and caches per language.
  // After the first user fetches a language, all others get it instantly from server cache.
  let merged: Record<string, string> = flat;
  let anyBatchFailed = false;
  try {
    const base = (import.meta.env.VITE_API_BASE_URL ?? "");
    const resp = await fetch(`${base}/api/translate-bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetLang: langCode, strings: flat, bundleVersion: TRANS_CACHE_VER }),
    });
    if (!resp.ok) {
      anyBatchFailed = true;
    } else {
      const json = await resp.json() as { translated?: Record<string, string> };
      if (json.translated) {
        merged = json.translated;
      } else {
        anyBatchFailed = true;
      }
    }
  } catch {
    anyBatchFailed = true;
  }

  const nested = unflattenObj(merged);
  // Only persist to localStorage if every batch translated successfully —
  // otherwise a transient API failure gets cached as the permanent "translation"
  // (silently showing English) and never retries until the cache version bumps.
  if (!anyBatchFailed) {
    try { localStorage.setItem(cacheKey, JSON.stringify(nested)); } catch { /* storage full */ }
  }
  i18n.addResourceBundle(langCode, "translation", nested, true, true);
}

export default i18n;
