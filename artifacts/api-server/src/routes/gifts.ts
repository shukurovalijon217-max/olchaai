import { Router } from "express";
import { db } from "@workspace/db";
import { liveGiftsTable, walletsTable, transactionsTable, liveStreamsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

const GIFT_CATALOG: Record<string, { emoji: string; value: number; label: string }> = {
  rose:    { emoji: "🌹", value: 500,   label: "Atirgul"  },
  star:    { emoji: "⭐", value: 1000,  label: "Yulduz"   },
  fire:    { emoji: "🔥", value: 2500,  label: "Alanga"   },
  crown:   { emoji: "👑", value: 10000, label: "Toj"      },
  diamond: { emoji: "💎", value: 25000, label: "Olmos"    },
  rocket:  { emoji: "🚀", value: 50000, label: "Raketa"   },
};

async function getOrCreateWallet(userId: number) {
  const existing = await db.query.walletsTable.findFirst({ where: eq(walletsTable.userId, userId) });
  if (existing) return existing;
  const [w] = await db.insert(walletsTable).values({ userId }).returning();
  return w;
}

// GET /gifts/catalog
router.get("/gifts/catalog", (_req, res) => {
  const catalog = Object.entries(GIFT_CATALOG).map(([type, g]) => ({ type, ...g }));
  res.json(catalog);
});

// POST /live/:id/gift
router.post("/live/:id/gift", requireAuth, async (req: any, res) => {
  try {
    const liveId = Number(req.params.id);
    const { giftType } = req.body as { giftType: string };

    const gift = GIFT_CATALOG[giftType];
    if (!gift) { res.status(400).json({ error: "Noma'lum sovg'a turi" }); return; }

    const [stream] = await db.select().from(liveStreamsTable).where(eq(liveStreamsTable.id, liveId));
    if (!stream || stream.status !== "active") { res.status(404).json({ error: "Efir topilmadi" }); return; }
    if (stream.hostId === req.session.userId) { res.status(400).json({ error: "O'z efiringa sovg'a yubora olmaysiz" }); return; }

    const senderWallet = await getOrCreateWallet(req.session.userId);
    if (senderWallet.balance < gift.value) {
      res.status(400).json({ error: "Hamyonida mablag' yetarli emas", required: gift.value, balance: senderWallet.balance });
      return;
    }

    const receiverWallet = await getOrCreateWallet(stream.hostId);

    // Deduct from sender
    await db.update(walletsTable).set({ balance: senderWallet.balance - gift.value, updatedAt: new Date() }).where(eq(walletsTable.id, senderWallet.id));
    await db.insert(transactionsTable).values({
      userId: req.session.userId, walletId: senderWallet.id,
      type: "transfer_out", amount: gift.value, currency: "UZS",
      status: "completed", paymentMethod: "internal",
      description: `${gift.emoji} ${gift.label} sovg'asi yuborildi`,
    });

    // Credit to receiver earnings
    await db.update(walletsTable).set({ earningsBalance: receiverWallet.earningsBalance + gift.value, updatedAt: new Date() }).where(eq(walletsTable.id, receiverWallet.id));
    await db.insert(transactionsTable).values({
      userId: stream.hostId, walletId: receiverWallet.id,
      type: "content_revenue", amount: gift.value, currency: "UZS",
      status: "completed", paymentMethod: "internal",
      description: `${gift.emoji} ${gift.label} sovg'asi olindi`,
    });

    // Create gift record
    const [liveGift] = await db.insert(liveGiftsTable).values({
      liveStreamId: liveId, senderId: req.session.userId, receiverId: stream.hostId,
      giftType, giftEmoji: gift.emoji, coinValue: gift.value,
    }).returning();

    const [sender] = await db.select({ displayName: usersTable.displayName, username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.session.userId));

    // Broadcast via Go WS
    try {
      await fetch(`http://localhost:8099/go/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 0,
          event: "live_gift",
          payload: {
            roomId: String(liveId),
            giftType, giftEmoji: gift.emoji, coinValue: gift.value,
            senderName: sender?.displayName ?? sender?.username ?? "Foydalanuvchi",
            senderId: req.session.userId,
          },
        }),
      });
    } catch {}

    res.json({ ok: true, gift: liveGift, newBalance: senderWallet.balance - gift.value });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sovg'a yuborishda xato" });
  }
});

// GET /live/:id/gifts
router.get("/live/:id/gifts", async (req, res) => {
  try {
    const liveId = Number(req.params.id);
    const gifts = await db.select().from(liveGiftsTable).where(eq(liveGiftsTable.liveStreamId, liveId));
    // Aggregate by sender
    const bySender = new Map<number, { senderId: number; total: number; count: number; gifts: typeof gifts }>();
    for (const g of gifts) {
      const prev = bySender.get(g.senderId) ?? { senderId: g.senderId, total: 0, count: 0, gifts: [] };
      bySender.set(g.senderId, { ...prev, total: prev.total + g.coinValue, count: prev.count + 1, gifts: [...prev.gifts, g] });
    }
    const leaderboard = [...bySender.values()].sort((a, b) => b.total - a.total);
    res.json({ gifts, leaderboard, totalValue: gifts.reduce((s, g) => s + g.coinValue, 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Sovg'alar ro'yxatini olishda xato" });
  }
});

export { GIFT_CATALOG };
export default router;
