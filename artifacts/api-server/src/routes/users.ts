import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, followsTable, postsTable } from "@workspace/db";
import { eq, ilike, sql, and, desc, inArray } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheAside, cacheDelPattern } from "../lib/cache";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const viewerId = (req.session as any)?.userId as number | undefined;

    let query = db.select().from(usersTable);
    if (search) {
      query = query.where(ilike(usersTable.username, `%${search}%`)) as typeof query;
    }
    const users = await query.limit(limit).offset(offset);

    const statsMap = await getUserStatsMap(users.map(u => u.id), viewerId);
    const enriched = users.map((u) => {
      const { passwordHash: _, ...safeUser } = u;
      return {
        ...safeUser,
        ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })
      };
    });

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
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ ...safeUser, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false });
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
    const cacheKey = `profile:${id}:viewer:${viewerId ?? 0}`;
    const result = await cacheAside("users", cacheKey, async () => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
      if (!user) return null;
      const [[followers], [following], [postsCount], followCheck] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
        db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
        db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
        viewerId && viewerId !== id
          ? db.select({ id: followsTable.followerId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, id))).limit(1)
          : Promise.resolve([]),
      ]);
      const { passwordHash: _, ...safeUser } = user;
      return { ...safeUser, followersCount: followers.count, followingCount: following.count, postsCount: postsCount.count, isFollowing: (followCheck as { id: number }[]).length > 0 };
    }, 30);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
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
    const { passwordHash: _, ...safeUser } = user;
    res.json({ ...safeUser, followersCount: followers.count, followingCount: following.count, postsCount: postsCount.count, isFollowing: false });
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
    const viewerId = (req.session as any)?.userId as number | undefined;
    const follows = await db.select().from(followsTable).where(eq(followsTable.followingId, id));
    const userIds = follows.map(f => f.followerId);
    if (userIds.length === 0) { res.json([]); return; }

    const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
    const statsMap = await getUserStatsMap(userIds, viewerId);
    const enriched = users.map((u) => {
      const { passwordHash: _, ...safeUser } = u;
      return {
        ...safeUser,
        ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })
      };
    });
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
