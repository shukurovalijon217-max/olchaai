import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, followsTable, postsTable } from "@workspace/db";
import { eq, ilike, sql, and, desc } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    let query = db.select().from(usersTable);
    if (search) {
      query = query.where(ilike(usersTable.username, `%${search}%`)) as typeof query;
    }
    const users = await query.limit(limit).offset(offset);

    const enriched = await Promise.all(users.map(async (u) => {
      const [followers] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, u.id));
      const [following] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, u.id));
      return { ...u, followersCount: followers.count, followingCount: following.count, postsCount: 0, isFollowing: false };
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { username, displayName, email, bio, avatarUrl } = req.body;
    const [user] = await db.insert(usersTable).values({ username, displayName, email, bio, avatarUrl }).returning();
    res.status(201).json({ ...user, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/stats/summary", async (req, res) => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [verified] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isVerified, true));
    res.json({ totalUsers: total.count, newToday: Math.floor(total.count * 0.02), activeToday: Math.floor(total.count * 0.35), verifiedCount: verified.count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = (req.session as any)?.userId as number | undefined;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const [[followers], [following], [postsCount], followCheck] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
      viewerId && viewerId !== id
        ? db.select({ id: followsTable.followerId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, id))).limit(1)
        : Promise.resolve([]),
    ]);
    res.json({ ...user, followersCount: followers.count, followingCount: following.count, postsCount: postsCount.count, isFollowing: (followCheck as { id: number }[]).length > 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id/posts", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Number(req.query.offset) || 0;
    const midnightCond = await midnightVisibilityConditionForReq(req);
    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.authorId, id), midnightCond))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit).offset(offset);
    res.json(posts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { displayName, bio, avatarUrl, coverUrl } = req.body;
    const [user] = await db.update(usersTable).set({ displayName, bio, avatarUrl, coverUrl }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const [[followers], [following], [postsCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
    ]);
    res.json({ ...user, followersCount: followers.count, followingCount: following.count, postsCount: postsCount.count, isFollowing: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/:id/follow", async (req, res) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = (req.session as any)?.userId as number | undefined;
    if (!followerId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const existing = await db.select().from(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));
    if (existing.length > 0) {
      await db.delete(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));
    } else {
      await db.insert(followsTable).values({ followerId, followingId });
    }
    const [followers] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, followingId));
    res.json({ following: existing.length === 0, followersCount: followers.count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id/followers", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const follows = await db.select().from(followsTable).where(eq(followsTable.followingId, id));
    const users = await Promise.all(follows.map(async (f) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, f.followerId));
      return u ? { ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } : null;
    }));
    res.json(users.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
