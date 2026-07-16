import { db, pushTokensTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/* ── Firebase Admin — lazy init (for Expo/native FCM tokens) ── */
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
  } catch { return null; }
}

/* ── web-push (VAPID) — for browser Web Push subscriptions ─── */
let webPushReady = false;
async function getWebPush() {
  const wp = (await import("web-push")).default;
  if (!webPushReady) {
    const pub  = process.env["VAPID_PUBLIC_KEY"];
    const priv = process.env["VAPID_PRIVATE_KEY"];
    const sub  = process.env["VAPID_SUBJECT"] ?? "mailto:admin@olchaai.com";
    if (pub && priv) {
      wp.setVapidDetails(sub, pub, priv);
      webPushReady = true;
    }
  }
  return webPushReady ? wp : null;
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
  url?: string;
}

/** Save notification to DB and send push (Web Push + FCM) */
export async function sendNotification(payload: PushPayload): Promise<void> {
  const { userId, title, body, data, type, actorName, actorAvatar, targetId, targetType, url } = payload;

  /* 1. Save to notifications table */
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

  /* 2. Get all user tokens */
  let tokens: { token: string; platform: string }[] = [];
  try {
    tokens = await db
      .select({ token: pushTokensTable.token, platform: pushTokensTable.platform })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId));
  } catch { return; }

  if (tokens.length === 0) return;

  const webTokens = tokens.filter(t => t.platform === "web");
  const fcmTokens = tokens.filter(t => t.platform === "fcm" || t.platform === "expo");

  /* 3a. Web Push (VAPID) for browser subscribers */
  if (webTokens.length > 0) {
    const wp = await getWebPush();
    if (wp) {
      const notifPayload = JSON.stringify({
        title,
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        url: url ?? "/",
        data: { type: type ?? "general", ...data },
      });
      const toRemove: string[] = [];
      await Promise.all(webTokens.map(async ({ token }) => {
        try {
          const sub = JSON.parse(token);
          await wp.sendNotification(sub, notifPayload);
        } catch (err: any) {
          const code = err?.statusCode ?? 0;
          if (code === 404 || code === 410) toRemove.push(token);
        }
      }));
      for (const bad of toRemove) {
        await db.delete(pushTokensTable).where(eq(pushTokensTable.token, bad)).catch(() => {});
      }
    }
  }

  /* 3b. Firebase FCM for native/Expo tokens */
  if (fcmTokens.length > 0) {
    const messaging = await getMessaging();
    if (messaging) {
      const tokenList = fcmTokens.map(t => t.token);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: tokenList,
          notification: { title, body },
          data: { ...data, type: type ?? "general" },
          android: { priority: "high", notification: { sound: "default", channelId: "olcha_default" } },
          apns: { payload: { aps: { sound: "default", badge: 1 } } },
        });
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
      } catch { /* ignore */ }
    }
  }
}
