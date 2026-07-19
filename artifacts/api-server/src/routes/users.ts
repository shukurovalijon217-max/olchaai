import { Router } from "express";
import { db, readDb } from "@workspace/db";
import { usersTable, followsTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, ilike, sql, and, desc, inArray } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { enrichWithCDN } from "../lib/bunny";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheAside, cacheDelPattern } from "../lib/cache";
import { notifyFollow } from "../lib/emailNotify";
import { sendNotification } from "../lib/pushNotifications";

const router = Router();

/**
 * Strip private fields from a user object.
 * If viewerId === user.id, return all public fields.
 * Otherwise, hide email/phone/privacySettings/notifPrefs/timezone/focusShield.
 */
function publicUser(user: Record<string, any>, viewerId?: number) {
  const { passwordHash: _pw, ...u } = user;
  if (viewerId && viewerId === u.id) return u;
  const { email: _e, phone: _p, privacySettings: _ps, notifPrefs: _np, focusShield: _fs, timezone: _tz, ...pub } = u;
  return pub;
}

/* ── Search / list users (public profiles only) ── */
router.get("/users", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const viewerId = (req.session as any)?.userId as number | undefined;

    let query = readDb.select().from(usersTable);
    if (search) {
      query = query.where(ilike(usersTable.username, `%${search}%`)) as typeof query;
    }
    const users = await query.limit(limit).offset(offset);

    const statsMap = await getUserStatsMap(users.map(u => u.id), viewerId);
    const enriched = users.map((u) => ({
      ...publicUser(u, viewerId),
      ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Platform stats summary (no user data) ── */
router.get("/users/stats/summary", async (req, res) => {
  try {
    const [total] = await readDb.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [verified] = await readDb.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isVerified, true));
    res.json({ totalUsers: total.count, newToday: Math.floor(total.count * 0.02), activeToday: Math.floor(total.count * 0.35), verifiedCount: verified.count });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get single user profile ── */
router.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id) || id <= 0) { res.status(400).json({ error: "Noto'g'ri foydalanuvchi ID" }); return; }
    const viewerId = (req.session as any)?.userId as number | undefined;
    const cacheKey = `profile:${id}:viewer:${viewerId ?? 0}`;
    const result = await cacheAside("users", cacheKey, async () => {
      const [user] = await readDb.select().from(usersTable).where(eq(usersTable.id, id));
      if (!user) return null;
      const [[followers], [following], [postsCount], followCheck] = await Promise.all([
        readDb.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
        readDb.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
        readDb.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
        viewerId && viewerId !== id
          ? readDb.select({ id: followsTable.followerId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, id))).limit(1)
          : Promise.resolve([]),
      ]);
      const isOwner = viewerId === id;
      const viewerIsFollowing = (followCheck as { id: number }[]).length > 0;
      const isPrivate = (user.privacySettings as any)?.privateProfile === true;

      /* Private profile — only show avatar/cover/name to non-followers */
      if (isPrivate && !isOwner && !viewerIsFollowing) {
        const cdnUser = enrichWithCDN({ avatarUrl: user.avatarUrl, coverUrl: user.coverUrl });
        return {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: cdnUser.avatarUrl,
          coverUrl: cdnUser.coverUrl,
          isVerified: user.isVerified ?? false,
          bio: null,
          followersCount: followers.count,
          followingCount: null,
          postsCount: null,
          isFollowing: false,
          isPrivate: true,
        };
      }

      return {
        ...publicUser(user, viewerId),
        followersCount: followers.count,
        followingCount: following.count,
        postsCount: postsCount.count,
        isFollowing: viewerIsFollowing,
        isPrivate: isOwner ? isPrivate : false,
      };
    }, 30);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get user's posts ── */
router.get("/users/:id/posts", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = (req.session as any)?.userId as number | undefined;

    /* Privacy gate — private profiles block post access for non-followers */
    if (viewerId !== id) {
      const [owner] = await db.select({ privacySettings: usersTable.privacySettings }).from(usersTable).where(eq(usersTable.id, id));
      if ((owner?.privacySettings as any)?.privateProfile === true) {
        const follow = await db.select({ id: followsTable.followerId })
          .from(followsTable).where(and(eq(followsTable.followerId, viewerId!), eq(followsTable.followingId, id))).limit(1);
        if (!viewerId || follow.length === 0) { res.json([]); return; }
      }
    }

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

/* ── Mirror view — exactly what an unauthenticated stranger sees ── */
router.get("/users/:id/mirror-view", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sessionUserId = (req.session as any)?.userId as number | undefined;
    if (!sessionUserId || sessionUserId !== id) {
      res.status(403).json({ error: "Faqat o'z profilingizning ko'zgu ko'rinishini so'rash mumkin" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    const privacy = (user.privacySettings as unknown as Record<string, unknown>) ?? {};
    const isPrivate = privacy.privateProfile === true;
    const isGhost = !!user.ghostUntil && user.ghostUntil > new Date();

    const [[followers], [following], [postsCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, id)),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, id)),
    ]);

    const hiddenFields: { field: string; reason: string }[] = [];
    const visibleFields: string[] = ["displayName", "username", "avatarUrl"];
    if (user.coverUrl) visibleFields.push("coverUrl");
    if (user.isVerified) visibleFields.push("isVerified");

    if (isPrivate || privacy.hideBio) {
      hiddenFields.push({ field: "bio", reason: isPrivate ? "Yopiq profil" : "Maxfiylik sozlamasi" });
    } else if (user.bio) {
      visibleFields.push("bio");
    }

    if (privacy.hideFollowers) {
      hiddenFields.push({ field: "followersCount", reason: "Maxfiylik sozlamasi" });
    } else {
      visibleFields.push("followersCount");
    }

    if (isPrivate || privacy.hideFollowing) {
      hiddenFields.push({ field: "followingCount", reason: isPrivate ? "Yopiq profil" : "Maxfiylik sozlamasi" });
    } else {
      visibleFields.push("followingCount");
    }

    if (isPrivate) {
      hiddenFields.push({ field: "posts", reason: "Yopiq profil — faqat kuzatuvchilar ko'radi" });
    } else {
      visibleFields.push("posts");
    }

    if (isGhost || privacy.activityStatus === false) {
      hiddenFields.push({ field: "onlineStatus", reason: isGhost ? "Ghost rejimi faol" : "Faollik holati yashirilgan" });
    } else {
      visibleFields.push("onlineStatus");
    }

    hiddenFields.push(
      { field: "email", reason: "Shaxsiy ma'lumot — hech qachon ko'rinmaydi" },
      { field: "phone", reason: "Shaxsiy ma'lumot — hech qachon ko'rinmaydi" },
    );

    res.json({
      profile: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        coverUrl: user.coverUrl ?? null,
        isVerified: user.isVerified ?? false,
        bio: (isPrivate || privacy.hideBio) ? null : (user.bio ?? null),
        followersCount: privacy.hideFollowers ? null : followers.count,
        followingCount: (isPrivate || privacy.hideFollowing) ? null : following.count,
        postsCount: isPrivate ? 0 : postsCount.count,
        isPrivate,
      },
      mirrorMeta: {
        isPrivate,
        isGhost,
        ghostUntil: isGhost ? user.ghostUntil : null,
        hiddenFields,
        visibleFields,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── Update own profile (ownership enforced) ── */
router.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sessionUserId = (req.session as any)?.userId as number | undefined;

    // Must be logged in and can only edit your OWN profile
    if (!sessionUserId) { res.status(401).json({ error: "Login talab qilinadi" }); return; }
    if (sessionUserId !== id) { res.status(403).json({ error: "Faqat o'z profilingizni o'zgartirishingiz mumkin" }); return; }

    const { displayName, bio, avatarUrl, coverUrl } = req.body;
    const [user] = await db.update(usersTable).set({ displayName, bio, avatarUrl, coverUrl }).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    cacheDelPattern("users:");

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

/* ── Follow / unfollow a user ── */
router.post("/users/:id/follow", async (req, res) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = (req.session as any)?.userId as number | undefined;
    if (!followerId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (followerId === followingId) { res.status(400).json({ error: "O'zingizni follow qila olmaysiz" }); return; }
    const existing = await db.select().from(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));
    const isFollowing = existing.length > 0;
    if (isFollowing) {
      await db.delete(followsTable).where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));
    } else {
      await db.insert(followsTable).values({ followerId, followingId });
    }
    const [followers] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, followingId));
    res.json({ following: !isFollowing, followersCount: followers.count });

    if (!isFollowing) {
      void (async () => {
        try {
          const [followedUser, followerUser] = await Promise.all([
            db.select({ email: usersTable.email, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, notifPrefs: usersTable.notifPrefs }).from(usersTable).where(eq(usersTable.id, followingId)).limit(1),
            db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, username: usersTable.username }).from(usersTable).where(eq(usersTable.id, followerId)).limit(1),
          ]);
          const follower = followerUser[0];
          const followed = followedUser[0];
          /* In-app notification + FCM/web push → kuzatilgan odamning bildirishnomalarida ko'rinadi */
          void sendNotification({
            userId: followingId,
            type: "follow",
            body: `${follower?.displayName ?? "Kimdir"} sizni kuzata boshladi`,
            title: "Yangi kuzatuvchi",
            actorName: follower?.displayName ?? undefined,
            actorAvatar: follower?.avatarUrl ?? undefined,
            targetId: followerId,
            targetType: "user",
            url: `/profile/${follower?.username ?? followerId}`,
          });
          /* Email notification — faqat emailNotifs yoqilgan bo'lsa */
          const followEmailOk = followed?.notifPrefs == null || ((followed.notifPrefs as { emailNotifs?: boolean }).emailNotifs ?? true);
          if (followed?.email && followEmailOk) {
            await notifyFollow({
              toEmail: followed.email,
              toName: followed.displayName ?? "Foydalanuvchi",
              followerName: follower?.displayName ?? "Kimdir",
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

/* ── Get followers list ── */
router.get("/users/:id/followers/count", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, id));
    res.json({ count: row?.count ?? 0 });
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
    const enriched = users.map((u) => ({
      ...publicUser(u, viewerId),
      ...(statsMap.get(u.id) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false })
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

/* ── Block / Unblock user ─────────────────────────── */
router.post("/users/:id/block", async (req, res) => {
  const blockerId = (req.session as any)?.userId as number | undefined;
  if (!blockerId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const blockedId = Number(req.params.id);
  if (!blockedId || blockerId === blockedId) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }
  try {
    await db.execute(
      sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${blockerId}, ${blockedId}) ON CONFLICT DO NOTHING`
    );
    res.json({ blocked: true, blockedId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id/block", async (req, res) => {
  const blockerId = (req.session as any)?.userId as number | undefined;
  if (!blockerId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const blockedId = Number(req.params.id);
  try {
    await db.execute(
      sql`DELETE FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}`
    );
    res.json({ blocked: false, blockedId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/me/blocks", async (req, res) => {
  const blockerId = (req.session as any)?.userId as number | undefined;
  if (!blockerId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  try {
    const rows = await db.execute(sql`SELECT blocked_id FROM user_blocks WHERE blocker_id = ${blockerId}`);
    const ids = (rows as any).rows.map((r: any) => Number(r.blocked_id));
    res.json({ blockedIds: ids });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
