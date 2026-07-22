/**
 * Cloudflare R2 storage — S3-compatible API.
 * Used for video/media uploads when R2_ACCESS_KEY_ID env var is set.
 * Files are served from media.olchaai.com (custom domain on the bucket).
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { Readable } from "stream";

export function isR2Enabled(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID!.trim();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: false,
    // AWS SDK v3 ≥3.750 adds automatic CRC32 checksums which break stream uploads
    // and presigned PUTs from the browser. Disable them for R2 compatibility.
    requestChecksumCalculation: "WHEN_REQUIRED" as any,
    responseChecksumValidation: "WHEN_REQUIRED" as any,
  });
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME!;
}

function getPublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Generate a presigned PUT URL for client-side direct upload to R2.
 *
 * objectPath is returned as the public CDN URL (https://media.olchaai.com/...)
 * so the frontend can store it directly as mediaUrl without any extra resolution.
 *
 * @param contentType MIME type of the file being uploaded
 * @param ttlSec      Presigned URL validity in seconds (default 15 min)
 */
export async function r2GetPresignedUploadUrl(
  contentType: string,
  ttlSec = 900
): Promise<{ uploadURL: string; objectPath: string; publicUrl: string }> {
  const client = getR2Client();
  const ext = contentTypeToExt(contentType);
  const key = `uploads/${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  const uploadURL = await getSignedUrl(client, command, { expiresIn: ttlSec });
  const publicUrl = getPublicUrl(key);

  // objectPath = public CDN URL so frontend stores it directly as mediaUrl
  return { uploadURL, objectPath: publicUrl, publicUrl };
}

/**
 * Resolve an r2:// objectPath to its public CDN URL.
 * Returns null if the path is not an R2 path.
 */
export function r2ObjectPathToPublicUrl(objectPath: string): string | null {
  if (!objectPath.startsWith("r2://")) return null;
  const key = objectPath.slice("r2://".length);
  return getPublicUrl(key);
}

/**
 * Upload a Node.js Readable stream directly to R2 (server-side, no CORS needed).
 * Returns the public CDN URL and objectPath (same value).
 */
export async function r2UploadStream(
  stream: Readable,
  contentType: string,
  contentLength?: number,
): Promise<{ objectPath: string; publicUrl: string }> {
  const client = getR2Client();
  const ext = contentTypeToExt(contentType);
  const key = `uploads/${randomUUID()}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
      Body: stream,
      ...(contentLength ? { ContentLength: contentLength } : {}),
    }),
  );

  const publicUrl = getPublicUrl(key);
  return { objectPath: publicUrl, publicUrl };
}

/**
 * Delete an object from R2 by its r2:// objectPath.
 */
export async function r2DeleteObject(objectPath: string): Promise<void> {
  if (!objectPath.startsWith("r2://")) return;
  const key = objectPath.slice("r2://".length);
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })
  );
}

/**
 * Check if an r2:// object exists.
 */
export async function r2ObjectExists(objectPath: string): Promise<boolean> {
  if (!objectPath.startsWith("r2://")) return false;
  const key = objectPath.slice("r2://".length);
  const client = getR2Client();
  try {
    await client.send(new HeadObjectCommand({ Bucket: getBucketName(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Stream an R2 object directly to the caller — no redirect, no presigned URL.
 * Returns null if the object is not found.
 */
export async function r2StreamObject(
  keyOrUrl: string
): Promise<{ body: Readable; contentType: string; contentLength?: number } | null> {
  const client = getR2Client();
  let key = keyOrUrl;
  if (key.startsWith("r2://")) key = key.slice("r2://".length);
  else if (key.includes("/uploads/")) key = "uploads/" + key.split("/uploads/")[1];
  else if (key.startsWith("uploads/")) { /* already bare key */ }

  try {
    const cmd = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
    const resp = await client.send(cmd);
    if (!resp.Body) return null;
    const body = resp.Body as unknown as Readable;
    const contentType = resp.ContentType ?? "application/octet-stream";
    const contentLength = resp.ContentLength;
    return { body, contentType, contentLength };
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

/**
 * Generate a presigned GET URL for an R2 object.
 * Works with any key format — r2://, full CDN URL, or bare key.
 */
export async function r2GetPresignedDownloadUrl(
  keyOrUrl: string,
  ttlSec = 3600
): Promise<string> {
  const client = getR2Client();
  let key = keyOrUrl;
  // r2://uploads/file.mp4 → uploads/file.mp4
  if (key.startsWith("r2://")) key = key.slice("r2://".length);
  // https://media.olchaai.com/uploads/file.mp4 → uploads/file.mp4
  else if (key.includes("/uploads/")) key = "uploads/" + key.split("/uploads/")[1];
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return getSignedUrl(client, command, { expiresIn: ttlSec });
}

function contentTypeToExt(contentType: string): string {
  const map: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
  };
  return map[contentType] ?? "";
}
