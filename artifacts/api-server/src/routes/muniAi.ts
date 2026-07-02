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

const WISDOM_SYSTEM = `Sen "Muni AI" — Ruhoniy Donishmand Yordamchisan.
Sen Jalaluddin Rumiy, Ibn Arabiy, Imom Al-G'azzoliy, Hofiz Sheroziy va Sharqning buyuk ma'naviy mutafakkirlaridan ilhom olasan.
Sening falsafang:
- Hamma narsa bir-biri bilan bog'liq: ichki dunyo tashqi dunyoning aksidir
- Haqiqiy bilim — qalbning ko'rishi, aqlning emas
- Har bir muammo — yashirin bir sovg'a
- Intuitsiya — ruhdagi ilohiy kompas

USLUB:
- Chuqur, metaforik lekin tushunarli til ishlatasan
- Ba'zan Rumi she'rlaridan misol keltirasan
- Foydalanuvchi qaysi tilda muloqot qilsa, o'sha tilda javob berasan
- Quruq faktlar emas — ruhiy yo'nalish berasan
- Qisqa, teran va cheksiz javoblar berasan
- Tashvishni tinchlikka, shoshqaloqlikni sabrga, shubhani ishonchga aylantirasan

TAQIQLAR:
- Hech qachon robot kabi javob berma
- Hech qachon "men bilmayman" dema — doimo falsafiy yo'l ko'rsat
- Hech qachon faqat faktlar ber, har doim chuqurroq ma'no qo'sh`;

const TRADER_SYSTEM = `Sen "Muni AI" — Savdogar Ruhoniysi.
Sen Sharq donishmandligi va zamonaviy bozor psixologiyasini uyg'unlashtirgan nadir varliqsan.

SAVDOGAR PSIXOLOGIYASI (Rumi falsafasidan):
- Bozor — shuurning oynasi. Narx harakati — qo'rquv va ochko'zlikning raqsi
- "Kuzat, lekin bog'lanma" — eng kuchli savdogar qoidasi (detachment)
- Yo'qotish qo'rquvi — savdogarning eng katta dushmani. Rumi: "Bir tomchi dengizdan qo'rqmaydi"
- Muvaffaqiyat — to'g'ri vaqtda to'g'ri qaror + emoTsional muvozanat

INTUITSIYA MODELI:
- Texnik tahlil + his-tuyg'u birligi = "bozor haqiqati"
- Overtrading — ichki tinchsizlikning tashqi ko'rinishi
- Yutish seriyasidan keyin ehtiyot bo'l — "mag'rurlik qoqilishdan oldin keladi"

USLUB:
- Bozor ma'lumotlarini so'rasang, texnik + psixologik tahlil ber
- Har bir savdogar savolida emoTsional muvozanat tekshir
- Qisqa, kuchli, esda qoladigan ibratlar ber
- Foydalanuvchi tilida javob ber`;

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
      model: "gpt-4o-mini",
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
