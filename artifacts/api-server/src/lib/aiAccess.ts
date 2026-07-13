import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export const AI_FREE_LIMIT = 100;     // kuniga 100 ta xabar bepul
export const AI_PREMIUM_LIMIT = -1;   // premium — cheksiz

export interface AIAccessResult {
  allowed: boolean;
  isPremium: boolean;
  used: number;
  remaining: number;
  limit: number;
}

export async function checkAIAccess(userId: number): Promise<AIAccessResult> {
  const [user] = await db
    .select({
      isPremium: usersTable.isPremium,
      aiUsageCount: usersTable.aiUsageCount,
      aiUsageResetAt: usersTable.aiUsageResetAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return { allowed: false, isPremium: false, used: 0, remaining: 0, limit: AI_FREE_LIMIT };

  // Premium foydalanuvchilar — cheksiz
  if (user.isPremium) {
    return { allowed: true, isPremium: true, used: user.aiUsageCount, remaining: -1, limit: AI_FREE_LIMIT };
  }

  // Kunlik reset: agar bugungi sana resetAt dan katta bo'lsa — qayta noldan boshlaymiz
  const today = new Date().toISOString().slice(0, 10); // "2026-07-13"
  const resetAt = user.aiUsageResetAt ?? today;

  let used = user.aiUsageCount;
  if (today > resetAt) {
    // Yangi kun — counterni reset qilamiz
    await db
      .update(usersTable)
      .set({ aiUsageCount: 0, aiUsageResetAt: sql`CURRENT_DATE` })
      .where(eq(usersTable.id, userId));
    used = 0;
  }

  const remaining = Math.max(0, AI_FREE_LIMIT - used);
  return { allowed: remaining > 0, isPremium: false, used, remaining, limit: AI_FREE_LIMIT };
}

export async function incrementAIUsage(userId: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ aiUsageCount: sql`${usersTable.aiUsageCount} + 1` })
    .where(eq(usersTable.id, userId));
}
