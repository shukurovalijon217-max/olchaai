import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Reads the browser's Network Information API (when available) to classify
 * the user's current connection. Falls back to "fast" when unsupported —
 * most desktop browsers (Safari, Firefox) don't expose navigator.connection.
 */
export type NetworkTier = "slow" | "medium" | "fast";

export function getNetworkTier(): NetworkTier {
  const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
  if (!conn) return "fast";
  if (conn.saveData) return "slow";
  const type = conn.effectiveType as string | undefined;
  if (type === "slow-2g" || type === "2g") return "slow";
  if (type === "3g") return "medium";
  return "fast";
}

/**
 * Returns a WebP-optimized image URL via /api/media/img proxy.
 * Falls back to the original URL for videos, blobs, data URIs, or empty strings.
 * Automatically scales width/quality down on slow connections (Network
 * Information API / Data Saver) so users on weak mobile internet load less data.
 * @param url   Original image URL (GCS presigned or CDN)
 * @param width Resize width in px (default 800)
 * @param quality WebP quality 20-100 (default 80)
 */
/**
 * Resolves a URL that may be a relative `/api/...` path stored in the DB.
 * media.olchaai.com URLs are served directly via Cloudflare → R2 (no Railway hop).
 */
// R2 public CDN domain — matches Cloudflare DNS record (media.olchaai.com → R2 bucket)
const R2_DOMAIN = "media.olchaai.com";
// Guarded base: VITE_API_BASE_URL may be undefined in some build configs
const API_BASE: string = "";

export function resolveApiUrl(url: string | null | undefined): string {
  if (!url) return "";
  // R2 public CDN → serve directly through Cloudflare (no Railway proxy hop needed)
  if (url.includes(R2_DOMAIN)) {
    return url; // https://media.olchaai.com/... → Cloudflare → R2 directly
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export function imgOptUrl(url: string | null | undefined, width = 800, quality = 80): string {
  if (!url) return "";
  // Skip non-image or local resources
  if (url.startsWith("blob:") || url.startsWith("data:") || url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")) {
    return url;
  }
  const tier = getNetworkTier();
  let w = width;
  let q = quality;
  if (tier === "slow") {
    w = Math.round(width * 0.55);
    q = Math.min(quality, 45);
  } else if (tier === "medium") {
    w = Math.round(width * 0.8);
    q = Math.min(quality, 65);
  }

  // Cloudinary URLs: use native transformation parameters directly (no proxy needed)
  const cloudinaryMatch = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/)(.+)$/);
  if (cloudinaryMatch) {
    return `${cloudinaryMatch[1]}w_${w},q_${q},f_auto/${cloudinaryMatch[2]}`;
  }

  // Relative URLs (stored in DB as /api/storage/objects/... or /api/storage/uploads/...)
  // must be served directly — the media proxy cannot parse relative URLs.
  if (url.startsWith("/")) {
    return resolveApiUrl(url);
  }

  // R2 public CDN (media.olchaai.com) — served directly via Cloudflare, no proxy needed
  if (url.includes(R2_DOMAIN)) {
    return url;
  }

  // Only proxy other absolute CDN URLs through the WebP optimizer.
  const base = "";
  return `${base}/api/media/img?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}
