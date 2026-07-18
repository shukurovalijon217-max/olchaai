/**
 * Creator Dashboard API
 * GET /api/creator/dashboard — real-time earnings summary, chart, top content, payout history
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  walletsTable, contentEarningsTable, payoutRequestsTable,
  creatorMonetizationTable, followsTable, usersTable,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) { res.status(401).json({ error: "Tizimga kiring" }); return; }
  next();
}

const router = Router();

/* ── GET /api/creator/dashboard ─────────────────────────────── */
router.get("/creator/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId as number;

    /* ── 1. Parallel base queries ── */
    const [
      walletRows,
      cmRows,
      followerRows,
      earningsTotals,
      topContentRaw,
      payoutHistoryRaw,
      thisMonthRaw,
    ] = await Promise.all([
      /* Wallet */
      db.select({
        earningsBalance: walletsTable.earningsBalance,
        adRevenueBalance: walletsTable.adRevenueBalance,
      }).from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1),

      /* Monetization status */
      db.select({
        status: creatorMonetizationTable.status,
        adsEnabled: creatorMonetizationTable.adsEnabled,
        membershipEnabled: creatorMonetizationTable.membershipEnabled,
      }).from(creatorMonetizationTable).where(eq(creatorMonetizationTable.userId, userId)).limit(1),

      /* Follower count */
      db.select({ count: sql<number>`COUNT(*)` })
        .from(followsTable).where(eq(followsTable.followingId, userId)),

      /* All-time earnings totals */
      db.select({
        totalEarnings:  sql<number>`COALESCE(SUM(${contentEarningsTable.creatorEarnings}), 0)`,
        totalViews:     sql<number>`COALESCE(SUM(${contentEarningsTable.totalViews}), 0)`,
        contentCount:   sql<number>`COUNT(DISTINCT ${contentEarningsTable.contentId})`,
      }).from(contentEarningsTable).where(eq(contentEarningsTable.authorId, userId)),

      /* Top 5 content by earnings */
      db.select({
        id:              contentEarningsTable.id,
        contentType:     contentEarningsTable.contentType,
        contentId:       contentEarningsTable.contentId,
        totalViews:      contentEarningsTable.totalViews,
        creatorEarnings: contentEarningsTable.creatorEarnings,
        lastUpdated:     contentEarningsTable.lastUpdated,
      }).from(contentEarningsTable)
        .where(eq(contentEarningsTable.authorId, userId))
        .orderBy(desc(contentEarningsTable.creatorEarnings))
        .limit(5),

      /* Payout history (last 8) */
      db.select({
        id:            payoutRequestsTable.id,
        amount:        payoutRequestsTable.amount,
        status:        payoutRequestsTable.status,
        paymentMethod: payoutRequestsTable.paymentMethod,
        createdAt:     payoutRequestsTable.createdAt,
      }).from(payoutRequestsTable)
        .where(eq(payoutRequestsTable.userId, userId))
        .orderBy(desc(payoutRequestsTable.createdAt))
        .limit(8),

      /* This month earnings */
      db.select({
        thisMonth: sql<number>`COALESCE(SUM(${contentEarningsTable.creatorEarnings}), 0)`,
      }).from(contentEarningsTable).where(
        and(
          eq(contentEarningsTable.authorId, userId),
          sql`${contentEarningsTable.lastUpdated} >= DATE_TRUNC('month', NOW())`
        )
      ),
    ]);

    const wallet         = walletRows[0];
    const cm             = cmRows[0];
    const followers      = Number(followerRows[0]?.count ?? 0);
    const totals         = earningsTotals[0];
    const thisMonth      = Number(thisMonthRaw[0]?.thisMonth ?? 0);

    /* ── 2. Daily earnings chart — last 30 days ── */
    const chartRaw = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', last_updated)::date AS day,
        SUM(creator_earnings)                 AS amount,
        SUM(total_views)                      AS views
      FROM content_earnings
      WHERE author_id = ${userId}
        AND last_updated >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1
    `);
    const chartRows = (chartRaw as any).rows ?? [];

    /* Fill missing days with 0 */
    const chartMap: Record<string, { amount: number; views: number }> = {};
    for (const r of chartRows) {
      const d = r.day instanceof Date
        ? r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10);
      chartMap[d] = { amount: Number(r.amount), views: Number(r.views) };
    }
    const chart: Array<{ date: string; amount: number; views: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      chart.push({ date: d, amount: chartMap[d]?.amount ?? 0, views: chartMap[d]?.views ?? 0 });
    }

    /* ── 3. Pending payouts ── */
    const pending = payoutHistoryRaw.filter(p => p.status === "pending");
    const pendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);

    res.json({
      summary: {
        monetizationStatus: cm?.status ?? "none",
        earningsBalance:    wallet?.earningsBalance    ?? 0,
        adRevenueBalance:   wallet?.adRevenueBalance   ?? 0,
        totalEarnings:      Number(totals?.totalEarnings  ?? 0),
        thisMonthEarnings:  thisMonth,
        totalViews:         Number(totals?.totalViews     ?? 0),
        contentCount:       Number(totals?.contentCount   ?? 0),
        followers,
        pendingPayoutCount:  pending.length,
        pendingPayoutAmount: pendingAmount,
        adsEnabled:         cm?.adsEnabled         ?? false,
        membershipEnabled:  cm?.membershipEnabled  ?? false,
      },
      chart,
      topContent:     topContentRaw,
      payoutHistory:  payoutHistoryRaw,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Dashboard yuklanmadi" });
  }
});

export default router;
