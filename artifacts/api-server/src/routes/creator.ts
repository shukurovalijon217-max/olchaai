import { Router } from "express";
import { db } from "@workspace/db";
import { creatorPlansTable, creatorSubscriptionsTable, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

async function getOrCreateWallet(userId: number) {
  const existing = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (existing) return existing;
  const [w] = await db.insert(walletsTable).values({ userId }).returning();
  return w;
}

// POST /creator/plans
router.post("/creator/plans", requireAuth, async (req: any, res) => {
  try {
    const { name, description, price, perks } = req.body as { name: string; description?: string; price: number; perks?: string[] };
    if (!name?.trim() || !price || price < 1000) {
      res.status(400).json({ error: "Nomi va minimal narx (1000 tiyin) talab qilinadi" }); return;
    }
    const [plan] = await db.insert(creatorPlansTable).values({
      creatorId: req.session.userId, name: name.trim(), description: description?.trim() ?? null,
      price, perks: perks ? JSON.stringify(perks) : null,
    }).returning();
    res.status(201).json(plan);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Reja yaratishda xato" });
  }
});

// GET /creator/plans/:creatorId
router.get("/creator/plans/:creatorId", async (req, res) => {
  try {
    const creatorId = Number(req.params.creatorId);
    const plans = await db.select().from(creatorPlansTable)
      .where(and(eq(creatorPlansTable.creatorId, creatorId), eq(creatorPlansTable.isActive, true)));
    res.json(plans.map(p => ({ ...p, perks: p.perks ? JSON.parse(p.perks) : [] })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Rejalarni olishda xato" });
  }
});

// POST /creator/subscribe/:planId
router.post("/creator/subscribe/:planId", requireAuth, async (req: any, res) => {
  try {
    const planId = Number(req.params.planId);
    const [plan] = await db.select().from(creatorPlansTable).where(eq(creatorPlansTable.id, planId));
    if (!plan || !plan.isActive) { res.status(404).json({ error: "Reja topilmadi" }); return; }
    if (plan.creatorId === req.session.userId) { res.status(400).json({ error: "O'z rejangga obuna bo'la olmaysiz" }); return; }

    // Check existing subscription
    const existing = await db.select().from(creatorSubscriptionsTable)
      .where(and(eq(creatorSubscriptionsTable.subscriberId, req.session.userId), eq(creatorSubscriptionsTable.planId, planId), eq(creatorSubscriptionsTable.status, "active")));
    if (existing.length > 0) { res.status(409).json({ error: "Allaqachon obuna bo'lgansiz" }); return; }

    const subscriberWallet = await getOrCreateWallet(req.session.userId);
    if (subscriberWallet.balance < plan.price) {
      res.status(400).json({ error: "Hamyonida mablag' yetarli emas", required: plan.price, balance: subscriberWallet.balance }); return;
    }

    const creatorWallet = await getOrCreateWallet(plan.creatorId);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // Deduct subscriber
    await db.update(walletsTable).set({ balance: subscriberWallet.balance - plan.price, updatedAt: new Date() }).where(eq(walletsTable.id, subscriberWallet.id));
    await db.insert(transactionsTable).values({
      userId: req.session.userId, walletId: subscriberWallet.id,
      type: "transfer_out", amount: plan.price, currency: "UZS", status: "completed",
      paymentMethod: "internal", description: `"${plan.name}" rejasiga obuna`,
    });

    // Credit creator
    await db.update(walletsTable).set({ earningsBalance: creatorWallet.earningsBalance + plan.price, updatedAt: new Date() }).where(eq(walletsTable.id, creatorWallet.id));
    await db.insert(transactionsTable).values({
      userId: plan.creatorId, walletId: creatorWallet.id,
      type: "content_revenue", amount: plan.price, currency: "UZS", status: "completed",
      paymentMethod: "internal", description: `"${plan.name}" rejasiga yangi obunachi`,
    });

    // Create subscription
    const [sub] = await db.insert(creatorSubscriptionsTable).values({
      subscriberId: req.session.userId, creatorId: plan.creatorId, planId,
      expiresAt: nextMonth, nextPaymentAt: nextMonth,
    }).returning();

    // Update subscriber count
    await db.update(creatorPlansTable).set({ subscriberCount: sql`${creatorPlansTable.subscriberCount} + 1` }).where(eq(creatorPlansTable.id, planId));

    res.status(201).json({ subscription: sub, newBalance: subscriberWallet.balance - plan.price });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obuna bo'lishda xato" });
  }
});

// DELETE /creator/subscribe/:planId
router.delete("/creator/subscribe/:planId", requireAuth, async (req: any, res) => {
  try {
    const planId = Number(req.params.planId);
    await db.update(creatorSubscriptionsTable)
      .set({ status: "cancelled" })
      .where(and(eq(creatorSubscriptionsTable.subscriberId, req.session.userId), eq(creatorSubscriptionsTable.planId, planId)));
    await db.update(creatorPlansTable).set({ subscriberCount: sql`GREATEST(${creatorPlansTable.subscriberCount} - 1, 0)` }).where(eq(creatorPlansTable.id, planId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obunani bekor qilishda xato" });
  }
});

// GET /creator/subscriptions  (my active subscriptions as subscriber)
router.get("/creator/subscriptions", requireAuth, async (req: any, res) => {
  try {
    const subs = await db.select().from(creatorSubscriptionsTable)
      .where(and(eq(creatorSubscriptionsTable.subscriberId, req.session.userId), eq(creatorSubscriptionsTable.status, "active")));
    const enriched = await Promise.all(subs.map(async s => {
      const [plan] = await db.select().from(creatorPlansTable).where(eq(creatorPlansTable.id, s.planId));
      const [creator] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, s.creatorId));
      return { ...s, plan: { ...plan, perks: plan?.perks ? JSON.parse(plan.perks) : [] }, creator };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obunalarni olishda xato" });
  }
});

// GET /creator/subscribers  (my subscribers as creator)
router.get("/creator/subscribers", requireAuth, async (req: any, res) => {
  try {
    const subs = await db.select().from(creatorSubscriptionsTable)
      .where(and(eq(creatorSubscriptionsTable.creatorId, req.session.userId), eq(creatorSubscriptionsTable.status, "active")));
    const enriched = await Promise.all(subs.map(async s => {
      const [subscriber] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, s.subscriberId));
      const [plan] = await db.select({ id: creatorPlansTable.id, name: creatorPlansTable.name, price: creatorPlansTable.price }).from(creatorPlansTable).where(eq(creatorPlansTable.id, s.planId));
      return { ...s, subscriber, plan };
    }));
    res.json({ subscribers: enriched, count: enriched.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obunachillarni olishda xato" });
  }
});

// GET /creator/check-subscription/:creatorId  — check if I'm subscribed
router.get("/creator/check-subscription/:creatorId", requireAuth, async (req: any, res) => {
  try {
    const creatorId = Number(req.params.creatorId);
    const active = await db.select().from(creatorSubscriptionsTable)
      .where(and(eq(creatorSubscriptionsTable.subscriberId, req.session.userId), eq(creatorSubscriptionsTable.creatorId, creatorId), eq(creatorSubscriptionsTable.status, "active")));
    res.json({ isSubscribed: active.length > 0, subscription: active[0] ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Obuna holatini tekshirishda xato" });
  }
});

export default router;
