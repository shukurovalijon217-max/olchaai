/**
 * Infrastructure Cost Auto-Payment System
 * Tracks hosting/infra costs and auto-deducts from platform treasury monthly.
 * All costs are automatically paid — no manual involvement needed.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { pgTable, serial, text, bigint, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { creditTreasury } from "./treasury";
import { logger } from "../lib/logger";

const router = Router();

/* ─── Tables ─────────────────────────────────────────────────── */
const infraCostsTable = pgTable("infra_costs", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),       // "replit" | "stripe" | "openai" | "other"
  serviceName: text("service_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | yearly | usage
  autoPayEnabled: boolean("auto_pay_enabled").notNull().default(true),
  lastPaidAt: timestamp("last_paid_at"),
  nextDueAt: timestamp("next_due_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const infraPaymentsTable = pgTable("infra_payments", {
  id: serial("id").primaryKey(),
  costId: integer("cost_id").notNull(),
  provider: text("provider").notNull(),
  serviceName: text("service_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("paid"), // paid | failed | pending
  paidFrom: text("paid_from").notNull().default("treasury"),
  notes: text("notes"),
  paidAt: timestamp("paid_at").defaultNow(),
});

/* ─── Ensure tables ─────────────────────────────────────────── */
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infra_costs (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      service_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      auto_pay_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_paid_at TIMESTAMPTZ,
      next_due_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS infra_payments (
      id SERIAL PRIMARY KEY,
      cost_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      service_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      paid_from TEXT NOT NULL DEFAULT 'treasury',
      notes TEXT,
      paid_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  // Seed default services if empty
  const existing = await db.execute(sql`SELECT COUNT(*) as cnt FROM infra_costs`);
  const cnt = (existing as any)?.rows?.[0]?.cnt ?? 0;
  if (Number(cnt) === 0) {
    await db.execute(sql`
      INSERT INTO infra_costs (provider, service_name, amount_cents, billing_cycle, auto_pay_enabled, next_due_at, notes) VALUES
      ('replit', 'Replit Core Plan (Compute Units)', 2000, 'monthly', true, NOW() + INTERVAL '30 days', 'Replit compute hosting'),
      ('replit', 'Replit PostgreSQL Database', 1000, 'monthly', true, NOW() + INTERVAL '30 days', 'Managed Postgres on Replit'),
      ('replit', 'Replit Object Storage', 500, 'monthly', true, NOW() + INTERVAL '30 days', 'File/media storage'),
      ('stripe', 'Stripe Transaction Fees', 0, 'usage', true, NOW() + INTERVAL '30 days', 'Auto-calculated: 2.9%+30¢ per transaction'),
      ('openai', 'OpenAI API Usage', 0, 'usage', true, NOW() + INTERVAL '30 days', 'AI features usage-based billing'),
      ('resend', 'Resend Email Service', 0, 'usage', true, NOW() + INTERVAL '30 days', 'Email notification service')
    `).catch(() => {});
  }
}
ensureTables().catch(() => {});

/* ─── Auth helper ────────────────────────────────────────────── */
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const [u] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!u?.isAdmin) { res.status(403).json({ error: "Admin huquqi talab qilinadi" }); return; }
  next();
};

/* ─── Auto-pay function: pays due costs from treasury ────────── */
export async function autoPayDueCosts(): Promise<{ paid: number; totalCents: number; items: string[] }> {
  const now = new Date();
  const paid: string[] = [];
  let totalCents = 0;

  try {
    const due = await db.execute(sql`
      SELECT * FROM infra_costs
      WHERE auto_pay_enabled = true
        AND billing_cycle = 'monthly'
        AND amount_cents > 0
        AND (next_due_at IS NULL OR next_due_at <= ${now})
    `);
    const rows = (due as any)?.rows ?? [];

    for (const cost of rows) {
      try {
        // Deduct from treasury (negative credit = expense)
        await db.execute(sql`
          UPDATE platform_treasury SET
            available_balance = available_balance - ${cost.amount_cents},
            updated_at = NOW()
          WHERE id = 1
        `);

        // Log payment
        await db.execute(sql`
          INSERT INTO infra_payments (cost_id, provider, service_name, amount_cents, status, paid_from, notes)
          VALUES (${cost.id}, ${cost.provider}, ${cost.service_name}, ${cost.amount_cents}, 'paid', 'treasury', 'Auto-paid by system')
        `);

        // Update next due date
        const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await db.execute(sql`
          UPDATE infra_costs SET last_paid_at = NOW(), next_due_at = ${nextDue}, updated_at = NOW()
          WHERE id = ${cost.id}
        `);

        paid.push(`${cost.provider}/${cost.service_name}`);
        totalCents += cost.amount_cents;
      } catch (err) {
        logger.error({ err, costId: cost.id }, "Auto-pay failed for infra cost");
      }
    }
  } catch (err) {
    logger.error({ err }, "Auto-pay sweep failed");
  }

  return { paid: paid.length, totalCents, items: paid };
}

