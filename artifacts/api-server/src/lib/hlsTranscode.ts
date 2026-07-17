/**
 * HLS Transcoding Service
 * Converts uploaded videos to HLS format (adaptive streaming) using FFmpeg.
 *
 * Storage strategy (in priority order):
 *   1. Cloudflare R2  — when R2_* env vars are set (production on Render)
 *   2. Replit GCS sidecar — when PRIVATE_OBJECT_DIR is set (dev on Replit)
 *
 * HLS segments are served directly from R2 public URL in production.
 * In dev (Replit) they're served via /api/reels/hls/:reelId/:filename.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { reelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const execAsync = promisify(exec);

/* ── R2 helpers ──────────────────────────────────────────────── */
function isR2Enabled(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: false,
    requestChecksumCalculation: "WHEN_REQUIRED" as any,
    responseChecksumValidation: "WHEN_REQUIRED" as any,
  });
}

function r2PublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

async function uploadHlsToR2(reelId: number, tmpDir: string): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const prefix = `hls/${reelId}`;

  const files = await readdir(tmpDir);
  await Promise.all(
    files.map(async (filename) => {
      const data = await readFile(join(tmpDir, filename));
      const contentType = filename.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/MP2T";
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${filename}`,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000", // segments are immutable
      }));
    }),
  );

  // Return the public URL of the playlist
  return r2PublicUrl(`${prefix}/playlist.m3u8`);
}

/* ── Replit GCS sidecar helpers (dev only) ───────────────────── */
const SIDECAR = "http://127.0.0.1:1106";

export function parseGcsPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1]!, objectName: parts.slice(2).join("/") };
}

async function signGetUrl(bucketName: string, objectName: string): Promise<string> {
  const resp = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "GET",
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`Sign failed: ${resp.status}`);
  return ((await resp.json()) as { signed_url: string }).signed_url;
}

async function uploadHlsToGcs(reelId: number, tmpDir: string): Promise<string> {
  const { objectStorageClient } = await import("./objectStorage");
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  const { bucketName, objectName: bucketPrefix } = parseGcsPath(privateDir);
  const bucket = objectStorageClient.bucket(bucketName);
  const hlsPrefix = `${bucketPrefix}/hls/${reelId}`;

  const files = await readdir(tmpDir);
  await Promise.all(
    files.map(async (filename) => {
      const data = await readFile(join(tmpDir, filename));
      const contentType = filename.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/MP2T";
      await bucket.file(`${hlsPrefix}/${filename}`).save(data, { contentType });
    }),
  );

  const apiBase = (process.env.API_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").replace(/\/$/, "");
  return `${apiBase}/api/reels/hls/${reelId}/playlist.m3u8`;
}

/** Resolve /objects/... path or raw URL to a downloadable URL */
async function resolveDownloadUrl(videoUrl: string): Promise<string> {
  // R2 public URLs and any https:// URL are already directly downloadable
  if (videoUrl.startsWith("https://") || videoUrl.startsWith("http://")) {
    return videoUrl;
  }
  // Replit /objects/... path — sign via GCS sidecar
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!privateDir) throw new Error("Cannot resolve video URL: PRIVATE_OBJECT_DIR not set and URL is not http(s)");
  const entityId = videoUrl.replace(/^\/objects\//, "");
  const fullPath = `${privateDir.replace(/\/$/, "")}/${entityId}`;
  const { bucketName, objectName } = parseGcsPath(fullPath);
  return signGetUrl(bucketName, objectName);
}

export async function transcodeReelToHLS(reelId: number, videoUrl: string): Promise<void> {
  const tmpDir = `/tmp/hls-${reelId}-${randomUUID()}`;
  try {
    logger.info({ reelId, storage: isR2Enabled() ? "r2" : "gcs" }, "HLS transcode: starting");

    const downloadUrl = await resolveDownloadUrl(videoUrl);
    await mkdir(tmpDir, { recursive: true });

    const playlistPath = join(tmpDir, "playlist.m3u8");
    const segPattern   = join(tmpDir, "seg_%03d.ts");

    // Single-quality HLS: max 720p, fast preset, optimized for mobile
    const cmd = `ffmpeg -y -i ${JSON.stringify(downloadUrl)} \
      -c:v libx264 -preset veryfast -crf 28 \
      -vf "scale='min(1280,iw)':-2" \
      -c:a aac -b:a 96k \
      -hls_time 6 \
      -hls_playlist_type vod \
      -hls_flags independent_segments \
      -hls_segment_filename ${JSON.stringify(segPattern)} \
      ${JSON.stringify(playlistPath)}`;

    await execAsync(cmd, { timeout: 8 * 60_000, maxBuffer: 50 * 1024 * 1024 });

    // Upload to the available storage backend
    let hlsUrl: string;
    if (isR2Enabled()) {
      hlsUrl = await uploadHlsToR2(reelId, tmpDir);
    } else {
      hlsUrl = await uploadHlsToGcs(reelId, tmpDir);
    }

    await db
      .update(reelsTable)
      .set({ hlsUrl, hlsStatus: "done" } as Record<string, unknown>)
      .where(eq(reelsTable.id, reelId));

    logger.info({ reelId, hlsUrl }, "HLS transcode: complete");
  } catch (err) {
    logger.error({ err, reelId }, "HLS transcode: failed");
    await db
      .update(reelsTable)
      .set({ hlsStatus: "error" } as Record<string, unknown>)
      .where(eq(reelsTable.id, reelId))
      .catch(() => {});
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
