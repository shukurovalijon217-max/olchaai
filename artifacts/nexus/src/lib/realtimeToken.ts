// Fetches (and caches) the signed token required by the Go real-time WebSocket.
const API = (import.meta.env.VITE_API_BASE_URL || "");

let cached: { token: string; userId: number } | null = null;
let inflight: { promise: Promise<string | null>; userId: number } | null = null;

export function getRealtimeToken(userId: number): Promise<string | null> {
  if (cached && cached.userId === userId) return Promise.resolve(cached.token);
  if (inflight && inflight.userId === userId) return inflight.promise;
  const promise = fetch(`${API}/api/auth/realtime-token`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) return null;
      const d = await res.json();
      if (typeof d.token === "string" && d.token) {
        // Token format is "userId:hmac16" — verify it belongs to the requested user
        // (guards against caching another identity during rapid account switching).
        if (d.token.split(":")[0] !== String(userId)) return null;
        cached = { token: d.token, userId };
        return d.token as string;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      if (inflight && inflight.userId === userId) inflight = null;
    });
  inflight = { promise, userId };
  return promise;
}

export function clearRealtimeToken() {
  cached = null;
  inflight = null;
}
