import { useState, useCallback, useEffect } from "react";

const KEY   = "olcha_dock_edged";
const EVENT = "olcha_dock_change";

/**
 * Shared docked-state hook — all three floating orbs (Avatar, Jarvis, FAB)
 * sync via localStorage + a window custom-event so they hide/restore together.
 */
export function useDockedState() {
  const [edged, setLocal] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      setLocal((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const dock = useCallback(() => {
    setLocal(true);
    try { localStorage.setItem(KEY, "1"); } catch {}
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: true }));
  }, []);

  const undock = useCallback(() => {
    setLocal(false);
    try { localStorage.setItem(KEY, "0"); } catch {}
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: false }));
  }, []);

  return { edged, dock, undock };
}
