/**
 * OlCha Media Fingerprinter — Node.js wrapper for the C++ pHash engine.
 *
 * Usage:
 *   const result = await hashImagePixels(pixels);   // pixels: number[] of 64 grayscale ints
 *   result → { phash, mean, popcount, algorithm, engine }
 *
 * Hamming distance between two hashes:
 *   const dist = hammingDistance(hash1, hash2);  // 0 = identical, >10 = different
 */

import { spawn } from "child_process";
import path from "path";

const BINARY = path.resolve(
  process.cwd().endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(process.cwd(), "../..")
    : process.cwd(),
  "artifacts/api-server/src/cpp/mediaHasher"
);

export interface MediaHashResult {
  phash: string;
  mean: number;
  popcount: number;
  algorithm: string;
  engine: string;
}

/** Compute perceptual hash for a 8×8 grayscale pixel grid (64 integers 0-255). */
export function hashImagePixels(pixels: number[]): Promise<MediaHashResult> {
  if (pixels.length !== 64) {
    return Promise.reject(new Error(`Expected 64 pixels, got ${pixels.length}`));
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(BINARY, [], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`mediaHasher exited ${code}: ${stderr}`));
      try { resolve(JSON.parse(stdout.trim())); }
      catch (e) { reject(new Error(`Invalid JSON from mediaHasher: ${stdout}`)); }
    });
    proc.on("error", reject);
    proc.stdin.write(pixels.join(" "));
    proc.stdin.end();
  });
}

/** Hamming distance between two 64-bit hex hashes. */
export function hammingDistance(h1: string, h2: string): number {
  const a = BigInt("0x" + h1);
  const b = BigInt("0x" + h2);
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) { dist += Number(xor & 1n); xor >>= 1n; }
  return dist;
}

/** Similarity score 0-1 (1 = identical). */
export function hashSimilarity(h1: string, h2: string): number {
  const dist = hammingDistance(h1, h2);
  return Math.round((1 - dist / 64) * 1000) / 1000;
}
