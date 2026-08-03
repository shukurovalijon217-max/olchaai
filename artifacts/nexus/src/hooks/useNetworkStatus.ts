/**
 * useNetworkStatus
 * Tracks browser online/offline events and exposes:
 *   - isOnline: current network status
 *   - justReconnected: true for 3 s after coming back online (for banner)
 */
import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      timer = setTimeout(() => setJustReconnected(false), 3000);
    };

    const onOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      if (timer) clearTimeout(timer);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isOnline, justReconnected };
}
