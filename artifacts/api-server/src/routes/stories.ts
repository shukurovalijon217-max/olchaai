import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, gt, and, inArray } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";
import { getUserStats, getUserStatsMap } from "../lib/userStats";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const now = new Date();
    const viewerId = (req.session as any)?.userId as number | undefined;
    const stories = await db.select().from(storiesTable).where(gt(storiesTable.expiresAt, now));
    const authorIds = [...new Set(stories.map(s => s.authorId))];
    const statsMap = await getUserStatsMap(authorIds, viewerId);
    const authors = authorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const enriched = stories.map((s) => {
      const author = authorMap.get(s.authorId);
      const stats = statsMap.get(s.authorId) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
      return { ...s, author: { ...(author || {}), ...stats }, isViewed: false };
    });
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
    const stats = await getUserStats(story.authorId, authorId);
    res.status(201).json({ ...story, author: { ...(author || {}), ...stats }, isViewed: false });
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
