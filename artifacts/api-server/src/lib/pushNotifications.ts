import { db, pushTokensTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface PushPayload {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: string;
  actorName?: string;
  actorAvatar?: string;
  targetId?: number;
  targetType?: string;
}

/** Save notification to DB and send Expo push notification */
export async function sendNotification(payload: PushPayload): Promise<void> {
  const { userId, title, body, data, type, actorName, actorAvatar, targetId, targetType } = payload;

  // 1. Save to notifications table
  try {
    await db.insert(notificationsTable).values({
      userId,
      type: type ?? "general",
      message: body,
      actorName: actorName ?? null,
      actorAvatar: actorAvatar ?? null,
      targetId: targetId ?? null,
      targetType: targetType ?? null,
    });
  } catch { /* ignore duplicate */ }

  // 2. Get user's push tokens
  let tokens: { token: string }[] = [];
  try {
    tokens = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId));
  } catch { return; }

  if (tokens.length === 0) return;

  // 3. Send via Expo Push API
  const messages = tokens.map(({ token }) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: "default",
    badge: 1,
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch { /* non-critical — notification saved to DB */ }
}
