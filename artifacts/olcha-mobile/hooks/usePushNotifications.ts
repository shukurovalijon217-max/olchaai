import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";

const API = process.env.EXPO_PUBLIC_API_URL ?? "https://api.olchaai.com";

/* ── Android notification channels (required for Android 8+) ── */
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("olcha_default", {
    name: "OlchaAI Bildirishnomalar",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#a855f7",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});

  Notifications.setNotificationChannelAsync("olcha_messages", {
    name: "Xabarlar",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: "#22c55e",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const permissions = await Notifications.getPermissionsAsync();
  let isGranted =
    (permissions as any).status === "granted" ||
    (permissions as any).granted === true;

  if (!isGranted) {
    const result = await Notifications.requestPermissionsAsync();
    isGranted =
      (result as any).status === "granted" ||
      (result as any).granted === true;
  }

  if (!isGranted) return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return null;
  }
}

async function saveTokenToServer(token: string, authToken?: string) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    await fetch(`${API}/api/push-token`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ token, platform: "expo" }),
    });
  } catch { /* non-critical */ }
}

/** Navigate to the right screen when user taps a push notification */
function handleNotificationNavigation(
  response: Notifications.NotificationResponse,
) {
  try {
    const data = response.notification.request.content.data as Record<
      string,
      any
    >;
    const type     = data?.type as string | undefined;
    const targetId = data?.targetId ?? data?.target_id;
    const senderId = data?.senderId ?? data?.sender_id;

    if (type === "message" && senderId) {
      router.push(`/chat/${senderId}` as any);
    } else if (type === "follow" && senderId) {
      router.push("/(tabs)/feed" as any);
    } else if ((type === "like" || type === "comment") && targetId) {
      router.push("/(tabs)/feed" as any);
    } else if (type === "live" && targetId) {
      router.push("/(tabs)/feed" as any);
    } else {
      router.push("/notifications" as any);
    }
  } catch { /* navigation may not be ready yet */ }
}

export function usePushNotifications(authToken?: string | null) {
  const notifListener   = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const savedToken      = useRef<string | null>(null);

  /* Register on mount and wire listeners */
  useEffect(() => {
    if (Platform.OS === "web") return;

    registerForPushNotifications().then((token) => {
      if (token && token !== savedToken.current) {
        savedToken.current = token;
        saveTokenToServer(token, authToken ?? undefined);
      }
    });

    notifListener.current = Notifications.addNotificationReceivedListener(
      () => { /* badge/sound already handled by setNotificationHandler */ },
    );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationNavigation(response);
      });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken]);

  /* Re-register token when auth changes (login / logout) */
  useEffect(() => {
    if (!authToken || Platform.OS === "web") return;
    registerForPushNotifications().then((token) => {
      if (token) saveTokenToServer(token, authToken);
    });
  }, [authToken]);
}
