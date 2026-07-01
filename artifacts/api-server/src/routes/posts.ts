import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postLikesTable, commentsTable, commentLikesTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { scanContentAsync } from "../moderation/aiFilter";
import { applyAutopilotDecision } from "../moderation/aiAutopilot.js";

const router = Router();

/* ── Batch enrich: 2 queries for ALL posts (not 2×N) ────────── */
async function batchEnrichPosts(
  posts: (typeof postsTable.$inferSelect)[],
  viewerId = 0,
) {
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map(p => p.authorId).filter(Boolean))] as number[];
  const postIds = posts.map(p => p.id);

  const [authors, likedRows] = await Promise.all([
    authorIds.length > 0
      ? db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : Promise.resolve([]),
    viewerId && postIds.length > 0
      ? db
          .select({ postId: postLikesTable.postId })
          .from(postLikesTable)
          .where(and(inArray(postLikesTable.postId, postIds), eq(postLikesTable.userId, viewerId)))
      : Promise.resolve([]),
  ]);

  const authorMap = new Map(authors.map(a => [a.id, a]));
  const likedSet = new Set((likedRows as { postId: number }[]).map(l => l.postId));

  return posts.map(post => {
    const author = authorMap.get(post.authorId as number);
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
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
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

    let posts;
    if (userId) {
      posts = await db.select().from(postsTable).where(eq(postsTable.authorId, userId)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    } else if (type && type !== "all") {
      posts = await db.select().from(postsTable).where(eq(postsTable.type, type)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    } else {
      posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);
    }

    res.json(await batchEnrichPosts(posts, viewerId));
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

/* ── POST /posts/ai-predict — predict engagement ───────────── */
router.post("/posts/ai-predict", async (req: any, res) => {
  try {
    const { mood, mediaType, hasPoll, hotTake, followerCount = 500 } = req.body as { mood?: string; mediaType?: string; hasPoll?: boolean; hotTake?: boolean; followerCount?: number };
    const base = followerCount;
    const videoMult = mediaType === "video" ? 3.2 : mediaType === "photo" ? 1.8 : 1.0;
    const moodMult = mood ? 1.4 : 1.0;
    const pollMult = hasPoll ? 1.6 : 1.0;
    const hotMult = hotTake ? 2.1 : 1.0;
    const rand = (lo: number, hi: number) => Math.round(lo + Math.random() * (hi - lo));
    const likes = Math.round(base * videoMult * moodMult * pollMult * hotMult * (0.15 + Math.random() * 0.25));
    const comments = Math.round(likes * (0.08 + Math.random() * 0.12));
    const shares = Math.round(likes * (0.05 + Math.random() * 0.08));
    const reach = Math.round(likes * rand(4, 12));
    const score = Math.min(99, Math.round(50 + (videoMult - 1) * 15 + (moodMult - 1) * 12 + (pollMult - 1) * 18 + (hotMult - 1) * 22 + Math.random() * 10));
    res.json({ likes, comments, shares, reach, score });
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen OlCha ijtimoiy tarmoq uchun ijodiy caption/izoh yozuvchi AI yordamchisan. Foydalanuvchi so'ragan tilda (o'zbek, rus yoki ingliz) qisqa, jozibali, emoji ishlatgan 3 ta har xil caption yoz. Har birini JSON arrayda qaytargin.`,
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
    const { authorId, content, type, mediaUrl, mediaUrls, overlays, audioName, audioUrl, audioTrimStart, audioTrimEnd, pollQuestion, pollOptions, mood, filterName, tags } = req.body;
    const sessionUserId: number | undefined = req.session?.userId;

    const [post] = await db
      .insert(postsTable)
      .values({ authorId, content, type: type || "text", mediaUrl, mediaUrls, overlays: overlays ?? null, audioName: audioName ?? null, audioUrl: audioUrl ?? null, audioTrimStart: audioTrimStart != null ? String(audioTrimStart) : null, audioTrimEnd: audioTrimEnd != null ? String(audioTrimEnd) : null, pollQuestion: pollQuestion ?? null, pollOptions: pollOptions ?? null, mood: mood ?? null, filterName: filterName ?? null, tags, isFlagged: false })
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
router.get("/posts/trending", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(10);
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
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
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

    const [post] = await db.select({ likesCount: postsTable.likesCount }).from(postsTable).where(eq(postsTable.id, postId));
    res.json({ liked: !isLiked, likesCount: post?.likesCount ?? 0 });
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
    const comments = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    if (comments.length === 0) { res.json([]); return; }

    const authorIds = [...new Set(comments.map(c => c.authorId).filter(Boolean))] as number[];
    const authors = authorIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    res.json(comments.map(c => {
      const author = authorMap.get(c.authorId as number);
      return {
        ...c,
        author: {
          id: author?.id ?? c.authorId, username: author?.username ?? "deleted",
          displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
          isVerified: author?.isVerified ?? false,
          followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false,
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
    const { authorId, content } = req.body;

    const [comment] = await db.insert(commentsTable).values({ postId, authorId, content }).returning();
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, postId));

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId as number));
    res.status(201).json({
      ...comment,
      author: {
        id: author?.id ?? authorId, username: author?.username ?? "deleted",
        displayName: author?.displayName ?? "Deleted User", avatarUrl: author?.avatarUrl ?? null,
        isVerified: author?.isVerified ?? false,
        followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false,
      },
    });

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
