import { useEffect } from "react";

const API = "";

async function subscribePush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
  if (Notification.permission === "denied") return;

  /* 1. Get VAPID public key from server */
  let publicKey: string;
  try {
    const r = await fetch(`${API}/api/notifications/vapid-key`, { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    publicKey = data.publicKey;
  } catch { return; }

  /* 2. Wait for service worker */
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch { return; }

  /* 3. Request permission */
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
  }

  /* 4. Subscribe to push */
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      /* Already subscribed — re-register (in case backend lost it) */
      await sendSubscription(existing);
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
    await sendSubscription(sub);
  } catch { /* user blocked or SW error */ }
}

async function sendSubscription(sub: PushSubscription) {
  await fetch(`${API}/api/notifications/push-subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function unsubscribePush() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API}/api/notifications/push-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {}
}

/** Call this hook inside a component rendered when user is logged in */
export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    /* Small delay so the app fully boots first */
    const t = setTimeout(() => subscribePush(), 3000);
    return () => clearTimeout(t);
  }, [enabled]);
}

/** Call before logout to unsubscribe push notifications */
export { unsubscribePush };
