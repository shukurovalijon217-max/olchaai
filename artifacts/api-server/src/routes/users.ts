import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, followsTable, postsTable, reelsTable, userInteractionsTable } from "@workspace/db";
import { eq, ilike, sql, and, desc, inArray, gte } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheAside, cacheDelPattern, cacheDelAsync } from "../lib/cache";
import { notifyFollow } from "../lib/emailNotify";

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
    // Own profile must never be served stale from the browser cache —
    // otherwise avatar/cover edits look like they "didn't apply".
    if (viewerId === id) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "private, max-age=30");
    }
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
    const sessionUserId = (req.session as any)?.userId as number | undefined;
    if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (sessionUserId !== id) { res.status(403).json({ error: "Forbidden" }); return; }
    const { displayName, bio, avatarUrl, coverUrl } = req.body;
    const [user] = await db.update(usersTable).set({ displayName, bio, avatarUrl, coverUrl }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const [[followers], [following], [postsCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
    ]);
    /* Invalidate profile cache so updated info shows immediately */
    void cacheDelPattern(`users:profile:${id}:`);
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
    const isFollowing = existing.length > 0;
    if (isFollowing) {
      await db.delete(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));
    } else {
      await db.insert(followsTable).values({ followerId, followingId });
    }
    const [followers] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, followingId));
    /* Invalidate both users' profile caches (follower counts changed) */
    void Promise.all([
      cacheDelPattern(`users:profile:${followingId}:`),
      cacheDelPattern(`users:profile:${followerId}:`),
    ]);
    res.json({ following: !isFollowing, followersCount: followers.count });

    // Email: yangi follower bo'lganda xabar
    if (!isFollowing) {
      void (async () => {
        try {
          const [followedUser, followerUser] = await Promise.all([
            db.select({ email: usersTable.email, displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, followingId)).limit(1),
            db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, followerId)).limit(1),
          ]);
          if (followedUser[0]?.email) {
            await notifyFollow({
              toEmail: followedUser[0].email,
              toName: followedUser[0].displayName ?? "Foydalanuvchi",
              followerName: followerUser[0]?.displayName ?? "Kimdir",
            });
          }
        } catch { /* non-fatal */ }
      })();
    }
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

