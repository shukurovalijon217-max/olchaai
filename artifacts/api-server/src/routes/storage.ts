import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { createHmac, timingSafeEqual } from "crypto";
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
  r2UploadStream,
  r2GetPresignedDownloadUrl,
  r2StreamObject,
} from "../lib/r2Storage";

/* ── Short-lived upload token ────────────────────────────────────────
   Avoids cross-origin session-cookie issues: the POST /request-url
   endpoint generates a signed token, embeds it in the uploadURL as
   ?ut=<token>, and the PUT /r2-proxy endpoint verifies it instead of
   checking req.session.  Token is HMAC-SHA256 over a timestamp, valid
   for 15 minutes.
   ─────────────────────────────────────────────────────────────────── */
function uploadTokenSecret(): string {
  return process.env["SESSION_SECRET"] || "olcha-upload-secret-2024";
}

function generateUploadToken(): string {
  const ts = Math.floor(Date.now() / 1000);
  const mac = createHmac("sha256", uploadTokenSecret())
    .update(`r2upload:${ts}`)
    .digest("hex")
    .slice(0, 24);
  return `${ts}.${mac}`;
}

function verifyUploadToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [tsStr, mac] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > 900) return false; // 15-minute expiry
  const expected = createHmac("sha256", uploadTokenSecret())
    .update(`r2upload:${ts}`)
    .digest("hex")
    .slice(0, 24);
  try {
    return timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch {
    return false;
  }
}

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

    // Priority 1: Cloudflare R2 — server-side proxy upload via /r2-proxy.
    // The browser PUTs to this API server (which has full CORS + credentials support),
    // and the server streams the body directly to R2.
    // This avoids the browser CORS limitation where R2 presigned PUTs cannot return
    // Access-Control-Allow-Credentials: true, which breaks XHR withCredentials mode.
    if (isR2Enabled()) {
      const token = generateUploadToken();
      // Derive the external API base URL (Render sets RENDER_EXTERNAL_URL automatically).
      const apiBase =
        (process.env.API_EXTERNAL_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "") ||
        `${(req.headers["x-forwarded-proto"] as string) || req.protocol}://${req.headers.host}`;
      const uploadURL = `${apiBase}/api/storage/uploads/r2-proxy?ut=${token}`;
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          // objectPath is a placeholder; the real public URL comes from the r2-proxy response body.
          objectPath: "/api/storage/uploads/pending",
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
 * PUT /storage/uploads/r2-proxy
 *
 * R2 server-side proxy upload.
 * Client PUTs raw file body here; server streams it directly to R2.
 * This avoids browser CORS restrictions on direct R2 presigned PUTs.
 * Authenticated via short-lived HMAC token in ?ut= query param (no
 * cross-origin session cookie required).
 */
router.put("/storage/uploads/r2-proxy", async (req: Request, res: Response) => {
  const token = req.query["ut"] as string | undefined;
  if (!verifyUploadToken(token)) {
    res.status(401).json({ error: "Invalid or expired upload token" });
    return;
  }
  if (!isR2Enabled()) {
    res.status(503).json({ error: "R2 not configured" });
    return;
  }

  const contentType = (req.headers["content-type"] as string) || "application/octet-stream";
  const contentLength = req.headers["content-length"]
    ? parseInt(req.headers["content-length"] as string, 10)
    : undefined;

  try {
    const { objectPath, publicUrl } = await r2UploadStream(req, contentType, contentLength);
    res.status(200).json({ ok: true, url: publicUrl, objectPath });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error, msg }, "R2 proxy upload failed");
    res.status(500).json({ error: "Upload failed", detail: msg });
  }
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

/**
 * GET /storage/r2-serve/*key
 * Stream R2 object directly to the client — no redirect, no CORS issue.
 * Supports Range requests for video seeking.
 */
router.get(/^\/storage\/r2-serve\/(.+)$/, async (req: Request, res: Response) => {
  if (!isR2Enabled()) {
    res.status(503).json({ error: "R2 not configured" });
    return;
  }
  try {
    const key = (req.params as unknown as string[])[0] ?? "";

    // For range requests (video seeking), fall back to presigned redirect
    // since AWS SDK streaming doesn't easily support byte ranges
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const url = await r2GetPresignedDownloadUrl(key, 3600);
      res.redirect(302, url);
      return;
    }

    const result = await r2StreamObject(key);
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (result.contentLength) {
      res.setHeader("Content-Length", result.contentLength);
    }
    result.body.pipe(res);
  } catch (err) {
    req.log.error({ err }, "R2 serve error");
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
