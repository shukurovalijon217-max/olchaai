/**
 * Cloudflare R2 storage — S3-compatible API.
 * Used for video/media uploads when R2_ACCESS_KEY_ID env var is set.
 * Files are served from media.olchaai.com (custom domain on the bucket).
 */
import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
export function isR2Enabled() {
    return !!(process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_BUCKET_NAME);
}
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID.trim();
    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
        },
        forcePathStyle: false,
    });
}
function getBucketName() {
    return process.env.R2_BUCKET_NAME;
}
function getPublicUrl(key) {
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
export async function r2GetPresignedUploadUrl(contentType, ttlSec = 900) {
    const client = getR2Client();
    const ext = contentTypeToExt(contentType);
    const key = `uploads/${randomUUID()}${ext}`;
    const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ContentType: contentType,
        // NOTE: Do NOT add CacheControl here — it becomes part of the presigned
        // signature and the browser PUT must then send that exact header, which
        // our XHR/fetch upload code does not. Cloudflare edge caching is
        // configured at the bucket/zone level instead.
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
export function r2ObjectPathToPublicUrl(objectPath) {
    if (!objectPath.startsWith("r2://"))
        return null;
    const key = objectPath.slice("r2://".length);
    return getPublicUrl(key);
}
/**
 * Delete an object from R2 by its r2:// objectPath.
 */
export async function r2DeleteObject(objectPath) {
    if (!objectPath.startsWith("r2://"))
        return;
    const key = objectPath.slice("r2://".length);
    const client = getR2Client();
    await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}
/**
 * Check if an r2:// object exists.
 */
export async function r2ObjectExists(objectPath) {
    if (!objectPath.startsWith("r2://"))
        return false;
    const key = objectPath.slice("r2://".length);
    const client = getR2Client();
    try {
        await client.send(new HeadObjectCommand({ Bucket: getBucketName(), Key: key }));
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Upload a raw Buffer directly to R2 (server-side upload).
 * Returns the public CDN URL for the uploaded object.
 *
 * CacheControl is set here directly because the server controls the PUT —
 * no presigned-URL header-echo problem.
 *
 * @param buffer      File content as a Buffer
 * @param key         R2 object key (e.g. "voice-comments/42.webm")
 * @param contentType MIME type of the file
 */
export async function r2UploadBuffer(buffer, key, contentType) {
    const client = getR2Client();
    await client.send(new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        CacheControl: "public, max-age=31536000, immutable",
    }));
    return getPublicUrl(key);
}
/**
 * Finalize a client-side presigned upload by copying the object in-place
 * with the correct Cache-Control metadata so Cloudflare edge-caches it.
 *
 * R2 does not allow PATCH of metadata, so the only way to set it after a
 * presigned PUT is a server-side copy-in-place (same source and destination).
 *
 * @param publicUrl  The public CDN URL returned by r2GetPresignedUploadUrl
 *                   (e.g. "https://media.olchaai.com/uploads/<uuid>.mp4")
 */
export async function r2FinalizeUpload(publicUrl) {
    const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    if (!base || !publicUrl.startsWith(base + "/")) {
        throw new Error(`publicUrl does not match R2_PUBLIC_URL base: ${publicUrl}`);
    }
    const key = publicUrl.slice(base.length + 1); // strip leading "/"
    const bucket = getBucketName();
    const client = getR2Client();
    // HeadObject to read the existing ContentType before the copy, because
    // MetadataDirective=REPLACE resets ALL metadata including Content-Type.
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = head.ContentType ?? "application/octet-stream";
    await client.send(new CopyObjectCommand({
        Bucket: bucket,
        Key: key,
        CopySource: `${bucket}/${key}`,
        MetadataDirective: "REPLACE",
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
    }));
}
function contentTypeToExt(contentType) {
    const map = {
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
