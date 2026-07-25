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
 * In production, VITE_API_BASE_URL is set to https://olchaai-api.onrender.com
 * so relative paths are prefixed with it. Already-absolute URLs pass through.
 */
export function resolveApiUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const base = (import.meta.env.VITE_API_BASE_URL ?? "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
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
  // Pattern: https://res.cloudinary.com/{cloud}/{type}/upload/{public_id}
  const cloudinaryMatch = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/)(.+)$/);
  if (cloudinaryMatch) {
    return `${cloudinaryMatch[1]}w_${w},q_${q},f_auto/${cloudinaryMatch[2]}`;
  }

  const base = (import.meta.env.VITE_API_BASE_URL ?? "");
  return `${base}/api/media/img?url=${encodeURIComponent(resolveApiUrl(url))}&w=${w}&q=${q}`;
}
