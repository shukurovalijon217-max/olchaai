import { db, pushTokensTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/* ── Firebase Admin — lazy init (for raw FCM tokens only) ── */
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

/* ── web-push (VAPID) — for browser Web Push subscriptions ── */
let webPushReady = false;
async function getWebPush() {
  const wp = (await import("web-push")).default;
  if (!webPushReady) {
    const pub  = process.env["VAPID_PUBLIC_KEY"];
    const priv = process.env["VAPID_PRIVATE_KEY"];
    const sub  = process.env["VAPID_SUBJECT"] ?? "mailto:admin@gilosai.com";
    if (pub && priv) {
      wp.setVapidDetails(sub, pub, priv);
      webPushReady = true;
    }
  }
  return webPushReady ? wp : null;
}

/* ── Expo Push API — for ExponentPushToken[...] tokens (Expo managed) ── */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100; // Expo recommends max 100 per request

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  type?: string,
): Promise<string[]> {
  const toRemove: string[] = [];
  // Send in chunks of 100
  for (let i = 0; i < tokens.length; i += EXPO_CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + EXPO_CHUNK_SIZE);
    const messages: ExpoPushMessage[] = chunk.map(token => ({
      to: token,
      title,
      body,
      sound: "default",
      badge: 1,
      channelId: "olcha_default",
      priority: "high",
      data: { ...data, type: type ?? "general" },
    }));
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(15_000),
      });
      if (resp.ok) {
        const result = await resp.json() as { data: Array<{ status: string; message?: string }> };
        if (Array.isArray(result.data)) {
          result.data.forEach((ticket, idx) => {
            if (ticket.status === "error") {
              const msg = ticket.message ?? "";
              if (msg.includes("InvalidCredentials") || msg.includes("DeviceNotRegistered")) {
                toRemove.push(chunk[idx]!);
              }
            }
          });
        }
      }
    } catch (err) {
      logger.warn({ err }, "Expo push: batch send failed");
    }
  }
  return toRemove;
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

/** Save notification to DB and send push (Expo Push + Web Push + FCM) */
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

  // Split by type:
  // - "expo" platform + ExponentPushToken[...] format → Expo Push API
  // - "fcm" platform with raw FCM token → Firebase Admin SDK
  // - "web" platform → VAPID web push
  const webTokens  = tokens.filter(t => t.platform === "web");
  const expoTokens = tokens.filter(t =>
    t.platform === "expo" && t.token.startsWith("ExponentPushToken[")
  );
  const fcmTokens  = tokens.filter(t =>
    t.platform === "fcm" ||
    (t.platform === "expo" && !t.token.startsWith("ExponentPushToken["))
  );

  /* 3a. Expo Push API (most mobile tokens) */
  if (expoTokens.length > 0) {
    const tokenList = expoTokens.map(t => t.token);
    const toRemove = await sendExpoNotifications(tokenList, title, body, data, type);
    for (const bad of toRemove) {
      await db.delete(pushTokensTable).where(eq(pushTokensTable.token, bad)).catch(() => {});
    }
  }

  /* 3b. Firebase FCM for raw FCM tokens */
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
      } catch (err) {
        logger.warn({ err }, "FCM: sendEachForMulticast failed");
      }
    }
  }

  /* 3c. Web Push (VAPID) for browser subscribers */
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
}
