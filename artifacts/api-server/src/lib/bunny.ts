/**
 * Bunny.net CDN — Pull Zone URL rewriting helper.
 *
 * Setup (one-time, in Bunny.net dashboard):
 *   1. Create a Pull Zone
 *   2. Set "Origin URL" to your R2_PUBLIC_URL (e.g. https://media.olchaai.com)
 *   3. Copy the CDN hostname (e.g. olcha.b-cdn.net or media.olchaai.com)
 *   4. Set env var: BUNNY_CDN_HOSTNAME=media.olchaai.com
 *
 * How it works:
 *   rewriteToBunnyCDN("https://pub.olchaai.com/uploads/abc.mp4")
 *   → "https://media.olchaai.com/uploads/abc.mp4"
 *
 * Bunny.net serves files from its 120+ PoP (Points of Presence) globally.
 * On first request it fetches from origin (R2), then caches at the edge.
 */

const bunnyCdnHost = (process.env.BUNNY_CDN_HOSTNAME ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const r2PublicHost = (process.env.R2_PUBLIC_URL ?? "").replace(/^https?:\/\//, "").split("/")[0] ?? "";

/** Returns true when Bunny CDN is configured via env vars. */
export function isBunnyEnabled(): boolean {
  return bunnyCdnHost.length > 0 && r2PublicHost.length > 0;
}

/**
 * Rewrites any R2 media URL to its Bunny CDN equivalent.
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
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch { /* malformed URL — return as-is */ }
  return url;
}

/** Video file extensions served via Bunny CDN */
const VIDEO_EXT = /\.(mp4|mov|webm|m3u8|ts)(\?.*)?$/i;

/** Image file extensions served via Bunny CDN */
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)(\?.*)?$/i;

/** Audio file extensions served via Bunny CDN */
const AUDIO_EXT = /\.(mp3|ogg|wav|aac|m4a)(\?.*)?$/i;

/**
 * Rewrites only video-type URLs (mp4, mov, webm, m3u8, ts).
 */
export function rewriteVideoToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!VIDEO_EXT.test(url.split("?")[0]!)) return url;
  return rewriteToBunnyCDN(url);
}

/**
 * Rewrites image URLs (jpg, png, webp, avif, gif, svg).
 * Use for profile pictures, post images, marketplace photos, thumbnails.
 */
export function rewriteImageToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!IMAGE_EXT.test(url.split("?")[0]!)) return url;
  return rewriteToBunnyCDN(url);
}

/**
 * Rewrites audio URLs (mp3, ogg, wav, aac, m4a).
 * Use for voice comments, audio messages, sound notifications.
 */
export function rewriteAudioToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!AUDIO_EXT.test(url.split("?")[0]!)) return url;
  return rewriteToBunnyCDN(url);
}

/**
 * Rewrites ANY media URL (video + image + audio) via Bunny CDN.
 * Use this for generic media responses where the type is unknown.
 */
export function rewriteAllMediaToBunnyCDN(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  return rewriteToBunnyCDN(url);
}

/**
 * Rewrites all CDN-eligible fields in a media object.
 * Handles: videoUrl, hlsUrl, thumbnailUrl, avatarUrl, imageUrl, audioUrl, coverUrl
 */
export function enrichWithCDN<T extends Record<string, unknown>>(obj: T): T {
  if (!isBunnyEnabled()) return obj;
  const cdnFields: (keyof T)[] = [
    "videoUrl", "hlsUrl", "thumbnailUrl", "avatarUrl",
    "imageUrl", "audioUrl", "coverUrl", "bannerUrl",
    "profilePicUrl", "mediaUrl", "previewUrl",
  ] as (keyof T)[];
  const result = { ...obj };
  for (const field of cdnFields) {
    if (typeof result[field] === "string") {
      (result as Record<keyof T, unknown>)[field] = rewriteAllMediaToBunnyCDN(result[field] as string);
    }
  }
  return result;
}
