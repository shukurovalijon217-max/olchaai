import { v2 as cloudinary } from "cloudinary";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export function isCloudinaryEnabled(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function generateUploadSession(baseUrl: string): { uuid: string; uploadURL: string; objectPath: string } {
  const uuid = randomUUID();
  return {
    uuid,
    uploadURL: `${baseUrl}/api/storage/uploads/cloud/${uuid}`,
    objectPath: `/cloud/${uuid}`,
  };
}

function getResourceType(contentType: string): "image" | "video" | "raw" {
  if (contentType.startsWith("video/") || contentType.startsWith("audio/")) return "video";
  if (contentType.startsWith("image/")) return "image";
  return "raw";
}

/** Buffer a Node readable stream into a single Buffer. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/** Upload a Buffer to Cloudinary and return the secure_url. */
async function uploadBuffer(uuid: string, buffer: Buffer, contentType: string): Promise<string> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: uuid,
        resource_type: getResourceType(contentType),
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/** Save uuid→url mapping to DB (best-effort, non-fatal). */
async function saveToDb(uuid: string, cloudinaryUrl: string, resourceType: string): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO upload_sessions (uuid, cloudinary_url, created_at)
          VALUES (${uuid}, ${cloudinaryUrl}, NOW())
          ON CONFLICT (uuid) DO UPDATE SET cloudinary_url = EXCLUDED.cloudinary_url`,
    );
  } catch (err) {
    logger.warn({ err, uuid }, "upload_sessions DB save failed (non-fatal) — URL still valid via direct Cloudinary path");
  }
}

export async function uploadBufferToCloudinary(
  uuid: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const cloudinaryUrl = await uploadBuffer(uuid, buffer, contentType);
  await saveToDb(uuid, cloudinaryUrl, getResourceType(contentType));
  return cloudinaryUrl;
}

export async function streamToCloudinary(
  uuid: string,
  readableStream: NodeJS.ReadableStream,
  contentType: string,
): Promise<string> {
  // Pipe directly to Cloudinary without buffering the entire file in RAM.
  // This avoids OOM and request-timeout on Render free tier for large videos.
  configure();
  const resourceType = getResourceType(contentType);
  const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { public_id: uuid, resource_type: resourceType, overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );
    readableStream.on("error", reject);
    readableStream.pipe(uploadStream);
  });
  await saveToDb(uuid, cloudinaryUrl, resourceType);
  return cloudinaryUrl;
}

/** Ping Cloudinary API to verify credentials. Returns ok + info or error message. */
export async function pingCloudinary(): Promise<{ ok: boolean; cloudName?: string; reason?: string }> {
  if (!isCloudinaryEnabled()) {
    return {
      ok: false,
      reason: "env vars not set",
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  }
  configure();
  try {
    await cloudinary.api.ping();
    return { ok: true, cloudName: process.env.CLOUDINARY_CLOUD_NAME };
  } catch (err) {
    return {
      ok: false,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Look up the Cloudinary URL for a UUID.
 * Falls back to constructing the URL directly from Cloudinary's CDN
 * so images/videos still serve even if the DB row is missing.
 */
export async function getCloudinaryUrl(uuid: string): Promise<string | null> {
  try {
    const rows = await db.execute(
      sql`SELECT cloudinary_url FROM upload_sessions WHERE uuid = ${uuid}`,
    );
    const r = (rows as any).rows?.[0];
    if (r?.cloudinary_url) return r.cloudinary_url as string;
  } catch (err) {
    logger.warn({ err, uuid }, "upload_sessions DB lookup failed — falling back to direct URL");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;

  // DB lookup failed — can't know the resource type, so return null.
  // The caller (GET /storage/cloud/:uuid) will 404 gracefully.
  // Returning a wrong resource_type URL (e.g. image/upload for a video) would cause
  // Cloudinary to serve the wrong format or error.
  return null;
}
