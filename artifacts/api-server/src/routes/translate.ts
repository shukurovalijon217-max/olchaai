import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const LANG_NAMES: Record<string, string> = {
  uz: "Uzbek", en: "English", ru: "Russian", zh: "Chinese (Simplified)",
  ar: "Arabic", tr: "Turkish", ko: "Korean", ja: "Japanese",
  de: "German", fr: "French", es: "Spanish", it: "Italian",
  pt: "Portuguese", hi: "Hindi", fa: "Persian", kk: "Kazakh",
  ky: "Kyrgyz", tg: "Tajik", az: "Azerbaijani", uk: "Ukrainian",
};

router.post("/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body as { text?: string; targetLang?: string };
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });
    if (!targetLang) return res.status(400).json({ error: "targetLang is required" });

    const langName = LANG_NAMES[targetLang] ?? targetLang;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return res.json({
      translation: parsed.translation ?? text,
      detectedLang: parsed.detectedLang ?? "unknown",
    });
  } catch (err) {
    req.log.error({ err }, "translate error");
    return res.status(500).json({ error: "Translation failed" });
  }
});

/** Batch UI-string translation — used by the frontend i18n auto-translate system */
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
    const entryCount = Object.keys(strings).length;
    if (entryCount === 0) return res.json({ translated: strings });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let translated: Record<string, string>;
    try {
      translated = JSON.parse(raw) as Record<string, string>;
    } catch {
      translated = strings;
    }

    return res.json({ translated });
  } catch (err) {
    req.log.error({ err }, "translate-ui-batch error");
    return res.status(500).json({ error: "Batch translation failed" });
  }
});

export default router;
