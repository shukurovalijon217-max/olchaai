import { Router } from "express";
import { db } from "@workspace/db";
import {
  monetizationConfigTable, contentEarningsTable, payoutRequestsTable,
  walletsTable, transactionsTable, usersTable,
  creatorMonetizationTable, followsTable,
} from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";

const router = Router();

/* ── Config cache (60s TTL) ─────────────────────────────────── */
let _cfgCache: any = null;
let _cfgCacheAt = 0;

async function getConfig() {
  if (_cfgCache && Date.now() - _cfgCacheAt < 60_000) return _cfgCache;
  let [cfg] = await db.select().from(monetizationConfigTable).where(eq(monetizationConfigTable.id, 1));
  if (!cfg) {
    [cfg] = await db
      .insert(monetizationConfigTable)
      .values({ id: 1 })
      .onConflictDoNothing()
      .returning();
  }
  _cfgCache = cfg;
  _cfgCacheAt = Date.now();
  return cfg;
}

function burstCache() { _cfgCache = null; }

/* ── Per-user monetization status cache (5min TTL) ──────────── */
const _userMonCache = new Map<number, { status: string; ts: number }>();
const USER_MON_TTL = 5 * 60_000;

async function getUserMonStatus(userId: number): Promise<string> {
  const cached = _userMonCache.get(userId);
  if (cached && Date.now() - cached.ts < USER_MON_TTL) return cached.status;
  const [cm] = await db
    .select({ status: creatorMonetizationTable.status })
    .from(creatorMonetizationTable)
    .where(eq(creatorMonetizationTable.userId, userId))
    .limit(1);
  const status = cm?.status ?? "none";
  _userMonCache.set(userId, { status, ts: Date.now() });
  return status;
}

function burstUserMonCache(userId: number) { _userMonCache.delete(userId); }

const TYPE_MULT: Record<string, keyof typeof monetizationConfigTable.$inferSelect> = {
  video: "videoRateMultiplier",
  reel:  "reelRateMultiplier",
  music: "musicRateMultiplier",
  movie: "movieRateMultiplier",
};

/* ── Shared earning accumulator (imported by other routes) ───── */
export async function accumulateViewEarning(
  contentType: string, contentId: number, authorId: number,
): Promise<void> {
  try {
    const cfg = await getConfig();
    if (!cfg?.enabled) return;

    /* Only credit creators who are in the active monetization program */
    const userStatus = await getUserMonStatus(authorId);
    if (userStatus !== "active") return;

    const multKey = TYPE_MULT[contentType] ?? "videoRateMultiplier";
    const multiplier = (cfg[multKey] as number) / 10;
    const grossPerView = Math.round((cfg.revenuePerMille / 1000) * multiplier);
    const creatorEarning = Math.round(grossPerView * cfg.creatorSharePercent / 100);
    const platformEarning = grossPerView - creatorEarning;

    const [existing] = await db
      .select({ id: contentEarningsTable.id, totalViews: contentEarningsTable.totalViews })
      .from(contentEarningsTable)
      .where(and(
        eq(contentEarningsTable.contentType, contentType),
        eq(contentEarningsTable.contentId, contentId),
      ))
      .limit(1);

    if (!existing) {
      await db.insert(contentEarningsTable).values({
        contentType, contentId, authorId, totalViews: 1,
      }).onConflictDoNothing();
      return;
    }

    const newTotal = existing.totalViews + 1;
    if (newTotal < cfg.minViewsThreshold) {
      await db.update(contentEarningsTable)
        .set({ totalViews: newTotal, lastUpdated: new Date() })
        .where(eq(contentEarningsTable.id, existing.id));
      return;
    }

    await db.update(contentEarningsTable).set({
      totalViews: newTotal,
      monetizedViews: sql`${contentEarningsTable.monetizedViews} + 1`,
      grossEarnings:   sql`${contentEarningsTable.grossEarnings}   + ${grossPerView}`,
      creatorEarnings: sql`${contentEarningsTable.creatorEarnings} + ${creatorEarning}`,
      platformEarnings:sql`${contentEarningsTable.platformEarnings}+ ${platformEarning}`,
      lastUpdated: new Date(),
    }).where(eq(contentEarningsTable.id, existing.id));

    if (creatorEarning <= 0) return;

    await db
      .insert(walletsTable)
      .values({ userId: authorId, earningsBalance: creatorEarning })
      .onConflictDoUpdate({
        target: walletsTable.userId,
        set: {
          earningsBalance: sql`${walletsTable.earningsBalance} + ${creatorEarning}`,
          updatedAt: new Date(),
        },
      });
  } catch { /* silent — never block view count */ }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any)?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN ROUTES
   ═══════════════════════════════════════════════════════════════ */

