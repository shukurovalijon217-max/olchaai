import { Router } from "express";
import { db } from "@workspace/db";
import {
  walletsTable, transactionsTable, paymentMethodsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { applyCommission, getCommissionRate } from "../lib/commission";
import { USD_TO_MAJOR, tiyinToUSD } from "../lib/currency";
import { stripeService } from "../stripe/stripeService";
import { storage } from "../stripe/storage";
import { getUncachableStripeClient } from "../stripe/stripeClient";

const REAL_PAYMENT_METHODS = new Set(["visa", "mastercard", "global"]);

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" }); return;
  }
  next();
};

async function getOrCreateWallet(userId: number) {
  const existing = await db.query.walletsTable.findFirst({
    where: eq(walletsTable.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db.insert(walletsTable).values({ userId }).returning();
  return created;
}

// GET /api/wallet
router.get("/wallet", requireAuth, async (req: any, res) => {
  try {
    const wallet = await getOrCreateWallet(req.session.userId);
    const commissionRate = await getCommissionRate();
    // Include key exchange rates so frontend can show dual-currency display
    const rates = {
      USD: USD_TO_MAJOR.USD,   // 1 UZS per 1 USD → use 1/(UZS rate)
      uzsPerUsd: USD_TO_MAJOR.UZS,  // 12800
      uzsPerEur: USD_TO_MAJOR.UZS / USD_TO_MAJOR.EUR,
    };
    res.json({ wallet, commissionRate, rates });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Hamyon ma'lumotlarini olishda xato" });
  }
});

// GET /api/wallet/transactions
router.get("/wallet/transactions", requireAuth, async (req: any, res) => {
  try {
    const wallet = await getOrCreateWallet(req.session.userId);
    const txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.walletId, wallet.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(50);
    res.json({ transactions: txs });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tranzaksiyalarni olishda xato" });
  }
});

// POST /api/wallet/deposit
const depositSchema = z.object({
  amount: z.number().int().min(100).max(100_000_000_00),
  paymentMethod: z.enum(["visa", "mastercard", "click", "payme", "global"]),
  description: z.string().optional(),
});

// POST /api/wallet/deposit — creates a real Stripe Checkout session; wallet is
// only credited after payment is confirmed via /wallet/deposit/confirm.
router.post("/wallet/deposit", requireAuth, async (req: any, res) => {
  try {
    const parsed = depositSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.issues }); return;
    }
    const { amount, paymentMethod, description } = parsed.data;
    if (!REAL_PAYMENT_METHODS.has(paymentMethod)) {
      res.status(400).json({ error: "Bu to'lov usuli hali ulanmagan (Tez orada)" }); return;
    }

    const wallet = await getOrCreateWallet(req.session.userId);
    const user = await storage.getUser(req.session.userId);
    if (!user) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }

    let customerId = (user as any).stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, String(user.id));
      await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] ?? req.get('host');
    const baseUrl = `https://${domain}`;
    const usdCents = Math.max(50, Math.round(tiyinToUSD(amount) * 100));

    const session = await stripeService.createCheckoutSession(
      customerId,
      {
        currency: "usd",
        product_data: { name: "OlCha hamyon to'ldirish" },
        unit_amount: usdCents,
        recurring: null,
      },
      `${baseUrl}/wallet?deposit_session={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/wallet?deposit_canceled=true`,
      { metadata: { userId: String(req.session.userId), amountTiyin: String(amount), paymentMethod } },
    );

    const [tx] = await db.insert(transactionsTable).values({
      userId: req.session.userId,
      walletId: wallet.id,
      type: "deposit",
      amount,
      paymentMethod,
      status: "pending",
      description: description ?? `${paymentMethod.toUpperCase()} orqali to'ldirish (to'lov kutilmoqda)`,
      reference: session.id,
    }).returning();

    res.json({ url: session.url, transactionId: tx.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "To'lov sessiyasini yaratishda xato" });
  }
});

// POST /api/wallet/deposit/confirm — verifies a Stripe Checkout session actually
// paid before crediting the wallet. Idempotent: safe to call more than once.
router.post("/wallet/deposit/confirm", requireAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) { res.status(400).json({ error: "sessionId talab qilinadi" }); return; }

    const [tx] = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.reference, sessionId), eq(transactionsTable.userId, req.session.userId)));
    if (!tx) { res.status(404).json({ error: "Tranzaksiya topilmadi" }); return; }

    if (tx.status !== "pending") {
      const wallet = await getOrCreateWallet(req.session.userId);
      res.json({ wallet, transaction: tx, alreadyConfirmed: true }); return;
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || String(session.metadata?.userId) !== String(req.session.userId)) {
      res.status(400).json({ error: "To'lov hali tasdiqlanmadi" }); return;
    }

    const commissionRate = await getCommissionRate();
    const commission = Math.floor(tx.amount * commissionRate / 100);
    const netAmount = tx.amount - commission;

    // Atomically flip pending -> completed first so concurrent confirms can't double-credit.
    const [updatedTx] = await db.update(transactionsTable)
      .set({
        status: "completed",
        amount: netAmount,
        description: `${tx.paymentMethod?.toUpperCase()} orqali to'ldirish (komissiya ${commissionRate}% = ${(commission / 100).toFixed(0)} UZS)`,
      })
      .where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending")))
      .returning();

    if (!updatedTx) {
      const wallet = await getOrCreateWallet(req.session.userId);
      res.json({ wallet, transaction: tx, alreadyConfirmed: true }); return;
    }

    const wallet = await getOrCreateWallet(req.session.userId);
    const [updatedWallet] = await db
      .update(walletsTable)
      .set({ balance: wallet.balance + netAmount, updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await applyCommission(req.session.userId, tx.amount, "deposit", sessionId);

    res.json({ wallet: updatedWallet, transaction: updatedTx, commission, commissionRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "To'lovni tasdiqlashda xato" });
  }
});

