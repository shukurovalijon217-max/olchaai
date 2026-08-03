/**
 * assertMediaUrl — validates that a media URL is a full HTTPS URL before it
 * can be persisted to the database.
 *
 * Three historical bugs this prevents:
 *   1. Double-URL: "/api/storage" + "https://media.olchaai.com/…"
 *   2. Relative path stored: "/api/storage/objects/uploads/UUID"
 *   3. Double path: "/api/storage/objects/objects/uploads/UUID"
 *
 * Throws a descriptive Error (caught by route try/catch → 500) when the URL
 * is present but invalid. Silently passes when the value is null/undefined/""
 * because many media fields are optional.
 */
export function assertMediaUrl(url: unknown, field = "mediaUrl"): void {
  if (url == null || url === "") return; // optional — absence is fine
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error(
      `[assertMediaUrl] Invalid ${field}: expected a full HTTPS URL, got "${String(url).slice(0, 120)}". ` +
      "This is a server-side bug — the upload pipeline returned a non-absolute URL."
    );
  }
}

/** Convenience: validate every entry in an array of media URLs. */
export function assertMediaUrls(urls: unknown, field = "mediaUrls"): void {
  if (urls == null) return;
  if (!Array.isArray(urls)) {
    throw new Error(`[assertMediaUrl] ${field} must be an array, got ${typeof urls}`);
  }
  urls.forEach((u, i) => assertMediaUrl(u, `${field}[${i}]`));
}
