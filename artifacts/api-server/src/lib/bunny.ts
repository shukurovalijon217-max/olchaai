/**
 * Bunny.net CDN — Pull Zone URL rewriting helper.
 *
 * Setup (one-time, in Bunny.net dashboard):
 *   1. Create a Pull Zone
 *   2. Set "Origin URL" to your R2_PUBLIC_URL (e.g. https://media.olchaai.com)
 *   3. Copy the CDN hostname (e.g. olcha.b-cdn.net or video.olchaai.com)
 *   4. Set env var: BUNNY_CDN_HOSTNAME=video.olchaai.com
 *
 * How it works:
 *   rewriteToBunnyCDN("https://media.olchaai.com/uploads/abc.mp4")
 *   → "https://video.olchaai.com/uploads/abc.mp4"
 *
 * Bunny.net then serves the file from its global PoP closest to the user.
 * On first request it fetches from origin (R2), then caches indefinitely.
 */

const bunnyCdnHost = (process.env.BUNNY_CDN_HOSTNAME ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const r2PublicHost = (process.env.R2_PUBLIC_URL ?? "").replace(/^https?:\/\//, "").split("/")[0] ?? "";

/** Returns true when Bunny CDN is configured via env vars. */
export function isBunnyEnabled(): boolean {
  return bunnyCdnHost.length > 0 && r2PublicHost.length > 0;
}

/**
 * Rewrites an R2 media URL to its Bunny CDN equivalent.
 * Pass-through (unchanged) if:
 *  - Bunny is not configured
 *  - URL is null/undefined/relative
 *  - URL does not originate from R2_PUBLIC_URL
 */
export function rewriteToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url || !isBunnyEnabled()) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === r2PublicHost) {
      parsed.hostname = bunnyCdnHost;
      /* Bunny CDN always serves over HTTPS */
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch { /* malformed URL — return as-is */ }
  return url;
}

/**
 * Rewrites only video-type URLs (mp4, mov, webm, m3u8, ts).
 * Thumbnails and profile images are left for the WebP proxy.
 */
const VIDEO_EXT = /\.(mp4|mov|webm|m3u8|ts)(\?.*)?$/i;

export function rewriteVideoToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!VIDEO_EXT.test(url.split("?")[0]!)) return url;
  return rewriteToBunnyCDN(url);
}
