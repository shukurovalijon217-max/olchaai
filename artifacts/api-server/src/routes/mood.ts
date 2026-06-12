import { Router } from "express";
import { db } from "@workspace/db";
import { userMoodsTable, usersTable } from "@workspace/db";
import { eq, desc, gt, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.post("/mood", requireAuth, async (req: any, res) => {
  try {
    const { mood, energyLevel, note, isPublic } = req.body;
    if (!mood) { res.status(400).json({ error: "Kayfiyat majburiy" }); return; }
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const [row] = await db.insert(userMoodsTable)
      .values({ userId: req.session.userId, mood, energyLevel: energyLevel ?? 5, note, isPublic: isPublic ?? true, expiresAt })
      .returning();
    res.json(row);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/mood/my", requireAuth, async (req: any, res) => {
  try {
    const [latest] = await db.select().from(userMoodsTable)
      .where(and(eq(userMoodsTable.userId, req.session.userId), gt(userMoodsTable.expiresAt, new Date())))
      .orderBy(desc(userMoodsTable.createdAt))
      .limit(1);
    res.json(latest ?? null);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/mood/map", async (req: any, res) => {
  try {
    const since = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const rows = await db
      .select({
        id: userMoodsTable.id,
        mood: userMoodsTable.mood,
        energyLevel: userMoodsTable.energyLevel,
        note: userMoodsTable.note,
        createdAt: userMoodsTable.createdAt,
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatar: usersTable.avatarUrl,
      })
      .from(userMoodsTable)
      .innerJoin(usersTable, eq(userMoodsTable.userId, usersTable.id))
      .where(and(eq(userMoodsTable.isPublic, true), gt(userMoodsTable.createdAt, since)))
      .orderBy(desc(userMoodsTable.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
