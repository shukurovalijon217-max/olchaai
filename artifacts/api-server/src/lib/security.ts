/**
 * Security utilities — Bearer token signing, rate limiting helpers
 */
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env["SESSION_SECRET"] ?? "olcha-secret-2024";

/** Generate a signed mobile auth token: "userId:hmac" */
export function signMobileToken(userId: number): string {
  const payload = String(userId);
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  return `${payload}:${sig}`;
}

/** Verify a mobile auth token. Returns userId or null. */
export function verifyMobileToken(token: string): number | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const uid = parseInt(payload, 10);
    return !isNaN(uid) && uid > 0 ? uid : null;
  } catch {
    return null;
  }
}

/** Simple in-memory rate limiter (per IP, per window) */
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 300;    // 300 requests per minute per IP

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || rec.resetAt <= now) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  rec.count++;
  if (rec.count > MAX_HITS) return false;
  return true;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of ipHits.entries()) {
    if (rec.resetAt <= now) ipHits.delete(ip);
  }
}, 5 * 60_000);
