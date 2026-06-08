import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, reelsTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/ai/feed", async (req, res) => {
  try {
    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(10);
    const reels = await db.select().from(reelsTable).orderBy(desc(reelsTable.viewsCount)).limit(5);
    const users = await db.select().from(usersTable).limit(5);

    const enrichedPosts = await Promise.all(posts.map(async (p) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, p.authorId));
      return { ...p, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }, tags: p.tags || [], isLiked: false };
    }));
    const enrichedReels = await Promise.all(reels.map(async (r) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, r.authorId));
      return { ...r, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }, tags: r.tags || [], isLiked: false };
    }));

    res.json({
      posts: enrichedPosts,
      reels: enrichedReels,
      suggestedUsers: users.map(u => ({ ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/trending-topics", async (req, res) => {
  try {
    const topics = [
      { tag: "AI", postCount: 12400, growth: 23.5, category: "Technology" },
      { tag: "Web3", postCount: 8900, growth: 15.2, category: "Finance" },
      { tag: "Fitness", postCount: 7600, growth: 8.1, category: "Health" },
      { tag: "Travel", postCount: 6200, growth: 12.0, category: "Lifestyle" },
      { tag: "Music", postCount: 5800, growth: 6.3, category: "Entertainment" },
      { tag: "Gaming", postCount: 5100, growth: 18.7, category: "Entertainment" },
      { tag: "Photography", postCount: 4700, growth: 4.2, category: "Art" },
      { tag: "Fashion", postCount: 4300, growth: 9.8, category: "Lifestyle" },
    ];
    res.json(topics);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/suggestions", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(6);
    res.json({
      users: users.map(u => ({ ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })),
      groups: [],
      topics: ["AI", "Fitness", "Photography", "Travel", "Gaming"],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/moderation", async (req, res) => {
  try {
    const { content } = req.body;
    const flagWords = ["spam", "hate", "abuse", "violence"];
    const lower = (content || "").toLowerCase();
    const flags = flagWords.filter(w => lower.includes(w));
    res.json({
      safe: flags.length === 0,
      confidence: flags.length === 0 ? 0.97 : 0.23,
      flags,
      recommendation: flags.length === 0 ? "Approved" : "Review required",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
