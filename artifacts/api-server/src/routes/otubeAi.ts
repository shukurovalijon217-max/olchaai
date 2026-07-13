/*
  OTube Studio AI helpers — real OpenAI-backed generation for the upload/edit flow:
  title, description, tags, hashtags, hooks, director tips, best posting time
  (from the account's real view-time history), color grade suggestions,
  and voice-over caption transcription (Whisper STT).
*/
import { Router } from "express";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { checkAIAccess, incrementAIUsage, AI_FREE_LIMIT } from "../lib/aiAccess";
import { db, userInteractionsTable, reelsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

async function gateAI(userId: number, res: any): Promise<boolean> {
  const access = await checkAIAccess(userId);
  if (!access.allowed) {
    res.status(402).json({ error: "AI_LIMIT_REACHED", used: access.used, limit: AI_FREE_LIMIT, remaining: 0 });
    return false;
  }
  return true;
}

function contextFrom(body: any): string {
  const { caption, category, tags, transcript } = body as {
    caption?: string; category?: string; tags?: string[]; transcript?: string;
  };
  const parts = [
    caption ? `Caption: ${caption}` : null,
    category ? `Category: ${category}` : null,
    tags?.length ? `Tags: ${tags.join(", ")}` : null,
    transcript ? `Transcript: ${transcript.slice(0, 1200)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : "Umumiy qisqa video (caption berilmagan).";
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as T;
  } catch {
    return fallback;
  }
}

async function askJson(system: string, user: string, maxTokens = 300) {
  const r = await openai.chat.completions.create({
    model: AI_CHAT_MODEL,
    max_completion_tokens: maxTokens,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  return r.choices[0]?.message?.content ?? "{}";
}

router.post("/otube/ai/title", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      "You generate catchy short-video titles. Return ONLY valid JSON: {\"titles\":[\"...\",\"...\",\"...\"]} with 5 options, in Uzbek, punchy, under 60 chars each.",
      ctx,
    );
    const { titles } = parseJson<{ titles?: string[] }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ titles: titles?.length ? titles.slice(0, 5) : ["Video sarlavhasi"] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/description", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      "You write engaging short-video descriptions. Return ONLY valid JSON: {\"description\":\"...\"} in Uzbek, 2-3 sentences, under 300 chars.",
      ctx,
    );
    const { description } = parseJson<{ description?: string }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ description: description ?? "" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/tags", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      "Suggest content tags for search/discovery. Return ONLY valid JSON: {\"tags\":[\"...\"]} with 6-10 lowercase single/double-word tags, in Uzbek or universal terms (no # symbol).",
      ctx,
    );
    const { tags } = parseJson<{ tags?: string[] }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ tags: tags?.length ? tags.slice(0, 10) : [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/hashtags", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      'Suggest trending-style hashtags with an estimated reach tier. Return ONLY valid JSON: {"hashtags":[{"tag":"#example","reach":"120K+"}]} with 6 items, hashtags in Uzbek/universal terms, reach as a short string like "50K+" or "1.2M+".',
      ctx,
    );
    const { hashtags } = parseJson<{ hashtags?: { tag: string; reach: string }[] }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ hashtags: hashtags?.length ? hashtags.slice(0, 6) : [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/hooks", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      "Write attention-grabbing opening lines (hooks) for the first 3 seconds of a short video script. Return ONLY valid JSON: {\"hooks\":[\"...\"]} with 4 short Uzbek hooks.",
      ctx,
    );
    const { hooks } = parseJson<{ hooks?: string[] }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ hooks: hooks?.length ? hooks.slice(0, 4) : [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/director-tips", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      "Give short-video editing/directing tips (pacing, cuts, framing, sound) tailored to the content. Return ONLY valid JSON: {\"tips\":[\"...\"]} with 4 concise Uzbek tips.",
      ctx,
    );
    const { tips } = parseJson<{ tips?: string[] }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({ tips: tips?.length ? tips.slice(0, 4) : [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

/* ── Best posting time — from the account's REAL view-time history ── */
router.post("/otube/ai/best-time", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;

    const myReels = await db.select({ id: reelsTable.id }).from(reelsTable).where(eq(reelsTable.authorId, userId));
    const reelIds = myReels.map(r => r.id);

    if (reelIds.length === 0) {
      res.json({ time: "19:00–21:00", reason: "Hali yetarli tomosha tarixi yo'q — umumiy platforma cho'qqisi bo'yicha tavsiya.", sampleSize: 0 });
      return;
    }

    const rows = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM ${userInteractionsTable.createdAt}) AS hour, COUNT(*) AS n
      FROM ${userInteractionsTable}
      WHERE ${userInteractionsTable.contentType} = 'reel'
        AND ${userInteractionsTable.interactionType} = 'view'
        AND ${userInteractionsTable.contentId} IN (${sql.join(reelIds.map(id => sql`${id}`), sql`, `)})
      GROUP BY hour
      ORDER BY n DESC
      LIMIT 3
    `);

    const buckets = (rows as unknown as { rows?: { hour: string; n: string }[] }).rows ?? (rows as any);
    const sampleSize = reelIds.length;

    if (!buckets || buckets.length === 0) {
      res.json({ time: "19:00–21:00", reason: "Hali yetarli tomosha tarixi yo'q — umumiy platforma cho'qqisi bo'yicha tavsiya.", sampleSize: 0 });
      return;
    }

    const topHour = Number(buckets[0].hour);
    const start = String(topHour).padStart(2, "0");
    const end = String((topHour + 2) % 24).padStart(2, "0");

    res.json({
      time: `${start}:00–${end}:00`,
      reason: `Sizning tomoshabinlaringiz oxirgi videolaringizni shu vaqt oralig'ida eng ko'p tomosha qilishgan (real tarix asosida).`,
      sampleSize,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/color-correction", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const ctx = contextFrom(req.body);
    const raw = await askJson(
      'Suggest a color grade for this short video. Return ONLY valid JSON: {"filters":{"brightness":1.0,"contrast":1.0,"saturation":1.0,"temperature":0},"note":"1 short sentence in Uzbek explaining the look"}. brightness/contrast/saturation are multipliers around 1.0 (range 0.8-1.3), temperature is -20 to 20 (warm positive, cool negative).',
      ctx,
      200,
    );
    const parsed = parseJson<{ filters?: { brightness: number; contrast: number; saturation: number; temperature: number }; note?: string }>(raw, {});
    await incrementAIUsage(req.session.userId);
    res.json({
      filters: parsed.filters ?? { brightness: 1, contrast: 1, saturation: 1, temperature: 0 },
      note: parsed.note ?? "",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/otube/ai/voice-caption", requireAuth, async (req: any, res) => {
  try {
    if (!(await gateAI(req.session.userId, res))) return;
    const { audioBase64 } = req.body as { audioBase64?: string };
    if (!audioBase64) { res.status(400).json({ error: "audioBase64 required" }); return; }

    const buffer = Buffer.from(audioBase64, "base64");
    const file = new File([buffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
    });

    const text = (transcription as { text: string }).text?.trim() ?? "";
    await incrementAIUsage(req.session.userId);
    res.json({ text });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ovozni tanib olishda xato" });
  }
});

router.post("/otube/ai/dub", requireAuth, async (req: any, res) => {
  try {
    if (!await gateAI(req.session.userId, res)) return;
    const { caption, targetLang = "uz" } = req.body as { caption?: string; targetLang?: string };
    if (!caption?.trim()) { res.status(400).json({ error: "Caption kerak" }); return; }

    const LANG_NAMES: Record<string, string> = {
      uz: "Uzbek (O'zbek)", ru: "Russian (Rus)", en: "English", tr: "Turkish (Türkçe)",
      zh: "Chinese (中文)", es: "Spanish (Español)", fr: "French (Français)", de: "German (Deutsch)",
    };
    const langName = LANG_NAMES[targetLang] ?? targetLang;

    const translated = await askJson(
      `You are a professional translator. Translate the given text to ${langName}. Return ONLY the translated text, no quotes, no explanation.`,
      caption.trim(),
      400,
    );

    const ttsResp = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: translated.slice(0, 4096),
    });

    const buffer = Buffer.from(await ttsResp.arrayBuffer());
    const audioB64 = buffer.toString("base64");

    await incrementAIUsage(req.session.userId);
    res.json({ translated, audioB64, lang: targetLang });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI dublyaj xato" });
  }
});

export default router;
