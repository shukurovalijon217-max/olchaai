import { Router } from "express";
import { db } from "@workspace/db";
import { userCoinsTable, dailyQuestsTable, questProgressTable, userTitlesTable, userStreaksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateCoins(userId: number) {
  const existing = await db.query.userCoinsTable.findFirst({ where: eq(userCoinsTable.userId, userId) });
  if (existing) return existing;
  const [created] = await db.insert(userCoinsTable).values({ userId }).returning();
  return created;
}

async function checkAndGrantTitle(userId: number, totalEarned: number) {
  const TITLE_THRESHOLDS = [
    { min: 0, title: "🌱 Yangi" },
    { min: 50, title: "⭐ Faol" },
    { min: 200, title: "🔥 Qizg'in" },
    { min: 500, title: "💎 Olmosli" },
    { min: 1000, title: "👑 Afsonaviy" },
  ];
  const earned = TITLE_THRESHOLDS.filter(t => totalEarned >= t.min);
  const newTitle = earned[earned.length - 1]?.title;
  if (!newTitle) return;
  const existing = await db.select().from(userTitlesTable).where(
    and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.title, newTitle))
  );
  if (existing.length === 0) {
    await db.insert(userTitlesTable).values({ userId, title: newTitle });
  }
}

router.get("/gamification/balance", requireAuth, async (req: any, res) => {
  try {
    const coins = await getOrCreateCoins(req.session.userId);
    const titles = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, req.session.userId));
    res.json({ ...coins, titles });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gamification/quests", requireAuth, async (req: any, res) => {
  try {
    const today = todayDate();
    const quests = await db.select().from(dailyQuestsTable).where(eq(dailyQuestsTable.isActive, true));
    const progress = await db.select().from(questProgressTable)
      .where(and(eq(questProgressTable.userId, req.session.userId), eq(questProgressTable.date, today)));
    const progressMap = new Map(progress.map(p => [p.questKey, p]));
    const enriched = quests.sort((a, b) => a.sortOrder - b.sortOrder).map(q => ({
      ...q,
      progress: progressMap.get(q.key)?.progress ?? 0,
      completedAt: progressMap.get(q.key)?.completedAt ?? null,
      claimedAt: progressMap.get(q.key)?.claimedAt ?? null,
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gamification/quests/:key/progress", requireAuth, async (req: any, res) => {
  try {
    const { key } = req.params;
    const today = todayDate();
    const quest = await db.query.dailyQuestsTable.findFirst({ where: eq(dailyQuestsTable.key, key) });
    if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }
    const existing = await db.query.questProgressTable.findFirst({
      where: and(eq(questProgressTable.userId, req.session.userId), eq(questProgressTable.questKey, key), eq(questProgressTable.date, today))
    });
    if (existing?.completedAt) { res.json({ ...existing, quest }); return; }
    const newProgress = Math.min((existing?.progress ?? 0) + 1, quest.target);
    const completedAt = newProgress >= quest.target ? new Date() : null;
    if (existing) {
      const [updated] = await db.update(questProgressTable)
        .set({ progress: newProgress, completedAt })
        .where(eq(questProgressTable.id, existing.id)).returning();
      res.json({ ...updated, quest });
    } else {
      const [created] = await db.insert(questProgressTable)
        .values({ userId: req.session.userId, questKey: key, progress: newProgress, completedAt, date: today }).returning();
      res.json({ ...created, quest });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gamification/quests/:key/claim", requireAuth, async (req: any, res) => {
  try {
    const { key } = req.params;
    const today = todayDate();
    const quest = await db.query.dailyQuestsTable.findFirst({ where: eq(dailyQuestsTable.key, key) });
    if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }
    const progress = await db.query.questProgressTable.findFirst({
      where: and(eq(questProgressTable.userId, req.session.userId), eq(questProgressTable.questKey, key), eq(questProgressTable.date, today))
    });
    if (!progress?.completedAt) { res.status(400).json({ error: "Quest not completed" }); return; }
    if (progress.claimedAt) { res.status(400).json({ error: "Already claimed" }); return; }
    await db.update(questProgressTable).set({ claimedAt: new Date() }).where(eq(questProgressTable.id, progress.id));
    const coins = await getOrCreateCoins(req.session.userId);
    const newBalance = coins.balance + quest.reward;
    const newTotal = coins.totalEarned + quest.reward;
    const [updated] = await db.update(userCoinsTable)
      .set({ balance: newBalance, totalEarned: newTotal, updatedAt: new Date() })
      .where(eq(userCoinsTable.userId, req.session.userId)).returning();
    await checkAndGrantTitle(req.session.userId, newTotal);
    res.json({ coins: updated, reward: quest.reward });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function getOrCreateStreak(userId: number) {
  const existing = await db.query.userStreaksTable.findFirst({ where: eq(userStreaksTable.userId, userId) });
  if (existing) return existing;
  const [created] = await db.insert(userStreaksTable).values({ userId }).returning();
  return created;
}

router.get("/gamification/streak", requireAuth, async (req: any, res) => {
  try {
    const streak = await getOrCreateStreak(req.session.userId);
    res.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      xp: streak.xp,
      lastActiveDate: streak.lastActiveDate,
      touchedToday: streak.lastActiveDate === todayDate(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gamification/streak/touch", requireAuth, async (req: any, res) => {
  try {
    const today = todayDate();
    const streak = await getOrCreateStreak(req.session.userId);

    if (streak.lastActiveDate === today) {
      res.json({
        currentStreak: streak.currentStreak, longestStreak: streak.longestStreak,
        xp: streak.xp, lastActiveDate: streak.lastActiveDate, touchedToday: true,
      });
      return;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const isConsecutive = streak.lastActiveDate === yesterday;
    const newCurrent = isConsecutive ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(streak.longestStreak, newCurrent);
    const xpGain = 10 + Math.min(40, newCurrent * 2);

    const [updated] = await db.update(userStreaksTable)
      .set({ currentStreak: newCurrent, longestStreak: newLongest, lastActiveDate: today, xp: streak.xp + xpGain, updatedAt: new Date() })
      .where(eq(userStreaksTable.userId, req.session.userId))
      .returning();

    res.json({
      currentStreak: updated.currentStreak, longestStreak: updated.longestStreak,
      xp: updated.xp, lastActiveDate: updated.lastActiveDate, touchedToday: true,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
