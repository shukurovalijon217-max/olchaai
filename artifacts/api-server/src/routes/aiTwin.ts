import { Router } from "express";
import { db } from "@workspace/db";
import { aiTwinConfigTable, aiTwinChatsTable, aiTwinMessagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.get("/twin/config", requireAuth, async (req: any, res) => {
  try {
    const [cfg] = await db.select().from(aiTwinConfigTable).where(eq(aiTwinConfigTable.userId, req.session.userId));
    res.json(cfg ?? null);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/twin/config", requireAuth, async (req: any, res) => {
  try {
    const { isEnabled, personality, topics, bio } = req.body;
    const existing = await db.select().from(aiTwinConfigTable).where(eq(aiTwinConfigTable.userId, req.session.userId));
    if (existing.length > 0) {
      const [updated] = await db.update(aiTwinConfigTable)
        .set({ isEnabled: isEnabled ?? existing[0].isEnabled, personality, topics, bio })
        .where(eq(aiTwinConfigTable.userId, req.session.userId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(aiTwinConfigTable)
        .values({ userId: req.session.userId, isEnabled: isEnabled ?? false, personality, topics, bio })
        .returning();
      res.json(created);
    }
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/twin/:userRef", async (req: any, res) => {
  try {
    const userRef = req.params.userRef;
    const asId = parseInt(userRef);
    const { eq: eqOp } = await import("drizzle-orm");
    let user: typeof usersTable.$inferSelect | undefined;
    if (!isNaN(asId)) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.id, asId));
    }
    if (!user) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.username, userRef));
    }
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [cfg] = await db.select().from(aiTwinConfigTable).where(eq(aiTwinConfigTable.userId, user.id));
    if (!cfg?.isEnabled) { res.status(404).json({ error: "Bu foydalanuvchining AI egizagi faol emas" }); return; }
    res.json({ user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatarUrl }, twin: cfg });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/twin/:userId/chat", requireAuth, async (req: any, res) => {
  try {
    const twinOwnerId = parseInt(req.params.userId);
    const visitorId = req.session.userId;
    const { message, chatId } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: "Xabar majburiy" }); return; }

    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, twinOwnerId));
    const [cfg] = await db.select().from(aiTwinConfigTable).where(eq(aiTwinConfigTable.userId, twinOwnerId));
    if (!cfg?.isEnabled) { res.status(403).json({ error: "AI egizak faol emas" }); return; }

    let currentChatId = chatId;
    if (!currentChatId) {
      const [chat] = await db.insert(aiTwinChatsTable).values({ twinOwnerId, visitorId }).returning();
      currentChatId = chat.id;
      await db.update(aiTwinConfigTable).set({ totalChats: cfg.totalChats + 1 }).where(eq(aiTwinConfigTable.userId, twinOwnerId));
    }

    await db.insert(aiTwinMessagesTable).values({ chatId: currentChatId, role: "user", content: message.trim() });

    const history = await db.select().from(aiTwinMessagesTable)
      .where(eq(aiTwinMessagesTable.chatId, currentChatId))
      .orderBy(aiTwinMessagesTable.createdAt)
      .limit(20);

    const systemPrompt = `Siz ${owner.displayName} (@${owner.username}) nomli shaxsning AI egizagisiz.
${cfg.bio ? `Bio: ${cfg.bio}` : ""}
${cfg.personality ? `Shaxsiyat: ${cfg.personality}` : ""}
${cfg.topics ? `Qiziqishlar: ${cfg.topics}` : ""}
Siz ushbu shaxsning fikrlash tarzi, uslubi va bilimlariga asosan javob berasiz.
Xuddi o'sha odam kabi muloyim, samimiy va qisqa javob bering.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content ?? "...";
    await db.insert(aiTwinMessagesTable).values({ chatId: currentChatId, role: "assistant", content: reply });
    await db.update(aiTwinConfigTable).set({ lastActiveAt: new Date() }).where(eq(aiTwinConfigTable.userId, twinOwnerId));

    res.json({ chatId: currentChatId, reply });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/twin/:userId/chats", requireAuth, async (req: any, res) => {
  try {
    const twinOwnerId = parseInt(req.params.userId);
    const visitorId = req.session.userId;
    const chats = await db.select().from(aiTwinChatsTable)
      .where(eq(aiTwinChatsTable.twinOwnerId, twinOwnerId))
      .orderBy(desc(aiTwinChatsTable.createdAt));
    const myChat = chats.find(c => c.visitorId === visitorId);
    if (!myChat) { res.json({ chatId: null, messages: [] }); return; }
    const messages = await db.select().from(aiTwinMessagesTable)
      .where(eq(aiTwinMessagesTable.chatId, myChat.id))
      .orderBy(aiTwinMessagesTable.createdAt);
    res.json({ chatId: myChat.id, messages });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
