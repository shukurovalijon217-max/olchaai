import { Router } from "express";
import { db } from "@workspace/db";
import {
  monetizationConfigTable, contentEarningsTable, payoutRequestsTable,
  walletsTable, transactionsTable, usersTable,
} from "@workspace/db";
import { eq, sql, desc, and, asc, inArray, sum, count } from "drizzle-orm";

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

    const multKey = TYPE_MULT[contentType] ?? "videoRateMultiplier";
    const multiplier = (cfg[multKey] as number) / 10; // 12 → 1.2x
    const grossPerView = Math.round((cfg.revenuePerMille / 1000) * multiplier);
    const creatorEarning = Math.round(grossPerView * cfg.creatorSharePercent / 100);
    const platformEarning = grossPerView - creatorEarning;

    /* Upsert content_earnings row */
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

    /* Past threshold — credit creator + platform */
    await db.update(contentEarningsTable).set({
      totalViews: newTotal,
      monetizedViews: sql`${contentEarningsTable.monetizedViews} + 1`,
      grossEarnings:   sql`${contentEarningsTable.grossEarnings}   + ${grossPerView}`,
      creatorEarnings: sql`${contentEarningsTable.creatorEarnings} + ${creatorEarning}`,
      platformEarnings:sql`${contentEarningsTable.platformEarnings}+ ${platformEarning}`,
      lastUpdated: new Date(),
    }).where(eq(contentEarningsTable.id, existing.id));

    if (creatorEarning <= 0) return;

    /* Credit creator wallet (upsert) */
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
   ADMIN ROUTES — require isAdmin check
   ═══════════════════════════════════════════════════════════════ */
function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any)?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

/* ── GET /api/admin/monetization/config ─────────────────────── */
router.get("/api/admin/monetization/config", requireAdmin, async (req, res) => {
  try {
    const cfg = await getConfig();
    res.json(cfg ?? {});
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── PUT /api/admin/monetization/config ─────────────────────── */
router.put("/api/admin/monetization/config", requireAdmin, async (req, res) => {
  try {
    const adminId = (req.session as any)?.userId as number;
    const {
      enabled, revenuePerMille, creatorSharePercent, minViewsThreshold,
      videoRateMultiplier, reelRateMultiplier, musicRateMultiplier, movieRateMultiplier,
      minPayoutAmount,
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
router.get("/api/admin/monetization/stats", requireAdmin, async (req, res) => {
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

    res.json({ ...totals, ...payoutStats });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server error" }); }
});

/* ── GET /api/admin/monetization/top-content ────────────────── */
router.get("/api/admin/monetization/top-content", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select({
        id: contentEarningsTable.id,
        contentType:     contentEarningsTable.contentType,
        contentId:       contentEarningsTable.contentId,
        authorId:        contentEarningsTable.authorId,
        totalViews:      contentEarningsTable.totalViews,
        monetizedViews:  contentEarningsTable.monetizedViews,
        grossEarnings:   contentEarningsTable.grossEarnings,
        creatorEarnings: contentEarningsTable.creatorEarnings,
        platformEarnings:contentEarningsTable.platformEarnings,
        lastUpdated:     contentEarningsTable.lastUpdated,
      })
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
router.get("/api/admin/monetization/payouts", requireAdmin, async (req, res) => {
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
router.patch("/api/admin/monetization/payouts/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminId = (req.session as any)?.userId as number;
    const { action, adminNote } = req.body; // action: "approve" | "reject"

    const [payout] = await db.select().from(payoutRequestsTable).where(eq(payoutRequestsTable.id, id)).limit(1);
    if (!payout) { res.status(404).json({ error: "Not found" }); return; }
    if (payout.status !== "pending") { res.status(400).json({ error: "Already processed" }); return; }

    if (action === "approve") {
      /* Deduct from earnings_balance, add to main balance */
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, payout.userId)).limit(1);
      if (!wallet) { res.status(400).json({ error: "Wallet not found" }); return; }
      if (wallet.earningsBalance < payout.amount) { res.status(400).json({ error: "Insufficient earnings balance" }); return; }

      await db.update(walletsTable).set({
        earningsBalance: sql`${walletsTable.earningsBalance} - ${payout.amount}`,
        balance: sql`${walletsTable.balance} + ${payout.amount}`,
        updatedAt: new Date(),
      }).where(eq(walletsTable.userId, payout.userId));

      /* Transaction record */
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

/* ═══════════════════════════════════════════════════════════════
   CREATOR ROUTES
   ═══════════════════════════════════════════════════════════════ */
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

/* ── GET /api/creator/monetization ──────────────────────────── */
router.get("/api/creator/monetization", requireAuth, async (req, res) => {
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

    res.json({
      totals,
      earningsBalance: wallet?.earningsBalance ?? 0,
      contentBreakdown,
      payouts: myPayouts,
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
router.post("/api/creator/monetization/payout", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;
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

    /* Check no pending payout already exists */
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
