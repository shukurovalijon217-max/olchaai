import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, chatConversationsTable, chatParticipantsTable, chatMessagesTable, type FocusShield } from "@workspace/db";
import { eq, desc, and, inArray, or, isNull, lte } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter.js";
import { applyAutopilotDecision } from "../moderation/aiAutopilot.js";
import { getUserStatsMap } from "../lib/userStats";
import { sendNotification } from "../lib/pushNotifications";

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

// Mute semantics only: message is always stored & delivered on fetch, this just
// suppresses the realtime notify/sound/push for senders outside the allowlist
// during the recipient's configured focus-shield window.
function isFocusShieldMuted(fs: FocusShield | null | undefined, senderId: number): boolean {
  if (!fs?.enabled) return false;
  if (fs.allowedUserIds?.includes(senderId)) return false;
  const { startHour, endHour } = fs;
  if (startHour === endHour) return false;
  const hour = new Date().getHours();
  return startHour < endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}

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

/**
 * time_capsule: a scheduled message only becomes "delivered" (visible in the
 * conversation preview + triggers a realtime notify) once its scheduledAt has
 * passed. There is no background job, so delivery is finalized lazily the
 * next time any participant fetches the conversation list or its messages.
 */
async function finalizeDueScheduledMessages(conversationId: number) {
  const now = new Date();
  const [conv] = await db.select().from(chatConversationsTable).where(eq(chatConversationsTable.id, conversationId));
  if (!conv) return;

  const [dueMsg] = await db.select().from(chatMessagesTable)
    .where(and(
      eq(chatMessagesTable.conversationId, conversationId),
      lte(chatMessagesTable.scheduledAt, now),
    ))
    .orderBy(desc(chatMessagesTable.scheduledAt))
    .limit(1);

  if (!dueMsg || !dueMsg.scheduledAt) return;
  if (dueMsg.scheduledAt <= conv.updatedAt) return; // already finalized

  await db.update(chatConversationsTable)
    .set({ lastMessage: dueMsg.content, updatedAt: now })
    .where(eq(chatConversationsTable.id, conversationId));

  const parts = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.conversationId, conversationId));
  for (const p of parts) {
    if (p.userId !== dueMsg.senderId) {
      await notifyGo(p.userId, "dm_message", { conversationId, message: dueMsg });
    }
  }
}

router.get("/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const myRows = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.userId, userId));
    const myConvIds = myRows.map(r => r.conversationId);
    if (myConvIds.length === 0) { res.json([]); return; }

    await Promise.all(myConvIds.map(id => finalizeDueScheduledMessages(id)));

    const convs = await db.select().from(chatConversationsTable)
      .where(inArray(chatConversationsTable.id, myConvIds))
      .orderBy(desc(chatConversationsTable.updatedAt))
      .limit(50);

    const allParticipantRows = await db.select().from(chatParticipantsTable).where(inArray(chatParticipantsTable.conversationId, myConvIds));
    const allParticipantIds = [...new Set(allParticipantRows.map(r => r.userId))];
    const statsMap = await getUserStatsMap(allParticipantIds, userId);
    const users = await db.select().from(usersTable).where(inArray(usersTable.id, allParticipantIds));
    const userMap = new Map(users.map(u => [u.id, { ...u, ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }) }]));

    const enriched = convs.map((c) => {
      const parts = allParticipantRows.filter(r => r.conversationId === c.id);
      const participants = parts.map(p => userMap.get(p.userId)).filter(Boolean);
      return { ...c, participants };
    });
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
    const statsMap = await getUserStatsMap(ids, userId);
    const participants = await Promise.all(ids.map(async (pid: number) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, pid));
      return u ? { ...u, ...(statsMap.get(pid) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }) } : null;
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

    await finalizeDueScheduledMessages(id);

    const now = new Date();
    // time_capsule: a message scheduled for the future stays hidden from
    // everyone except its own sender (who sees it marked as pending) until
    // scheduledAt has passed.
    const msgs = await db.select().from(chatMessagesTable)
      .where(and(
        eq(chatMessagesTable.conversationId, id),
        or(
          isNull(chatMessagesTable.scheduledAt),
          lte(chatMessagesTable.scheduledAt, now),
          eq(chatMessagesTable.senderId, userId),
        ),
      ))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(50);

    const withPending = msgs.map(m => ({
      ...m,
      isPending: !!m.scheduledAt && m.scheduledAt > now,
    }));
    res.json(withPending.reverse());
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
    const { content, mediaUrl, scheduledAt, type: msgType } = req.body;
    if (!(await isParticipant(conversationId, senderId))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = !!scheduledDate && scheduledDate.getTime() > Date.now();

    // AI scan on every outgoing message
    const scan = await scanContentAsync(content ?? "");

    const [msg] = await db.insert(chatMessagesTable)
      .values({ conversationId, senderId, content, type: msgType ?? "text", mediaUrl, scheduledAt: scheduledDate ?? undefined })
      .returning();

    // AI Autopilot decision (warnings/bans/logging)
    const decision = await applyAutopilotDecision({
      scan, authorId: senderId,
      contentType: "message", contentId: msg.id, contentText: content ?? "",
    });

    if (decision.isBanned || scan.autoBlock) {
      res.status(422).json({
        error: decision.message ?? "Xabar avtomatik bloklandi — qoidalarga zid kontent.",
        action: decision.action,
        warningCount: decision.warningCount,
      }); return;
    }

    if (!isFutureScheduled) {
      // Delivered immediately: update the conversation preview and notify.
      await db.update(chatConversationsTable).set({ lastMessage: content, updatedAt: new Date() }).where(eq(chatConversationsTable.id, conversationId));

      const parts = await db.select().from(chatParticipantsTable).where(eq(chatParticipantsTable.conversationId, conversationId));
      const recipientIds = parts.map(p => p.userId).filter(id => id !== senderId);
      const recipients = recipientIds.length
        ? await db.select({ id: usersTable.id, focusShield: usersTable.focusShield }).from(usersTable).where(inArray(usersTable.id, recipientIds))
        : [];
      const focusShieldById = new Map(recipients.map(r => [r.id, r.focusShield]));

      // Get sender info for push notification body
      const [sender] = await db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
      const senderName = sender?.displayName ?? "Kimdir";

      for (const p of parts) {
        if (p.userId !== senderId) {
          if (isFocusShieldMuted(focusShieldById.get(p.userId), senderId)) {
            req.log.info({ recipientId: p.userId, senderId }, "focus_shield_muted_notify");
            continue;
          }
          await notifyGo(p.userId, "dm_message", { conversationId, message: msg });
          // Push notification (fire-and-forget)
          sendNotification({
            userId: p.userId,
            title: `💬 ${senderName}`,
            body: content ? content.slice(0, 100) : (mediaUrl ? "📎 Fayl yubordi" : "Yangi xabar"),
            type: "message",
            actorName: senderName,
            actorAvatar: sender?.avatarUrl ?? undefined,
            targetId: conversationId,
            targetType: "conversation",
            data: { conversationId: String(conversationId), type: "message" },
          }).catch(() => {});
        }
      }
    }

    res.status(201).json({
      ...msg,
      isPending: isFutureScheduled,
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