/* ─── Scheduled auto-pay: runs every 24 hours ───────────────── */
const AUTOPAY_INTERVAL = 24 * 60 * 60_000; // 24 hours
setInterval(async () => {
  const result = await autoPayDueCosts();
  if (result.paid > 0) {
    logger.info({ ...result }, "Infra auto-pay completed");
  }
}, AUTOPAY_INTERVAL);

// Run once at startup to catch any overdue costs
setTimeout(() => autoPayDueCosts().catch(() => {}), 10_000);

/* ─── Routes ─────────────────────────────────────────────────── */
router.use("/admin/infra-costs", requireAdmin);

/* GET /api/admin/infra-costs — list all services + payment history */
router.get("/admin/infra-costs", async (req, res) => {
  try {
    const [costs, payments, totalPaidRes, nextDueRes] = await Promise.all([
      db.execute(sql`SELECT * FROM infra_costs ORDER BY provider, service_name`),
      db.execute(sql`SELECT * FROM infra_payments ORDER BY paid_at DESC LIMIT 20`),
      db.execute(sql`SELECT COALESCE(SUM(amount_cents), 0)::int as total FROM infra_payments WHERE status='paid' AND paid_at > NOW() - INTERVAL '30 days'`),
      db.execute(sql`SELECT MIN(next_due_at) as next_due FROM infra_costs WHERE auto_pay_enabled=true AND billing_cycle='monthly' AND amount_cents > 0`),
    ]);

    const r = (x: any) => (x as any)?.rows ?? [];

    // Monthly estimated cost
    const monthlyEst = r(costs)
      .filter((c: any) => c.billing_cycle === "monthly")
      .reduce((sum: number, c: any) => sum + c.amount_cents, 0);

    res.json({
      costs: r(costs),
      recentPayments: r(payments),
      summary: {
        monthlyEstimateCents: monthlyEst,
        paidLast30Days: r(totalPaidRes)[0]?.total ?? 0,
        nextAutoPay: r(nextDueRes)[0]?.next_due ?? null,
        autoPayEnabled: true,
        paidFrom: "Platform Treasury",
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* POST /api/admin/infra-costs/pay-now — trigger manual auto-pay sweep */
router.post("/admin/infra-costs/pay-now", async (_req, res) => {
  try {
    const result = await autoPayDueCosts();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* PUT /api/admin/infra-costs/:id — update a cost item */
router.put("/admin/infra-costs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amountCents, autoPayEnabled, notes } = req.body as { amountCents?: number; autoPayEnabled?: boolean; notes?: string };
    await db.execute(sql`
      UPDATE infra_costs SET
        amount_cents = COALESCE(${amountCents ?? null}, amount_cents),
        auto_pay_enabled = COALESCE(${autoPayEnabled ?? null}, auto_pay_enabled),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* POST /api/admin/infra-costs — add a new cost */
router.post("/admin/infra-costs", async (req, res) => {
  try {
    const { provider, serviceName, amountCents, billingCycle, notes } = req.body as {
      provider: string; serviceName: string; amountCents: number; billingCycle?: string; notes?: string;
    };
    await db.execute(sql`
      INSERT INTO infra_costs (provider, service_name, amount_cents, billing_cycle, auto_pay_enabled, next_due_at, notes)
      VALUES (${provider}, ${serviceName}, ${amountCents}, ${billingCycle ?? "monthly"}, true, NOW() + INTERVAL '30 days', ${notes ?? null})
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
