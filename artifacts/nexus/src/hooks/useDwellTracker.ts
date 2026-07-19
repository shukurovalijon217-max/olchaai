import { useEffect, useRef, useCallback } from "react";

const API = (import.meta.env.VITE_API_BASE_URL);

export function useDwellTracker(
  contentType: "post" | "reel",
  contentId: number,
  enabled = true,
) {
  const enterTimeRef = useRef<number | null>(null);
  const sentRef = useRef(false);
  const elRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sendDwell = useCallback(
    (durationMs: number) => {
      if (durationMs < 800 || !contentId) return;
      fetch(`${API}/api/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, interactionType: "view", durationMs }),
        credentials: "include",
      }).catch(() => {});
    },
    [contentType, contentId],
  );

  const setRef = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
  }, []);

  useEffect(() => {
    if (!enabled || !contentId) return;
    const el = elRef.current;
    if (!el) return;

    observerRef.current?.disconnect();
    enterTimeRef.current = null;
    sentRef.current = false;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          enterTimeRef.current = Date.now();
          sentRef.current = false;
        } else if (enterTimeRef.current && !sentRef.current) {
          sentRef.current = true;
          sendDwell(Date.now() - enterTimeRef.current);
          enterTimeRef.current = null;
        }
      },
      { threshold: 0.5 },
    );

    observerRef.current.observe(el);

    return () => {
      if (enterTimeRef.current && !sentRef.current) {
        sentRef.current = true;
        sendDwell(Date.now() - enterTimeRef.current);
      }
      observerRef.current?.disconnect();
    };
  }, [contentType, contentId, enabled, sendDwell]);

  return setRef;
}
