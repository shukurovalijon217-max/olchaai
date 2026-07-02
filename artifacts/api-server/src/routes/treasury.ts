/**
 * Platform Treasury — Admin Revenue & Withdrawal System
 * All platform revenue auto-routes here. Admin can view stats and withdraw.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { pgTable, serial, text, bigint, real, jsonb, timestamp } from "drizzle-orm/pg-core";

const router = Router();

const treasuryTable = pgTable("platform_treasury", {
  id: serial("id").primaryKey(),
  totalRevenue: bigint("total_revenue", { mode: "number" }).notNull().default(0),
  availableBalance: bigint("available_balance", { mode: "number" }).notNull().default(0),
  totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).notNull().default(0),
  premiumRevenue: bigint("premium_revenue", { mode: "number" }).notNull().default(0),
  marketplaceRevenue: bigint("marketplace_revenue", { mode: "number" }).notNull().default(0),
  giftRevenue: bigint("gift_revenue", { mode: "number" }).notNull().default(0),
  otherRevenue: bigint("other_revenue", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const treasuryTxTable = pgTable("treasury_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  source: text("source").notNull(),
  description: text("description"),
  reference: text("reference"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [u] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!u?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
};

/** Credit revenue to platform treasury. Call from commission, stripe webhook, etc. */
export async function creditTreasury(opts: {
  amount: number;
  source: "premium" | "marketplace" | "gift" | "other";
  description: string;
  reference?: string;
}): Promise<void> {
  try {
    const { amount, source, description, reference } = opts;
    if (amount <= 0) return;

    const col = source === "premium" ? "premium_revenue"
      : source === "marketplace" ? "marketplace_revenue"
      : source === "gift" ? "gift_revenue"
      : "other_revenue";

    await db.execute(sql`
      UPDATE platform_treasury
      SET total_revenue = total_revenue + ${amount},
          available_balance = available_balance + ${amount},
          ${sql.raw(col)} = ${sql.raw(col)} + ${amount},
          updated_at = NOW()
      WHERE id = 1
    `);

    await db.insert(treasuryTxTable).values({
      type: "credit",
      amount,
      source,
      description,
      reference: reference ?? null,
    });
  } catch (err) {
    // Non-fatal — log but don't fail the caller
    console.error("[Treasury] creditTreasury error:", err);
  }
}

/* GET /api/admin/treasury — dashboard stats */
router.get("/admin/treasury", requireAdmin, async (req, res) => {
  try {
    const [treasury] = await db.select().from(treasuryTable).where(sql`id = 1`);
    const recentTx = await db.select().from(treasuryTxTable)
      .orderBy(desc(treasuryTxTable.createdAt)).limit(50);

    const todayRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as rev
      FROM treasury_transactions WHERE type = 'credit' AND created_at >= CURRENT_DATE
    `);
    const weekRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as rev
      FROM treasury_transactions WHERE type = 'credit' AND created_at >= NOW() - INTERVAL '7 days'
    `);
    const monthRes = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as rev
      FROM treasury_transactions WHERE type = 'credit' AND created_at >= NOW() - INTERVAL '30 days'
    `);

    const todayRow = (todayRes as any).rows?.[0] ?? (Array.isArray(todayRes) ? todayRes[0] : {});
    const weekRow = (weekRes as any).rows?.[0] ?? (Array.isArray(weekRes) ? weekRes[0] : {});
    const monthRow = (monthRes as any).rows?.[0] ?? (Array.isArray(monthRes) ? monthRes[0] : {});

    res.json({
      treasury: treasury ?? {
        totalRevenue: 0, availableBalance: 0, totalWithdrawn: 0,
        premiumRevenue: 0, marketplaceRevenue: 0, giftRevenue: 0, otherRevenue: 0,
      },
      todayRevenue: Number(todayRow?.rev ?? 0),
      weekRevenue: Number(weekRow?.rev ?? 0),
      monthRevenue: Number(monthRow?.rev ?? 0),
      recentTransactions: recentTx,
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* POST /api/admin/treasury/withdraw — withdraw funds */
router.post("/admin/treasury/withdraw", requireAdmin, async (req, res) => {
  try {
    const { amount, method, details, description } = req.body as {
      amount: number; method: string; details?: string; description?: string;
    };

    if (!amount || amount <= 0) { res.status(400).json({ error: "Noto'g'ri miqdor" }); return; }
    if (!method) { res.status(400).json({ error: "To'lov usuli kerak" }); return; }

    const treasuryRes = await db.execute(sql`
      SELECT available_balance as available FROM platform_treasury WHERE id = 1
    `);
    const treasuryRow = (treasuryRes as any).rows?.[0] ?? (Array.isArray(treasuryRes) ? treasuryRes[0] : {});
    const available = Number(treasuryRow?.available ?? 0);
    if (amount > available) {
      res.status(400).json({ error: "Yetarli mablag' yo'q", available });
      return;
    }

    await db.execute(sql`
      UPDATE platform_treasury
      SET available_balance = available_balance - ${amount},
          total_withdrawn = total_withdrawn + ${amount},
          updated_at = NOW()
      WHERE id = 1
    `);

    const ref = `WD-${Date.now()}`;
    await db.insert(treasuryTxTable).values({
      type: "withdrawal",
      amount,
      source: "admin",
      description: description ?? `Yechib olish — ${method}${details ? `: ${details}` : ""}`,
      reference: ref,
    });

    res.json({ ok: true, amount, method, reference: ref, remaining: available - amount });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/admin/treasury/transactions — all treasury transactions */
router.get("/admin/treasury/transactions", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 100), 200);
    const offset = Number(req.query["offset"] ?? 0);
    const txs = await db.select().from(treasuryTxTable)
      .orderBy(desc(treasuryTxTable.createdAt))
      .limit(limit).offset(offset);
    res.json({ transactions: txs, limit, offset });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
