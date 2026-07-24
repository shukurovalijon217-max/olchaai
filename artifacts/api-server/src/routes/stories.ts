import { Router } from "express";
import { db, readDb } from "@workspace/db";
import { storiesTable, storyViewsTable, usersTable, moderationQueueTable } from "@workspace/db";
import { eq, sql, gt, and, inArray } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter";
import { getUserStats, getUserStatsMap } from "../lib/userStats";
import { cacheAside, cacheDelPattern } from "../lib/cache";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const enriched = await cacheAside("stories", `list:${viewerId ?? 0}`, async () => {
      const now = new Date();
      const stories = await readDb.select().from(storiesTable).where(gt(storiesTable.expiresAt, now));
      const authorIds = [...new Set(stories.map(s => s.authorId))];
      const statsMap = await getUserStatsMap(authorIds, viewerId);
      const authors = authorIds.length > 0 ? await readDb.select().from(usersTable).where(inArray(usersTable.id, authorIds)) : [];
      const authorMap = new Map(authors.map(a => [a.id, a]));
      return stories.map((s) => {
        const author = authorMap.get(s.authorId);
        const stats = statsMap.get(s.authorId) || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
        return { ...s, author: { ...(author || {}), ...stats }, isViewed: false };
      });
    }, 30);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories", async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption, type, backgroundColor, content } = req.body;
    const authorId = (req.session as any)?.userId as number | undefined;
    if (!authorId) { res.status(401).json({ error: "Login kerak" }); return; }

    const storyType = type || (mediaUrl ? (mediaType || "photo") : "text");
    const storyCaption = caption || content || null;

    // AI scan caption before saving
    const scan = await scanContentAsync(storyCaption ?? "");
    if (scan.autoBlock) {
      res.status(422).json({
        error: "Story avtomatik bloklandi — qoidalarga zid material aniqlandi.",
        categories: scan.categories,
      }); return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(storiesTable).values({
      authorId,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || storyType,
      type: storyType,
      backgroundColor: backgroundColor || null,
      caption: storyCaption,
      expiresAt,
    }).returning();

    if (scan.verdict !== "clean") {
      await db.insert(moderationQueueTable).values({
        contentType: "story", contentId: story.id, contentText: caption ?? "",
        authorId: authorId ?? null,
        aiScore: scan.score, aiCategories: scan.categories,
        aiVerdict: scan.verdict, autoFlagged: true, autoBlocked: false,
        status: "pending",
      }).catch(() => {});
    }

    cacheDelPattern("stories:list:");
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, story.authorId));
    const stats = await getUserStats(story.authorId, authorId);
    res.status(201).json({ ...story, author: { ...(author || {}), ...stats }, isViewed: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stories/:id", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Login kerak" }); return; }

    const [story] = await db.select({ id: storiesTable.id, authorId: storiesTable.authorId })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story) { res.status(404).json({ error: "Story topilmadi" }); return; }
    if (story.authorId !== userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
    cacheDelPattern("stories:list:");
    res.json({ deleted: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories/:id/view", async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const userId  = (req.session as any)?.userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    /* Dedup: insert only if not already viewed by this user */
    const existing = await db.select({ id: storyViewsTable.id })
      .from(storyViewsTable)
      .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.userId, userId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(storyViewsTable).values({ storyId, userId });
      await db.update(storiesTable)
        .set({ viewsCount: sql`${storiesTable.viewsCount} + 1` })
        .where(eq(storiesTable.id, storyId));
    }
    const [story] = await db.select({ viewsCount: storiesTable.viewsCount })
      .from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    res.json({ viewed: true, viewsCount: story?.viewsCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
