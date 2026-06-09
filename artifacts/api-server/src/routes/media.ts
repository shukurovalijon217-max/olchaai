/**
 * /api/media/* — C++ pHash media fingerprinting routes.
 * Uses the compiled OlCha-C++-MediaHasher binary for perceptual image hashing.
 */
import { Router, Request, Response } from "express";
import { hashImagePixels, hammingDistance, hashSimilarity } from "../lib/mediaHasher.js";

const router = Router();

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
    engine: "OlCha-C++-MediaHasher-v1",
  });
});

export default router;
