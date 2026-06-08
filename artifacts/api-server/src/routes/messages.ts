import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, conversationParticipantsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)).limit(20);
    const enriched = await Promise.all(convs.map(async (c) => {
      const parts = await db.select().from(conversationParticipantsTable).where(eq(conversationParticipantsTable.conversationId, c.id));
      const participants = await Promise.all(parts.map(async (p) => {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
        return u ? { ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } : null;
      }));
      return { ...c, participants: participants.filter(Boolean) };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { participantIds } = req.body;
    const [conv] = await db.insert(conversationsTable).values({}).returning();
    await Promise.all((participantIds as number[]).map(userId =>
      db.insert(conversationParticipantsTable).values({ conversationId: conv.id, userId })
    ));
    const participants = await Promise.all((participantIds as number[]).map(async (userId: number) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      return u ? { ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } : null;
    }));
    res.status(201).json({ ...conv, participants: participants.filter(Boolean) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(desc(messagesTable.createdAt)).limit(50);
    res.json(msgs.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const { senderId, content, mediaUrl } = req.body;
    const [msg] = await db.insert(messagesTable).values({ conversationId, senderId, content, mediaUrl }).returning();
    await db.update(conversationsTable).set({ lastMessage: content, updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
    res.status(201).json(msg);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
