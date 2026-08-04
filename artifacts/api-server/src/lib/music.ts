/**
 * Music search — multi-provider with automatic fallback
 *
 * Priority:
 *   1. Audius discovery network  (free, full tracks, no key)
 *   2. Jamendo API               (free, legal, requires free client_id)
 *   3. Free Music Archive        (CC-licensed, JSON feed)
 *
 * Env var:  JAMENDO_CLIENT_ID  (defaults to public sandbox key)
 */

export interface MusicResult {
  id: string;
  name: string;
  artist: string;
  title: string;
  album: string;
  artwork: string;
  preview: string;   // proxied through our API
  duration: number;
  full: boolean;
  source: "audius" | "jamendo" | "fma";
}

/* ─── Audius ──────────────────────────────────────────────────── */
export const AUDIUS_HOSTS = [
  "https://api.audius.co",
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
  "https://dn1.monophonic.digital",
  "https://dn2.monophonic.digital",
];
const AUDIUS_APP = "gilosai";

/**
 * Fetch a fresh list of live Audius discovery nodes from the registry.
 * https://api.audius.co returns { "data": ["https://...", ...] }
 * Falls back to the static AUDIUS_HOSTS list if the registry is unreachable.
 */
export async function fetchAudiusHosts(): Promise<string[]> {
  try {
    const r = await fetch("https://api.audius.co", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return AUDIUS_HOSTS;
    const d = await r.json() as { data?: string[] };
    const hosts = (d.data ?? []).filter((h: string) => typeof h === "string" && h.startsWith("https://"));
    return hosts.length > 0 ? hosts : AUDIUS_HOSTS;
  } catch {
    return AUDIUS_HOSTS;
  }
}

export async function audiusSearch(q: string, limit = 40, hosts?: string[]): Promise<any[]> {
  const searchHosts = hosts ?? AUDIUS_HOSTS;
  for (const host of searchHosts) {
    try {
      const r = await fetch(
        `${host}/v1/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}&app_name=${AUDIUS_APP}`,
        { signal: AbortSignal.timeout(10000), redirect: "follow" },
      );
      if (!r.ok) continue;
      const d = await r.json() as { data?: any[] };
      if ((d.data ?? []).length > 0) return d.data!;
    } catch { /* try next */ }
  }
  return [];
}

export async function audiusStream(id: string): Promise<Response | null> {
  for (const host of AUDIUS_HOSTS) {
    try {
      const r = await fetch(
        `${host}/v1/tracks/${id}/stream?app_name=${AUDIUS_APP}`,
        { signal: AbortSignal.timeout(20000), redirect: "follow" },
      );
      if (!r.ok || !r.body) continue;
      const ct = r.headers.get("content-type") ?? "audio/mpeg";
      if (ct.includes("text/html")) continue;
      return r;
    } catch { /* try next */ }
  }
  return null;
}

/* ─── Jamendo ─────────────────────────────────────────────────── */
// Free tier: 5,000 requests/day. Register at https://devportal.jamendo.com
const JAMENDO_CLIENT_ID = process.env["JAMENDO_CLIENT_ID"] ?? "b6747d04";

export async function jamendoSearch(q: string, limit = 40): Promise<MusicResult[]> {
  try {
    const url = new URL("https://api.jamendo.com/v3.0/tracks/");
    url.searchParams.set("client_id", JAMENDO_CLIENT_ID);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("search", q);
    url.searchParams.set("audioformat", "mp32");
    url.searchParams.set("include", "musicinfo");
    url.searchParams.set("order", "popularity_total");
    url.searchParams.set("audiodlformat", "mp32");

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json() as { results?: any[] };
    return (d.results ?? []).map(t => ({
      id:       `jm_${t.id}`,
      name:     `${t.artist_name} — ${t.name}`,
      artist:   t.artist_name ?? "Unknown",
      title:    t.name ?? "",
      album:    t.album_name ?? "",
      artwork:  t.album_image ?? t.image ?? "",
      preview:  t.audio ?? "",   // direct Jamendo CDN URL
      duration: t.duration ?? 0,
      full:     true,
      source:   "jamendo" as const,
    })).filter(t => t.preview);
  } catch {
    return [];
  }
}

/* ─── Unified search (Audius → Jamendo fallback) ─────────────── */
export async function searchMusic(q: string, limit = 40, hosts?: string[]): Promise<{
  results: MusicResult[];
  source: "audius" | "jamendo" | "empty";
}> {
  // 1. Try Audius
  const audiusTracks = await audiusSearch(q, limit, hosts);
  if (audiusTracks.length > 0) {
    const results = audiusTracks
      .filter(t => t.id)
      .map(t => {
        const artObj = t.artwork ?? {};
        return {
          id:       `au_${t.id}`,
          name:     `${t.user?.name ?? "Unknown"} — ${t.title}`,
          artist:   t.user?.name ?? "Unknown",
          title:    t.title ?? "",
          album:    "",
          artwork:  artObj["150x150"] ?? artObj["480x480"] ?? artObj["_150x150"] ?? "",
          preview:  `/api/music/stream/${t.id}`,
          duration: t.duration ?? 0,
          full:     true,
          source:   "audius" as const,
        };
      });
    return { results, source: "audius" };
  }

  // 2. Audius failed — fall back to Jamendo
  const jamendoResults = await jamendoSearch(q, limit);
  if (jamendoResults.length > 0) {
    return { results: jamendoResults, source: "jamendo" };
  }

  return { results: [], source: "empty" };
}
