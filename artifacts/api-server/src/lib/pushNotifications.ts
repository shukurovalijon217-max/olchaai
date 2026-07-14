import { db, pushTokensTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/* ── Firebase Admin — lazy init with modular API ── */
let messagingInstance: import("firebase-admin/messaging").Messaging | null = null;

async function getMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
    if (!raw) return null;
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getMessaging: _getMsg } = await import("firebase-admin/messaging");
    const serviceAccount = JSON.parse(raw);
    const app = getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0]!;
    messagingInstance = _getMsg(app);
    return messagingInstance;
  } catch (e) {
    console.error("[push] Firebase init failed:", e);
    return null;
  }
}

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

/** Save notification to DB and send push via Firebase FCM */
export async function sendNotification(payload: PushPayload): Promise<void> {
  const { userId, title, body, data, type, actorName, actorAvatar, targetId, targetType } = payload;

  // 1. Save to notifications table (always)
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
  } catch { /* ignore */ }

  // 2. Get user's push tokens
  let tokens: { token: string }[] = [];
  try {
    tokens = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId));
  } catch { return; }

  if (tokens.length === 0) return;

  // 3. Send via Firebase FCM
  const messaging = await getMessaging();
  if (!messaging) return;

  const tokenList = tokens.map(t => t.token);
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenList,
      notification: { title, body },
      data: { ...data, type: type ?? "general" },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "olcha_default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    });

    // Remove invalid/expired tokens
    const toRemove: string[] = [];
    response.responses.forEach((resp: { success: boolean; error?: { code?: string } }, idx: number) => {
      if (!resp.success) {
        const code = resp.error?.code ?? "";
        if (code.includes("invalid-registration-token") || code.includes("registration-token-not-registered")) {
          toRemove.push(tokenList[idx]!);
        }
      }
    });
    for (const bad of toRemove) {
      await db.delete(pushTokensTable).where(eq(pushTokensTable.token, bad)).catch(() => {});
    }
  } catch (e) {
    console.error("[push] FCM send failed:", e);
  }
}
