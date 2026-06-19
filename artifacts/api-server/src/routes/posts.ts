import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postLikesTable, commentsTable, commentLikesTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
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

/* ── POST /posts — instant response, AI scan in background ─── */
router.post("/posts", async (req: any, res) => {
  try {
    const { authorId, content, type, mediaUrl, tags } = req.body;
    const sessionUserId: number | undefined = req.session?.userId;

    const [post] = await db
      .insert(postsTable)
      .values({ authorId, content, type: type || "text", mediaUrl, tags, isFlagged: false })
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
