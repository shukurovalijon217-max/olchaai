import { db } from "@workspace/db";
import { platformSettingsTable, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DEFAULT_COMMISSION_RATE = 10; // %

/** Get current commission rate (%) from DB, default 10% */
export async function getCommissionRate(): Promise<number> {
  const [row] = await db
    .select({ value: platformSettingsTable.value })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "commission_rate"));
  if (!row) return DEFAULT_COMMISSION_RATE;
  const parsed = parseFloat(row.value);
  return isNaN(parsed) ? DEFAULT_COMMISSION_RATE : Math.max(0, Math.min(100, parsed));
}

/** Set commission rate in DB */
export async function setCommissionRate(rate: number): Promise<void> {
  const clamped = Math.max(0, Math.min(100, rate));
  const existing = await db
    .select({ id: platformSettingsTable.id })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "commission_rate"));

  if (existing.length > 0) {
    await db
      .update(platformSettingsTable)
      .set({ value: String(clamped), updatedAt: new Date() })
      .where(eq(platformSettingsTable.key, "commission_rate"));
  } else {
    await db.insert(platformSettingsTable).values({ key: "commission_rate", value: String(clamped) });
  }
}

/** Get or create the admin wallet (first admin user found) */
async function getAdminWallet(): Promise<{ id: number; userId: number; earningsBalance: number } | null> {
  const [admin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isAdmin, true))
    .limit(1);
  if (!admin) return null;

  const existing = await db
    .select({ id: walletsTable.id, userId: walletsTable.userId, earningsBalance: walletsTable.earningsBalance })
    .from(walletsTable)
    .where(eq(walletsTable.userId, admin.id))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(walletsTable)
    .values({ userId: admin.id })
    .returning({ id: walletsTable.id, userId: walletsTable.userId, earningsBalance: walletsTable.earningsBalance });
  return created;
}

/**
 * Deduct commission from a transaction amount and credit it to admin wallet.
 * Returns the commission amount (in tiyin).
 * Non-fatal: if anything fails, returns 0.
 */
export async function applyCommission(
  fromUserId: number,
  grossAmount: number,
  type: "deposit" | "withdrawal" | "transfer",
  ref: string,
): Promise<number> {
  try {
    const rate = await getCommissionRate();
    if (rate <= 0) return 0;

    const commission = Math.floor(grossAmount * rate / 100);
    if (commission <= 0) return 0;

    const adminWallet = await getAdminWallet();
    if (!adminWallet) return 0;

    // Credit commission to admin earnings balance
    await db
      .update(walletsTable)
      .set({ earningsBalance: adminWallet.earningsBalance + commission, updatedAt: new Date() })
      .where(eq(walletsTable.id, adminWallet.id));

    // Record commission transaction
    await db.insert(transactionsTable).values({
      userId: adminWallet.userId,
      walletId: adminWallet.id,
      type: "content_revenue",
      amount: commission,
      status: "completed",
      paymentMethod: "internal",
      description: `Komissiya (${rate}%) — foydalanuvchi #${fromUserId} ${type}`,
      reference: `COM-${ref}`,
    });

    return commission;
  } catch {
    return 0;
  }
}
