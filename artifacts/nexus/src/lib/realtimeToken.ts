// Fetches (and caches) the signed token required by the Go real-time WebSocket.
const API = (import.meta.env.VITE_API_BASE_URL || "");

let cached: { token: string; userId: number } | null = null;
let inflight: Promise<string | null> | null = null;

export function getRealtimeToken(userId: number): Promise<string | null> {
  if (cached && cached.userId === userId) return Promise.resolve(cached.token);
  if (inflight) return inflight;
  inflight = fetch(`${API}/api/auth/realtime-token`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) return null;
      const d = await res.json();
      if (typeof d.token === "string" && d.token) {
        cached = { token: d.token, userId };
        return d.token as string;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

export function clearRealtimeToken() {
  cached = null;
}
