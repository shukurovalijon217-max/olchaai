import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { scanContentAsync } from "../moderation/aiFilter.js";
import { applyAutopilotDecision } from "../moderation/aiAutopilot.js";

const GO_SERVICE = process.env.GO_SERVICE_URL ?? "http://localhost:8099";

async function notifyGo(userId: number, event: string, payload: unknown) {
  try {
    await fetch(`${GO_SERVICE}/go/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, event, payload }),
    });
  } catch {}
}

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

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" });
    return null;
  }
  return userId;
}

async function isParticipant(conversationId: number, userId: number): Promise<boolean> {
  const [row] = await db.select().from(chatParticipantsTable)
    .where(and(eq(chatParticipantsTable.conversationId, conversationId), eq(chatParticipantsTable.userId, userId)));
  return !!row;
}

router.get("/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const myRows = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.userId, userId));
    const myConvIds = myRows.map(r => r.conversationId);
    if (myConvIds.length === 0) { res.json([]); return; }

    const convs = await db.select().from(chatConversationsTable)
      .where(inArray(chatConversationsTable.id, myConvIds))
      .orderBy(desc(chatConversationsTable.updatedAt))
      .limit(50);
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
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { participantIds } = req.body;
    const ids = Array.from(new Set([...(participantIds as number[] ?? []), userId]));
    if (!ids.includes(userId)) ids.push(userId);

    const [conv] = await db.insert(chatConversationsTable).values({}).returning();
    await Promise.all(ids.map(pid =>
      db.insert(chatParticipantsTable).values({ conversationId: conv.id, userId: pid })
    ));
    const participants = await Promise.all(ids.map(async (pid: number) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, pid));
      return u ? { ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } : null;
    }));
    res.status(201).json({ ...conv, participants: participants.filter(Boolean) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const id = Number(req.params.id);
    if (!(await isParticipant(id, userId))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    const msgs = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.conversationId, id)).orderBy(desc(chatMessagesTable.createdAt)).limit(50);
    res.json(msgs.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:id/messages", async (req: any, res) => {
  const senderId = requireAuth(req, res);
  if (!senderId) return;
  try {
    const conversationId = Number(req.params["id"]);
    const { content, mediaUrl } = req.body;
    if (!(await isParticipant(conversationId, senderId))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    // AI scan on every outgoing message
    const scan = await scanContentAsync(content ?? "");

    const [msg] = await db.insert(chatMessagesTable).values({ conversationId, senderId, content, mediaUrl }).returning();

    // AI Autopilot decision (warnings/bans/logging)
    const decision = await applyAutopilotDecision({
      scan, authorId: senderId,
      contentType: "message", contentId: msg.id, contentText: content ?? "",
    });

    await db.update(chatConversationsTable).set({ lastMessage: content, updatedAt: new Date() }).where(eq(chatConversationsTable.id, conversationId));

    if (decision.isBanned || scan.autoBlock) {
      res.status(422).json({
        error: decision.message ?? "Xabar avtomatik bloklandi — qoidalarga zid kontent.",
        action: decision.action,
        warningCount: decision.warningCount,
      }); return;
    }

    // Notify other participants in realtime via the Go WS hub
    const parts = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.conversationId, conversationId));
    for (const p of parts) {
      if (p.userId !== senderId) {
        await notifyGo(p.userId, "dm_message", { conversationId, message: msg });
      }
    }

    res.status(201).json({
      ...msg,
      ...(decision.action === "warned" ? { warning: decision.message } : {}),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/conversations/:id/messages/:msgId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const conversationId = Number(req.params.id);
    const msgId = Number(req.params.msgId);
    if (!(await isParticipant(conversationId, userId))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    await db.delete(chatMessagesTable).where(and(
      eq(chatMessagesTable.id, msgId),
      eq(chatMessagesTable.conversationId, conversationId),
      eq(chatMessagesTable.senderId, userId),
    ));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const id = Number(req.params.id);
    if (!(await isParticipant(id, userId))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.conversationId, id));
    await db.delete(chatParticipantsTable).where(eq(chatParticipantsTable.conversationId, id));
    await db.delete(chatConversationsTable).where(eq(chatConversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
