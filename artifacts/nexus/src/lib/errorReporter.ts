/* Global frontend error reporter — sends uncaught errors and unhandled
   promise rejections to the API so production failures are visible in
   server logs without waiting for user screenshots.
   Deduped per session, capped at 10 reports, fire-and-forget. */

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const seen = new Set<string>();
let sent = 0;
const MAX_REPORTS = 10;

/* Noise we can't act on (extensions, cross-origin scripts, network flakiness) */
const IGNORE = [
  /Script error\.?/i,
  /ResizeObserver loop/i,
  /Load failed/i,
  /NetworkError/i,
  /Failed to fetch/i,
  /AbortError/i,
  /extension:\/\//i,
];

function report(message: string, stack?: string) {
  if (sent >= MAX_REPORTS) return;
  const msg = String(message || "").slice(0, 500);
  if (!msg || IGNORE.some(re => re.test(msg))) return;
  const key = msg.slice(0, 120);
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  try {
    const body = JSON.stringify({ message: msg, stack: stack?.slice(0, 3000), url: location.href.slice(0, 500) });
    // sendBeacon survives page unloads; fall back to fetch
    if (!navigator.sendBeacon?.(`${API}/api/client-errors`, new Blob([body], { type: "application/json" }))) {
      fetch(`${API}/api/client-errors`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* reporting must never break the app */ }
}

export function initErrorReporter() {
  window.addEventListener("error", (e) => {
    report(e.message || String(e.error), e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    report(r?.message || String(r), r?.stack);
  });
}
