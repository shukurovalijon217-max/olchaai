/**
 * Pre-warms translation cache for ALL supported languages.
 * Runs fully in background — server startup is never delayed.
 * Once cached in DB, ANY user switching to that language gets instant response (0 ms).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

// ── Complete list of all 99 supported languages (uz + en are bundled at build time) ──
export const ALL_LANGS: { code: string; name: string }[] = [
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "it", name: "Italian" },
  { code: "tr", name: "Turkish" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "fa", name: "Persian" },
  { code: "bn", name: "Bengali" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "uk", name: "Ukrainian" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "el", name: "Greek" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "he", name: "Hebrew" },
  { code: "ms", name: "Malay" },
  { code: "sw", name: "Swahili" },
  { code: "tl", name: "Filipino" },
  { code: "az", name: "Azerbaijani" },
  { code: "kk", name: "Kazakh" },
  { code: "ky", name: "Kyrgyz" },
  { code: "tk", name: "Turkmen" },
  { code: "tg", name: "Tajik" },
  { code: "mn", name: "Mongolian" },
  { code: "af", name: "Afrikaans" },
  { code: "am", name: "Amharic" },
  { code: "be", name: "Belarusian" },
  { code: "bg", name: "Bulgarian" },
  { code: "bs", name: "Bosnian" },
  { code: "ca", name: "Catalan" },
  { code: "cy", name: "Welsh" },
  { code: "et", name: "Estonian" },
  { code: "eu", name: "Basque" },
  { code: "ga", name: "Irish" },
  { code: "gl", name: "Galician" },
  { code: "gu", name: "Gujarati" },
  { code: "ha", name: "Hausa" },
  { code: "hr", name: "Croatian" },
  { code: "hy", name: "Armenian" },
  { code: "ig", name: "Igbo" },
  { code: "is", name: "Icelandic" },
  { code: "jv", name: "Javanese" },
  { code: "ka", name: "Georgian" },
  { code: "km", name: "Khmer" },
  { code: "kn", name: "Kannada" },
  { code: "ku", name: "Kurdish" },
  { code: "lb", name: "Luxembourgish" },
  { code: "lo", name: "Lao" },
  { code: "lt", name: "Lithuanian" },
  { code: "lv", name: "Latvian" },
  { code: "mg", name: "Malagasy" },
  { code: "mi", name: "Māori" },
  { code: "mk", name: "Macedonian" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "mt", name: "Maltese" },
  { code: "my", name: "Burmese" },
  { code: "ne", name: "Nepali" },
  { code: "ny", name: "Chichewa" },
  { code: "pa", name: "Punjabi" },
  { code: "ps", name: "Pashto" },
  { code: "rw", name: "Kinyarwanda" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "sm", name: "Samoan" },
  { code: "sn", name: "Shona" },
  { code: "so", name: "Somali" },
  { code: "sq", name: "Albanian" },
  { code: "sr", name: "Serbian" },
  { code: "st", name: "Sesotho" },
  { code: "su", name: "Sundanese" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ur", name: "Urdu" },
  { code: "xh", name: "Xhosa" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" },
  { code: "eo", name: "Esperanto" },
  { code: "fy", name: "Frisian" },
  { code: "yi", name: "Yiddish" },
  { code: "sd", name: "Sindhi" },
  { code: "or", name: "Odia" },
  { code: "as", name: "Assamese" },
];

const BATCH_SIZE = 200;
// How many languages to translate in parallel (balance speed vs OpenAI rate limits)
const LANG_CONCURRENCY = 5;

async function translateBatch(
  strings: Record<string, string>,
  langName: string,
): Promise<Record<string, string>> {
  const completion = await openai.chat.completions.create({
    model: AI_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a professional UI translator. Translate all JSON values to ${langName}.
Rules:
- Keep every JSON key EXACTLY as-is
- Only translate the string values
- Preserve {{variable}} placeholders unchanged (e.g. {{count}}, {{name}})
- Preserve all emojis unchanged
- Keep \\n and punctuation as-is
- Return ONLY valid JSON, no markdown, no extra text`,
      },
      { role: "user", content: JSON.stringify(strings) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 8000,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw) as Record<string, string>; } catch { return strings; }
}

async function dbCacheExists(cacheKey: string): Promise<boolean> {
  try {
    const res = await db.execute(
      sql`SELECT 1 FROM translation_cache WHERE cache_key = ${cacheKey} LIMIT 1`
    );
    const rows = (res as any).rows ?? res;
    return rows && rows.length > 0;
  } catch { return false; }
}

async function dbCacheSet(cacheKey: string, translated: Record<string, string>): Promise<void> {
  await db.execute(sql`
    INSERT INTO translation_cache (cache_key, translated, cached_at)
    VALUES (${cacheKey}, ${JSON.stringify(translated)}, NOW())
    ON CONFLICT (cache_key) DO UPDATE
      SET translated = EXCLUDED.translated, cached_at = NOW()
  `);
}

export async function dbBaseGet(bundleVersion: string): Promise<Record<string, string> | null> {
  try {
    const res = await db.execute(
      sql`SELECT translated FROM translation_cache WHERE cache_key = ${"trans_bundle:base:" + bundleVersion} LIMIT 1`
    );
    const rows = (res as any).rows ?? res;
    if (rows?.[0]?.translated) {
      return typeof rows[0].translated === "string"
        ? JSON.parse(rows[0].translated)
        : rows[0].translated;
    }
  } catch { /* ignore */ }
  return null;
}

