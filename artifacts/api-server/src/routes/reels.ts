import { Router } from "express";
import { db } from "@workspace/db";
import { reelsTable, reelLikesTable, reelCommentsTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";

const router = Router();

async function enrichReel(reel: typeof reelsTable.$inferSelect, viewerId = 0) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, reel.authorId));
  const liked = viewerId
    ? await db.select().from(reelLikesTable).where(and(eq(reelLikesTable.reelId, reel.id), eq(reelLikesTable.userId, viewerId)))
    : [];
  return {
    ...reel,
    author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false, isVerified: author?.isVerified || false },
    tags: reel.tags || [],
    isLiked: liked.length > 0,
  };
}

router.get("/reels", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = Number(req.query.offset) || 0;
    const userId = req.query.userId ? Number(req.query.userId) : null;
    const query = db.select().from(reelsTable);
    const reels = await (userId
      ? query.where(eq(reelsTable.authorId, userId)).orderBy(desc(reelsTable.createdAt)).limit(limit).offset(offset)
      : query.orderBy(desc(reelsTable.viewsCount)).limit(limit).offset(offset));
    const enriched = await Promise.all(reels.map(r => enrichReel(r, viewerId)));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reels", async (req, res) => {
  try {
    const { authorId, videoUrl, thumbnailUrl, caption, audioTrack, duration, tags } = req.body;

    const scan = await scanContentAsync(caption ?? "");
    if (scan.autoBlock) {
      res.status(422).json({ error: "Reel avtomatik bloklandi — qoidalarga zid material aniqlandi.", categories: scan.categories }); return;
    }

    const [reel] = await db.insert(reelsTable).values({ authorId, videoUrl, thumbnailUrl, caption, audioTrack, duration, tags }).returning();

    if (scan.verdict !== "clean") {
      await db.insert(moderationQueueTable).values({
        contentType: "reel", contentId: reel.id, contentText: caption ?? "",
        authorId: authorId ?? null,
        aiScore: scan.score, aiCategories: scan.categories,
        aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: false, status: "pending",
      }).catch(() => {});
    }

    res.status(201).json({ ...(await enrichReel(reel)), aiScan: scan.verdict !== "clean" ? scan : undefined });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reels/:id/like", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const existing = await db.select().from(reelLikesTable).where(and(eq(reelLikesTable.reelId, reelId), eq(reelLikesTable.userId, userId)));
    if (existing.length > 0) {
      await db.delete(reelLikesTable).where(and(eq(reelLikesTable.reelId, reelId), eq(reelLikesTable.userId, userId)));
      await db.update(reelsTable).set({ likesCount: sql`${reelsTable.likesCount} - 1` }).where(eq(reelsTable.id, reelId));
    } else {
      await db.insert(reelLikesTable).values({ reelId, userId });
      await db.update(reelsTable).set({ likesCount: sql`${reelsTable.likesCount} + 1` }).where(eq(reelsTable.id, reelId));
    }
    const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
    res.json({ liked: existing.length === 0, likesCount: reel?.likesCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Reel Comments ──────────────────────────────────────────── */

router.get("/reels/:id/comments", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const comments = await db
      .select()
      .from(reelCommentsTable)
      .where(eq(reelCommentsTable.reelId, reelId))
      .orderBy(desc(reelCommentsTable.createdAt));

    const enriched = await Promise.all(comments.map(async (c) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, c.authorId));
      return {
        ...c,
        author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false, isVerified: author?.isVerified || false },
      };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reels/:id/comments", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }

    const scan = await scanContentAsync(content);
    if (scan.autoBlock) {
      res.status(422).json({ error: "Izoh avtomatik bloklandi.", categories: scan.categories }); return;
    }

    const [comment] = await db.insert(reelCommentsTable).values({ reelId, authorId: userId, content }).returning();
    await db.update(reelsTable).set({ commentsCount: sql`${reelsTable.commentsCount} + 1` }).where(eq(reelsTable.id, reelId));

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId));
    res.status(201).json({
      ...comment,
      author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false, isVerified: author?.isVerified || false },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
