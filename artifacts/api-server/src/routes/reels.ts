import { Router } from "express";
import { db } from "@workspace/db";
import { reelsTable, reelLikesTable, reelCommentsTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";

const router = Router();

/* ── Batch enrich: 2 queries for ALL reels (not 2×N) ────────── */
async function batchEnrichReels(
  reels: (typeof reelsTable.$inferSelect)[],
  viewerId = 0,
) {
  if (reels.length === 0) return [];

  const authorIds = [...new Set(reels.map(r => r.authorId).filter(Boolean))] as number[];
  const reelIds = reels.map(r => r.id);

  const [authors, likedRows] = await Promise.all([
    authorIds.length > 0
      ? db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : Promise.resolve([]),
    viewerId && reelIds.length > 0
      ? db
          .select({ reelId: reelLikesTable.reelId })
          .from(reelLikesTable)
          .where(and(inArray(reelLikesTable.reelId, reelIds), eq(reelLikesTable.userId, viewerId)))
      : Promise.resolve([]),
  ]);

  const authorMap = new Map(authors.map(a => [a.id, a]));
  const likedSet = new Set((likedRows as { reelId: number }[]).map(l => l.reelId));

  return reels.map(reel => {
    const author = authorMap.get(reel.authorId as number);
    return {
      ...reel,
      likesCount: reel.likesCount ?? 0,
      commentsCount: reel.commentsCount ?? 0,
      viewsCount: reel.viewsCount ?? 0,
      author: {
        id: author?.id ?? reel.authorId,
        username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User",
        avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
      },
      tags: reel.tags || [],
      isLiked: likedSet.has(reel.id),
    };
  });
}

/* ── GET /reels ─────────────────────────────────────────────── */
router.get("/reels", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = Number(req.query.offset) || 0;
    const userId = req.query.userId ? Number(req.query.userId) : null;

    const reels = await (userId
      ? db.select().from(reelsTable).where(eq(reelsTable.authorId, userId)).orderBy(desc(reelsTable.createdAt)).limit(limit).offset(offset)
      : db.select().from(reelsTable).orderBy(desc(reelsTable.viewsCount)).limit(limit).offset(offset));

    res.json(await batchEnrichReels(reels, viewerId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /reels — instant response, AI scan in background ─── */
router.post("/reels", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const { authorId, videoUrl, thumbnailUrl, caption, audioTrack, duration, tags } = req.body;

    const [reel] = await db
      .insert(reelsTable)
      .values({ authorId, videoUrl, thumbnailUrl, caption, audioTrack, duration, tags })
      .returning();

    const [enriched] = await batchEnrichReels([reel], viewerId);
    res.status(201).json(enriched);

    /* AI scan in background — never blocks response */
    void (async () => {
      try {
        const scan = await scanContentAsync(caption ?? "");
        if (scan.verdict === "clean") return;
        if (scan.autoBlock) {
          await db.delete(reelsTable).where(eq(reelsTable.id, reel.id)).catch(() => {});
        }
        await db.insert(moderationQueueTable).values({
          contentType: "reel", contentId: reel.id, contentText: caption ?? "",
          authorId: authorId ?? null,
          aiScore: scan.score, aiCategories: scan.categories,
          aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: scan.autoBlock,
          status: scan.autoBlock ? "rejected" : "pending",
        }).catch(() => {});
      } catch { /* silent */ }
    })();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /reels/:id/like ───────────────────────────────────── */
router.post("/reels/:id/like", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const existing = await db
      .select({ reelId: reelLikesTable.reelId })
      .from(reelLikesTable)
      .where(and(eq(reelLikesTable.reelId, reelId), eq(reelLikesTable.userId, userId)))
      .limit(1);

    const isLiked = existing.length > 0;
    if (isLiked) {
      await db.delete(reelLikesTable).where(and(eq(reelLikesTable.reelId, reelId), eq(reelLikesTable.userId, userId)));
      await db.update(reelsTable).set({ likesCount: sql`GREATEST(0, ${reelsTable.likesCount} - 1)` }).where(eq(reelsTable.id, reelId));
    } else {
      await db.insert(reelLikesTable).values({ reelId, userId }).onConflictDoNothing();
      await db.update(reelsTable).set({ likesCount: sql`${reelsTable.likesCount} + 1` }).where(eq(reelsTable.id, reelId));
    }

    const [reel] = await db.select({ likesCount: reelsTable.likesCount }).from(reelsTable).where(eq(reelsTable.id, reelId));
    res.json({ liked: !isLiked, likesCount: reel?.likesCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /reels/:id/view ───────────────────────────────────── */
router.post("/reels/:id/view", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    await db.update(reelsTable).set({ viewsCount: sql`${reelsTable.viewsCount} + 1` }).where(eq(reelsTable.id, reelId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /reels/:id/comments ────────────────────────────────── */
router.get("/reels/:id/comments", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const comments = await db
      .select()
      .from(reelCommentsTable)
      .where(eq(reelCommentsTable.reelId, reelId))
      .orderBy(desc(reelCommentsTable.createdAt));

    if (comments.length === 0) { res.json([]); return; }

    const authorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))] as number[];
    const authors = authorIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    res.json(comments.map(c => {
      const author = authorMap.get(c.authorId as number);
      return {
        ...c,
        author: {
          id: author?.id ?? c.authorId, username: author?.username ?? "deleted",
          displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
          isVerified: author?.isVerified ?? false,
          followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false,
        },
      };
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /reels/:id/comments ───────────────────────────────── */
router.post("/reels/:id/comments", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }

    const [comment] = await db.insert(reelCommentsTable).values({ reelId, authorId: userId, content }).returning();
    await db.update(reelsTable).set({ commentsCount: sql`${reelsTable.commentsCount} + 1` }).where(eq(reelsTable.id, reelId));

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.status(201).json({
      ...comment,
      author: {
        id: author?.id ?? userId, username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false,
      },
    });

    /* AI scan in background */
    void (async () => {
      try {
        const scan = await scanContentAsync(content);
        if (scan.autoBlock) {
          await db.delete(reelCommentsTable).where(eq(reelCommentsTable.id, comment.id)).catch(() => {});
          await db.update(reelsTable).set({ commentsCount: sql`GREATEST(0, ${reelsTable.commentsCount} - 1)` }).where(eq(reelsTable.id, reelId)).catch(() => {});
        }
      } catch { /* silent */ }
    })();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
