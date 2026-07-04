import { Router } from "express";
import { db } from "@workspace/db";
import { reelsTable, reelLikesTable, reelCommentsTable, usersTable, moderationQueueTable, followsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, sql, desc, and, inArray, not, count } from "drizzle-orm";
import { accumulateViewEarning } from "./monetization";
import { scanContentAsync } from "../moderation/aiFilter";
import { getUserStats, getUserStatsMap } from "../lib/userStats";

const router = Router();

/* ── Batch enrich: 3 queries for ALL reels (not 3×N) ────────── */
async function batchEnrichReels(
  reels: (typeof reelsTable.$inferSelect)[],
  viewerId = 0,
) {
  if (reels.length === 0) return [];

  const authorIds = [...new Set(reels.map(r => r.authorId).filter(Boolean))] as number[];
  const reelIds = reels.map(r => r.id);

  const [authors, likedRows, statsMap] = await Promise.all([
    authorIds.length > 0
      ? db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : Promise.resolve([]),
    viewerId && reelIds.length > 0
      ? db
          .select({ reelId: reelLikesTable.reelId })
          .from(reelLikesTable)
          .where(and(inArray(reelLikesTable.reelId, reelIds), eq(reelLikesTable.userId, viewerId)))
      : Promise.resolve([]),
    getUserStatsMap(authorIds, viewerId),
  ]);

  const authorMap = new Map(authors.map(a => [a.id, a]));
  const likedSet = new Set((likedRows as { reelId: number }[]).map(l => l.reelId));

  return reels.map(reel => {
    const author = authorMap.get(reel.authorId as number);
    const authorId = author?.id ?? (reel.authorId as number);
    const stats = statsMap.get(authorId) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };

    return {
      ...reel,
      likesCount: reel.likesCount ?? 0,
      commentsCount: reel.commentsCount ?? 0,
      viewsCount: reel.viewsCount ?? 0,
      author: {
        id: authorId,
        username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User",
        avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        ...stats,
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

/* ── GET /reels/similar — semantic tag overlap ──────────────── */
router.get("/reels/similar", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const tagsParam = String(req.query.tags ?? "");
    const excludeParam = String(req.query.excludeIds ?? "");
    const limit = Math.min(Number(req.query.limit) || 8, 20);

    const tags = tagsParam.split(",").map(t => t.trim()).filter(Boolean);
    const excludeIds = excludeParam.split(",").map(Number).filter(n => !isNaN(n) && n > 0);

    if (tags.length === 0) { res.json([]); return; }

    /* Build parameterized array-overlap condition */
    const overlap = sql`${reelsTable.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]`;

    const rows = await db
      .select()
      .from(reelsTable)
      .where(
        excludeIds.length > 0
          ? and(overlap, not(inArray(reelsTable.id, excludeIds)))
          : overlap,
      )
      .orderBy(desc(reelsTable.viewsCount))
      .limit(limit);

    res.json(await batchEnrichReels(rows, viewerId));
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

/* ── DELETE /reels/:id ──────────────────────────────────────── */
router.delete("/reels/:id", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [reel] = await db.select({ authorId: reelsTable.authorId })
      .from(reelsTable).where(eq(reelsTable.id, reelId)).limit(1);

    if (!reel) { res.status(404).json({ error: "Not found" }); return; }
    if (reel.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(reelCommentsTable).where(eq(reelCommentsTable.reelId, reelId));
    await db.delete(reelLikesTable).where(eq(reelLikesTable.reelId, reelId));
    await db.delete(reelsTable).where(eq(reelsTable.id, reelId));

    res.json({ ok: true });
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

    /* Increment view count */
    await db.update(reelsTable)
      .set({ viewsCount: sql`${reelsTable.viewsCount} + 1` })
      .where(eq(reelsTable.id, reelId));

    /* Fetch author for monetization — fire-and-forget, never blocks */
    const [reel] = await db.select({ authorId: reelsTable.authorId })
      .from(reelsTable).where(eq(reelsTable.id, reelId)).limit(1);
    if (reel?.authorId) {
      void accumulateViewEarning("reel", reelId, reel.authorId);
    }

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
    const viewerId = (req.session as any)?.userId as number | undefined;
    const authors = authorIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));
    const statsMap = await getUserStatsMap(authorIds, viewerId);

    res.json(comments.map(c => {
      const author = authorMap.get(c.authorId as number);
      const stats = statsMap.get(c.authorId as number) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
      return {
        ...c,
        author: {
          id: author?.id ?? c.authorId, username: author?.username ?? "deleted",
          displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
          isVerified: author?.isVerified ?? false,
          ...stats,
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
    const stats = await getUserStats(userId, userId);
    res.status(201).json({
      ...comment,
      author: {
        id: author?.id ?? userId, username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        ...stats,
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

/* ── POST /reels/:id/gift — send a tip from wallet to creator ── */
router.post("/reels/:id/gift", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const { amount } = req.body as { amount?: number };
    if (!amount || amount < 100) { res.status(400).json({ error: "Minimal miqdor 100 so'm" }); return; }

    const [reel] = await db.select({ authorId: reelsTable.authorId }).from(reelsTable).where(eq(reelsTable.id, reelId));
    if (!reel) { res.status(404).json({ error: "Video topilmadi" }); return; }
    if (reel.authorId === userId) { res.status(400).json({ error: "O'z videongizga sovg'a yubora olmaysiz" }); return; }

    /* Get or create sender wallet */
    let senderWallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
    if (!senderWallet) {
      const [w] = await db.insert(walletsTable).values({ userId }).returning();
      senderWallet = w;
    }
    if (senderWallet.balance < amount) {
      res.status(400).json({ error: "Hamyonda mablag' yetarli emas", balance: senderWallet.balance, required: amount });
      return;
    }

    /* Get or create receiver wallet */
    let receiverWallet = reel.authorId
      ? await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, reel.authorId) })
      : null;
    if (!receiverWallet && reel.authorId) {
      const [w] = await db.insert(walletsTable).values({ userId: reel.authorId }).returning();
      receiverWallet = w;
    }

    /* Deduct from sender */
    const newBal = senderWallet.balance - amount;
    await db.update(walletsTable).set({ balance: newBal, updatedAt: new Date() }).where(eq(walletsTable.id, senderWallet.id));
    await db.insert(transactionsTable).values({
      userId, walletId: senderWallet.id,
      type: "transfer_out", amount, currency: "UZS", status: "completed", paymentMethod: "internal",
      description: `⭐ Video uchun sovg'a yuborildi (reel #${reelId})`,
    });

    /* Credit to author earnings */
    if (receiverWallet && reel.authorId) {
      await db.update(walletsTable)
        .set({ earningsBalance: receiverWallet.earningsBalance + amount, updatedAt: new Date() })
        .where(eq(walletsTable.id, receiverWallet.id));
      await db.insert(transactionsTable).values({
        userId: reel.authorId, walletId: receiverWallet.id,
        type: "content_revenue", amount, currency: "UZS", status: "completed", paymentMethod: "internal",
        description: `⭐ Video uchun sovg'a olindi (reel #${reelId})`,
      });
    }

    res.json({ ok: true, newBalance: newBal });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sovg'a yuborishda xato" });
  }
});

export default router;
