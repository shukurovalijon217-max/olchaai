import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a WebP-optimized image URL via /api/media/img proxy.
 * Falls back to the original URL for videos, blobs, data URIs, or empty strings.
 * @param url   Original image URL (GCS presigned or CDN)
 * @param width Resize width in px (default 800)
 * @param quality WebP quality 20-100 (default 80)
 */
export function imgOptUrl(url: string | null | undefined, width = 800, quality = 80): string {
  if (!url) return "";
  // Skip non-image or local resources
  if (url.startsWith("blob:") || url.startsWith("data:") || url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")) {
    return url;
  }
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/media/img?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
