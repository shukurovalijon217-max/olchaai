import { Router } from "express";
import { db } from "@workspace/db";
import { anonZonesTable, anonPostsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.get("/anon/zones", requireAuth, async (req: any, res) => {
  try {
    const zones = await db.select().from(anonZonesTable)
      .where(eq(anonZonesTable.isActive, true))
      .orderBy(desc(anonZonesTable.postCount));
    res.json(zones);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/anon/zones/:id/posts", requireAuth, async (req: any, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (isNaN(zoneId)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
    const posts = await db.select().from(anonPostsTable)
      .where(eq(anonPostsTable.zoneId, zoneId))
      .orderBy(desc(anonPostsTable.createdAt))
      .limit(50);
    res.json(posts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/anon/zones/:id/posts", requireAuth, async (req: any, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (isNaN(zoneId)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
    const { content } = req.body;
    if (!content?.trim() || content.trim().length > 500) {
      res.status(400).json({ error: "Kontent 1-500 belgi bo'lishi kerak" }); return;
    }
    const zone = await db.query.anonZonesTable.findFirst({ where: eq(anonZonesTable.id, zoneId) });
    if (!zone) { res.status(404).json({ error: "Zona topilmadi" }); return; }
    const [post] = await db.insert(anonPostsTable).values({ zoneId, content: content.trim() }).returning();
    await db.update(anonZonesTable).set({ postCount: zone.postCount + 1 }).where(eq(anonZonesTable.id, zoneId));
    res.status(201).json(post);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/anon/zones/:id/posts/:postId/like", requireAuth, async (req: any, res) => {
  try {
    const postId = Number(req.params.postId);
    if (isNaN(postId)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
    const [post] = await db.select().from(anonPostsTable).where(eq(anonPostsTable.id, postId));
    if (!post) { res.status(404).json({ error: "Post topilmadi" }); return; }
    const [updated] = await db.update(anonPostsTable)
      .set({ likes: post.likes + 1 }).where(eq(anonPostsTable.id, postId)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
