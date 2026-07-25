import { Router } from "express";
import { db } from "@workspace/db";
import {
  challengesTable, challengeParticipantsTable, usersTable,
  walletsTable, transactionsTable, reelsTable,
} from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

async function enrichChallenges(rows: (typeof challengesTable.$inferSelect)[], viewerId?: number) {
  if (rows.length === 0) return [];
  const creatorIds = [...new Set(rows.map(r => r.creatorId))];
  const challengeIds = rows.map(r => r.id);

  const [creators, counts, joined] = await Promise.all([
    db.select().from(usersTable).where(sql`${usersTable.id} IN ${creatorIds}`),
    db.select({ challengeId: challengeParticipantsTable.challengeId, n: count() })
      .from(challengeParticipantsTable)
      .where(sql`${challengeParticipantsTable.challengeId} IN ${challengeIds}`)
      .groupBy(challengeParticipantsTable.challengeId),
    viewerId
      ? db.select({ challengeId: challengeParticipantsTable.challengeId })
          .from(challengeParticipantsTable)
          .where(and(sql`${challengeParticipantsTable.challengeId} IN ${challengeIds}`, eq(challengeParticipantsTable.userId, viewerId)))
      : Promise.resolve([]),
  ]);

  const creatorMap = new Map(creators.map(c => [c.id, c]));
  const countMap = new Map(counts.map(c => [c.challengeId, Number(c.n)]));
  const joinedSet = new Set((joined as { challengeId: number }[]).map(j => j.challengeId));

  return rows.map(r => {
    const creator = creatorMap.get(r.creatorId);
    return {
      ...r,
      creator: creator ? {
        id: creator.id, username: creator.username, displayName: creator.displayName,
        avatarUrl: creator.avatarUrl, isVerified: creator.isVerified,
      } : null,
      participantsCount: countMap.get(r.id) ?? 0,
      isJoined: joinedSet.has(r.id),
    };
  });
}

/* ── GET /challenges ─────────────────────────────────────────── */
router.get("/challenges", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const creatorId = req.query.creatorId ? Number(req.query.creatorId) : null;

    const rows = await (creatorId
      ? db.select().from(challengesTable).where(eq(challengesTable.creatorId, creatorId)).orderBy(desc(challengesTable.createdAt))
      : db.select().from(challengesTable).where(eq(challengesTable.status, "active")).orderBy(desc(challengesTable.createdAt)));

    res.json(await enrichChallenges(rows, viewerId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /challenges/:id ─────────────────────────────────────── */
router.get("/challenges/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = (req.session as any)?.userId as number | undefined;
    const [row] = await db.select().from(challengesTable).where(eq(challengesTable.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const [enriched] = await enrichChallenges([row], viewerId);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /challenges — creator funds the prize pool from their wallet ── */
router.post("/challenges", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as number;
    const { name, hashtag, category, description, days, prizePool, judgeType, settings } = req.body as {
      name: string; hashtag: string; category: string; description?: string;
      days?: number; prizePool?: number; judgeType?: string; settings?: Record<string, unknown>;
    };

    if (!name?.trim() || !hashtag?.trim() || !category?.trim()) {
      res.status(400).json({ error: "name, hashtag, category talab qilinadi" });
      return;
    }

    const pool = Math.max(0, Number(prizePool) || 0);

    if (pool > 0) {
      const wallet = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
      if (!wallet || wallet.balance < pool) {
        res.status(400).json({ error: "Mukofot puli uchun hamyonda mablag' yetarli emas", balance: wallet?.balance ?? 0, required: pool });
        return;
      }
      await db.update(walletsTable)
        .set({ balance: wallet.balance - pool, updatedAt: new Date() })
        .where(eq(walletsTable.id, wallet.id));
      await db.insert(transactionsTable).values({
        userId, walletId: wallet.id, type: "transfer_out", amount: pool,
        currency: "UZS", status: "completed", paymentMethod: "internal",
        description: `🏆 Challenge mukofot puli: ${name}`,
      });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + Math.max(1, Number(days) || 7) * 24 * 60 * 60 * 1000);

    const [challenge] = await db.insert(challengesTable).values({
      creatorId: userId, name, hashtag: hashtag.replace(/^#/, ""), category,
      description: description ?? null, days: Math.max(1, Number(days) || 7),
      prizePool: pool, judgeType: judgeType ?? "vote", settings: settings ?? {},
      startsAt, endsAt,
    }).returning();

    const [enriched] = await enrichChallenges([challenge], userId);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /challenges/:id/join ───────────────────────────────── */
router.post("/challenges/:id/join", requireAuth, async (req: any, res) => {
  try {
    const challengeId = Number(req.params.id);
    const userId = req.session.userId as number;
    const { reelId } = req.body as { reelId?: number };

    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId));
    if (!challenge) { res.status(404).json({ error: "Challenge topilmadi" }); return; }
    if (challenge.status !== "active") { res.status(400).json({ error: "Challenge tugagan" }); return; }

    if (reelId) {
      const [reel] = await db.select({ authorId: reelsTable.authorId }).from(reelsTable).where(eq(reelsTable.id, reelId));
      if (!reel || reel.authorId !== userId) { res.status(403).json({ error: "Bu video sizga tegishli emas" }); return; }
    }

    await db.insert(challengeParticipantsTable)
      .values({ challengeId, userId, reelId: reelId ?? null })
      .onConflictDoUpdate({
        target: [challengeParticipantsTable.challengeId, challengeParticipantsTable.userId],
        set: { reelId: reelId ?? null },
      });

    const [enriched] = await enrichChallenges([challenge], userId);
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
