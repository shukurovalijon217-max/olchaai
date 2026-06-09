import { Router } from "express";
import { db } from "@workspace/db";
import {
  walletsTable, transactionsTable, paymentMethodsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { applyCommission, getCommissionRate } from "../lib/commission";

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
    res.json({ wallet, commissionRate });
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

router.post("/wallet/deposit", requireAuth, async (req: any, res) => {
  try {
    const parsed = depositSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.issues }); return;
    }
    const { amount, paymentMethod, description } = parsed.data;
    const wallet = await getOrCreateWallet(req.session.userId);
    const commissionRate = await getCommissionRate();
    const commission = Math.floor(amount * commissionRate / 100);
    const netAmount = amount - commission;

    await new Promise(r => setTimeout(r, 300));

    const [updatedWallet] = await db
      .update(walletsTable)
      .set({ balance: wallet.balance + netAmount, updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    const ref = `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [tx] = await db.insert(transactionsTable).values({
      userId: req.session.userId,
      walletId: wallet.id,
      type: "deposit",
      amount: netAmount,
      paymentMethod,
      status: "completed",
      description: description ?? `${paymentMethod.toUpperCase()} orqali to'ldirish (komissiya ${commissionRate}% = ${(commission / 100).toFixed(0)} UZS)`,
      reference: ref,
    }).returning();

    // Credit commission to admin wallet (non-fatal)
    await applyCommission(req.session.userId, amount, "deposit", ref);

    res.json({ wallet: updatedWallet, transaction: tx, commission, commissionRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "To'ldirish amalga oshirilmadi" });
  }
});

// POST /api/wallet/withdraw
const withdrawSchema = z.object({
  amount: z.number().int().min(100),
  paymentMethod: z.enum(["visa", "mastercard", "click", "payme", "global"]),
  accountDetails: z.string().min(3),
  description: z.string().optional(),
});

router.post("/wallet/withdraw", requireAuth, async (req: any, res) => {
  try {
    const parsed = withdrawSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.issues }); return;
    }
    const { amount, paymentMethod, description } = parsed.data;
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
    if (remaining > 0) {
      const fromEarnings = Math.min(remaining, newEarnings);
      newEarnings -= fromEarnings; remaining -= fromEarnings;
    }
    if (remaining > 0) newAdRevenue -= remaining;

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
      status: "completed",
      description: description ?? `${paymentMethod.toUpperCase()} orqali yechish (komissiya ${commissionRate}%)`,
      reference: ref,
    }).returning();

    await applyCommission(req.session.userId, amount, "withdrawal", ref);

    res.json({ wallet: updatedWallet, transaction: tx, commission, commissionRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Yechish amalga oshirilmadi" });
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

// POST /api/wallet/simulate-ad-revenue
router.post("/wallet/simulate-ad-revenue", requireAuth, async (req: any, res) => {
  try {
    const amount = Math.floor(Math.random() * 50000) + 10000;
    const wallet = await getOrCreateWallet(req.session.userId);
    const [updated] = await db
      .update(walletsTable)
      .set({ adRevenueBalance: wallet.adRevenueBalance + amount, updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id))
      .returning();
    await db.insert(transactionsTable).values({
      userId: req.session.userId,
      walletId: wallet.id,
      type: "ad_revenue",
      amount,
      status: "completed",
      paymentMethod: "internal",
      description: "Reklama daromadi",
      reference: `ADR-${Date.now()}`,
    });
    res.json({ wallet: updated, credited: amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

// POST /api/wallet/simulate-earnings
router.post("/wallet/simulate-earnings", requireAuth, async (req: any, res) => {
  try {
    const amount = Math.floor(Math.random() * 100000) + 20000;
    const wallet = await getOrCreateWallet(req.session.userId);
    const [updated] = await db
      .update(walletsTable)
      .set({ earningsBalance: wallet.earningsBalance + amount, updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id))
      .returning();
    await db.insert(transactionsTable).values({
      userId: req.session.userId,
      walletId: wallet.id,
      type: "content_revenue",
      amount,
      status: "completed",
      paymentMethod: "internal",
      description: "Kontent daromadi",
      reference: `CNT-${Date.now()}`,
    });
    res.json({ wallet: updated, credited: amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
