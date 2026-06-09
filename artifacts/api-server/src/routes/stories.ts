import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, gt, and } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const now = new Date();
    const stories = await db.select().from(storiesTable).where(gt(storiesTable.expiresAt, now));
    const enriched = await Promise.all(stories.map(async (s) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
      return { ...s, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }, isViewed: false };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories", async (req, res) => {
  try {
    const { authorId, mediaUrl, mediaType, caption } = req.body;

    // AI scan caption before saving
    const scan = await scanContentAsync(caption ?? "");
    if (scan.autoBlock) {
      res.status(422).json({
        error: "Story avtomatik bloklandi — qoidalarga zid material aniqlandi.",
        categories: scan.categories,
      }); return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(storiesTable).values({ authorId, mediaUrl, mediaType: mediaType || "photo", caption, expiresAt }).returning();

    if (scan.verdict !== "clean") {
      await db.insert(moderationQueueTable).values({
        contentType: "story", contentId: story.id, contentText: caption ?? "",
        authorId: authorId ?? null,
        aiScore: scan.score, aiCategories: scan.categories,
        aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: false,
        status: "pending",
      }).catch(() => {});
    }

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, story.authorId));
    res.status(201).json({ ...story, author: { ...(author || {}), followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }, isViewed: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories/:id/view", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId = 1;
    const existing = await db.select().from(storyViewsTable).where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.userId, userId)));
    if (existing.length === 0) {
      await db.insert(storyViewsTable).values({ storyId, userId });
      await db.update(storiesTable).set({ viewsCount: sql`${storiesTable.viewsCount} + 1` }).where(eq(storiesTable.id, storyId));
    }
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
    res.json({ viewed: true, viewsCount: story?.viewsCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
