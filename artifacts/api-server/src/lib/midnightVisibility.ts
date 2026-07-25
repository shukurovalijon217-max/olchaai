import { db, postsTable, usersTable } from "@workspace/db";
import { eq, type SQL } from "drizzle-orm";

const DEFAULT_TZ = "UTC";
const WINDOW_START_HOUR = 23;
const WINDOW_END_HOUR = 5;

/**
 * Returns true if `now` falls inside the midnight-confession visibility
 * window (23:00–05:00) in the given IANA timezone. Falls back to UTC
 * (effectively server local time in this deployment) when no timezone
 * is available or it's invalid.
 */
export function isWithinMidnightWindow(timezone?: string | null, now: Date = new Date()): boolean {
  const tz = timezone || DEFAULT_TZ;
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(now));
  } catch {
    hour = now.getUTCHours();
  }
  return hour >= WINDOW_START_HOUR || hour < WINDOW_END_HOUR;
}

/**
 * Shared Drizzle visibility condition for `posts.midnightOnly`.
 * - Outside the window: only non-midnight-only posts are visible.
 * - Inside the window: everything is visible (midnight-only posts "unlock").
 * Apply this alongside any other filters via `and(...)` on every read path
 * that lists or fetches individual posts for end users (not admin moderation,
 * which must see all content regardless of time).
 */
export function midnightVisibilityCondition(timezone?: string | null): SQL {
  if (isWithinMidnightWindow(timezone)) return eq(postsTable.midnightOnly, postsTable.midnightOnly);
  return eq(postsTable.midnightOnly, false);
}

/**
 * Convenience helper: resolves the viewer's timezone from their session
 * (if logged in) and returns the ready-to-use visibility condition.
 */
export async function midnightVisibilityConditionForReq(req: { session?: { userId?: number } }): Promise<SQL> {
  const userId = req.session?.userId;
  if (!userId) return midnightVisibilityCondition(null);
  const [u] = await db.select({ timezone: usersTable.timezone }).from(usersTable).where(eq(usersTable.id, userId));
  return midnightVisibilityCondition(u?.timezone ?? null);
}
