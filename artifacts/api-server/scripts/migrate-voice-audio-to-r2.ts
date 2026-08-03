/**
 * One-time migration: upload base64 DataURL audio blobs stored in voice_comments.audio_url
 * to Cloudflare R2 and replace them with public CDN URLs.
 *
 * Idempotent — rows that already have an http(s) URL are skipped.
 * Safe to re-run; each comment uses a deterministic R2 key (voice-comments/<id>.<ext>).
 *
 * Usage:
 *   pnpm --filter @workspace/api-server migrate:voice-audio
 *
 * Required env vars: DATABASE_URL (or NEON_DATABASE_URL), R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { db, voiceCommentsTable } from "@workspace/db";
import { like, eq } from "drizzle-orm";
import { r2UploadBuffer, isR2Enabled } from "../src/lib/r2Storage.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function mimeFromDataUrl(dataUrl: string): string {
  // data:<mime>;base64,...
  const m = dataUrl.match(/^data:([^;]+);base64,/);
  return m ? m[1] : "audio/webm";
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Malformed DataURL — no comma separator");
  return Buffer.from(dataUrl.slice(comma + 1), "base64");
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/x-m4a": ".m4a",
  };
  return map[mime] ?? ".webm";
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!isR2Enabled()) {
    console.error("❌  R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_PUBLIC_URL.");
    process.exit(1);
  }

  // Fetch all rows whose audio_url is still a base64 DataURL
  const rows = await db
    .select()
    .from(voiceCommentsTable)
    .where(like(voiceCommentsTable.audioUrl, "data:%"));

  if (rows.length === 0) {
    console.log("✅  No base64 audio blobs found — nothing to migrate.");
    return;
  }

  console.log(`Found ${rows.length} voice comment(s) with base64 audio. Starting migration…\n`);

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    const { id, audioUrl } = row;
    try {
      const mime = mimeFromDataUrl(audioUrl);
      const ext  = extFromMime(mime);
      const key  = `voice-comments/${id}${ext}`;   // deterministic → idempotent
      const buf  = bufferFromDataUrl(audioUrl);

      const publicUrl = await r2UploadBuffer(buf, key, mime);

      await db
        .update(voiceCommentsTable)
        .set({ audioUrl: publicUrl })
        .where(eq(voiceCommentsTable.id, id));

      console.log(`  ✓ [${id}] ${mime} ${(buf.length / 1024).toFixed(1)} KB → ${publicUrl}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ [${id}] failed:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${ok}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
