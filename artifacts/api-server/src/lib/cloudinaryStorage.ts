import { v2 as cloudinary } from "cloudinary";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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

export async function uploadBufferToCloudinary(
  uuid: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  configure();

  const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: uuid, resource_type: getResourceType(contentType), overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    stream.end(buffer);
  });

  await db.execute(
    sql`INSERT INTO upload_sessions (uuid, cloudinary_url) VALUES (${uuid}, ${cloudinaryUrl})
        ON CONFLICT (uuid) DO UPDATE SET cloudinary_url = EXCLUDED.cloudinary_url`
  );

  return cloudinaryUrl;
}

export async function streamToCloudinary(
  uuid: string,
  readableStream: NodeJS.ReadableStream,
  contentType: string
): Promise<string> {
  configure();

  const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: uuid,
        resource_type: getResourceType(contentType),
        overwrite: true,
        chunk_size: 6_000_000,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    readableStream.pipe(uploadStream);
    readableStream.on("error", reject);
  });

  await db.execute(
    sql`INSERT INTO upload_sessions (uuid, cloudinary_url) VALUES (${uuid}, ${cloudinaryUrl})
        ON CONFLICT (uuid) DO UPDATE SET cloudinary_url = EXCLUDED.cloudinary_url`
  );

  return cloudinaryUrl;
}

export async function getCloudinaryUrl(uuid: string): Promise<string | null> {
  const rows = await db.execute(
    sql`SELECT cloudinary_url FROM upload_sessions WHERE uuid = ${uuid}`
  );
  const r = (rows as any).rows?.[0];
  return r?.cloudinary_url ?? null;
}