// POST /api/wallet/withdraw
const withdrawSchema = z.object({
  amount: z.number().int().min(100),
  paymentMethod: z.enum(["visa", "mastercard", "click", "payme", "global"]),
  accountDetails: z.string().min(3),
  description: z.string().optional(),
});

// POST /api/wallet/withdraw — holds funds immediately and creates a "pending"
// withdrawal request. There is no automated payout rail (Click/Payme/bank),
// so an admin must review it (GET/PATCH /api/admin/wallet/withdrawals) and
// send the money manually before marking it completed — this endpoint never
// pretends a transfer happened on its own.
router.post("/wallet/withdraw", requireAuth, async (req: any, res) => {
  try {
    const parsed = withdrawSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.issues }); return;
    }
    const { amount, paymentMethod, accountDetails, description } = parsed.data;
    if (!REAL_PAYMENT_METHODS.has(paymentMethod)) {
      res.status(400).json({ error: "Bu to'lov usuli hali ulanmagan (Tez orada)" }); return;
    }
    const wallet = await getOrCreateWallet(req.session.userId);
    const commissionRate = await getCommissionRate();
    const commission = Math.floor(amount * commissionRate / 100);
    const totalNeeded = amount + commission;

    const totalAvailable = wallet.balance + wallet.earningsBalance + wallet.adRevenueBalance;
    if (totalAvailable < totalNeeded) {
      res.status(400).json({
        error: `Balans yetarli emas. Yechish uchun ${(totalNeeded / 100).toFixed(0)} UZS kerak (${commissionRate}% komissiya bilan)`,
      }); return;
    }

    let remaining = totalNeeded;
    let newBalance = wallet.balance;
    let newEarnings = wallet.earningsBalance;
    let newAdRevenue = wallet.adRevenueBalance;

    const fromPersonal = Math.min(remaining, newBalance);
    newBalance -= fromPersonal; remaining -= fromPersonal;
    let fromEarnings = 0;
    if (remaining > 0) {
      fromEarnings = Math.min(remaining, newEarnings);
      newEarnings -= fromEarnings; remaining -= fromEarnings;
    }
    let fromAdRevenue = 0;
    if (remaining > 0) { fromAdRevenue = remaining; newAdRevenue -= remaining; }

    const [updatedWallet] = await db
      .update(walletsTable)
      .set({ balance: newBalance, earningsBalance: newEarnings, adRevenueBalance: newAdRevenue, updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    const ref = `WIT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [tx] = await db.insert(transactionsTable).values({
      userId: req.session.userId,
      walletId: wallet.id,
      type: "withdrawal",
      amount: -amount,
      paymentMethod,
      status: "pending",
      description: description ?? `${paymentMethod.toUpperCase()} orqali yechish so'rovi (${accountDetails}) — admin tasdiqlashini kutmoqda (komissiya ${commissionRate}%)`,
      reference: ref,
      metadata: JSON.stringify({ fromPersonal, fromEarnings, fromAdRevenue, commission, accountDetails }),
    }).returning();

    res.json({ wallet: updatedWallet, transaction: tx, commission, commissionRate, status: "pending" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Yechish so'rovini yaratishda xato" });
  }
});

// POST /api/wallet/transfer
const transferSchema = z.object({
  toUserId: z.number().int().positive(),
  amount: z.number().int().min(100),
  description: z.string().optional(),
});

