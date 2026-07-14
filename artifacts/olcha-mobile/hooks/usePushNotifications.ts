import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

const API = process.env.EXPO_PUBLIC_API_URL ?? "https://api.olchaai.com";

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
  let isGranted = (permissions as any).status === "granted" || (permissions as any).granted === true;

  if (!isGranted) {
    const result = await Notifications.requestPermissionsAsync();
    isGranted = (result as any).status === "granted" || (result as any).granted === true;
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
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    await fetch(`${API}/api/push-token`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ token, platform: "expo" }),
    });
  } catch { /* non-critical */ }
}

export function usePushNotifications(authToken?: string | null) {
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    registerForPushNotifications().then((token) => {
      if (token) saveTokenToServer(token, authToken ?? undefined);
    });

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received while app is in foreground
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // User tapped the notification — navigation handled via expo-router deep links
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken]);
}
