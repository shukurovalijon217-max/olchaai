import { Router } from "express";
import { db } from "@workspace/db";
import {
  reelsTable, reelLikesTable, reelCommentsTable, usersTable, moderationQueueTable, followsTable, walletsTable, transactionsTable,
  userInteractionsTable, reelWatchProgressTable, reelCollaboratorsTable,
} from "@workspace/db";
import { eq, sql, desc, and, inArray, not, count, gte } from "drizzle-orm";
import { accumulateViewEarning } from "./monetization";
import { scanContentAsync } from "../moderation/aiFilter";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheGet, cacheSet } from "../lib/cache";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

/* ── Batch enrich: 3 queries for ALL reels (not 3×N) ────────── */
async function batchEnrichReels(
  reels: (typeof reelsTable.$inferSelect)[],
  viewerId = 0,
) {
  if (reels.length === 0) return [];

  const authorIds = [...new Set(reels.map(r => r.authorId).filter(Boolean))] as number[];
  const reelIds = reels.map(r => r.id);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [authors, likedRows, statsMap, views24hRows] = await Promise.all([
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
    reelIds.length > 0
      ? db.select({ reelId: userInteractionsTable.contentId, n: count() })
          .from(userInteractionsTable)
          .where(and(
            eq(userInteractionsTable.contentType, "reel"),
            eq(userInteractionsTable.interactionType, "view"),
            inArray(userInteractionsTable.contentId, reelIds),
            gte(userInteractionsTable.createdAt, since24h),
          ))
          .groupBy(userInteractionsTable.contentId)
      : Promise.resolve([]),
  ]);

  const authorMap = new Map(authors.map(a => [a.id, a]));
  const likedSet = new Set((likedRows as { reelId: number }[]).map(l => l.reelId));
  const views24hMap = new Map((views24hRows as { reelId: number; n: number }[]).map(v => [v.reelId, Number(v.n)]));

  return reels.map(reel => {
    const author = authorMap.get(reel.authorId as number);
    const authorId = author?.id ?? (reel.authorId as number);
    const stats = statsMap.get(authorId) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };

    return {
      ...reel,
      likesCount: reel.likesCount ?? 0,
      commentsCount: reel.commentsCount ?? 0,
      viewsCount: reel.viewsCount ?? 0,
      views24h: views24hMap.get(reel.id) ?? 0,
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

function computeSignalScore(viewsCount: number, likesCount: number, views24h: number) {
  const base = Math.log10(Math.max(2, viewsCount)) * 14 + (likesCount / Math.max(1, viewsCount)) * 120;
  const velocityBoost = Math.min(30, (views24h / Math.max(1, viewsCount)) * 60);
  return Math.min(99, Math.round(base + velocityBoost));
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
    const { videoUrl, thumbnailUrl, caption, audioTrack, duration, tags } = req.body;
    const authorId = viewerId ?? Number(req.body.authorId);
    if (!authorId) { res.status(401).json({ error: "Login kerak" }); return; }

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

/* ── GET /reels/:id/analytics — real 24h velocity/signal ────── */
router.get("/reels/:id/analytics", async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const [reel] = await db.select({ viewsCount: reelsTable.viewsCount, likesCount: reelsTable.likesCount })
      .from(reelsTable).where(eq(reelsTable.id, reelId));
    if (!reel) { res.status(404).json({ error: "Not found" }); return; }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [row] = await db.select({ n: count() })
      .from(userInteractionsTable)
      .where(and(
        eq(userInteractionsTable.contentType, "reel"),
        eq(userInteractionsTable.interactionType, "view"),
        eq(userInteractionsTable.contentId, reelId),
        gte(userInteractionsTable.createdAt, since24h),
      ));

    const views24h = Number(row?.n ?? 0);
    const viewsCount = reel.viewsCount ?? 0;
    const velocityPct = viewsCount > 0 ? Math.round((views24h / viewsCount) * 1000) / 10 : 0;
    const signalScore = computeSignalScore(viewsCount, reel.likesCount ?? 0, views24h);

    res.json({ reelId, viewsCount, views24h, velocityPct, signalScore });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PUT /reels/:id/progress — save real watch position ──────── */
router.put("/reels/:id/progress", requireAuth, async (req: any, res) => {
  try {
    const reelId = Number(req.params.id);
    const userId = req.session.userId as number;
    const { positionSec, durationSec } = req.body as { positionSec?: number; durationSec?: number };

    const [row] = await db.insert(reelWatchProgressTable)
      .values({ userId, reelId, positionSec: Math.max(0, positionSec ?? 0), durationSec: Math.max(0, durationSec ?? 0), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [reelWatchProgressTable.userId, reelWatchProgressTable.reelId],
        set: { positionSec: Math.max(0, positionSec ?? 0), durationSec: Math.max(0, durationSec ?? 0), updatedAt: new Date() },
      })
      .returning();

    res.json({ reelId, positionSec: row.positionSec, durationSec: row.durationSec, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /reels/continue-watching — real saved progress ──────── */
router.get("/reels/continue-watching", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;
    const rows = await db.select().from(reelWatchProgressTable)
      .where(and(eq(reelWatchProgressTable.userId, userId), sql`${reelWatchProgressTable.positionSec} > 0`))
      .orderBy(desc(reelWatchProgressTable.updatedAt))
      .limit(10);

    if (rows.length === 0) { res.json([]); return; }

    const reelIds = rows.map(r => r.reelId);
    const reels = await db.select().from(reelsTable).where(inArray(reelsTable.id, reelIds));
    const enriched = await batchEnrichReels(reels, userId);
    const reelMap = new Map(enriched.map(r => [r.id, r]));

    const items = rows
      .map(p => {
        const reel = reelMap.get(p.reelId);
        if (!reel) return null;
        const pct = p.durationSec > 0 ? Math.min(99, Math.round((p.positionSec / p.durationSec) * 100)) : 0;
        return { reel, positionSec: p.positionSec, durationSec: p.durationSec, pct };
      })
      .filter(Boolean);

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Collab studio: invite/list/remove collaborators ─────────── */
router.get("/reels/collaborators", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;
    const rows = await db.select().from(reelCollaboratorsTable)
      .where(eq(reelCollaboratorsTable.ownerId, userId))
      .orderBy(desc(reelCollaboratorsTable.createdAt));

    const handles = rows.map(r => r.inviteeHandle);
    const invitees = handles.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.username, handles))
      : [];
    const inviteeMap = new Map(invitees.map(u => [u.username, u]));

    res.json(rows.map(r => {
      const invitee = inviteeMap.get(r.inviteeHandle);
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        invitee: invitee ? {
          id: invitee.id, username: invitee.username, displayName: invitee.displayName,
          avatarUrl: invitee.avatarUrl, isVerified: invitee.isVerified,
        } : null,
      };
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reels/collaborators", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;
    const { inviteeHandle, permission } = req.body as { inviteeHandle?: string; permission?: string };
    const handle = (inviteeHandle ?? "").replace(/^@/, "").trim();
    if (!handle) { res.status(400).json({ error: "inviteeHandle talab qilinadi" }); return; }

    const [invitee] = await db.select().from(usersTable).where(eq(usersTable.username, handle));
    if (!invitee) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    if (invitee.id === userId) { res.status(400).json({ error: "O'zingizni taklif qila olmaysiz" }); return; }

    const [row] = await db.insert(reelCollaboratorsTable)
      .values({ ownerId: userId, inviteeHandle: handle, permission: permission === "view" ? "view" : "edit", status: "pending" })
      .returning();

    res.status(201).json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      invitee: { id: invitee.id, username: invitee.username, displayName: invitee.displayName, avatarUrl: invitee.avatarUrl, isVerified: invitee.isVerified },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reels/collaborators/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    const [row] = await db.select({ ownerId: reelCollaboratorsTable.ownerId }).from(reelCollaboratorsTable).where(eq(reelCollaboratorsTable.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    if (row.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(reelCollaboratorsTable).where(eq(reelCollaboratorsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /reels/:id/view ───────────────────────────────────── */
router.post("/reels/:id/view", async (req, res) => {
  try {
    const reelId = Number(req.params.id);

    /* Deduplicate: same user (or IP) can only add 1 view per reel per hour */
    const userId  = (req.session as any)?.userId as number | undefined;
    const viewKey = `rview:${reelId}:${userId ?? req.ip}`;
    const already = await cacheGet(viewKey);
    if (already) { res.json({ ok: true, deduplicated: true }); return; }
    await cacheSet(viewKey, "1", 3600); /* 1 hour TTL */

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

router.get("/reels/:id/versions", requireAuth, async (req: any, res) => {
  const reelId = Number(req.params.id);
  try {
    const result = await db.execute(
      sql`SELECT rv.*, u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
          FROM reel_versions rv
          JOIN users u ON u.id = rv.editor_id
          WHERE rv.reel_id = ${reelId}
          ORDER BY rv.created_at DESC
          LIMIT 50`
    );
    res.json((result as any).rows ?? []);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.post("/reels/:id/versions", requireAuth, async (req: any, res) => {
  const reelId = Number(req.params.id);
  const { note } = req.body as { note?: string };
  try {
    const reel = await db.query.reelsTable.findFirst({ where: eq(reelsTable.id, reelId) });
    if (!reel) { res.status(404).json({ error: "Video topilmadi" }); return; }

    const result = await db.execute(
      sql`INSERT INTO reel_versions (reel_id, editor_id, caption, tags, note)
          VALUES (${reelId}, ${req.session.userId}, ${reel.caption ?? null}, ${reel.tags ?? null}, ${note ?? null})
          RETURNING *`
    );
    res.json((result as any).rows?.[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