router.post("/wallet/transfer", requireAuth, async (req: any, res) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot" }); return;
    }
    const { toUserId, amount, description } = parsed.data;
    if (toUserId === req.session.userId) {
      res.status(400).json({ error: "O'zingizga pul o'tkaza olmaysiz" }); return;
    }

    const commissionRate = await getCommissionRate();
    const commission = Math.floor(amount * commissionRate / 100);
    const totalNeeded = amount + commission;

    const fromWallet = await getOrCreateWallet(req.session.userId);
    if (fromWallet.balance < totalNeeded) {
      res.status(400).json({
        error: `Shaxsiy balans yetarli emas. ${commissionRate}% komissiya bilan ${(totalNeeded / 100).toFixed(0)} UZS kerak`,
      }); return;
    }
    const toWallet = await getOrCreateWallet(toUserId);

    const [updatedFrom] = await db
      .update(walletsTable)
      .set({ balance: fromWallet.balance - totalNeeded, updatedAt: new Date() })
      .where(eq(walletsTable.id, fromWallet.id))
      .returning();

    await db
      .update(walletsTable)
      .set({ balance: toWallet.balance + amount, updatedAt: new Date() })
      .where(eq(walletsTable.id, toWallet.id));

    const ref = `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await db.insert(transactionsTable).values([
      {
        userId: req.session.userId, walletId: fromWallet.id,
        type: "transfer_out", amount: -(amount + commission), status: "completed",
        paymentMethod: "internal",
        description: description ?? `O'tkazma (${commissionRate}% komissiya: ${(commission / 100).toFixed(0)} UZS)`,
        reference: ref,
      },
      {
        userId: toUserId, walletId: toWallet.id,
        type: "transfer_in", amount, status: "completed",
        paymentMethod: "internal",
        description: description ?? "Pul qabul qilish",
        reference: ref,
      },
    ]);

    await applyCommission(req.session.userId, amount, "transfer", ref);

    res.json({ wallet: updatedFrom, commission, commissionRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "O'tkazma amalga oshirilmadi" });
  }
});

// GET /api/wallet/payment-methods
router.get("/wallet/payment-methods", requireAuth, async (req: any, res) => {
  try {
    const methods = await db
      .select()
      .from(paymentMethodsTable)
      .where(eq(paymentMethodsTable.userId, req.session.userId))
      .orderBy(desc(paymentMethodsTable.createdAt));
    res.json({ paymentMethods: methods });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "To'lov usullarini olishda xato" });
  }
});

// POST /api/wallet/payment-methods
const addMethodSchema = z.object({
  type: z.enum(["visa", "mastercard", "click", "payme", "global"]),
  title: z.string().min(1).max(100),
  maskedNumber: z.string().optional(),
  holderName: z.string().optional(),
  expiryDate: z.string().optional(),
  isDefault: z.boolean().optional(),
});

router.post("/wallet/payment-methods", requireAuth, async (req: any, res) => {
  try {
    const parsed = addMethodSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot" }); return;
    }
    const data = parsed.data;
    if (data.isDefault) {
      await db
        .update(paymentMethodsTable)
        .set({ isDefault: false })
        .where(eq(paymentMethodsTable.userId, req.session.userId));
    }
    const [method] = await db.insert(paymentMethodsTable).values({
      userId: req.session.userId,
      type: data.type,
      title: data.title,
      maskedNumber: data.maskedNumber,
      holderName: data.holderName,
      expiryDate: data.expiryDate,
      isDefault: data.isDefault ?? false,
    }).returning();
    res.json({ paymentMethod: method });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "To'lov usulini qo'shishda xato" });
  }
});

// DELETE /api/wallet/payment-methods/:id
router.delete("/wallet/payment-methods/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db
      .delete(paymentMethodsTable)
      .where(and(eq(paymentMethodsTable.id, id), eq(paymentMethodsTable.userId, req.session.userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "O'chirishda xato" });
  }
});

// POST /api/wallet/tip
const tipSchema = z.object({
  toUserId: z.number().int().positive(),
  amount: z.number().int().min(100).max(10_000_000_00),
  message: z.string().max(200).optional(),
  postId: z.number().int().optional(),
});

router.post("/wallet/tip", requireAuth, async (req: any, res) => {
  try {
    const data = tipSchema.parse(req.body);
    if (data.toUserId === req.session.userId) {
      res.status(400).json({ error: "O'zingizga tip yubora olmaysiz" }); return;
    }
    const fromWallet = await getOrCreateWallet(req.session.userId);
    if (fromWallet.balance < data.amount) {
      res.status(400).json({ error: "Hamyonda yetarli mablag' yo'q" }); return;
    }
    const toWallet = await getOrCreateWallet(data.toUserId);

    await db.update(walletsTable)
      .set({ balance: fromWallet.balance - data.amount, updatedAt: new Date() })
      .where(eq(walletsTable.id, fromWallet.id));
    await db.insert(transactionsTable).values({
      userId: req.session.userId, walletId: fromWallet.id,
      type: "transfer_out", amount: -data.amount, status: "completed",
      paymentMethod: "internal",
      description: data.message ?? "Kreatorga sovg'a",
      reference: `TIP-${Date.now()}`,
    });

    await db.update(walletsTable)
      .set({ earningsBalance: toWallet.earningsBalance + data.amount, updatedAt: new Date() })
      .where(eq(walletsTable.id, toWallet.id));
    await db.insert(transactionsTable).values({
      userId: data.toUserId, walletId: toWallet.id,
      type: "transfer_in", amount: data.amount, status: "completed",
      paymentMethod: "internal",
      description: `Tip: ${data.message ?? "Sovg'a"}`,
      reference: `TIP-${Date.now()}-IN`,
    });

    res.json({ success: true, amount: data.amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tip yuborishda xato" });
  }
});

export default router;
