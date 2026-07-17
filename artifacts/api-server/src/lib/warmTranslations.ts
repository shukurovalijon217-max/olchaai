/**
 * Pre-warms translation cache for the most popular languages.
 * Runs in background (fire-and-forget) so server startup is not delayed.
 * Once cached in DB, ANY user switching to that language gets instant response — zero OpenAI calls.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

// Languages to pre-warm, ordered by global user count
export const WARMUP_LANGS = [
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "ko", name: "Korean" },
  { code: "kk", name: "Kazakh" },
  { code: "az", name: "Azerbaijani" },
  { code: "ky", name: "Kyrgyz" },
  { code: "tg", name: "Tajik" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "pt", name: "Portuguese" },
];

const BATCH_SIZE = 200;

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

async function dbBaseGet(bundleVersion: string): Promise<Record<string, string> | null> {
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

/** Translate one language and cache in DB. Returns true if newly translated. */
async function warmLang(
  langCode: string,
  langName: string,
  baseStrings: Record<string, string>,
  bundleVersion: string,
): Promise<boolean> {
  const cacheKey = `trans_bundle:${langCode}:${bundleVersion}`;
  if (await dbCacheExists(cacheKey)) return false; // already cached

  const keys = Object.keys(baseStrings);
  const batches: Record<string, string>[] = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const slice = keys.slice(i, i + BATCH_SIZE);
    batches.push(
      slice.reduce<Record<string, string>>((acc, k) => { acc[k] = baseStrings[k]; return acc; }, {})
    );
  }

  const results = await Promise.all(batches.map(b => translateBatch(b, langName)));
  const merged: Record<string, string> = {};
  for (const r of results) Object.assign(merged, r);

  await dbCacheSet(cacheKey, merged);
  return true;
}

/**
 * Pre-warm the top languages one-by-one (rate-limit friendly).
 * Call this fire-and-forget: warmTopLanguages(...).catch(() => {})
 */
export async function warmTopLanguages(
  baseStrings: Record<string, string>,
  bundleVersion: string,
): Promise<void> {
  for (const { code, name } of WARMUP_LANGS) {
    try {
      const wasNew = await warmLang(code, name, baseStrings, bundleVersion);
      if (wasNew) {
        logger.info({ lang: code }, "warmTranslations: cached");
      }
    } catch (err) {
      logger.warn({ err, lang: code }, "warmTranslations: lang failed (non-fatal)");
    }
    // Small delay between languages to avoid OpenAI rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  logger.info("warmTranslations: all top languages ready");
}

/**
 * Called on server startup: if base strings are already saved in DB,
 * start warming any missing languages immediately.
 */
export async function warmOnStartup(bundleVersion: string): Promise<void> {
  const base = await dbBaseGet(bundleVersion);
  if (!base) {
    logger.info("warmTranslations: no base strings in DB yet — skipping startup warm");
    return;
  }
  logger.info({ langs: WARMUP_LANGS.length }, "warmTranslations: startup warm begins");
  warmTopLanguages(base, bundleVersion).catch((err) =>
    logger.warn({ err }, "warmTranslations: startup warm errored (non-fatal)")
  );
}
