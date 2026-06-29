import { useState, useCallback, useEffect } from "react";

function makeKey(side: "left" | "right") {
  return {
    KEY:   `olcha_dock_edged_${side}`,
    EVENT: `olcha_dock_change_${side}`,
  };
}

/**
 * Docked-state hook per side ("left" | "right").
 * Muni on OTube uses "left"; Avatar + FAB always use "right".
 */
export function useDockedState(side: "left" | "right" = "right") {
  const { KEY, EVENT } = makeKey(side);

  const [edged, setLocal] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => setLocal((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [EVENT]);

  const dock = useCallback(() => {
    setLocal(true);
    try { localStorage.setItem(KEY, "1"); } catch {}
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: true }));
  }, [KEY, EVENT]);

  const undock = useCallback(() => {
    setLocal(false);
    try { localStorage.setItem(KEY, "0"); } catch {}
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: false }));
  }, [KEY, EVENT]);

  return { edged, dock, undock };
}
