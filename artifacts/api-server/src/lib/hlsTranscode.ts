/**
 * HLS Transcoding Service
 * Converts uploaded videos to HLS format (adaptive streaming) using FFmpeg.
 * HLS segments are stored in GCS and served via /api/reels/hls/:reelId/:filename.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { objectStorageClient } from "./objectStorage";
import { db } from "@workspace/db";
import { reelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const execAsync = promisify(exec);
const SIDECAR = "http://127.0.0.1:1106";

export function parseGcsPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
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

/** Resolve /objects/... path or raw GCS URL to a signed downloadable URL */
async function resolveDownloadUrl(videoUrl: string): Promise<string> {
  if (videoUrl.startsWith("https://") || videoUrl.startsWith("http://")) {
    return videoUrl;
  }
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR not set");
  const entityId = videoUrl.replace(/^\/objects\//, "");
  const fullPath = `${privateDir.replace(/\/$/, "")}/${entityId}`;
  const { bucketName, objectName } = parseGcsPath(fullPath);
  return signGetUrl(bucketName, objectName);
}

export async function transcodeReelToHLS(reelId: number, videoUrl: string): Promise<void> {
  const tmpDir = `/tmp/hls-${reelId}-${randomUUID()}`;
  try {
    logger.info({ reelId }, "HLS transcode: starting");

    const downloadUrl = await resolveDownloadUrl(videoUrl);
    await mkdir(tmpDir, { recursive: true });

    const playlistPath = join(tmpDir, "playlist.m3u8");
    const segPattern = join(tmpDir, "seg_%03d.ts");

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

    // Upload segments to GCS under PRIVATE_OBJECT_DIR/hls/{reelId}/
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

    // HLS served via /api/reels/hls/:reelId/playlist.m3u8
    // Use full URL so it works in production where frontend and API are on different hosts
    const apiBase = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
    const hlsUrl = `${apiBase}/api/reels/hls/${reelId}/playlist.m3u8`;
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
