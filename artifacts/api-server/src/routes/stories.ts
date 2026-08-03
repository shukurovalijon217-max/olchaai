import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, storyReactionsTable, usersTable, moderationQueueTable, chatConversationsTable, chatParticipantsTable, chatMessagesTable } from "@workspace/db";
import { eq, sql, gt, and, inArray } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheAside, cacheDelPattern } from "../lib/cache";
import { assertMediaUrl } from "../lib/assertMediaUrl";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const enriched = await cacheAside("stories", `list:${viewerId ?? 0}`, async () => {
      const now = new Date();
      const stories = await db.select().from(storiesTable).where(gt(storiesTable.expiresAt, now));
      const authorIds = [...new Set(stories.map(s => s.authorId))];
      const statsMap = await getUserStatsMap(authorIds, viewerId);
      const authors = authorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
      const authorMap = new Map(authors.map(a => [a.id, a]));
      return stories.map((s) => {
        const author = authorMap.get(s.authorId);
        const stats = statsMap.get(s.authorId) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
        return { ...s, author: { ...(author || {}), ...stats }, isViewed: false };
      });
    }, 30);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories", async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    const authorId = (req.session as any)?.userId ?? Number(req.body.authorId);
    if (!authorId) { res.status(401).json({ error: "Login kerak" }); return; }

    assertMediaUrl(mediaUrl, "mediaUrl");

    // AI scan caption before saving
    const scan = await scanContentAsync(caption ?? "");
    if (scan.autoBlock) {
      res.status(422).json({
        error: "Story avtomatik bloklandi — qoidalarga zid material aniqlandi.",
        categories: scan.categories,
      }); return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(storiesTable).values({ authorId, mediaUrl, mediaType: mediaType || "photo", caption, expiresAt }).returning();

    if (scan.verdict !== "clean") {
      await db.insert(moderationQueueTable).values({
        contentType: "story", contentId: story.id, contentText: caption ?? "",
        authorId: authorId ?? null,
        aiScore: scan.score, aiCategories: scan.categories,
        aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: false,
        status: "pending",
      }).catch(() => {});
    }

    cacheDelPattern("stories:list:");
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, story.authorId));
    const stats = await getUserStats(story.authorId, authorId);
    res.status(201).json({ ...story, author: { ...(author || {}), ...stats }, isViewed: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stories/:id", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Login kerak" }); return; }

    const [story] = await db.select({ id: storiesTable.id, authorId: storiesTable.authorId })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story) { res.status(404).json({ error: "Story topilmadi" }); return; }
    if (story.authorId !== userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
    cacheDelPattern("stories:list:");
    res.json({ deleted: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories/:id/view", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    /* Dedup: insert only if not already viewed by this user */
    const existing = await db.select({ id: storyViewsTable.id })
      .from(storyViewsTable)
      .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.userId, userId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(storyViewsTable).values({ storyId, userId });
      await db.update(storiesTable)
        .set({ viewsCount: sql`${storiesTable.viewsCount} + 1` })
        .where(eq(storiesTable.id, storyId));
    }
    const [story] = await db.select({ viewsCount: storiesTable.viewsCount })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    res.json({ viewed: true, viewsCount: story?.viewsCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /stories/:id/react — send an emoji reaction to a story ─── */
router.post("/stories/:id/react", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const emoji: string = req.body.emoji || "❤️";

    const [story] = await db.select({ id: storiesTable.id, authorId: storiesTable.authorId })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story) { res.status(404).json({ error: "Story topilmadi" }); return; }

    /* Atomic upsert via ON CONFLICT — safe against concurrent requests */
    await db.insert(storyReactionsTable)
      .values({ storyId, userId, emoji })
      .onConflictDoUpdate({
        target: [storyReactionsTable.storyId, storyReactionsTable.userId],
        set: { emoji },
      });

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(storyReactionsTable).where(eq(storyReactionsTable.storyId, storyId));

    res.json({ reacted: true, emoji, reactionsCount: count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── GET /stories/:id/reactions — fetch reactions for a story (author only) ─── */
router.get("/stories/:id/reactions", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const [story] = await db.select({ authorId: storiesTable.authorId })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story) { res.status(404).json({ error: "Story topilmadi" }); return; }
    if (story.authorId !== userId) { res.status(403).json({ error: "Faqat muallif ko'ra oladi" }); return; }

    const reactions = await db.select({
      id: storyReactionsTable.id,
      emoji: storyReactionsTable.emoji,
      createdAt: storyReactionsTable.createdAt,
      userId: storyReactionsTable.userId,
    }).from(storyReactionsTable).where(eq(storyReactionsTable.storyId, storyId));

    const userIds = [...new Set(reactions.map(r => r.userId))];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
          .from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = reactions.map(r => ({ ...r, user: userMap.get(r.userId) }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── POST /stories/:id/reply — DM the story author with a reply ─── */
router.post("/stories/:id/reply", async (req, res) => {
  try {
    const storyId  = Number(req.params.id);
    const senderId = (req.session as any)?.userId as number | undefined;
    if (!senderId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const message: string = (req.body.message || "").trim();
    if (!message) { res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" }); return; }

    const [story] = await db.select({ id: storiesTable.id, authorId: storiesTable.authorId })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story) { res.status(404).json({ error: "Story topilmadi" }); return; }

    const recipientId = story.authorId;
    if (recipientId === senderId) {
      res.status(400).json({ error: "O'z storyingizga javob bera olmaysiz" }); return;
    }

    /* Find existing true 1-on-1 conversation between sender and recipient.
       A 1-on-1 has exactly 2 participants, so we:
       1. Find conversations where sender is a participant.
       2. Intersect with conversations where recipient is a participant.
       3. Keep only those whose total participant count is exactly 2. */
    const senderConvs = await db.select({ conversationId: chatParticipantsTable.conversationId })
      .from(chatParticipantsTable).where(eq(chatParticipantsTable.userId, senderId));
    const senderConvIds = senderConvs.map(r => r.conversationId);

    let conversationId: number | null = null;
    if (senderConvIds.length > 0) {
      const sharedConvs = await db.select({ conversationId: chatParticipantsTable.conversationId })
        .from(chatParticipantsTable)
        .where(and(
          eq(chatParticipantsTable.userId, recipientId),
          inArray(chatParticipantsTable.conversationId, senderConvIds),
        ));
      const sharedIds = sharedConvs.map(r => r.conversationId);

      /* Among the shared conversations, find one that has exactly 2 participants */
      if (sharedIds.length > 0) {
        const countRows = await db.select({
          conversationId: chatParticipantsTable.conversationId,
          cnt: sql<number>`count(*)::int`,
        })
          .from(chatParticipantsTable)
          .where(inArray(chatParticipantsTable.conversationId, sharedIds))
          .groupBy(chatParticipantsTable.conversationId);

        const dmRow = countRows.find(r => r.cnt === 2);
        if (dmRow) conversationId = dmRow.conversationId;
      }
    }

    /* Create conversation if none exists */
    if (!conversationId) {
      const [conv] = await db.insert(chatConversationsTable)
        .values({ lastMessage: message })
        .returning({ id: chatConversationsTable.id });
      conversationId = conv.id;
      await db.insert(chatParticipantsTable).values([
        { conversationId, userId: senderId },
        { conversationId, userId: recipientId },
      ]);
    }

    /* Insert the message */
    await db.insert(chatMessagesTable).values({
      conversationId,
      senderId,
      content: message,
    });

    await db.update(chatConversationsTable)
      .set({ lastMessage: message, updatedAt: new Date() })
      .where(eq(chatConversationsTable.id, conversationId));

    res.json({ sent: true, conversationId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
