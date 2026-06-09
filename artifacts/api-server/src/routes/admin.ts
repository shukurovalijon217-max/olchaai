import { Router, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable, reelsTable, storiesTable, groupsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

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

export default router;
