import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import {
  isCloudinaryEnabled,
  generateUploadSession,
  streamToCloudinary,
  getCloudinaryUrl,
  pingCloudinary,
} from "../lib/cloudinaryStorage";
import {
  isR2Enabled,
  r2GetPresignedUploadUrl,
} from "../lib/r2Storage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * When Cloudinary is configured, returns a server-proxy upload URL.
 * Otherwise falls back to Replit Object Storage (dev only).
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    // Priority 1: Cloudflare R2 (production CDN)
    // objectPath is the public CDN URL so the frontend can store it as mediaUrl directly.
    if (isR2Enabled()) {
      const { uploadURL, objectPath } = await r2GetPresignedUploadUrl(contentType);
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
      return;
    }

    // Priority 2: Cloudinary proxy upload
    if (isCloudinaryEnabled()) {
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = req.headers.host || "";
      const baseUrl = `${proto}://${host}`;
      const { uploadURL, objectPath } = generateUploadSession(baseUrl);
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
      return;
    }

    // Priority 3: Replit Object Storage (dev fallback)
    const isReplit = !!(process.env["REPLIT_CLUSTER"] || process.env["REPLIT_DEPLOYMENT"] || process.env["REPLIT_DB_URL"] || process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"]);
    if (!isReplit) {
      req.log.warn("Upload attempted without R2/Cloudinary configured");
      res.status(503).json({
        error: "Fayl yuklash sozlanmagan. R2_ACCESS_KEY_ID yoki CLOUDINARY_CLOUD_NAME env varlarini o'rnating.",
      });
      return;
    }

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/cloudinary-check
 * Diagnostics: verify Cloudinary credentials are valid.
 */
router.get("/storage/cloudinary-check", async (req: Request, res: Response) => {
  if (!isCloudinaryEnabled()) {
    res.json({
      ok: false,
      reason: "env vars not set",
      vars: {
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      },
    });
    return;
  }
  const result = await pingCloudinary();
  res.json(result);
});

/**
 * PUT /storage/uploads/cloud/:uuid
 *
 * Cloudinary proxy upload endpoint.
 * Client PUTs raw file body here; server streams it to Cloudinary.
 */
router.put("/storage/uploads/cloud/:uuid", async (req: Request, res: Response) => {
  const uuidParam = req.params.uuid;
  const uuid = Array.isArray(uuidParam) ? uuidParam[0] : uuidParam;
  const contentType = (req.headers["content-type"] as string) || "application/octet-stream";

  try {
    const cloudinaryUrl = await streamToCloudinary(uuid, req, contentType);
    res.status(200).json({ ok: true, url: cloudinaryUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error, msg }, "Cloudinary upload failed");
    res.status(500).json({ error: "Upload failed", detail: msg });
  }
});

/**
 * GET /storage/cloud/:uuid
 *
 * Redirect to Cloudinary URL for a previously uploaded file.
 */
router.get("/storage/cloud/:uuid", async (req: Request, res: Response) => {
  const { uuid } = req.params;
  try {
    const uuidStr = Array.isArray(uuid) ? uuid[0] : uuid;
    const url = await getCloudinaryUrl(uuidStr);
    if (!url) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.redirect(302, url);
  } catch (error) {
    req.log.error({ err: error }, "Cloudinary serve failed");
    res.status(500).json({ error: "Failed to serve file" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR (Replit dev only).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const rangeHeader = req.headers.range;
    let rangeOption: { start: number; end?: number } | undefined;
    if (rangeHeader) {
      const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (match) {
        rangeOption = {
          start: parseInt(match[1], 10),
          end: match[2] ? parseInt(match[2], 10) : undefined,
        };
      }
    }

    const response = await objectStorageService.downloadObject(objectFile, { range: rangeOption });

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.status === 200 || response.status === 206) {
      res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=86400, stale-while-revalidate=86400");
    }

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * DELETE /storage/objects/delete
 */
router.delete("/storage/objects/delete", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath || !objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }

  try {
    await objectStorageService.deleteObjectEntity(objectPath);
    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Error deleting object");
    res.status(500).json({ error: "Failed to delete object" });
  }
});

export default router;
