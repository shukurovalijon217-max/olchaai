import { Router } from "express";
import { db } from "@workspace/db";
import {
  platformExpensesTable,
  expenseDeductionRequestsTable,
  walletsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

/* ─── Admin guard ─────────────────────────────────────────────── */
const adminOnly = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  if (!req.session?.isAdmin) { res.status(403).json({ error: "Faqat admin" }); return; }
  next();
};

/* ─── GET /admin/platform-expenses ─────────────────────── */
router.get("/admin/platform-expenses", adminOnly, async (req, res) => {
  try {
    const expenses = await db
      .select()
      .from(platformExpensesTable)
      .orderBy(desc(platformExpensesTable.createdAt));
    res.json({ expenses });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── POST /admin/platform-expenses ────────────────────── */
router.post("/admin/platform-expenses", adminOnly, async (req: any, res) => {
  try {
    const { name, category, amountCents, currency = "USD", period = "monthly", description } = req.body;
    if (!name || !category || !amountCents) {
      res.status(400).json({ error: "name, category, amountCents majburiy" }); return;
    }
    const [expense] = await db
      .insert(platformExpensesTable)
      .values({ name, category, amountCents: Number(amountCents), currency, period, description })
      .returning();
    res.json({ expense });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── PATCH /admin/platform-expenses/:id ───────────────── */
router.patch("/admin/platform-expenses/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, amountCents, currency, period, description, isActive } = req.body;
    const [updated] = await db
      .update(platformExpensesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(amountCents !== undefined && { amountCents: Number(amountCents) }),
        ...(currency !== undefined && { currency }),
        ...(period !== undefined && { period }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(platformExpensesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Xarajat topilmadi" }); return; }
    res.json({ expense: updated });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── DELETE /admin/platform-expenses/:id ──────────────── */
router.delete("/admin/platform-expenses/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(platformExpensesTable).where(eq(platformExpensesTable.id, id));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── GET /admin/platform-expenses/summary ─────────────── */
router.get("/admin/platform-expenses/summary", adminOnly, async (req, res) => {
  try {
    // Get total platform gross revenue from admin wallet earnings
    const [adminWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, 1)); // admin userId = 1

    const grossRevenueCents = adminWallet?.earningsBalance ?? 0;

    // Get active monthly expenses total
    const expenses = await db
      .select()
      .from(platformExpensesTable)
      .where(eq(platformExpensesTable.isActive, true));

    const monthlyExpenseCents = expenses
      .filter(e => e.period === "monthly")
      .reduce((sum, e) => sum + e.amountCents, 0);

    const annualExpenseCents = expenses
      .filter(e => e.period === "annual")
      .reduce((sum, e) => sum + Math.round(e.amountCents / 12), 0); // monthly-equivalent

    const oneTimeCents = expenses
      .filter(e => e.period === "one_time")
      .reduce((sum, e) => sum + e.amountCents, 0);

    const totalMonthlyExpenseCents = monthlyExpenseCents + annualExpenseCents;
    const netProfitCents = grossRevenueCents - totalMonthlyExpenseCents;

    // Recent deduction requests
    const recentRequests = await db
      .select()
      .from(expenseDeductionRequestsTable)
      .orderBy(desc(expenseDeductionRequestsTable.createdAt))
      .limit(10);

    res.json({
      grossRevenueCents,
      totalMonthlyExpenseCents,
      oneTimeCents,
      netProfitCents,
      expenseCount: expenses.length,
      expenses,
      recentRequests,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── POST /admin/platform-expenses/deduction-request ──── */
router.post("/admin/platform-expenses/deduction-request", adminOnly, async (req: any, res) => {
  try {
    // Recalculate totals live
    const [adminWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, 1));

    const grossRevenueCents = adminWallet?.earningsBalance ?? 0;

    const expenses = await db
      .select()
      .from(platformExpensesTable)
      .where(eq(platformExpensesTable.isActive, true));

    const totalExpenseCents = expenses
      .filter(e => e.period !== "one_time")
      .reduce((sum, e) => {
        const monthly = e.period === "annual" ? Math.round(e.amountCents / 12) : e.amountCents;
        return sum + monthly;
      }, 0);

    if (totalExpenseCents <= 0) {
      res.status(400).json({ error: "Faol xarajatlar yo'q" }); return;
    }
    if (grossRevenueCents < totalExpenseCents) {
      res.status(400).json({
        error: `Daromad yetarli emas. Kerak: $${(totalExpenseCents / 100).toFixed(2)}, Mavjud: $${(grossRevenueCents / 100).toFixed(2)}`,
      }); return;
    }

    const netProfitCents = grossRevenueCents - totalExpenseCents;

    const [request] = await db
      .insert(expenseDeductionRequestsTable)
      .values({
        totalRevenueCents: grossRevenueCents,
        totalExpenseCents,
        netProfitCents,
        status: "pending",
        notes: req.body.notes ?? null,
      })
      .returning();

    res.json({ request });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── GET /admin/platform-expenses/deduction-requests ──── */
router.get("/admin/platform-expenses/deduction-requests", adminOnly, async (req, res) => {
  try {
    const requests = await db
      .select()
      .from(expenseDeductionRequestsTable)
      .orderBy(desc(expenseDeductionRequestsTable.createdAt))
      .limit(20);
    res.json({ requests });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── POST /admin/platform-expenses/deduction-requests/:id/approve ─── */
router.post("/admin/platform-expenses/deduction-requests/:id/approve", adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [req_] = await db
      .select()
      .from(expenseDeductionRequestsTable)
      .where(eq(expenseDeductionRequestsTable.id, id));
    if (!req_) { res.status(404).json({ error: "So'rov topilmadi" }); return; }
    if (req_.status !== "pending") { res.status(400).json({ error: "Faqat pending so'rovlar tasdiqlanishi mumkin" }); return; }

    // Deduct from admin wallet
    const [adminWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, 1));

    if (!adminWallet) { res.status(400).json({ error: "Admin hamyon topilmadi" }); return; }
    if (adminWallet.earningsBalance < req_.totalExpenseCents) {
      res.status(400).json({ error: "Admin hamyonda yetarli mablag' yo'q" }); return;
    }

    await db
      .update(walletsTable)
      .set({
        earningsBalance: adminWallet.earningsBalance - req_.totalExpenseCents,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, 1));

    const [updated] = await db
      .update(expenseDeductionRequestsTable)
      .set({
        status: "approved",
        approvedBy: req.session.userId,
        approvedAt: new Date(),
      })
      .where(eq(expenseDeductionRequestsTable.id, id))
      .returning();

    res.json({ request: updated });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

/* ─── POST /admin/platform-expenses/deduction-requests/:id/reject ──── */
router.post("/admin/platform-expenses/deduction-requests/:id/reject", adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(expenseDeductionRequestsTable)
      .set({ status: "rejected", notes: req.body.notes ?? null })
      .where(and(
        eq(expenseDeductionRequestsTable.id, id),
        eq(expenseDeductionRequestsTable.status, "pending"),
      ))
      .returning();
    if (!updated) { res.status(404).json({ error: "So'rov topilmadi yoki allaqachon ko'rib chiqilgan" }); return; }
    res.json({ request: updated });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Xato" }); }
});

export default router;
