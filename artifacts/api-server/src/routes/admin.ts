import { Router, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable, reelsTable, storiesTable, groupsTable, walletsTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq, sql, desc, sum } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripe/stripeClient";
import { getStripeSync } from "../stripe/stripeClient";

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

    res.json({
      totalUsers: users.count,
      totalPosts: posts.count,
      totalReels: reels.count,
      totalStories: stories.count,
      totalGroups: groups.count,
      activeNow: Math.floor(users.count * 0.12),
      flaggedContent: 3,
      aiAccuracy: 97.4,
      dailyGrowth: 2.3,
      topRegions: [
        { region: "Asia", users: Math.floor(users.count * 0.38) },
        { region: "Europe", users: Math.floor(users.count * 0.28) },
        { region: "North America", users: Math.floor(users.count * 0.22) },
        { region: "Other", users: Math.floor(users.count * 0.12) },
      ],
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
    res.json(users.map(u => ({ ...u, postsCount: 0, followersCount: 0, lastSeen: u.createdAt.toISOString() })));
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
    res.json({ ...user, postsCount: 0, followersCount: 0, lastSeen: user.createdAt.toISOString() });
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
    const userGrowth = [];
    const contentGrowth = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      userGrowth.push({ date, count: Math.floor(50 + Math.random() * 120) });
      contentGrowth.push({ date, posts: Math.floor(200 + Math.random() * 400), reels: Math.floor(80 + Math.random() * 150), stories: Math.floor(300 + Math.random() * 500) });
    }
    const topPosts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(5);
    const enrichedTop = await Promise.all(topPosts.map(async (p) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, p.authorId));
      return { ...p, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }, tags: p.tags || [], isLiked: false };
    }));
    res.json({ period, userGrowth, contentGrowth, engagementRate: 6.8, topContent: enrichedTop });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/ai-system", async (req, res) => {
  try {
    const metricsHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      metricsHistory.push({ date, accuracy: 95 + Math.random() * 3, responseTime: 80 + Math.floor(Math.random() * 40) });
    }
    res.json({
      version: "NEXUS-AI v4.2.1",
      accuracy: 97.4,
      modelsRunning: 12,
      lastImproved: new Date(Date.now() - 3600000).toISOString(),
      selfImprovementEnabled: true,
      recommendations: [
        { module: "Content Ranking", suggestion: "Increase weight of recency factor by 8%", impact: "high" },
        { module: "User Suggestions", suggestion: "Add mutual friends signal to recommendation graph", impact: "medium" },
        { module: "Moderation", suggestion: "Retrain hate speech classifier on new dataset", impact: "high" },
      ],
      metricsHistory,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/users/:id/verify — verified badge berish/olish
router.patch("/admin/users/:id/verify", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select({ isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
    const [user] = await db.update(usersTable).set({ isVerified: !existing.isVerified }).where(eq(usersTable.id, id)).returning();
    res.json({ ...user, postsCount: 0, followersCount: 0, lastSeen: user.createdAt.toISOString() });
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
    res.json({ ...user, postsCount: 0, followersCount: 0, lastSeen: user.createdAt.toISOString() });
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
      actorName: "OlCha Admin",
      targetId: null,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await db.insert(notificationsTable).values(notifications);
    }
    res.json({ ok: true, sent: notifications.length });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
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
    platform: "OlCha",
    version: "1.0.0",
  });
});

// PATCH /admin/settings  
router.patch("/admin/settings", async (req, res) => {
  // In production these would be stored in a settings table
  res.json({ ok: true, settings: req.body });
});

router.post("/admin/stripe/seed", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const existing = await stripe.products.search({ query: "name:'OlCha Premium' AND active:'true'" });
    if (existing.data.length > 0) {
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      const stripeSync = await getStripeSync();
      await stripeSync.syncBackfill();
      res.json({ message: "Mahsulot allaqachon mavjud, sinxronlashtirildi", productId: existing.data[0].id, prices: prices.data });
      return;
    }
    const product = await stripe.products.create({
      name: "OlCha Premium",
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
    res.json({ message: "OlCha Premium yaratildi va sinxronlashtirildi", productId: product.id, monthlyPriceId: monthly.id, yearlyPriceId: yearly.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Stripe mahsulot yaratishda xato" });
  }
});

export default router;
