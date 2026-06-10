import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  lastMessage: text("last_message"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const chatParticipantsTable = pgTable("chat_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull(),
});

const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(chatConversationsTable).orderBy(desc(chatConversationsTable.updatedAt)).limit(20);
    const enriched = await Promise.all(convs.map(async (c) => {
      const parts = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.conversationId, c.id));
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
    const [conv] = await db.insert(chatConversationsTable).values({}).returning();
    await Promise.all((participantIds as number[]).map(userId =>
      db.insert(chatParticipantsTable).values({ conversationId: conv.id, userId })
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
    const msgs = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.conversationId, id)).orderBy(desc(chatMessagesTable.createdAt)).limit(50);
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
    const [msg] = await db.insert(chatMessagesTable).values({ conversationId, senderId, content, mediaUrl }).returning();
    await db.update(chatConversationsTable).set({ lastMessage: content, updatedAt: new Date() }).where(eq(chatConversationsTable.id, conversationId));
    res.status(201).json(msg);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
