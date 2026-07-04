import { Router } from "express";
import { db } from "@workspace/db";
import { userMoodsTable, usersTable, followsTable } from "@workspace/db";
import { eq, desc, gt, and, inArray } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.post("/mood", requireAuth, async (req: any, res) => {
  try {
    const { mood, energyLevel, note, isPublic, expiresInHours } = req.body;
    if (!mood) { res.status(400).json({ error: "Kayfiyat majburiy" }); return; }
    const hours = Math.min(Math.max(Number(expiresInHours) || 8, 1), 48);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const [row] = await db.insert(userMoodsTable)
      .values({ userId: req.session.userId, mood, energyLevel: energyLevel ?? 5, note, isPublic: isPublic ?? true, expiresAt })
      .returning();
    res.json(row);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

// energy_broadcast: followees' current public energy levels (still active)
router.get("/mood/following/energy", requireAuth, async (req: any, res) => {
  try {
    const follows = await db.select({ id: followsTable.followingId }).from(followsTable)
      .where(eq(followsTable.followerId, req.session.userId));
    const followeeIds = follows.map(f => f.id);
    if (followeeIds.length === 0) { res.json([]); return; }

    const rows = await db
      .select({
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatar: usersTable.avatarUrl,
        mood: userMoodsTable.mood,
        energyLevel: userMoodsTable.energyLevel,
        createdAt: userMoodsTable.createdAt,
      })
      .from(userMoodsTable)
      .innerJoin(usersTable, eq(userMoodsTable.userId, usersTable.id))
      .where(and(
        inArray(userMoodsTable.userId, followeeIds),
        eq(userMoodsTable.isPublic, true),
        gt(userMoodsTable.expiresAt, new Date()),
      ))
      .orderBy(desc(userMoodsTable.createdAt));

    // Keep only the most recent entry per user
    const seen = new Set<number>();
    const latest = rows.filter(r => {
      if (seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });
    res.json(latest);
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
