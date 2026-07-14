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
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export function isR2Enabled(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME
  );
}

let _r2Client: S3Client | null = null;
function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;
  const accountId = process.env.R2_ACCOUNT_ID!.trim();
  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: false,
  });
  return _r2Client;
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
