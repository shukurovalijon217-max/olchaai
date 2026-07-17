import { Router } from "express";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const LANG_NAMES: Record<string, string> = {
  uz: "Uzbek", en: "English", ru: "Russian", zh: "Chinese (Simplified)",
  ar: "Arabic", tr: "Turkish", ko: "Korean", ja: "Japanese",
  de: "German", fr: "French", es: "Spanish", it: "Italian",
  pt: "Portuguese", hi: "Hindi", fa: "Persian", kk: "Kazakh",
  ky: "Kyrgyz", tg: "Tajik", az: "Azerbaijani", uk: "Ukrainian",
  nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  fi: "Finnish", no: "Norwegian", he: "Hebrew", cs: "Czech",
  hu: "Hungarian", ro: "Romanian", el: "Greek", th: "Thai",
  vi: "Vietnamese", id: "Indonesian", ms: "Malay", bn: "Bengali",
  tk: "Turkmen", mn: "Mongolian", sw: "Swahili", tl: "Filipino",
  af: "Afrikaans", am: "Amharic", be: "Belarusian", bg: "Bulgarian",
  bs: "Bosnian", ca: "Catalan", cy: "Welsh", et: "Estonian",
  eu: "Basque", ga: "Irish", gl: "Galician", gu: "Gujarati",
  ha: "Hausa", hr: "Croatian", hy: "Armenian", ig: "Igbo",
  is: "Icelandic", jv: "Javanese", ka: "Georgian", km: "Khmer",
  kn: "Kannada", ku: "Kurdish", lb: "Luxembourgish", lo: "Lao",
  lt: "Lithuanian", lv: "Latvian", mg: "Malagasy", mi: "Māori",
  mk: "Macedonian", ml: "Malayalam", mr: "Marathi", mt: "Maltese",
  my: "Burmese", ne: "Nepali", ny: "Chichewa", pa: "Punjabi",
  ps: "Pashto", rw: "Kinyarwanda", si: "Sinhala", sk: "Slovak",
  sl: "Slovenian", sm: "Samoan", sn: "Shona", so: "Somali",
  sq: "Albanian", sr: "Serbian", st: "Sesotho", su: "Sundanese",
  ta: "Tamil", te: "Telugu", ur: "Urdu", xh: "Xhosa",
  yo: "Yoruba", zu: "Zulu", eo: "Esperanto", fy: "Frisian",
  yi: "Yiddish", sd: "Sindhi", or: "Odia", as: "Assamese",
};

// 200 keys per batch — large enough to reduce round-trips, small enough to stay within token limits
const BATCH_SIZE = 200;

/** Translate a flat key→value dict via OpenAI (single batch) */
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
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return strings;
  }
}

/** Read a cached translation bundle from DB */
async function dbCacheGet(cacheKey: string): Promise<Record<string, string> | null> {
  try {
    const res = await db.execute(
      sql`SELECT translated FROM translation_cache WHERE cache_key = ${cacheKey} LIMIT 1`
    );
    const rows = (res as any).rows ?? res;
    if (rows && rows[0]?.translated) {
      return typeof rows[0].translated === "string"
        ? JSON.parse(rows[0].translated)
        : rows[0].translated;
    }
  } catch { /* table may not exist yet */ }
  return null;
}

/** Save a translation bundle to DB */
async function dbCacheSet(cacheKey: string, translated: Record<string, string>): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO translation_cache (cache_key, translated, cached_at)
      VALUES (${cacheKey}, ${JSON.stringify(translated)}, NOW())
      ON CONFLICT (cache_key) DO UPDATE
        SET translated = EXCLUDED.translated, cached_at = NOW()
    `);
  } catch { /* ignore — cache is best-effort */ }
}

/**
 * POST /api/translate-bundle
 * Translates a full UI bundle using parallel OpenAI batches, cached in DB.
 * After the first user triggers a language, all subsequent users get it from DB cache — zero OpenAI calls.
 *
 * Body: { targetLang: string, strings: Record<string,string>, bundleVersion?: string }
 * Returns: { translated: Record<string,string>, fromCache: boolean }
 */
router.post("/translate-bundle", async (req, res) => {
  try {
    const { targetLang, strings, bundleVersion = "v1" } = req.body as {
      targetLang?: string;
      strings?: Record<string, string>;
      bundleVersion?: string;
    };

    if (!targetLang || typeof strings !== "object" || strings === null) {
      return res.status(400).json({ error: "targetLang and strings required" });
    }

    const keys = Object.keys(strings);
    if (keys.length === 0) return res.json({ translated: strings, fromCache: false });

    const cacheKey = `trans_bundle:${targetLang}:${bundleVersion}`;

    // 1. Check DB cache first (survives server restarts)
    const dbCached = await dbCacheGet(cacheKey);
    if (dbCached) {
      return res.json({ translated: dbCached, fromCache: true });
    }

    const langName = LANG_NAMES[targetLang] ?? targetLang;

    // 2. Split into batches and run ALL in PARALLEL (key fix: was sequential → now parallel)
    const batches: Record<string, string>[] = [];
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const slice = keys.slice(i, i + BATCH_SIZE);
      const batch = slice.reduce<Record<string, string>>(
        (acc, k) => { acc[k] = strings[k]; return acc; },
        {},
      );
      batches.push(batch);
    }

    const results = await Promise.all(batches.map(b => translateBatch(b, langName)));
    const merged: Record<string, string> = {};
    for (const r of results) Object.assign(merged, r);

    // 3. Persist to DB (best-effort, async — don't await to keep response fast)
    dbCacheSet(cacheKey, merged).catch(() => {});

    return res.json({ translated: merged, fromCache: false });
  } catch (err) {
    req.log.error({ err }, "translate-bundle error");
    return res.status(500).json({ error: "Bundle translation failed" });
  }
});

/** POST /api/translate-ui-batch — kept for backward compat (single batch) */
router.post("/translate-ui-batch", async (req, res) => {
  try {
    const { targetLang, strings } = req.body as {
      targetLang?: string;
      strings?: Record<string, string>;
    };
    if (!targetLang || typeof strings !== "object" || strings === null) {
      return res.status(400).json({ error: "targetLang and strings required" });
    }

    const langName = LANG_NAMES[targetLang] ?? targetLang;
    if (Object.keys(strings).length === 0) return res.json({ translated: strings });

    const translated = await translateBatch(strings, langName);
    return res.json({ translated });
  } catch (err) {
    req.log.error({ err }, "translate-ui-batch error");
    return res.status(500).json({ error: "Batch translation failed" });
  }
});

/** POST /api/translate — single text translation */
router.post("/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body as { text?: string; targetLang?: string };
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });
    if (!targetLang) return res.status(400).json({ error: "targetLang is required" });

    const langName = LANG_NAMES[targetLang] ?? targetLang;

    const completion = await openai.chat.completions.create({
      model: AI_CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a precise, natural-sounding translator. Translate the given text to ${langName}.
Return ONLY valid JSON in this exact shape: {"translation":"<translated text>","detectedLang":"<ISO 639-1 source language code>"}
Preserve all emoji, punctuation, line breaks, and casual tone. Do not explain or add anything extra.`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { translation?: string; detectedLang?: string };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return res.json({
      translation: parsed.translation ?? text,
      detectedLang: parsed.detectedLang ?? "unknown",
    });
  } catch (err) {
    req.log.error({ err }, "translate error");
    return res.status(500).json({ error: "Translation failed" });
  }
});

export default router;
