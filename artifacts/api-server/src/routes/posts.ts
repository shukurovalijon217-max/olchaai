import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postLikesTable, commentsTable, commentLikesTable, usersTable, moderationQueueTable, followsTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { scanContentAsync } from "../moderation/aiFilter";
import { applyAutopilotDecision } from "../moderation/aiAutopilot.js";
import { cacheAside, cacheDel, cacheDelPattern } from "../lib/cache";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { notifyComment, notifyLike } from "../lib/emailNotify";
import { sendNotification } from "../lib/pushNotifications";

const router = Router();

/* ── Batch enrich: 2 queries for ALL posts (not 2×N) ────────── */
async function batchEnrichPosts(
  posts: (typeof postsTable.$inferSelect)[],
  viewerId = 0,
) {
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map(p => p.authorId).filter(Boolean))] as number[];
  const postIds = posts.map(p => p.id);

  const [authors, likedRows, statsMap] = await Promise.all([
    authorIds.length > 0
      ? db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : Promise.resolve([]),
    viewerId && postIds.length > 0
      ? db
          .select({ postId: postLikesTable.postId })
          .from(postLikesTable)
          .where(and(inArray(postLikesTable.postId, postIds), eq(postLikesTable.userId, viewerId)))
      : Promise.resolve([]),
    getUserStatsMap(authorIds, viewerId),
  ]);

  const authorMap = new Map(authors.map(a => [a.id, a]));
  const likedSet = new Set((likedRows as { postId: number }[]).map(l => l.postId));

  return posts.map(post => {
    const author = authorMap.get(post.authorId as number);
    const stats = statsMap.get(post.authorId as number) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
    return {
      ...post,
      likesCount: post.likesCount ?? 0,
      commentsCount: post.commentsCount ?? 0,
      sharesCount: (post as any).sharesCount ?? 0,
      author: {
        id: author?.id ?? post.authorId,
        username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User",
        avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        ...stats,
      },
      tags: post.tags || [],
      isLiked: likedSet.has(post.id),
    };
  });
}