/** Translate one language using parallel key batches and save to DB. Returns true if newly translated. */
async function warmLang(
  langCode: string,
  langName: string,
  baseStrings: Record<string, string>,
  bundleVersion: string,
): Promise<boolean> {
  const cacheKey = `trans_bundle:${langCode}:${bundleVersion}`;
  if (await dbCacheExists(cacheKey)) return false; // already cached — skip

  const keys = Object.keys(baseStrings);
  const batches: Record<string, string>[] = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const slice = keys.slice(i, i + BATCH_SIZE);
    batches.push(
      slice.reduce<Record<string, string>>((acc, k) => { acc[k] = baseStrings[k]; return acc; }, {})
    );
  }

  // Translate all key batches for this language in parallel
  const results = await Promise.all(batches.map(b => translateBatch(b, langName)));
  const merged: Record<string, string> = {};
  for (const r of results) Object.assign(merged, r);

  await dbCacheSet(cacheKey, merged);
  return true;
}

/** Run an array of async tasks with limited concurrency */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Pre-warm ALL supported languages with controlled concurrency.
 * Languages already in DB are skipped instantly.
 * Call fire-and-forget: warmAllLanguages(...).catch(() => {})
 */
export async function warmAllLanguages(
  baseStrings: Record<string, string>,
  bundleVersion: string,
): Promise<void> {
  let cached = 0;
  let translated = 0;
  let failed = 0;

  const tasks = ALL_LANGS.map(({ code, name }) => async () => {
    try {
      const wasNew = await warmLang(code, name, baseStrings, bundleVersion);
      if (wasNew) {
        translated++;
        logger.info({ lang: code }, "warmTranslations: cached");
      } else {
        cached++;
      }
    } catch (err) {
      failed++;
      logger.warn({ err, lang: code }, "warmTranslations: lang failed (non-fatal)");
    }
  });

  await runWithConcurrency(tasks, LANG_CONCURRENCY);
  logger.info(
    { total: ALL_LANGS.length, translated, cached, failed },
    "warmTranslations: all languages ready"
  );
}

/**
 * Called on server startup: if base strings are already in DB,
 * kick off background warming for any missing languages.
 */
export async function warmOnStartup(bundleVersion: string): Promise<void> {
  const base = await dbBaseGet(bundleVersion);
  if (!base) {
    logger.info("warmTranslations: no base strings in DB yet — will warm after first user request");
    return;
  }
  logger.info({ langs: ALL_LANGS.length }, "warmTranslations: startup warm begins");
  warmAllLanguages(base, bundleVersion).catch((err) =>
    logger.warn({ err }, "warmTranslations: startup warm errored (non-fatal)")
  );
}
