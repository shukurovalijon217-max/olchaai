/**
 * HLS Adaptive Bitrate Transcoding Service
 * YouTube/TikTok-style: 3 quality renditions (360p / 720p / 1080p)
 * with a master playlist for automatic quality switching.
 *
 * Storage strategy (in priority order):
 *   1. Cloudflare R2  — when R2_* env vars are set (production on Render)
 *   2. Replit GCS sidecar — when PRIVATE_OBJECT_DIR is set (dev on Replit)
 */
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile, rm, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { reelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const execAsync = promisify(exec);

/* ── Quality renditions ────────────────────────────────────────── */
const RENDITIONS = [
  { name: "360p",  scale: "640:-2",  crf: 30, videoBr: "500k",  audioBr: "64k",  bandwidth: 600_000  },
  { name: "720p",  scale: "1280:-2", crf: 26, videoBr: "2000k", audioBr: "96k",  bandwidth: 2_200_000 },
  { name: "1080p", scale: "1920:-2", crf: 23, videoBr: "4500k", audioBr: "128k", bandwidth: 5_000_000 },
] as const;

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

async function uploadDirToR2(reelId: number, dir: string, prefix: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const files = await readdir(dir);
  await Promise.all(
    files.map(async (filename) => {
      const data = await readFile(join(dir, filename));
      const contentType = filename.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/MP2T";
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${filename}`,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      }));
    }),
  );
}

async function uploadHlsToR2(reelId: number, tmpDir: string): Promise<string> {
  const hlsPrefix = `hls/${reelId}`;

  // Upload master playlist
  const masterData = await readFile(join(tmpDir, "master.m3u8"));
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `${hlsPrefix}/master.m3u8`,
    Body: masterData,
    ContentType: "application/vnd.apple.mpegurl",
    CacheControl: "public, max-age=60",
  }));

  // Upload each rendition
  await Promise.all(
    RENDITIONS.map(r => uploadDirToR2(reelId, join(tmpDir, r.name), `${hlsPrefix}/${r.name}`))
  );

  return r2PublicUrl(`${hlsPrefix}/master.m3u8`);
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

async function uploadDirToGcs(bucket: any, dir: string, prefix: string): Promise<void> {
  const files = await readdir(dir);
  await Promise.all(
    files.map(async (filename) => {
      const data = await readFile(join(dir, filename));
      const contentType = filename.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/MP2T";
      await bucket.file(`${prefix}/${filename}`).save(data, { contentType });
    }),
  );
}

async function uploadHlsToGcs(reelId: number, tmpDir: string): Promise<string> {
  const { objectStorageClient } = await import("./objectStorage");
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  const { bucketName, objectName: bucketPrefix } = parseGcsPath(privateDir);
  const bucket = objectStorageClient.bucket(bucketName);
  const hlsPrefix = `${bucketPrefix}/hls/${reelId}`;

  // Upload master playlist
  const masterData = await readFile(join(tmpDir, "master.m3u8"));
  await bucket.file(`${hlsPrefix}/master.m3u8`).save(masterData, { contentType: "application/vnd.apple.mpegurl" });

  // Upload each rendition
  await Promise.all(
    RENDITIONS.map(r => uploadDirToGcs(bucket, join(tmpDir, r.name), `${hlsPrefix}/${r.name}`))
  );

  const apiBase = (process.env.API_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").replace(/\/$/, "");
  return `${apiBase}/api/reels/hls/${reelId}/master.m3u8`;
}

/** Resolve /objects/... path or raw URL to a downloadable URL */
async function resolveDownloadUrl(videoUrl: string): Promise<string> {
  if (videoUrl.startsWith("https://") || videoUrl.startsWith("http://")) {
    return videoUrl;
  }
  const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
  if (!privateDir) throw new Error("Cannot resolve video URL: PRIVATE_OBJECT_DIR not set");
  const entityId = videoUrl.replace(/^\/objects\//, "");
  const fullPath = `${privateDir.replace(/\/$/, "")}/${entityId}`;
  const { bucketName, objectName } = parseGcsPath(fullPath);
  return signGetUrl(bucketName, objectName);
}

/** Transcode one rendition into its own subdirectory */
async function transcodeRendition(
  downloadUrl: string,
  rendition: typeof RENDITIONS[number],
  tmpDir: string,
): Promise<void> {
  const outDir = join(tmpDir, rendition.name);
  await mkdir(outDir, { recursive: true });

  const playlist = join(outDir, "playlist.m3u8");
  const segPattern = join(outDir, "seg_%03d.ts");

  const cmd = [
    "ffmpeg -y",
    `-i ${JSON.stringify(downloadUrl)}`,
    `-c:v libx264 -preset veryfast -crf ${rendition.crf}`,
    `-b:v ${rendition.videoBr} -maxrate ${rendition.videoBr} -bufsize ${rendition.videoBr}`,
    `-vf "scale=${rendition.scale},format=yuv420p"`,
    `-c:a aac -b:a ${rendition.audioBr}`,
    `-hls_time 4`,
    `-hls_playlist_type vod`,
    `-hls_flags independent_segments`,
    `-hls_segment_filename ${JSON.stringify(segPattern)}`,
    JSON.stringify(playlist),
  ].join(" ");

  await execAsync(cmd, { timeout: 10 * 60_000, maxBuffer: 50 * 1024 * 1024 });
}

/** Build HLS master playlist referencing all renditions */
async function buildMasterPlaylist(tmpDir: string): Promise<void> {
  const lines: string[] = ["#EXTM3U", "#EXT-X-VERSION:3", ""];

  for (const r of RENDITIONS) {
    // Read rendition playlist to get actual resolution
    const renditionPlaylist = join(tmpDir, r.name, "playlist.m3u8");
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.scale.replace(":-2", "x" + (r.name === "360p" ? "360" : r.name === "720p" ? "720" : "1080"))},NAME="${r.name}"`,
      `${r.name}/playlist.m3u8`,
      "",
    );
  }

  await writeFile(join(tmpDir, "master.m3u8"), lines.join("\n"), "utf-8");
}

export async function transcodeReelToHLS(reelId: number, videoUrl: string): Promise<void> {
  const tmpDir = `/tmp/hls-${reelId}-${randomUUID()}`;
  try {
    logger.info({ reelId, storage: isR2Enabled() ? "r2" : "gcs" }, "HLS adaptive transcode: starting 3 renditions");

    const downloadUrl = await resolveDownloadUrl(videoUrl);
    await mkdir(tmpDir, { recursive: true });

    // Transcode all renditions in parallel for speed
    await Promise.all(
      RENDITIONS.map(r => transcodeRendition(downloadUrl, r, tmpDir))
    );

    // Build master playlist
    await buildMasterPlaylist(tmpDir);

    // Upload to storage
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

    logger.info({ reelId, hlsUrl }, "HLS adaptive transcode: complete (360p/720p/1080p)");
  } catch (err) {
    logger.error({ err, reelId }, "HLS adaptive transcode: failed");
    await db
      .update(reelsTable)
      .set({ hlsStatus: "error" } as Record<string, unknown>)
      .where(eq(reelsTable.id, reelId))
      .catch(() => {});
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
