/**
 * NetworkBanner — floating offline/reconnect notification
 * Shows a red banner when offline, green flash on reconnect.
 */
import { useEffect, useState } from "react";

function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export function NetworkBanner() {
  const online  = useNetworkStatus();
  const [show, setShow]   = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShow(true);
    } else if (wasOffline) {
      // show green "reconnected" briefly
      setShow(true);
      const t = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(t);
    }
  }, [online]); // eslint-disable-line

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 14,
        fontWeight: 600,
        color: "#fff",
        background: online ? "#16a34a" : "#dc2626",
        transition: "background 0.4s",
        letterSpacing: 0.3,
      }}
    >
      {online ? "✅ Internet qayta ulandi" : "⚠️ Internet yo'q — Offline rejim"}
    </div>
  );
}
