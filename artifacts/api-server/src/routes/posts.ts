import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postLikesTable, commentsTable, usersTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, viewerId = 0) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  const liked = viewerId ? await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, viewerId))) : [];
  return {
    ...post,
    author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false, isVerified: author?.isVerified || false },
    tags: post.tags || [],
    isLiked: liked.length > 0,
  };
}

router.get("/posts", async (req, res) => {
  try {
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

    const enriched = await Promise.all(posts.map(p => enrichPost(p)));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { authorId, content, type, mediaUrl, tags } = req.body;
    const [post] = await db.insert(postsTable).values({ authorId, content, type: type || "text", mediaUrl, tags }).returning();
    res.status(201).json(await enrichPost(post));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/trending", async (req, res) => {
  try {
    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(10);
    const enriched = await Promise.all(posts.map(p => enrichPost(p)));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(await enrichPost(post));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:id/like", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = 1;
    const existing = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
    if (existing.length > 0) {
      await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
      await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} - 1` }).where(eq(postsTable.id, postId));
    } else {
      await db.insert(postLikesTable).values({ postId, userId });
      await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
    }
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    res.json({ liked: existing.length === 0, likesCount: post?.likesCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(desc(commentsTable.createdAt));
    const enriched = await Promise.all(comments.map(async (c) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, c.authorId));
      return { ...c, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:id/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { authorId, content } = req.body;
    const [comment] = await db.insert(commentsTable).values({ postId, authorId, content }).returning();
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, postId));
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId));
    res.status(201).json({ ...comment, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
