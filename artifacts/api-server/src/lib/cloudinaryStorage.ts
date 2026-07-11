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

export async function uploadBufferToCloudinary(
  uuid: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  configure();

  const resourceType: "image" | "video" | "raw" = contentType.startsWith("video/")
    ? "video"
    : contentType.startsWith("audio/")
    ? "video"
    : contentType.startsWith("image/")
    ? "image"
    : "raw";

  const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: uuid, resource_type: resourceType, overwrite: true },
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

export async function getCloudinaryUrl(uuid: string): Promise<string | null> {
  const rows = await db.execute(
    sql`SELECT cloudinary_url FROM upload_sessions WHERE uuid = ${uuid}`
  );
  const r = (rows as any).rows?.[0];
  return r?.cloudinary_url ?? null;
}
