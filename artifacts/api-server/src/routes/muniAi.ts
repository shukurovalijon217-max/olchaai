/*
  Muni AI — Ruhoniy Donishmand (Rumi Falsafasi)
  Jalaluddin Rumiy, Ibn Arabiy, Al-G'azzoliy ilhomidan ulhom olgan
  falsafiy va psixologik AI yordamchi.
  Streaming SSE responses — identical pattern to openai-chat.ts
*/
import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkAIAccess, incrementAIUsage, AI_FREE_LIMIT } from "../lib/aiAccess";

const router = Router();

const WISDOM_SYSTEM = `Sen "Muni AI" — OlchaAI platformasining shaxsiy AI yordamchisisan.
Foydalanuvchilarga hayot, shaxsiy rivojlanish, munosabatlar, motivatsiya va kundalik masalalar bo'yicha yordam berasan.

USLUB:
- Professional AI yordamchi kabi javob ber: aniq, to'g'ri, tushunarli va foydali
- Savolga to'g'ridan-to'g'ri javob ber; keraksiz metafora, she'riy uslub yoki majburiy falsafiy ohangdan saqlan
- Fakt yoki bilim kerak bo'lsa — ishonchli va aniq ma'lumot ber
- Agar biror narsani bilmasang yoki noaniq bo'lsa, buni ochiq ayt — taxmin qilib chalg'itma
- Kerak bo'lganda amaliy qadamlar, ro'yxat yoki aniq tavsiyalar taklif qil
- Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber
- Javoblarni qisqa va tartibli tut, kerak bo'lsa tuzilgan (bandlar/ro'yxat) shaklda ber`;

const TRADER_SYSTEM = `Sen "Muni AI" — OlchaAI platformasining bozor va savdo psixologiyasi bo'yicha AI yordamchisisan.

FOKUS:
- Bozor harakati, savdo strategiyalari, risk boshqaruvi va trading psixologiyasi
- Emotsional omillar (qo'rquv, ochko'zlik, overtrading) savdo qarorlariga qanday ta'sir qilishini tushuntirish

USLUB:
- Professional AI yordamchi kabi javob ber: aniq, to'g'ri va amaliy
- Texnik va psixologik jihatlarni tushunarli tilda tushuntir
- Taxmin va faktni aniq ajratib ko'rsat; bu moliyaviy maslahat emas, ta'lim/ma'lumot xarakterida ekanini yodda tut
- Noaniqlik bo'lsa, buni ochiq ayt — taxmin qilib chalg'itma
- Javoblarni qisqa va tartibli tut
- Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber`;

router.post("/muni/chat", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { message, mode = "wisdom", history = [] } = req.body as {
    message: string;
    mode?: "wisdom" | "trader";
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) { res.status(400).json({ error: "message required" }); return; }

  try {
    /* ── Free tier check BEFORE SSE headers ─────────────────── */
    const access = await checkAIAccess(req.session.userId);
    if (!access.allowed) {
      res.status(402).json({
        error: "AI_LIMIT_REACHED",
        used: access.used,
        limit: AI_FREE_LIMIT,
        remaining: 0,
      });
      return;
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const systemPrompt = mode === "trader" ? TRADER_SYSTEM : WISDOM_SYSTEM;

    const prior = (history ?? []).slice(-12).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      stream: true,
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...prior,
        { role: "user", content: message },
      ],
    });

    let full = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        full += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await incrementAIUsage(req.session.userId);
    const newAccess = await checkAIAccess(req.session.userId);
    res.write(`data: ${JSON.stringify({ done: true, fullText: full, usage: { used: newAccess.used, remaining: newAccess.remaining, isPremium: newAccess.isPremium } })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "Muni AI xatosi" })}\n\n`);
    res.end();
  }
});

/* ─── Daily wisdom quote (no auth required for splash screens) ── */
const RUMI_QUOTES = [
  { uz: "Siz bu dunyoga mehmon bo'lib keldingiz. Qalbingizni uy qiling.", en: "You came here as a guest to this world. Make your heart your home.", author: "Rumi" },
  { uz: "Sukunat — ruhning tili. So'zlar esa uning soyasi.", en: "Silence is the language of the soul. Words are but its shadow.", author: "Rumi" },
  { uz: "Yiqilish emas — turmaslik — muvaffaqiyatsizlikdir.", en: "Failure is not falling down, but refusing to rise.", author: "Rumi" },
  { uz: "Qo'rquv uchun qurilgan devorlar seni qamoqqa oladi.", en: "Walls built out of fear become your prison.", author: "Rumi" },
  { uz: "Sabr — qalbning ilmuri. Har qanday bo'ronga dosh beradi.", en: "Patience is the anchor of the heart. It withstands every storm.", author: "Al-Ghazali" },
  { uz: "O'z-o'zingni bil — butun olamni bilasan.", en: "Know yourself — and you will know the entire universe.", author: "Ibn Arabi" },
  { uz: "Bozor — shuurning oynasi. Ko'rganingda o'zingni ko'rasan.", en: "The market is a mirror of consciousness. In it you see yourself.", author: "Muni AI" },
  { uz: "Intuitsiya — ming tajribadan to'qilgan ipak ip.", en: "Intuition is a silken thread woven from a thousand experiences.", author: "Muni AI" },
];

router.get("/muni/quote", (_req, res) => {
  const q = RUMI_QUOTES[Math.floor(Math.random() * RUMI_QUOTES.length)]!;
  res.json(q);
});

export default router;
