import { Router } from "express";
import { db } from "@workspace/db";
import { scenariosTable, scenarioBranchesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.get("/scenarios", async (req: any, res) => {
  try {
    const rows = await db.select().from(scenariosTable)
      .where(eq(scenariosTable.isPublished, true))
      .orderBy(desc(scenariosTable.createdAt))
      .limit(30);
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/scenarios/mine", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.select().from(scenariosTable)
      .where(eq(scenariosTable.creatorId, req.session.userId))
      .orderBy(desc(scenariosTable.createdAt));
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/scenarios", requireAuth, async (req: any, res) => {
  try {
    const { title, description, thumbnail } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Sarlavha majburiy" }); return; }
    const [sc] = await db.insert(scenariosTable)
      .values({ creatorId: req.session.userId, title: title.trim(), description, thumbnail })
      .returning();
    res.json(sc);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/scenarios/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [sc] = await db.select().from(scenariosTable).where(eq(scenariosTable.id, id));
    if (!sc) { res.status(404).json({ error: "Topilmadi" }); return; }
    const branches = await db.select().from(scenarioBranchesTable)
      .where(eq(scenarioBranchesTable.scenarioId, id))
      .orderBy(scenarioBranchesTable.orderIndex);
    // increment view
    await db.update(scenariosTable).set({ viewCount: sc.viewCount + 1 }).where(eq(scenariosTable.id, id));
    res.json({ ...sc, branches });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/scenarios/:id/branches", requireAuth, async (req: any, res) => {
  try {
    const scenarioId = parseInt(req.params.id);
    const [sc] = await db.select().from(scenariosTable).where(eq(scenariosTable.id, scenarioId));
    if (!sc || sc.creatorId !== req.session.userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    const { parentId, videoUrl, choiceText, choiceEmoji, isRoot, orderIndex } = req.body;
    const [branch] = await db.insert(scenarioBranchesTable)
      .values({ scenarioId, parentId, videoUrl, choiceText, choiceEmoji: choiceEmoji ?? "👉", isRoot: isRoot ?? false, orderIndex: orderIndex ?? 0 })
      .returning();
    res.json(branch);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.patch("/scenarios/:id/publish", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [sc] = await db.select().from(scenariosTable).where(eq(scenariosTable.id, id));
    if (!sc || sc.creatorId !== req.session.userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
    const [updated] = await db.update(scenariosTable).set({ isPublished: true }).where(eq(scenariosTable.id, id)).returning();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
