import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export const AI_FREE_LIMIT = 100;

export interface AIAccessResult {
  allowed: boolean;
  isPremium: boolean;
  used: number;
  remaining: number;
  limit: number;
}

export async function checkAIAccess(userId: number): Promise<AIAccessResult> {
  const [user] = await db
    .select({ isPremium: usersTable.isPremium, aiUsageCount: usersTable.aiUsageCount })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return { allowed: false, isPremium: false, used: 0, remaining: 0, limit: AI_FREE_LIMIT };
  if (user.isPremium) return { allowed: true, isPremium: true, used: user.aiUsageCount, remaining: -1, limit: AI_FREE_LIMIT };

  const used = user.aiUsageCount;
  const remaining = Math.max(0, AI_FREE_LIMIT - used);
  return { allowed: remaining > 0, isPremium: false, used, remaining, limit: AI_FREE_LIMIT };
}

export async function incrementAIUsage(userId: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ aiUsageCount: sql`${usersTable.aiUsageCount} + 1` })
    .where(eq(usersTable.id, userId));
}
