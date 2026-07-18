/**
 * /api/media/* — C++ pHash media fingerprinting + WebP image optimizer routes.
 */
import { Router, Request, Response } from "express";
import { hashImagePixels, hammingDistance, hashSimilarity } from "../lib/mediaHasher.js";
import sharp from "sharp";
import https from "https";
import http from "http";
import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { cacheGet, cacheSet } from "../lib/cache";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /api/media/hash
 * Body: { pixels: number[] }  — 64 grayscale ints (8×8 downsampled image)
 * Returns: { phash, mean, popcount, algorithm, engine }
 */
router.post("/hash", async (req: Request, res: Response) => {
  const { pixels } = req.body as { pixels?: unknown };
  if (!Array.isArray(pixels) || pixels.length !== 64) {
    res.status(400).json({ error: "pixels must be an array of 64 integers (0-255)" });
    return;
  }
  const nums = (pixels as unknown[]).map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) {
    res.status(400).json({ error: "all pixel values must be integers 0-255" });
    return;
  }
  try {
    const result = await hashImagePixels(nums);
    res.json({ ...result, pixels: nums.length });
  } catch (err) {
    res.status(500).json({ error: "C++ hasher error", detail: String(err) });
  }
});

/**
 * POST /api/media/compare
 * Body: { hash1: string, hash2: string }
 * Returns: { hamming, similarity, duplicate }
 */
router.post("/compare", (req: Request, res: Response) => {
  const { hash1, hash2 } = req.body as { hash1?: string; hash2?: string };
  if (!hash1 || !hash2 || !/^[0-9a-f]{16}$/.test(hash1) || !/^[0-9a-f]{16}$/.test(hash2)) {
    res.status(400).json({ error: "hash1 and hash2 must be 16-char hex strings" });
    return;
  }
  const hamming = hammingDistance(hash1, hash2);
  const similarity = hashSimilarity(hash1, hash2);
  res.json({
    hamming,
    similarity,
    duplicate: hamming <= 6,      // ≤6 bits diff → likely duplicate
    similar: hamming <= 15,       // ≤15 bits → visually similar
    engine: "OlchaAI-C++-MediaHasher-v1",
  });
});

/**
 * GET /api/media/img?url=<encoded>&w=800&q=80
 * Fetches a remote image, converts to WebP, caches 1h in-memory.
 * Used by the frontend to serve feed/profile images as WebP.
 */
const _bunnyCdnHost = (process.env.BUNNY_CDN_HOSTNAME ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const ALLOWED_HOSTS = new RegExp(
  `\\.(googleusercontent\\.com|googleapis\\.com|gcs\\.olchaai\\.com|replit\\.com|replit\\.app|storage\\.googleapis\\.com|cloudinary\\.com|onrender\\.com|olchaai\\.com${_bunnyCdnHost ? `|${_bunnyCdnHost.replace(/\./g, "\\.")}` : ""})$`,
  "i",
);

function fetchRemote(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { timeout: 8000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

router.get("/img", async (req: Request, res: Response) => {
  const rawUrl = req.query["url"] as string | undefined;
  const width  = Math.min(Math.max(Number(req.query["w"]) || 800, 40), 1920);
  const quality = Math.min(Math.max(Number(req.query["q"]) || 80, 20), 100);

  if (!rawUrl) { res.status(400).json({ error: "url required" }); return; }

  let decoded: string;
  try { decoded = decodeURIComponent(rawUrl); } catch {
    res.status(400).json({ error: "invalid url encoding" }); return;
  }

  // Safety: only proxy images from our own storage / known CDN hosts
  let hostname: string;
  try { hostname = new URL(decoded).hostname; } catch {
    res.status(400).json({ error: "invalid url" }); return;
  }
  if (!ALLOWED_HOSTS.test(hostname)) {
    res.status(403).json({ error: "host not allowed" }); return;
  }

  const cacheKey = `webp:${width}:${quality}:${decoded}`;
  const cached = cacheGet<Buffer>(cacheKey);
  if (cached) {
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("X-Cache", "HIT");
    res.end(cached);
    return;
  }

  try {
    const raw = await fetchRemote(decoded);
    const webp = await sharp(raw)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();

    cacheSet(cacheKey, webp, 60 * 60 * 1000); // 1h

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("X-Cache", "MISS");
    res.end(webp);
  } catch (err) {
    // On failure, redirect to the original image — graceful fallback
    res.redirect(302, decoded);
  }
});

/**
 * POST /api/media/optimize-video
 * Body: { objectPath: string }
 *
 * Downloads an already-uploaded video from object storage, transcodes it
 * with ffmpeg to a web-friendly H.264/AAC mp4 (max 720p, CRF 26, faststart),
 * and overwrites the same objectPath in place so the post's mediaUrl is
 * unchanged. Falls back to leaving the original file untouched on any error
 * (never blocks publishing on a compression failure).
 */
router.post("/optimize-video", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath || !objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }

  let workDir: string | undefined;
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const [originalBuffer] = await file.download();
    const originalSize = originalBuffer.length;

    workDir = await mkdtemp(join(tmpdir(), "vidopt-"));
    const inputPath = join(workDir, "in");
    const outputPath = join(workDir, "out.mp4");
    await writeFile(inputPath, originalBuffer);

    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", inputPath,
        "-vf", "scale='min(1280,iw)':-2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outputPath,
      ]);
      let stderr = "";
      ff.stderr.on("data", (d) => { stderr += d.toString(); });
      ff.on("error", reject);
      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      });
    });

    const compressed = await readFile(outputPath);

    // Only replace if compression actually shrank the file meaningfully.
    if (compressed.length > 0 && compressed.length < originalSize * 0.95) {
      await objectStorageService.overwriteObjectEntity(objectPath, compressed, "video/mp4");
      res.json({
        objectPath,
        optimized: true,
        originalSize,
        newSize: compressed.length,
        savedPct: Math.round((1 - compressed.length / originalSize) * 100),
      });
    } else {
      res.json({ objectPath, optimized: false, originalSize, newSize: originalSize, savedPct: 0 });
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err }, "Video optimization failed");
    // Graceful fallback: publishing should not fail just because compression did.
    res.json({ objectPath, optimized: false, error: "optimize_failed" });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
});

export default router;
