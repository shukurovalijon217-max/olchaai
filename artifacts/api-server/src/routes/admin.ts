import { Router, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable, reelsTable, storiesTable, groupsTable, walletsTable, transactionsTable, notificationsTable, premiumConfigTable, moderationQueueTable, commentsTable } from "@workspace/db";
import { eq, sql, desc, sum, and, inArray } from "drizzle-orm";
import { getCommissionRate, setCommissionRate, applyCommission } from "../lib/commission";
import { getUncachableStripeClient } from "../stripe/stripeClient";
import { getStripeSync } from "../stripe/stripeClient";
import { getUserStats, getUserStatsMap } from "../lib/userStats";

const router = Router();

const requireAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) { res.status(403).json({ error: "Admin huquqi talab qilinadi" }); return; }
  next();
};

router.use("/admin", requireAdmin);

router.get("/admin/dashboard", async (req, res) => {
  try {
    const [users] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [posts] = await db.select({ count: sql<number>`count(*)::int` }).from(postsTable);
    const [reels] = await db.select({ count: sql<number>`count(*)::int` }).from(reelsTable);
    const [stories] = await db.select({ count: sql<number>`count(*)::int` }).from(storiesTable);
    const [groups] = await db.select({ count: sql<number>`count(*)::int` }).from(groupsTable);
    const [flagged] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable).where(eq(moderationQueueTable.status, "pending"));
    const [newToday] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(sql`${usersTable.createdAt} >= current_date`);
    const regions = await db.select({ region: usersTable.country, count: sql<number>`count(*)::int` })
      .from(usersTable).groupBy(usersTable.country).orderBy(desc(sql`count(*)`)).limit(5);

    const activeRes = await db.execute(sql`SELECT count(*)::int as count FROM user_sessions WHERE expire > now()`);
    const rows = (r: any) => r?.rows ?? [];
    const activeNow = rows(activeRes)[0]?.count ?? 0;

    const totalUsers = users.count;
    const dailyGrowth = totalUsers > 0 ? Math.round((newToday.count / totalUsers) * 1000) / 10 : 0;

    res.json({
      totalUsers,
      totalPosts: posts.count,
      totalReels: reels.count,
      totalStories: stories.count,
      totalGroups: groups.count,
      activeNow,
      flaggedContent: flagged?.count ?? 0,
      newUsersToday: newToday?.count ?? 0,
      dailyGrowth,
      topRegions: regions.map(r => ({ region: r.region || "Noma'lum", users: r.count })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    let users;
    if (status && status !== "all") {
      users = await db.select().from(usersTable).where(eq(usersTable.status, status)).limit(limit).offset(offset);
    } else {
      users = await db.select().from(usersTable).limit(limit).offset(offset);
    }
    const statsMap = await getUserStatsMap(users.map(u => u.id));
    res.json(users.map(u => ({ ...u, ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }), lastSeen: u.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:id/suspend", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { suspend } = req.body;
    const [user] = await db.update(usersTable).set({ status: suspend ? "suspended" : "active" }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const stats = await getUserStats(id);
    res.json({ ...user, ...stats, lastSeen: user.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/content", async (req, res) => {
  try {
    const flagged = req.query.flagged === "true";
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    let posts;
    if (flagged) {
      posts = await db.select().from(postsTable).where(eq(postsTable.isFlagged, true)).orderBy(desc(postsTable.createdAt)).limit(limit);
    } else {
      posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit);
    }
    const enriched = await Promise.all(posts.map(async (p) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, p.authorId));
      return {
        id: p.id,
        type: "post",
        authorName: author?.displayName || "Unknown",
        authorAvatar: author?.avatarUrl || null,
        preview: p.content.slice(0, 120),
        mediaUrl: p.mediaUrl || null,
        likesCount: p.likesCount,
        isFlagged: p.isFlagged,
        flagReason: p.isFlagged ? "Community guidelines violation" : null,
        createdAt: p.createdAt.toISOString(),
      };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/analytics", async (req, res) => {
  try {
    const period = req.query.period as string || "7d";
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const rows = (r: any) => r?.rows ?? [];

    const [userRes, postRes, reelRes, storyRes] = await Promise.all([
      db.execute(sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM users WHERE created_at >= now() - make_interval(days => ${days}) GROUP BY date`),
      db.execute(sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM posts WHERE created_at >= now() - make_interval(days => ${days}) GROUP BY date`),
      db.execute(sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM reels WHERE created_at >= now() - make_interval(days => ${days}) GROUP BY date`),
      db.execute(sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count FROM stories WHERE created_at >= now() - make_interval(days => ${days}) GROUP BY date`),
    ]);
    const toMap = (r: any) => new Map(rows(r).map((row: any) => [row.date, row.count]));
    const userMap = toMap(userRes), postMap = toMap(postRes), reelMap = toMap(reelRes), storyMap = toMap(storyRes);

    const userGrowth = [];
    const contentGrowth = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      userGrowth.push({ date, count: userMap.get(date) ?? 0 });
      contentGrowth.push({ date, posts: postMap.get(date) ?? 0, reels: reelMap.get(date) ?? 0, stories: storyMap.get(date) ?? 0 });
    }

    const [postStats] = await db.select({
      totalPosts: sql<number>`count(*)::int`,
      totalLikes: sql<number>`coalesce(sum(${postsTable.likesCount}),0)::int`,
    }).from(postsTable).where(sql`${postsTable.createdAt} >= now() - make_interval(days => ${days})`);
    const [commentStats] = await db.select({ totalComments: sql<number>`count(*)::int` })
      .from(commentsTable).where(sql`${commentsTable.createdAt} >= now() - make_interval(days => ${days})`);
    const engagementRate = postStats.totalPosts > 0
      ? Math.round(((postStats.totalLikes + commentStats.totalComments) / postStats.totalPosts) * 10) / 10
      : 0;

    const topPosts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(5);
    const authorIds = [...new Set(topPosts.map(p => p.authorId).filter(Boolean))] as number[];
    const statsMap = await getUserStatsMap(authorIds);
    const authors = authorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const enrichedTop = topPosts.map((p) => {
      const author = authorMap.get(p.authorId as number);
      const stats = statsMap.get(p.authorId as number) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
      return { ...p, author: { ...(author || {}), ...stats }, tags: p.tags || [], isLiked: false };
    });
    res.json({ period, userGrowth, contentGrowth, engagementRate, topContent: enrichedTop });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/ai-system", async (req, res) => {
  try {
    const rows = (r: any) => r?.rows ?? [];
    const [modStats] = await db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${moderationQueueTable.status} = 'pending')::int`,
      autoBlocked: sql<number>`count(*) filter (where ${moderationQueueTable.autoBlocked} = true)::int`,
      avgScore: sql<number>`coalesce(avg(${moderationQueueTable.aiScore}), 0)::float`,
    }).from(moderationQueueTable);

    const [lastMod] = await db.select({ createdAt: moderationQueueTable.createdAt })
      .from(moderationQueueTable).orderBy(desc(moderationQueueTable.createdAt)).limit(1);

    const volRes = await db.execute(sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count
      FROM moderation_queue WHERE created_at >= now() - interval '7 days' GROUP BY date
    `);
    const volMap = new Map(rows(volRes).map((row: any) => [row.date, row.count]));
    const volumeHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      volumeHistory.push({ date, count: volMap.get(date) ?? 0 });
    }

    res.json({
      version: "NEXUS-AI v1.0.0",
      modelsRunning: 5,
      totalModerated: modStats?.total ?? 0,
      pendingReview: modStats?.pending ?? 0,
      autoBlockedCount: modStats?.autoBlocked ?? 0,
      avgAiScore: Math.round((modStats?.avgScore ?? 0) * 100) / 100,
      lastModerationAt: lastMod?.createdAt ? lastMod.createdAt.toISOString() : null,
      volumeHistory,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─── GET /admin/ai-usage ─── AI usage stats for admin panel ─── */
router.get("/admin/ai-usage", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [admin] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
    if (!admin?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

    const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [premiumUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isPremium, true));
    const [freeAtLimit] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable)
      .where(and(eq(usersTable.isPremium, false), sql`${usersTable.aiUsageCount} >= 5`));
    const [totalAiCalls] = await db.select({ total: sql<number>`COALESCE(SUM(ai_usage_count), 0)::int` }).from(usersTable);

    const topUsers = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      isPremium: usersTable.isPremium,
      aiUsageCount: usersTable.aiUsageCount,
    }).from(usersTable).orderBy(desc(usersTable.aiUsageCount)).limit(10);

    res.json({
      totalUsers: totalUsers?.count ?? 0,
      premiumUsers: premiumUsers?.count ?? 0,
      freeUsersAtLimit: freeAtLimit?.count ?? 0,
      totalAiCalls: totalAiCalls?.total ?? 0,
      freeLimit: 5,
      topUsers,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/users/:id/toggle-premium — premium berish/olish
router.patch("/admin/users/:id/toggle-premium", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select({ isPremium: usersTable.isPremium }).from(usersTable).where(eq(usersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [user] = await db.update(usersTable).set({ isPremium: !existing.isPremium }).where(eq(usersTable.id, id)).returning();
    const stats = await getUserStats(id);
    res.json({ ...user, ...stats, lastSeen: user.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// PATCH /admin/users/:id/verify — verified badge berish/olish
router.patch("/admin/users/:id/verify", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select({ isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [user] = await db.update(usersTable).set({ isVerified: !existing.isVerified }).where(eq(usersTable.id, id)).returning();
    const stats = await getUserStats(id);
    res.json({ ...user, ...stats, lastSeen: user.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// PATCH /admin/users/:id/toggle-admin — admin qilish/olib tashlash
router.patch("/admin/users/:id/toggle-admin", async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.session.userId) { res.status(400).json({ error: "O'zingizning admin huquqingizni olmaysiz" }); return; }
    const [existing] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [user] = await db.update(usersTable).set({ isAdmin: !existing.isAdmin }).where(eq(usersTable.id, id)).returning();
    const stats = await getUserStats(id);
    res.json({ ...user, ...stats, lastSeen: user.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// DELETE /admin/posts/:id — postni o'chirish
router.delete("/admin/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// GET /admin/finance — moliyaviy umumiy ko'rinish
router.get("/admin/finance", async (req, res) => {
  try {
    const wallets = await db
      .select({
        userId: walletsTable.userId,
        balance: walletsTable.balance,
        earningsBalance: walletsTable.earningsBalance,
        adRevenueBalance: walletsTable.adRevenueBalance,
        displayName: usersTable.displayName,
        username: usersTable.username,
        email: usersTable.email,
      })
      .from(walletsTable)
      .leftJoin(usersTable, eq(walletsTable.userId, usersTable.id))
      .orderBy(desc(walletsTable.balance))
      .limit(50);

    const [totals] = await db
      .select({
        totalBalance: sql<number>`coalesce(sum(balance),0)::int`,
        totalEarnings: sql<number>`coalesce(sum(earnings_balance),0)::int`,
        totalAdRevenue: sql<number>`coalesce(sum(ad_revenue_balance),0)::int`,
      })
      .from(walletsTable);

    const recentTxs = await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(20);

    const [txCount] = await db.select({ count: sql<number>`count(*)::int` }).from(transactionsTable);
    const deposits = await db.select({ total: sql<number>`coalesce(sum(amount),0)::int` }).from(transactionsTable).where(eq(transactionsTable.type, "deposit"));
    const withdrawals = await db.select({ total: sql<number>`coalesce(sum(abs(amount)),0)::int` }).from(transactionsTable).where(eq(transactionsTable.type, "withdrawal"));

    res.json({
      wallets,
      totals: { ...totals, totalAll: totals.totalBalance + totals.totalEarnings + totals.totalAdRevenue },
      recentTransactions: recentTxs,
      stats: {
        totalTransactions: txCount.count,
        totalDeposited: deposits[0]?.total ?? 0,
        totalWithdrawn: withdrawals[0]?.total ?? 0,
      },
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// GET /admin/wallet/withdrawals — list withdrawal requests for manual review
router.get("/admin/wallet/withdrawals", async (req, res) => {
  try {
    const status = (req.query.status as string) || "pending";
    const whereClause = status === "all"
      ? eq(transactionsTable.type, "withdrawal")
      : and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, status));

    const rows = await db
      .select({
        id: transactionsTable.id,
        userId: transactionsTable.userId,
        amount: transactionsTable.amount,
        paymentMethod: transactionsTable.paymentMethod,
        status: transactionsTable.status,
        description: transactionsTable.description,
        reference: transactionsTable.reference,
        metadata: transactionsTable.metadata,
        createdAt: transactionsTable.createdAt,
        displayName: usersTable.displayName,
        username: usersTable.username,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100);

    res.json({ withdrawals: rows });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// PATCH /admin/wallet/withdrawals/:id — approve (mark as paid out manually) or reject (refund hold)
router.patch("/admin/wallet/withdrawals/:id", async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const { action, adminNote } = req.body as { action: "approve" | "reject"; adminNote?: string };
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "action 'approve' yoki 'reject' bo'lishi kerak" }); return;
    }

    const [tx] = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.type, "withdrawal")));
    if (!tx) { res.status(404).json({ error: "So'rov topilmadi" }); return; }
    if (tx.status !== "pending") { res.status(400).json({ error: "So'rov allaqachon ko'rib chiqilgan" }); return; }

    if (action === "approve") {
      const [updatedTx] = await db.update(transactionsTable)
        .set({ status: "completed", description: `${tx.description ?? ""} — admin tomonidan tasdiqlandi${adminNote ? `: ${adminNote}` : ""}` })
        .where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending")))
        .returning();
      if (!updatedTx) { res.status(409).json({ error: "So'rov holati o'zgargan, qayta urinib ko'ring" }); return; }

      const grossAmount = Math.abs(tx.amount);
      await applyCommission(tx.userId, grossAmount, "withdrawal", tx.reference ?? `WIT-${tx.id}`);

      res.json({ transaction: updatedTx }); return;
    }

    // reject → refund the held amounts back to the wallet
    let meta: { fromPersonal?: number; fromEarnings?: number; fromAdRevenue?: number } = {};
    try { meta = tx.metadata ? JSON.parse(tx.metadata) : {}; } catch { meta = {}; }
    const wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, tx.userId) })
      ?? (await db.insert(walletsTable).values({ userId: tx.userId }).returning())[0];

    const [updatedWallet] = await db.update(walletsTable)
      .set({
        balance: wallet.balance + (meta.fromPersonal ?? 0),
        earningsBalance: wallet.earningsBalance + (meta.fromEarnings ?? 0),
        adRevenueBalance: wallet.adRevenueBalance + (meta.fromAdRevenue ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    const [updatedTx] = await db.update(transactionsTable)
      .set({ status: "cancelled", description: `${tx.description ?? ""} — admin tomonidan rad etildi va mablag' qaytarildi${adminNote ? `: ${adminNote}` : ""}` })
      .where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending")))
      .returning();
    if (!updatedTx) { res.status(409).json({ error: "So'rov holati o'zgargan, qayta urinib ko'ring" }); return; }

    res.json({ transaction: updatedTx, wallet: updatedWallet });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// POST /admin/notify/broadcast — barcha yoki tanlangan foydalanuvchilarga bildirishnoma
router.post("/admin/notify/broadcast", async (req, res) => {
  try {
    const { message, type = "system", targetUserIds } = req.body as { message: string; type?: string; targetUserIds?: number[] };
    if (!message?.trim()) { res.status(400).json({ error: "Xabar bo'sh bo'lmasligi kerak" }); return; }

    let userIds: number[];
    if (targetUserIds && targetUserIds.length > 0) {
      userIds = targetUserIds;
    } else {
      const allUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.status, "active"));
      userIds = allUsers.map(u => u.id);
    }

    const notifications = userIds.map(userId => ({
      userId,
      type,
      message,
      actorName: "OlchaAI Admin",
      targetId: null,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await db.insert(notificationsTable).values(notifications);
    }
    res.json({ ok: true, sent: notifications.length });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

// GET /admin/commission — joriy komissiya foizini olish
router.get("/admin/commission", async (req, res) => {
  try {
    const rate = await getCommissionRate();
    res.json({ rate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

// PATCH /admin/commission — komissiya foizini o'zgartirish
router.patch("/admin/commission", async (req, res) => {
  try {
    const { rate } = req.body as { rate: number };
    if (typeof rate !== "number" || rate < 0 || rate > 100) {
      res.status(400).json({ error: "rate 0–100 orasida bo'lishi kerak" }); return;
    }
    await setCommissionRate(rate);
    res.json({ ok: true, rate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

// GET /admin/commission/stats — komissiya statistikasi (admin hamyoni daromadi)
router.get("/admin/commission/stats", async (req, res) => {
  try {
    const { usersTable: ut, walletsTable: wt, transactionsTable: tt } = await import("@workspace/db");
    const [admin] = await db
      .select({ id: ut.id })
      .from(ut)
      .where(eq(ut.isAdmin, true))
      .limit(1);

    if (!admin) { res.json({ totalCommission: 0, adminBalance: 0, adminEarnings: 0, monthlyCommission: 0, txCount: 0 }); return; }

    const [adminWallet] = await db
      .select({ balance: wt.balance, earningsBalance: wt.earningsBalance, adRevenueBalance: wt.adRevenueBalance, id: wt.id })
      .from(wt)
      .where(eq(wt.userId, admin.id))
      .limit(1);

    if (!adminWallet) { res.json({ totalCommission: 0, adminBalance: 0, adminEarnings: 0, monthlyCommission: 0, txCount: 0 }); return; }

    const [total] = await db
      .select({ total: sql<number>`coalesce(sum(amount),0)::int`, count: sql<number>`count(*)::int` })
      .from(tt)
      .where(eq(tt.walletId, adminWallet.id));

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [monthly] = await db
      .select({ total: sql<number>`coalesce(sum(amount),0)::int` })
      .from(tt)
      .where(sql`${tt.walletId} = ${adminWallet.id} AND ${tt.createdAt} >= ${monthStart}`);

    res.json({
      totalCommission: total?.total ?? 0,
      txCount: total?.count ?? 0,
      monthlyCommission: monthly?.total ?? 0,
      adminBalance: adminWallet.balance,
      adminEarnings: adminWallet.earningsBalance,
      adminAdRevenue: adminWallet.adRevenueBalance,
      adminTotal: adminWallet.balance + adminWallet.earningsBalance + adminWallet.adRevenueBalance,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

// GET /admin/settings
router.get("/admin/settings", async (req, res) => {
  res.json({
    maintenanceMode: false,
    registrationOpen: true,
    contentModerationEnabled: true,
    aiModerationThreshold: 0.7,
    maxPostLength: 2000,
    maxFileSize: 100,
    premiumEnabled: true,
    adsEnabled: true,
    platform: "OlchaAI",
    version: "1.0.0",
  });
});

// PATCH /admin/settings  
router.patch("/admin/settings", async (req, res) => {
  res.json({ ok: true, settings: req.body });
});

// ===== PREMIUM CONFIG =====
router.get("/admin/premium-config", async (req, res) => {
  try {
    const rows = await db.select().from(premiumConfigTable).where(eq(premiumConfigTable.id, 1));
    let config = rows[0];
    if (!config) {
      await db.insert(premiumConfigTable).values({ id: 1, monthlyPriceCents: 999, yearlyDiscountPercent: 20 }).onConflictDoNothing();
      const r2 = await db.select().from(premiumConfigTable).where(eq(premiumConfigTable.id, 1));
      config = r2[0];
    }
    const monthly = config.monthlyPriceCents;
    const yearlyTotal = Math.round(monthly * 12 * (1 - config.yearlyDiscountPercent / 100));
    res.json({ config, computed: { yearlyTotalCents: yearlyTotal, monthlyEquivCents: Math.round(yearlyTotal / 12) } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Konfiguratsiyani o'qishda xato" });
  }
});

router.put("/admin/premium-config", async (req: any, res) => {
  try {
    const { monthlyPriceCents, yearlyDiscountPercent } = req.body as { monthlyPriceCents?: number; yearlyDiscountPercent?: number };
    if (monthlyPriceCents !== undefined && (typeof monthlyPriceCents !== "number" || monthlyPriceCents < 100 || monthlyPriceCents > 99900)) {
      res.status(400).json({ error: "monthlyPriceCents 100–99900 orasida bo'lishi kerak" }); return;
    }
    if (yearlyDiscountPercent !== undefined && (typeof yearlyDiscountPercent !== "number" || yearlyDiscountPercent < 0 || yearlyDiscountPercent > 90)) {
      res.status(400).json({ error: "yearlyDiscountPercent 0–90 orasida bo'lishi kerak" }); return;
    }

    const rows = await db.select().from(premiumConfigTable).where(eq(premiumConfigTable.id, 1));
    const current = rows[0] ?? { monthlyPriceCents: 999, yearlyDiscountPercent: 20, monthlyStripePriceId: null, yearlyStripePriceId: null, stripeProductId: null };

    const newMonthly = monthlyPriceCents ?? current.monthlyPriceCents;
    const newDiscount = yearlyDiscountPercent ?? current.yearlyDiscountPercent;
    const newYearlyTotal = Math.round(newMonthly * 12 * (1 - newDiscount / 100));

    // Get or find the Stripe product
    const stripe = await getUncachableStripeClient();
    let productId = current.stripeProductId;
    if (!productId) {
      const existing = await stripe.products.search({ query: "name:'OlchaAI Premium' AND active:'true'" });
      productId = existing.data[0]?.id ?? null;
    }
    if (!productId) {
      res.status(400).json({ error: "Stripe mahsulot topilmadi. Avval /api/admin/stripe/seed ni ishga tushiring" }); return;
    }

    // Create new prices in Stripe
    const [newMonthlyPrice, newYearlyPrice] = await Promise.all([
      stripe.prices.create({ product: productId, unit_amount: newMonthly, currency: "usd", recurring: { interval: "month" } }),
      stripe.prices.create({ product: productId, unit_amount: newYearlyTotal, currency: "usd", recurring: { interval: "year" } }),
    ]);

    // Archive old prices
    await Promise.allSettled([
      current.monthlyStripePriceId ? stripe.prices.update(current.monthlyStripePriceId, { active: false }) : Promise.resolve(),
      current.yearlyStripePriceId ? stripe.prices.update(current.yearlyStripePriceId, { active: false }) : Promise.resolve(),
    ]);

    // Update config in DB
    const updatedRows = await db.insert(premiumConfigTable).values({
      id: 1,
      monthlyPriceCents: newMonthly,
      yearlyDiscountPercent: newDiscount,
      monthlyStripePriceId: newMonthlyPrice.id,
      yearlyStripePriceId: newYearlyPrice.id,
      stripeProductId: productId,
      updatedAt: new Date(),
      updatedBy: req.session.userId,
    }).onConflictDoUpdate({
      target: premiumConfigTable.id,
      set: {
        monthlyPriceCents: newMonthly,
        yearlyDiscountPercent: newDiscount,
        monthlyStripePriceId: newMonthlyPrice.id,
        yearlyStripePriceId: newYearlyPrice.id,
        stripeProductId: productId,
        updatedAt: new Date(),
        updatedBy: req.session.userId,
      },
    }).returning();

    // Sync Stripe data to local DB
    try { const s = await getStripeSync(); await s.syncBackfill(); } catch { /* non-fatal */ }

    res.json({
      ok: true,
      config: updatedRows[0],
      computed: { yearlyTotalCents: newYearlyTotal, monthlyEquivCents: Math.round(newYearlyTotal / 12) },
      stripeMonthlyPriceId: newMonthlyPrice.id,
      stripeYearlyPriceId: newYearlyPrice.id,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Narxlarni yangilashda xato" });
  }
});

router.post("/admin/stripe/seed", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const existing = await stripe.products.search({ query: "name:'OlchaAI Premium' AND active:'true'" });
    if (existing.data.length > 0) {
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      const stripeSync = await getStripeSync();
      await stripeSync.syncBackfill();
      res.json({ message: "Mahsulot allaqachon mavjud, sinxronlashtirildi", productId: existing.data[0].id, prices: prices.data });
      return;
    }
    const product = await stripe.products.create({
      name: "OlchaAI Premium",
      description: "Reklama yo'q, eksklyuziv badge, kengaytirilgan tahlil va boshqa premium xususiyatlar.",
      metadata: { app: "olcha" },
    });
    const monthly = await stripe.prices.create({
      product: product.id, unit_amount: 999, currency: "usd", recurring: { interval: "month" },
    });
    const yearly = await stripe.prices.create({
      product: product.id, unit_amount: 7999, currency: "usd", recurring: { interval: "year" },
    });
    const stripeSync = await getStripeSync();
    await stripeSync.syncBackfill();
    res.json({ message: "OlchaAI Premium yaratildi va sinxronlashtirildi", productId: product.id, monthlyPriceId: monthly.id, yearlyPriceId: yearly.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Stripe mahsulot yaratishda xato" });
  }
});

export default router;