/* ── GET /posts ─────────────────────────────────────────────── */
router.get("/posts", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const type = req.query.type as string;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    // Cache key: anonymous/public feed only (viewer-specific feeds not cached)
    const cacheKey = !viewerId && offset < 60 ? `list:${type ?? "all"}:${limit}:${offset}` : null;

    const midnightCond = await midnightVisibilityConditionForReq(req);
    // Hide posts whose auto-destruct time has passed
    const notExpired = sql`(${postsTable.destructAt} IS NULL OR ${postsTable.destructAt} > NOW())`;

    const enriched = await cacheAside("posts", cacheKey ?? `__skip__${Date.now()}`, async () => {
      let posts;
      if (userId) {
        posts = await db.select().from(postsTable).where(and(eq(postsTable.authorId, userId), midnightCond, notExpired)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
      } else if (type && type !== "all") {
        posts = await db.select().from(postsTable).where(and(eq(postsTable.type, type), midnightCond, notExpired)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
      } else {
        posts = await db.select().from(postsTable).where(and(midnightCond, notExpired)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
      }
      return batchEnrichPosts(posts, viewerId);
    }, cacheKey ? 15 : 0);

    if (cacheKey) res.setHeader("X-Cache", "HIT");
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /music/search — iTunes proxy (CORS-safe) ──────────── */
router.get("/music/search", async (req: any, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) { res.json({ results: [] }); return; }
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=25&lang=en_us`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) { res.json({ results: [] }); return; }
    const data = await r.json() as { results?: any[] };
    const results = (data.results ?? []).map((t: any) => ({
      name: `${t.artistName} — ${t.trackName}`,
      artist: t.artistName ?? "",
      title:  t.trackName  ?? "",
      album:  t.collectionName ?? "",
      artwork: (t.artworkUrl100 ?? "").replace("100x100", "60x60"),
      preview: t.previewUrl ?? "",
    }));
    res.json({ results });
  } catch (err) {
    req.log.warn(err, "music search failed");
    res.json({ results: [] });
  }
});

/* ── GET /music/proxy — stream iTunes preview audio (avoids iOS CORS) ── */
router.get("/music/proxy", async (req: any, res) => {
  try {
    const rawUrl = String(req.query.url ?? "").trim();
    if (!rawUrl || !rawUrl.startsWith("https://audio-ssl.itunes.apple.com/")) {
      res.status(400).json({ error: "invalid url" }); return;
    }
    const upstream = await fetch(rawUrl, { signal: AbortSignal.timeout(10000) });
    if (!upstream.ok || !upstream.body) { res.status(502).json({ error: "upstream failed" }); return; }
    const ct = upstream.headers.get("content-type") ?? "audio/mp4";
    const cl = upstream.headers.get("content-length");
    res.setHeader("Content-Type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (cl) res.setHeader("Content-Length", cl);
    const { Readable } = await import("stream");
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (err) {
    req.log.warn(err, "music proxy failed");
    if (!res.headersSent) res.status(502).json({ error: "proxy error" });
  }
});

/* ── POST /posts/ai-predict — predict engagement from real historical averages ───── */
router.post("/posts/ai-predict", async (req: any, res) => {
  try {
    const { mood, mediaType, hasPoll, hotTake } = req.body as { mood?: string; mediaType?: string; hasPoll?: boolean; hotTake?: boolean };
    const userId: number | undefined = req.session?.userId;

    const rows = (r: any) => r?.rows ?? [];
    const [statsRes, followerRes, userAvgRes] = await Promise.all([
      db.execute(sql`
        SELECT
          coalesce(avg(likes_count), 0)::float as avg_likes,
          coalesce(avg(comments_count), 0)::float as avg_comments,
          coalesce(avg(shares_count), 0)::float as avg_shares,
          coalesce(avg(likes_count) filter (where type = ${mediaType ?? "text"}), null)::float as avg_likes_type,
          coalesce(avg(likes_count) filter (where mood is not null), null)::float as avg_likes_mood,
          coalesce(avg(likes_count) filter (where poll_question is not null), null)::float as avg_likes_poll,
          coalesce(avg(likes_count) filter (where hot_take = true), null)::float as avg_likes_hot
        FROM posts
      `),
      userId
        ? db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId))
        : Promise.resolve([{ count: 0 }]),
      userId
        ? db.select({ avgLikes: sql<number>`coalesce(avg(${postsTable.likesCount}), 0)::float`, total: sql<number>`count(*)::int` })
            .from(postsTable).where(eq(postsTable.authorId, userId))
        : Promise.resolve([{ avgLikes: 0, total: 0 }]),
    ]);

    const stats = rows(statsRes)[0] ?? {};
    const overallAvgLikes: number = Number(stats.avg_likes) || 0;
    const overallAvgComments: number = Number(stats.avg_comments) || 0;
    const overallAvgShares: number = Number(stats.avg_shares) || 0;

    const segmentAvgs: number[] = [];
    if (stats.avg_likes_type != null) segmentAvgs.push(Number(stats.avg_likes_type));
    if (mood && stats.avg_likes_mood != null) segmentAvgs.push(Number(stats.avg_likes_mood));
    if (hasPoll && stats.avg_likes_poll != null) segmentAvgs.push(Number(stats.avg_likes_poll));
    if (hotTake && stats.avg_likes_hot != null) segmentAvgs.push(Number(stats.avg_likes_hot));

    const baselineLikes = segmentAvgs.length > 0
      ? segmentAvgs.reduce((a, b) => a + b, 0) / segmentAvgs.length
      : overallAvgLikes;

    const [{ avgLikes: userAvgLikes, total: userPostCount }] = userAvgRes as { avgLikes: number; total: number }[];
    let personalizationFactor = 1;
    if (userPostCount >= 3 && overallAvgLikes > 0) {
      personalizationFactor = Math.min(2.5, Math.max(0.4, userAvgLikes / overallAvgLikes));
    }

    const predictedLikes = Math.max(0, Math.round(baselineLikes * personalizationFactor));
    const commentRatio = overallAvgLikes > 0 ? overallAvgComments / overallAvgLikes : 0.1;
    const shareRatio = overallAvgLikes > 0 ? overallAvgShares / overallAvgLikes : 0.05;
    const predictedComments = Math.max(0, Math.round(predictedLikes * commentRatio));
    const predictedShares = Math.max(0, Math.round(predictedLikes * shareRatio));

    const [{ count: followerCount }] = followerRes as { count: number }[];
    const reach = followerCount;

    const totalEngagement = predictedLikes + predictedComments * 2 + predictedShares * 3;
    const baselineEngagement = overallAvgLikes + overallAvgComments * 2 + overallAvgShares * 3;
    const score = baselineEngagement > 0
      ? Math.min(99, Math.max(1, Math.round((totalEngagement / baselineEngagement) * 50)))
      : 50;

    res.json({ likes: predictedLikes, comments: predictedComments, shares: predictedShares, reach, score });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ likes: 0, comments: 0, shares: 0, reach: 0, score: 50 });
  }
});

/* ── POST /posts/:id/hot-take ───────────────────────────────── */
router.post("/posts/:id/hot-take", async (req: any, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId, vote } = req.body as { userId: number; vote: "fire" | "cold" };
    if (!userId || !vote) { res.status(400).json({ error: "userId, vote required" }); return; }
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      `INSERT INTO hot_take_votes(post_id,user_id,vote) VALUES($1,$2,$3)
       ON CONFLICT(post_id,user_id) DO UPDATE SET vote=$3`,
      [postId, userId, vote]
    );
    const { rows } = await pool.query(
      `SELECT vote, COUNT(*) as count FROM hot_take_votes WHERE post_id=$1 GROUP BY vote`,
      [postId]
    );
    const fire = Number(rows.find((r: any) => r.vote === "fire")?.count ?? 0);
    const cold = Number(rows.find((r: any) => r.vote === "cold")?.count ?? 0);
    await pool.end();
    res.json({ fire, cold, userVote: vote });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /posts/:id/hot-take ────────────────────────────────── */
router.get("/posts/:id/hot-take", async (req: any, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = Number((req.session as any)?.userId ?? 0);
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const [{ rows }, { rows: userRow }] = await Promise.all([
      pool.query(`SELECT vote, COUNT(*) as count FROM hot_take_votes WHERE post_id=$1 GROUP BY vote`, [postId]),
      userId ? pool.query(`SELECT vote FROM hot_take_votes WHERE post_id=$1 AND user_id=$2`, [postId, userId]) : { rows: [] },
    ]);
    await pool.end();
    const fire = Number(rows.find((r: any) => r.vote === "fire")?.count ?? 0);
    const cold = Number(rows.find((r: any) => r.vote === "cold")?.count ?? 0);
    res.json({ fire, cold, userVote: userRow[0]?.vote ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ fire: 0, cold: 0, userVote: null });
  }
});

/* ── POST /posts/ai-caption — generate AI captions ─────────── */
router.post("/posts/ai-caption", async (req: any, res) => {
  try {
    const { mood, mediaType, description } = req.body as { mood?: string; mediaType?: string; description?: string };
    const moodLabel = mood ? `Mood/kayfiyat: ${mood}.` : "";
    const mediaLabel = mediaType === "video" ? "video post" : mediaType === "photo" ? "rasm/foto post" : "matn post";
    const descPart = description ? `Post haqida: "${description}".` : "";
    const completion = await openai.chat.completions.create({
      model: AI_CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: `Sen OlchaAI ijtimoiy tarmoq uchun ijodiy caption/izoh yozuvchi AI yordamchisan. Foydalanuvchi so'ragan tilda (o'zbek, rus yoki ingliz) qisqa, jozibali, emoji ishlatgan 3 ta har xil caption yoz. Har birini JSON arrayda qaytargin.`,
        },
        {
          role: "user",
          content: `${mediaLabel} uchun 3 ta caption yoz. ${moodLabel} ${descPart} Faqat JSON array qaytargin: ["caption1","caption2","caption3"]`,
        },
      ],
      temperature: 0.85,
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content ?? "[]";
    let captions: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      captions = match ? JSON.parse(match[0]) : [];
    } catch { captions = [raw]; }
    res.json({ captions: captions.slice(0, 3) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ captions: [] });
  }
});

/* ── POST /posts/:id/vote ───────────────────────────────────── */
router.post("/posts/:id/vote", async (req: any, res) => {
  try {
    const postId = Number(req.params.id);
    const { userId, optionIndex } = req.body as { userId: number; optionIndex: number };
    if (!userId || optionIndex === undefined) { res.status(400).json({ error: "userId, optionIndex required" }); return; }
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      `INSERT INTO post_votes(post_id,user_id,option_index) VALUES($1,$2,$3)
       ON CONFLICT(post_id,user_id) DO UPDATE SET option_index=$3`,
      [postId, userId, optionIndex]
    );
    const { rows } = await pool.query(
      `SELECT option_index, COUNT(*) as count FROM post_votes WHERE post_id=$1 GROUP BY option_index`,
      [postId]
    );
    await pool.end();
    res.json({ votes: rows.map((r: any) => ({ optionIndex: Number(r.option_index), count: Number(r.count) })), userVote: optionIndex });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /posts/:id/votes ───────────────────────────────────── */
router.get("/posts/:id/votes", async (req: any, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = Number((req.session as any)?.userId ?? 0);
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const [{ rows: voteRows }, { rows: userRows }] = await Promise.all([
      pool.query(`SELECT option_index, COUNT(*) as count FROM post_votes WHERE post_id=$1 GROUP BY option_index`, [postId]),
      userId ? pool.query(`SELECT option_index FROM post_votes WHERE post_id=$1 AND user_id=$2`, [postId, userId]) : { rows: [] },
    ]);
    await pool.end();
    res.json({
      votes: voteRows.map((r: any) => ({ optionIndex: Number(r.option_index), count: Number(r.count) })),
      userVote: userRows[0] ? Number(userRows[0].option_index) : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /posts — instant response, AI scan in background ─── */
router.post("/posts", async (req: any, res) => {
  try {
    const { content, type, mediaUrl, mediaUrls, overlays, audioName, audioUrl, audioTrimStart, audioTrimEnd, pollQuestion, pollOptions, mood, filterName, tags, midnightOnly,
      destructAt, geoLat, geoLng, geoRadiusKm, emotionLock, lockedEmotion, liveMoodEnabled, seriesName, seriesOrder, collabCanvasEnabled, collabCanvasId } = req.body;
    const sessionUserId: number | undefined = req.session?.userId;
    const authorId = sessionUserId ?? Number(req.body.authorId);
    if (!authorId) { res.status(401).json({ error: "Login kerak" }); return; }

    const [post] = await db
      .insert(postsTable)
      .values({
        authorId, content, type: type || "text", mediaUrl, mediaUrls,
        overlays: overlays ?? null, audioName: audioName ?? null, audioUrl: audioUrl ?? null,
        audioTrimStart: audioTrimStart != null ? String(audioTrimStart) : null,
        audioTrimEnd: audioTrimEnd != null ? String(audioTrimEnd) : null,
        pollQuestion: pollQuestion ?? null, pollOptions: pollOptions ?? null,
        mood: mood ?? null, filterName: filterName ?? null, tags, isFlagged: false, midnightOnly: !!midnightOnly,
        // 6 new real features
        destructAt: destructAt ? new Date(destructAt) : null,
        geoLat: geoLat ?? null, geoLng: geoLng ?? null, geoRadiusKm: geoRadiusKm ?? 0,
        emotionLock: !!emotionLock, lockedEmotion: lockedEmotion ?? null,
        liveMoodEnabled: !!liveMoodEnabled,
        seriesName: seriesName ?? null, seriesOrder: seriesOrder ?? 1,
        collabCanvasEnabled: !!collabCanvasEnabled, collabCanvasId: collabCanvasId ?? null,
      })
      .returning();

    const [enriched] = await batchEnrichPosts([post], sessionUserId);
    res.status(201).json(enriched);

    /* AI scan & autopilot — fire-and-forget, never blocks response */
    void (async () => {
      try {
        const scan = await scanContentAsync(content ?? "");
        if (scan.verdict === "clean") return;

        await db.update(postsTable)
          .set({ isFlagged: true })
          .where(eq(postsTable.id, post.id))
          .catch(() => {});

        await db.insert(moderationQueueTable).values({
          contentType: "post", contentId: post.id, contentText: content,
          authorId: authorId ?? null,
          aiScore: scan.score, aiCategories: scan.categories,
          aiVerdict: scan.verdict, autoFlagged: true,
          autoBlocked: scan.autoBlock,
          status: scan.autoBlock ? "rejected" : "pending",
        }).catch(() => {});

        const decision = await applyAutopilotDecision({
          scan, authorId: sessionUserId ?? authorId ?? null,
          contentType: "post", contentId: post.id, contentText: content ?? "",
        });

        if (decision.isBanned || scan.autoBlock) {
          await db.delete(postsTable).where(eq(postsTable.id, post.id)).catch(() => {});
        }
      } catch { /* silent */ }
    })();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /posts/trending ────────────────────────────────────── */
/* ── GET /posts/series/:name ─────────────────────────────────── */
router.get("/posts/series/:name", async (req: any, res) => {
  try {
    const seriesName = decodeURIComponent(req.params.name);
    const viewerId = req.session?.userId as number | undefined;
    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.seriesName, seriesName), sql`(${postsTable.destructAt} IS NULL OR ${postsTable.destructAt} > NOW())`))
      .orderBy(postsTable.seriesOrder);
    const enriched = await batchEnrichPosts(posts, viewerId);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/trending", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const midnightCond = await midnightVisibilityConditionForReq(req);
    const posts = await db.select().from(postsTable).where(midnightCond).orderBy(desc(postsTable.likesCount)).limit(10);
    res.json(await batchEnrichPosts(posts, viewerId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /posts/:id ─────────────────────────────────────────── */
router.get("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = (req.session as any)?.userId as number | undefined;
    const midnightCond = await midnightVisibilityConditionForReq(req);
    const [post] = await db.select().from(postsTable).where(and(eq(postsTable.id, id), midnightCond));
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    const [enriched] = await batchEnrichPosts([post], viewerId);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /posts/:id ──────────────────────────────────────── */
router.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const commentRows = await db
      .select({ id: commentsTable.id })
      .from(commentsTable)
      .where(eq(commentsTable.postId, id));
    if (commentRows.length > 0) {
      await db.delete(commentLikesTable).where(inArray(commentLikesTable.commentId, commentRows.map(c => c.id)));
    }
    await Promise.all([
      db.delete(commentsTable).where(eq(commentsTable.postId, id)),
      db.delete(postLikesTable).where(eq(postLikesTable.postId, id)),
      db.delete(moderationQueueTable).where(and(eq(moderationQueueTable.contentType, "post"), eq(moderationQueueTable.contentId, id))),
    ]);
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /posts/:id/like ───────────────────────────────────── */
router.post("/posts/:id/like", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const existing = await db
      .select({ id: postLikesTable.postId })
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)))
      .limit(1);

    const isLiked = existing.length > 0;
    if (isLiked) {
      await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
      await db.update(postsTable).set({ likesCount: sql`GREATEST(0, ${postsTable.likesCount} - 1)` }).where(eq(postsTable.id, postId));
    } else {
      await db.insert(postLikesTable).values({ postId, userId }).onConflictDoNothing();
      await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
    }

    const [post] = await db.select({ likesCount: postsTable.likesCount, authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, postId));
    res.json({ liked: !isLiked, likesCount: post?.likesCount ?? 0 });

    // Push + Email: like bo'lganda post egasiga xabar (o'ziga xabar ketmasin)
    if (!isLiked && post?.authorId && post.authorId !== userId) {
      void (async () => {
        try {
          const [postAuthor, liker] = await Promise.all([
            db.select({ email: usersTable.email, displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, post.authorId!)).limit(1),
            db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),
          ]);
          const likerName = liker[0]?.displayName ?? "Kimdir";
          // Push notification
          await sendNotification({
            userId: post.authorId!,
            title: "❤️ Yangi like",
            body: `${likerName} postingizni yoqtirdi`,
            type: "like",
            actorName: likerName,
            actorAvatar: liker[0]?.avatarUrl ?? undefined,
            targetId: postId,
            targetType: "post",
            data: { postId: String(postId), type: "like" },
          });
          if (postAuthor[0]?.email) {
            await notifyLike({
              toEmail: postAuthor[0].email,
              toName: postAuthor[0].displayName ?? "Foydalanuvchi",
              likerName,
              postPreview: post.content ?? "",
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

/* ── POST /posts/:id/comments/:commentId/like ───────────────── */
router.post("/posts/:id/comments/:commentId/like", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const existing = await db
      .select({ id: commentLikesTable.id })
      .from(commentLikesTable)
      .where(and(eq(commentLikesTable.commentId, commentId), eq(commentLikesTable.userId, userId)))
      .limit(1);

    const isLiked = existing.length > 0;
    if (isLiked) {
      await db.delete(commentLikesTable).where(and(eq(commentLikesTable.commentId, commentId), eq(commentLikesTable.userId, userId)));
      await db.update(commentsTable).set({ likesCount: sql`GREATEST(0, ${commentsTable.likesCount} - 1)` }).where(eq(commentsTable.id, commentId));
    } else {
      await db.insert(commentLikesTable).values({ commentId, userId }).onConflictDoNothing();
      await db.update(commentsTable).set({ likesCount: sql`${commentsTable.likesCount} + 1` }).where(eq(commentsTable.id, commentId));
    }

    const [comment] = await db.select({ likesCount: commentsTable.likesCount }).from(commentsTable).where(eq(commentsTable.id, commentId));
    res.json({ liked: !isLiked, likesCount: comment?.likesCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /posts/:id/comments ────────────────────────────────── */
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    // Validate postId to prevent NaN/0 queries that could leak data
    if (!postId || isNaN(postId)) { res.json([]); return; }
    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    if (comments.length === 0) { res.json([]); return; }

    const authorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))] as number[];
    const viewerId = (req.session as any)?.userId as number | undefined;
    const authors = authorIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));
    const statsMap = await getUserStatsMap(authorIds, viewerId);

    res.json(comments.map(c => {
      const author = authorMap.get(c.authorId as number);
      const stats = statsMap.get(c.authorId as number) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
      return {
        ...c,
        author: {
          id: author?.id ?? c.authorId, username: author?.username ?? "deleted",
          displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
          isVerified: author?.isVerified ?? false,
          ...stats,
        },
      };
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /posts/:id/comments ───────────────────────────────── */
router.post("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId || isNaN(postId)) { res.status(400).json({ error: "Noto'g'ri post ID" }); return; }
    const { content } = req.body;
    // SECURITY: use ONLY session userId — never accept authorId from request body
    // (body-based authorId allows impersonation of any user)
    const authorId = (req.session as any)?.userId as number | undefined;
    if (!authorId) { res.status(401).json({ error: "Izoh yozish uchun tizimga kiring" }); return; }

    const [comment] = await db.insert(commentsTable).values({ postId, authorId, content }).returning();
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, postId));

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId as number));
    const stats = await getUserStats(comment.authorId as number, authorId);
    res.status(201).json({
      ...comment,
      author: {
        id: author?.id ?? authorId, username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        ...stats,
      },
    });

    /* Push + Email bildirishnoma — post egasiga */
    void (async () => {
      try {
        const [postRow] = await db.select({ authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, postId));
        if (postRow?.authorId && postRow.authorId !== authorId) {
          const commenterName = author?.displayName ?? "Kimdir";
          // Push notification
          await sendNotification({
            userId: postRow.authorId,
            title: "💬 Yangi izoh",
            body: `${commenterName}: ${(content ?? "").slice(0, 80)}`,
            type: "comment",
            actorName: commenterName,
            actorAvatar: author?.avatarUrl ?? undefined,
            targetId: postId,
            targetType: "post",
            data: { postId: String(postId), type: "comment" },
          });
          const [postAuthor] = await db.select({ email: usersTable.email, displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, postRow.authorId)).limit(1);
          if (postAuthor?.email) {
            await notifyComment({
              toEmail: postAuthor.email,
              toName: postAuthor.displayName ?? "Foydalanuvchi",
              commenterName,
              postPreview: postRow.content ?? "",
              commentText: content ?? "",
            });
          }
        }
      } catch { /* non-fatal */ }
    })();

    /* AI scan comment in background */
    void (async () => {
      try {
        const scan = await scanContentAsync(content ?? "");
        if (scan.verdict === "clean") return;
        if (scan.autoBlock) {
          await db.delete(commentsTable).where(eq(commentsTable.id, comment.id)).catch(() => {});
          await db.update(postsTable).set({ commentsCount: sql`GREATEST(0, ${postsTable.commentsCount} - 1)` }).where(eq(postsTable.id, postId)).catch(() => {});
        }
        await db.insert(moderationQueueTable).values({
          contentType: "comment", contentId: comment.id, contentText: content,
          authorId: authorId ?? null,
          aiScore: scan.score, aiCategories: scan.categories,
          aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: scan.autoBlock,
          status: scan.autoBlock ? "rejected" : "pending",
        }).catch(() => {});
      } catch { /* silent */ }
    })();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