/* ── GET /users/:id/creator-analytics?period=7|30|all ────────── */
router.get("/users/:id/creator-analytics", async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    // Only the owner may view their own analytics
    const callerId = req.session?.userId as number | undefined;
    if (!callerId) { res.status(401).json({ error: "Unauthenticated" }); return; }
    if (callerId !== id) { res.status(403).json({ error: "Forbidden" }); return; }

    const periodParam = req.query.period;
    const allTime = periodParam === "all";
    const period = allTime ? null : (Number(periodParam) || 30);

    // For timed periods, set a `since` cutoff; for all-time, since is null (no filter)
    let since: Date | null = null;
    if (!allTime && period !== null) {
      since = new Date();
      since.setDate(since.getDate() - period);
      since.setHours(0, 0, 0, 0);
    }

    /* ── 1. Daily views from user_interactions ─────────────────── */
    const postIds = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.authorId, id));
    const reelIds = await db
      .select({ id: reelsTable.id })
      .from(reelsTable)
      .where(eq(reelsTable.authorId, id));

    const allPostIds = postIds.map(p => p.id);
    const allReelIds = reelIds.map(r => r.id);

    const sinceClause = since ? sql`AND created_at >= ${since}` : sql``;

    // daily views: posts
    const postViews = allPostIds.length > 0
      ? await db.execute(sql`
          SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS n
          FROM user_interactions
          WHERE content_type = 'post' AND interaction_type = 'view'
            AND content_id = ANY(ARRAY[${sql.join(allPostIds.map(i => sql`${i}`), sql`, `)}]::int[])
            ${sinceClause}
          GROUP BY 1 ORDER BY 1`)
      : { rows: [] };

    // daily views: reels
    const reelViews = allReelIds.length > 0
      ? await db.execute(sql`
          SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS n
          FROM user_interactions
          WHERE content_type = 'reel' AND interaction_type = 'view'
            AND content_id = ANY(ARRAY[${sql.join(allReelIds.map(i => sql`${i}`), sql`, `)}]::int[])
            ${sinceClause}
          GROUP BY 1 ORDER BY 1`)
      : { rows: [] };

    // daily likes
    const likesRows = (allPostIds.length > 0 || allReelIds.length > 0)
      ? await db.execute(sql`
          SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS n
          FROM user_interactions
          WHERE interaction_type = 'like'
            AND (
              (content_type = 'post'  AND content_id = ANY(ARRAY[${allPostIds.length > 0 ? sql.join(allPostIds.map(i => sql`${i}`), sql`, `) : sql`NULL`}]::int[]))
              OR
              (content_type = 'reel'  AND content_id = ANY(ARRAY[${allReelIds.length > 0 ? sql.join(allReelIds.map(i => sql`${i}`), sql`, `) : sql`NULL`}]::int[]))
            )
            ${sinceClause}
          GROUP BY 1 ORDER BY 1`)
      : { rows: [] };

    /* ── 2. Follower growth ─────────────────────────────────────── */
    const followerGrowth = since
      ? await db.execute(sql`
          SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS new_followers
          FROM follows
          WHERE following_id = ${id} AND created_at >= ${since}
          GROUP BY 1 ORDER BY 1`)
      : await db.execute(sql`
          SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS new_followers
          FROM follows
          WHERE following_id = ${id}
          GROUP BY 1 ORDER BY 1`);

    // Total followers before the window (baseline); for all-time, baseline is 0
    const followerBaseline = since
      ? (await db
          .select({ count: sql<number>`count(*)::int` })
          .from(followsTable)
          .where(and(eq(followsTable.followingId, id), sql`created_at < ${since}`)))[0]?.count ?? 0
      : 0;

    /* ── 3. Top posts & reels ───────────────────────────────────── */
    const topPosts = allPostIds.length > 0
      ? await db
          .select({ id: postsTable.id, content: postsTable.content, likesCount: postsTable.likesCount, commentsCount: postsTable.commentsCount, sharesCount: postsTable.sharesCount, createdAt: postsTable.createdAt })
          .from(postsTable)
          .where(eq(postsTable.authorId, id))
          .orderBy(desc(sql`${postsTable.likesCount} + ${postsTable.commentsCount}`))
          .limit(5)
      : [];

    const topReels = allReelIds.length > 0
      ? await db
          .select({ id: reelsTable.id, caption: reelsTable.caption, viewsCount: reelsTable.viewsCount, likesCount: reelsTable.likesCount, createdAt: reelsTable.createdAt })
          .from(reelsTable)
          .where(eq(reelsTable.authorId, id))
          .orderBy(desc(reelsTable.viewsCount))
          .limit(5)
      : [];

    /* ── 4. Build day-by-day timeline ───────────────────────────── */
    // Collect all days with activity to determine the earliest date for all-time
    const allActivityDays = [
      ...(postViews as any).rows,
      ...(reelViews as any).rows,
      ...(likesRows as any).rows,
      ...(followerGrowth as any).rows,
    ].map((r: any) => String(r.day).slice(0, 10));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let timelineStart: Date;
    if (since) {
      timelineStart = since;
    } else if (allActivityDays.length > 0) {
      timelineStart = new Date(allActivityDays.reduce((a, b) => (a < b ? a : b)));
    } else {
      // No activity at all — use 30-day window as default
      timelineStart = new Date();
      timelineStart.setDate(timelineStart.getDate() - 30);
      timelineStart.setHours(0, 0, 0, 0);
    }

    const dayMap: Record<string, { date: string; postViews: number; reelViews: number; likes: number; newFollowers: number }> = {};
    const msPerDay = 86400000;
    const totalDays = Math.round((today.getTime() - timelineStart.getTime()) / msPerDay);
    for (let d = 0; d <= totalDays; d++) {
      const dt = new Date(timelineStart.getTime() + d * msPerDay);
      const key = dt.toISOString().slice(0, 10);
      dayMap[key] = { date: key, postViews: 0, reelViews: 0, likes: 0, newFollowers: 0 };
    }

    for (const row of (postViews as any).rows) {
      const k = String(row.day).slice(0, 10);
      if (dayMap[k]) dayMap[k].postViews += Number(row.n);
    }
    for (const row of (reelViews as any).rows) {
      const k = String(row.day).slice(0, 10);
      if (dayMap[k]) dayMap[k].reelViews += Number(row.n);
    }
    for (const row of (likesRows as any).rows) {
      const k = String(row.day).slice(0, 10);
      if (dayMap[k]) dayMap[k].likes += Number(row.n);
    }
    for (const row of (followerGrowth as any).rows) {
      const k = String(row.day).slice(0, 10);
      if (dayMap[k]) dayMap[k].newFollowers += Number(row.new_followers);
    }

    const timeline = Object.values(dayMap);

    // Cumulative follower count per day
    let cumFollowers = followerBaseline;
    const timelineWithFollowers = timeline.map(d => {
      cumFollowers += d.newFollowers;
      return { ...d, followers: cumFollowers };
    });

    /* ── 5. Summary totals ─────────────────────────────────────── */
    const totalViews = timeline.reduce((s, d) => s + d.postViews + d.reelViews, 0);
    const totalLikes = timeline.reduce((s, d) => s + d.likes, 0);
    const totalNewFollowers = timeline.reduce((s, d) => s + d.newFollowers, 0);
    const currentFollowers = cumFollowers;
    const totalContent = allPostIds.length + allReelIds.length;
    const engagementRate = totalViews > 0 ? Math.round((totalLikes / totalViews) * 1000) / 10 : 0;

    res.json({
      timeline: timelineWithFollowers,
      topPosts,
      topReels,
      summary: {
        totalViews,
        totalLikes,
        totalNewFollowers,
        currentFollowers,
        totalContent,
        engagementRate,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /users/:userId/posts/:postId/stats ───────────────────── */
router.get("/users/:userId/posts/:postId/stats", async (req: any, res) => {
  try {
    const userId = Number(req.params.userId);
    const postId = Number(req.params.postId);
    if (isNaN(userId) || isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const callerId = req.session?.userId as number | undefined;
    if (!callerId) { res.status(401).json({ error: "Unauthenticated" }); return; }
    if (callerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [post] = await db.select({
      id: postsTable.id,
      content: postsTable.content,
      mediaUrl: postsTable.mediaUrl,
      type: postsTable.type,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      sharesCount: postsTable.sharesCount,
      createdAt: postsTable.createdAt,
    }).from(postsTable).where(and(eq(postsTable.id, postId), eq(postsTable.authorId, userId)));

    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const viewsResult = await db.execute(sql`
      SELECT COUNT(*)::int AS views
      FROM user_interactions
      WHERE content_type = 'post' AND content_id = ${postId} AND interaction_type = 'view'`);

    const savesResult = await db.execute(sql`
      SELECT COUNT(*)::int AS saves
      FROM user_interactions
      WHERE content_type = 'post' AND content_id = ${postId} AND interaction_type = 'save'`);

    res.json({
      id: post.id,
      content: post.content,
      mediaUrl: post.mediaUrl,
      type: post.type,
      createdAt: post.createdAt,
      views: Number((viewsResult as any).rows?.[0]?.views ?? 0),
      likes: post.likesCount ?? 0,
      comments: post.commentsCount ?? 0,
      shares: post.sharesCount ?? 0,
      saves: Number((savesResult as any).rows?.[0]?.saves ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /users/:userId/reels/:reelId/stats ───────────────────── */
router.get("/users/:userId/reels/:reelId/stats", async (req: any, res) => {
  try {
    const userId = Number(req.params.userId);
    const reelId = Number(req.params.reelId);
    if (isNaN(userId) || isNaN(reelId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const callerId = req.session?.userId as number | undefined;
    if (!callerId) { res.status(401).json({ error: "Unauthenticated" }); return; }
    if (callerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [reel] = await db.select({
      id: reelsTable.id,
      caption: reelsTable.caption,
      videoUrl: reelsTable.videoUrl,
      thumbnailUrl: reelsTable.thumbnailUrl,
      viewsCount: reelsTable.viewsCount,
      likesCount: reelsTable.likesCount,
      createdAt: reelsTable.createdAt,
    }).from(reelsTable).where(and(eq(reelsTable.id, reelId), eq(reelsTable.authorId, userId)));

    if (!reel) { res.status(404).json({ error: "Reel not found" }); return; }

    const savesResult = await db.execute(sql`
      SELECT COUNT(*)::int AS saves
      FROM user_interactions
      WHERE content_type = 'reel' AND content_id = ${reelId} AND interaction_type = 'save'`);

    const interactionViewsResult = await db.execute(sql`
      SELECT COUNT(*)::int AS views
      FROM user_interactions
      WHERE content_type = 'reel' AND content_id = ${reelId} AND interaction_type = 'view'`);

    const interactionViews = Number((interactionViewsResult as any).rows?.[0]?.views ?? 0);
    const storedViews = reel.viewsCount ?? 0;

    res.json({
      id: reel.id,
      caption: reel.caption,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      createdAt: reel.createdAt,
      views: Math.max(storedViews, interactionViews),
      likes: reel.likesCount ?? 0,
      shares: 0,
      saves: Number((savesResult as any).rows?.[0]?.saves ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