/* ── GET /api/admin/monetization/config ─────────────────────── */
router.get("/admin/monetization/config", requireAdmin, async (req, res) => {
  try {
    const cfg = await getConfig();
    res.json(cfg ?? {});
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── PUT /api/admin/monetization/config ─────────────────────── */
router.put("/admin/monetization/config", requireAdmin, async (req, res) => {
  try {
    const adminId = (req.session as any)?.userId as number;
    const {
      enabled, revenuePerMille, creatorSharePercent, minViewsThreshold,
      videoRateMultiplier, reelRateMultiplier, musicRateMultiplier, movieRateMultiplier,
      minPayoutAmount, minFollowers, minTotalViews, minContentCount, autoApprove,
    } = req.body;

    const patch: Record<string, any> = { updatedAt: new Date(), updatedBy: adminId };
    if (enabled !== undefined)             patch.enabled = Boolean(enabled);
    if (revenuePerMille !== undefined)     patch.revenuePerMille = Math.max(0, Number(revenuePerMille));
    if (creatorSharePercent !== undefined) patch.creatorSharePercent = Math.max(0, Math.min(100, Number(creatorSharePercent)));
    if (minViewsThreshold !== undefined)   patch.minViewsThreshold = Math.max(0, Number(minViewsThreshold));
    if (videoRateMultiplier !== undefined) patch.videoRateMultiplier = Math.max(1, Number(videoRateMultiplier));
    if (reelRateMultiplier !== undefined)  patch.reelRateMultiplier  = Math.max(1, Number(reelRateMultiplier));
    if (musicRateMultiplier !== undefined) patch.musicRateMultiplier = Math.max(1, Number(musicRateMultiplier));
    if (movieRateMultiplier !== undefined) patch.movieRateMultiplier = Math.max(1, Number(movieRateMultiplier));
    if (minPayoutAmount !== undefined)     patch.minPayoutAmount = Math.max(0, Number(minPayoutAmount));
    if (minFollowers !== undefined)        patch.minFollowers = Math.max(0, Number(minFollowers));
    if (minTotalViews !== undefined)       patch.minTotalViews = Math.max(0, Number(minTotalViews));
    if (minContentCount !== undefined)     patch.minContentCount = Math.max(0, Number(minContentCount));
    if (autoApprove !== undefined)         patch.autoApprove = Boolean(autoApprove);

    const [updated] = await db
      .insert(monetizationConfigTable)
      .values({ id: 1, ...patch })
      .onConflictDoUpdate({ target: monetizationConfigTable.id, set: patch })
      .returning();

    burstCache();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/admin/monetization/stats ─────────────────────── */
router.get("/admin/monetization/stats", requireAdmin, async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalViews:       sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        monetizedViews:   sql<number>`COALESCE(SUM(${contentEarningsTable.monetizedViews}), 0)`,
        grossEarnings:    sql<number>`COALESCE(SUM(${contentEarningsTable.grossEarnings}), 0)`,
        creatorEarnings:  sql<number>`COALESCE(SUM(${contentEarningsTable.creatorEarnings}), 0)`,
        platformEarnings: sql<number>`COALESCE(SUM(${contentEarningsTable.platformEarnings}), 0)`,
        contentCount:     sql<number>`COUNT(*)`,
      })
      .from(contentEarningsTable);

    const [payoutStats] = await db
      .select({
        pendingCount:  sql<number>`COUNT(*) FILTER (WHERE ${payoutRequestsTable.status} = 'pending')`,
        pendingAmount: sql<number>`COALESCE(SUM(${payoutRequestsTable.amount}) FILTER (WHERE ${payoutRequestsTable.status} = 'pending'), 0)`,
        paidAmount:    sql<number>`COALESCE(SUM(${payoutRequestsTable.amount}) FILTER (WHERE ${payoutRequestsTable.status} IN ('approved','paid')), 0)`,
        totalRequests: sql<number>`COUNT(*)`,
      })
      .from(payoutRequestsTable);

    const [appStats] = await db
      .select({
        totalActive:   sql<number>`COUNT(*) FILTER (WHERE ${creatorMonetizationTable.status} = 'active')`,
        totalApplied:  sql<number>`COUNT(*) FILTER (WHERE ${creatorMonetizationTable.status} = 'applied')`,
        totalRejected: sql<number>`COUNT(*) FILTER (WHERE ${creatorMonetizationTable.status} = 'rejected')`,
      })
      .from(creatorMonetizationTable);

    res.json({ ...totals, ...payoutStats, ...appStats });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/admin/monetization/top-content ────────────────── */
router.get("/admin/monetization/top-content", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(contentEarningsTable)
      .orderBy(desc(contentEarningsTable.creatorEarnings))
      .limit(limit);

    if (rows.length === 0) { res.json([]); return; }

    const authorIds = [...new Set(rows.map(r => r.authorId))];
    const authors = await db.select({
      id: usersTable.id, username: usersTable.username,
      displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(inArray(usersTable.id, authorIds));
    const authorMap = new Map(authors.map(a => [a.id, a]));

    res.json(rows.map(r => ({ ...r, author: authorMap.get(r.authorId) ?? null })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/admin/monetization/payouts ────────────────────── */
router.get("/admin/monetization/payouts", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "pending");
    const limit  = Math.min(Number(req.query.limit) || 50, 200);

    const rows = await db
      .select()
      .from(payoutRequestsTable)
      .where(status === "all" ? undefined : eq(payoutRequestsTable.status, status))
      .orderBy(desc(payoutRequestsTable.createdAt))
      .limit(limit);

    if (rows.length === 0) { res.json([]); return; }

    const userIds = [...new Set(rows.map(r => r.userId))];
    const users = await db.select({
      id: usersTable.id, username: usersTable.username,
      displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(inArray(usersTable.id, userIds));
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json(rows.map(r => ({ ...r, user: userMap.get(r.userId) ?? null })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── PATCH /api/admin/monetization/payouts/:id ──────────────── */
router.patch("/admin/monetization/payouts/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminId = (req.session as any)?.userId as number;
    const { action, adminNote } = req.body;

    const [payout] = await db.select().from(payoutRequestsTable).where(eq(payoutRequestsTable.id, id)).limit(1);
    if (!payout) { res.status(404).json({ error: "Not found" }); return; }
    if (payout.status !== "pending") { res.status(400).json({ error: "Already processed" }); return; }

    if (action === "approve") {
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, payout.userId)).limit(1);
      if (!wallet) { res.status(400).json({ error: "Wallet not found" }); return; }
      if (wallet.earningsBalance < payout.amount) { res.status(400).json({ error: "Insufficient earnings balance" }); return; }

      await db.update(walletsTable).set({
        earningsBalance: sql`${walletsTable.earningsBalance} - ${payout.amount}`,
        balance: sql`${walletsTable.balance} + ${payout.amount}`,
        updatedAt: new Date(),
      }).where(eq(walletsTable.userId, payout.userId));

      await db.insert(transactionsTable).values({
        userId: payout.userId,
        walletId: wallet.id,
        type: "content_revenue",
        amount: payout.amount,
        status: "completed",
        paymentMethod: payout.paymentMethod ?? "internal",
        description: "Daromad to'lovi tasdiqlandi (admin)",
        reference: `payout-${id}`,
      });

      await db.update(payoutRequestsTable).set({
        status: "approved", adminNote: adminNote ?? null,
        processedBy: adminId, processedAt: new Date(),
      }).where(eq(payoutRequestsTable.id, id));
    } else {
      await db.update(payoutRequestsTable).set({
        status: "rejected", adminNote: adminNote ?? null,
        processedBy: adminId, processedAt: new Date(),
      }).where(eq(payoutRequestsTable.id, id));
    }

    const [updated] = await db.select().from(payoutRequestsTable).where(eq(payoutRequestsTable.id, id));
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/admin/monetization/applications ───────────────── */
router.get("/admin/monetization/applications", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "applied");
    const limit  = Math.min(Number(req.query.limit) || 50, 200);

    const rows = await db
      .select()
      .from(creatorMonetizationTable)
      .where(status === "all" ? undefined : eq(creatorMonetizationTable.status, status))
      .orderBy(desc(creatorMonetizationTable.appliedAt))
      .limit(limit);

    if (rows.length === 0) { res.json([]); return; }

    const userIds = rows.map(r => r.userId);
    const users = await db.select({
      id: usersTable.id, username: usersTable.username,
      displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(inArray(usersTable.id, userIds));
    const userMap = new Map(users.map(u => [u.id, u]));

    /* Attach follower counts and content earnings */
    const earningRows = await db
      .select({
        authorId: contentEarningsTable.authorId,
        totalViews: sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        contentCount: sql<number>`COUNT(*)`,
      })
      .from(contentEarningsTable)
      .where(inArray(contentEarningsTable.authorId, userIds))
      .groupBy(contentEarningsTable.authorId);
    const earningsMap = new Map(earningRows.map(e => [e.authorId, e]));

    res.json(rows.map(r => ({
      ...r,
      user: userMap.get(r.userId) ?? null,
      totalViews: earningsMap.get(r.userId)?.totalViews ?? 0,
      contentCount: earningsMap.get(r.userId)?.contentCount ?? 0,
    })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── PATCH /api/admin/monetization/applications/:id ─────────── */
router.patch("/admin/monetization/applications/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminId = (req.session as any)?.userId as number;
    const { action, rejectionReason } = req.body; // action: "approve" | "reject"

    const [app] = await db.select().from(creatorMonetizationTable)
      .where(eq(creatorMonetizationTable.id, id)).limit(1);
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    if (app.status !== "applied") { res.status(400).json({ error: "Not in applied state" }); return; }

    const newStatus = action === "approve" ? "active" : "rejected";
    const [updated] = await db.update(creatorMonetizationTable).set({
      status: newStatus,
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: action === "reject" ? (rejectionReason ?? null) : null,
    }).where(eq(creatorMonetizationTable.id, id)).returning();

    burstUserMonCache(app.userId);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ═══════════════════════════════════════════════════════════════
   CREATOR ROUTES
   ═══════════════════════════════════════════════════════════════ */

/* ── GET /api/creator/monetization/eligibility ──────────────── */
router.get("/creator/monetization/eligibility", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;
    const cfg = await getConfig();

    /* Current monetization status */
    const [cm] = await db.select()
      .from(creatorMonetizationTable)
      .where(eq(creatorMonetizationTable.userId, userId))
      .limit(1);

    /* Follower count */
    const [followerRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    const followers = Number(followerRow?.count ?? 0);

    /* Total views + content count from earnings table */
    const [stats] = await db
      .select({
        totalViews:   sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        contentCount: sql<number>`COUNT(DISTINCT ${contentEarningsTable.contentId})`,
      })
      .from(contentEarningsTable)
      .where(eq(contentEarningsTable.authorId, userId));
    const totalViews   = Number(stats?.totalViews ?? 0);
    const contentCount = Number(stats?.contentCount ?? 0);

    const minFollowers    = cfg?.minFollowers ?? 1000;
    const minTotalViews   = cfg?.minTotalViews ?? 10000;
    const minContentCount = cfg?.minContentCount ?? 10;

    const metFollowers    = followers >= minFollowers;
    const metViews        = totalViews >= minTotalViews;
    const metContent      = contentCount >= minContentCount;
    const eligible        = metFollowers && metViews && metContent;

    /* Wallet earnings */
    const [wallet] = await db.select({ earningsBalance: walletsTable.earningsBalance })
      .from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);

    res.json({
      status: cm?.status ?? "none",
      rejectionReason: cm?.rejectionReason ?? null,
      appliedAt: cm?.appliedAt ?? null,
      reviewedAt: cm?.reviewedAt ?? null,
      eligible,
      canApply: eligible && (!cm || cm.status === "none" || cm.status === "rejected"),
      autoApprove: cfg?.autoApprove ?? false,
      criteria: {
        followers:    { current: followers,    required: minFollowers,    met: metFollowers },
        totalViews:   { current: totalViews,   required: minTotalViews,   met: metViews },
        contentCount: { current: contentCount, required: minContentCount, met: metContent },
      },
      earnings: {
        balance: wallet?.earningsBalance ?? 0,
        minPayout: cfg?.minPayoutAmount ?? 5000000,
      },
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── POST /api/creator/monetization/apply ───────────────────── */
router.post("/creator/monetization/apply", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;
    const cfg = await getConfig();

    /* Check eligibility */
    const [followerRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    const followers = Number(followerRow?.count ?? 0);

    const [stats] = await db
      .select({
        totalViews:   sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        contentCount: sql<number>`COUNT(DISTINCT ${contentEarningsTable.contentId})`,
      })
      .from(contentEarningsTable)
      .where(eq(contentEarningsTable.authorId, userId));
    const totalViews   = Number(stats?.totalViews ?? 0);
    const contentCount = Number(stats?.contentCount ?? 0);

    if (followers < (cfg?.minFollowers ?? 1000)) {
      res.status(400).json({ error: `Kamida ${cfg?.minFollowers ?? 1000} ta obunachi kerak` }); return;
    }
    if (totalViews < (cfg?.minTotalViews ?? 10000)) {
      res.status(400).json({ error: `Kamida ${(cfg?.minTotalViews ?? 10000).toLocaleString()} ta ko'rish kerak` }); return;
    }
    if (contentCount < (cfg?.minContentCount ?? 10)) {
      res.status(400).json({ error: `Kamida ${cfg?.minContentCount ?? 10} ta kontent kerak` }); return;
    }

    /* Check existing application */
    const [existing] = await db.select()
      .from(creatorMonetizationTable)
      .where(eq(creatorMonetizationTable.userId, userId))
      .limit(1);

    if (existing?.status === "applied") {
      res.status(400).json({ error: "Arizangiz allaqachon ko'rib chiqilmoqda" }); return;
    }
    if (existing?.status === "active") {
      res.status(400).json({ error: "Monetizatsiya allaqachon yoqilgan" }); return;
    }

    const autoApprove = cfg?.autoApprove ?? false;
    const newStatus = autoApprove ? "active" : "applied";
    const now = new Date();

    let result: any;
    if (existing) {
      [result] = await db.update(creatorMonetizationTable).set({
        status: newStatus,
        appliedAt: now,
        reviewedAt: autoApprove ? now : null,
        reviewedBy: autoApprove ? null : null,
        rejectionReason: null,
      }).where(eq(creatorMonetizationTable.userId, userId)).returning();
    } else {
      [result] = await db.insert(creatorMonetizationTable).values({
        userId,
        status: newStatus,
        appliedAt: now,
        reviewedAt: autoApprove ? now : null,
      }).returning();
    }

    burstUserMonCache(userId);
    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/creator/monetization ──────────────────────────── */
router.get("/creator/monetization", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;

    const [totals] = await db
      .select({
        totalViews:      sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        monetizedViews:  sql<number>`COALESCE(SUM(${contentEarningsTable.monetizedViews}), 0)`,
        grossEarnings:   sql<number>`COALESCE(SUM(${contentEarningsTable.grossEarnings}), 0)`,
        creatorEarnings: sql<number>`COALESCE(SUM(${contentEarningsTable.creatorEarnings}), 0)`,
        contentCount:    sql<number>`COUNT(*)`,
      })
      .from(contentEarningsTable)
      .where(eq(contentEarningsTable.authorId, userId));

    const contentBreakdown = await db
      .select()
      .from(contentEarningsTable)
      .where(eq(contentEarningsTable.authorId, userId))
      .orderBy(desc(contentEarningsTable.creatorEarnings))
      .limit(20);

    const [wallet] = await db.select({ earningsBalance: walletsTable.earningsBalance })
      .from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);

    const myPayouts = await db.select()
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.userId, userId))
      .orderBy(desc(payoutRequestsTable.createdAt))
      .limit(10);

    const cfg = await getConfig();
    const [cm] = await db.select()
      .from(creatorMonetizationTable)
      .where(eq(creatorMonetizationTable.userId, userId))
      .limit(1);

    res.json({
      totals,
      earningsBalance: wallet?.earningsBalance ?? 0,
      contentBreakdown,
      payouts: myPayouts,
      monetizationStatus: cm?.status ?? "none",
      config: {
        enabled: cfg?.enabled ?? true,
        revenuePerMille: cfg?.revenuePerMille ?? 50000,
        creatorSharePercent: cfg?.creatorSharePercent ?? 70,
        minViewsThreshold: cfg?.minViewsThreshold ?? 1000,
        minPayoutAmount: cfg?.minPayoutAmount ?? 5000000,
      },
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── POST /api/creator/monetization/payout ──────────────────── */
router.post("/creator/monetization/payout", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;

    /* Only active creators can request payouts */
    const status = await getUserMonStatus(userId);
    if (status !== "active") {
      res.status(403).json({ error: "Monetizatsiya dasturida faol bo'lmagan kreatorlar pul so'ray olmaydi" }); return;
    }

    const { amount, paymentMethod, paymentDetails } = req.body;
    const amt = Number(amount);
    const cfg = await getConfig();

    if (amt < (cfg?.minPayoutAmount ?? 5000000)) {
      res.status(400).json({ error: `Minimal to'lov miqdori: ${((cfg?.minPayoutAmount ?? 5000000) / 100).toLocaleString()} UZS` });
      return;
    }

    const [wallet] = await db.select({ earningsBalance: walletsTable.earningsBalance })
      .from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet || wallet.earningsBalance < amt) {
      res.status(400).json({ error: "Mablag' yetarli emas" }); return;
    }

    const [pending] = await db.select({ id: payoutRequestsTable.id })
      .from(payoutRequestsTable)
      .where(and(eq(payoutRequestsTable.userId, userId), eq(payoutRequestsTable.status, "pending")))
      .limit(1);
    if (pending) {
      res.status(400).json({ error: "Kutayotgan to'lov so'rovi allaqachon mavjud" }); return;
    }

    const [payout] = await db.insert(payoutRequestsTable).values({
      userId, amount: amt, paymentMethod, paymentDetails,
    }).returning();

    res.status(201).json(payout);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

export default router;
