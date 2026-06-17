import { Router } from "express";
import { db } from "@workspace/db";
import { aiConversations as conversations, aiMessages as messages } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/openai/conversations", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const list = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, req.session.userId))
      .orderBy(conversations.createdAt);
    res.json(list);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  try {
    const [conv] = await db
      .insert(conversations)
      .values({ title, userId: req.session.userId })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations/:id", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.session.userId)));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/openai/conversations/:id", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  try {
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.session.userId)));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.session.userId)));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const convId = Number(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }

  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convId), eq(conversations.userId, req.session.userId)));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }

    await db.insert(messages).values({ conversationId: convId, role: "user", content });
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const chatMessages = history.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: "Siz OlCha platformasining AI yordamchisisiz. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob bering. Qisqa, aniq va foydali javoblar bering." },
        ...chatMessages,
      ],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "AI xatosi" })}\n\n`);
    res.end();
  }
});

router.post("/openai/generate-caption", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { topic, tone, platform } = req.body;
  if (!topic) { res.status(400).json({ error: "topic required" }); return; }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: "Siz ijtimoiy tarmoq uchun kontent yozuvchisisiz. O'zbek, rus yoki ingliz tilida (so'ralgandek) jozibali caption, hashtag va emoji yozasiz.",
        },
        {
          role: "user",
          content: `Mavzu: "${topic}"\nOhang: ${tone || "qiziqarli"}\nPlatforma: ${platform || "OlCha"}\n\nQisqa caption + hashtaglar yoz.`,
        },
      ],
    });
    const caption = response.choices[0]?.message?.content ?? "";
    res.json({ caption });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xatosi" });
  }
});

router.post("/openai/generate-image", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt required" }); return; }
  try {
    const { generateImageUrl } = await import("@workspace/integrations-openai-ai-server/image");
    const url = await generateImageUrl(prompt, "1024x1024");
    res.json({ url });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Rasm yaratishda xato" });
  }
});

router.post("/openai/moderate", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: 'Siz kontent moderatorisiz. Matnni tekshirib, JSON formatda qaytaring: {"safe": bool, "reason": string, "categories": ["spam"|"hate"|"violence"|"adult"|"other"]}',
        },
        { role: "user", content: `Matnni tekshir: "${content}"` },
      ],
    });
    try {
      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, ""));
      res.json(result);
    } catch {
      res.json({ safe: true, reason: "Tahlil qilinmadi", categories: [] });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Moderatsiya xatosi" });
  }
});

router.post("/openai/voice-chat", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { audioBase64 } = req.body;
  if (!audioBase64) { res.status(400).json({ error: "audioBase64 required" }); return; }

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    const file = new File([buffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });
    const transcript = transcription.text?.trim() ?? "";

    if (!transcript) {
      res.json({ transcript: "", response: "Ovoz aniqlanmadi. Iltimos qayta urinib ko'ring.", audioBase64: null });
      return;
    }

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 350,
      messages: [
        {
          role: "system",
          content: "Siz OlCha platformasining ovozli AI yordamchisisiz. Qisqa, aniq va foydali javoblar bering. Foydalanuvchi qaysi tilda gapirsa, o'sha tilda javob bering.",
        },
        { role: "user", content: transcript },
      ],
    });
    const aiText = chatResponse.choices[0]?.message?.content ?? "Kechirasiz, javob bera olmadim.";

    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: aiText,
      response_format: "mp3",
    });
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    res.json({
      transcript,
      response: aiText,
      audioBase64: audioBuffer.toString("base64"),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ovozli suhbat xatosi" });
  }
});

export default router;
