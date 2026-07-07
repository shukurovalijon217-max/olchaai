/**
 * Security utilities — Bearer token signing, rate limiting, brute-force protection
 */
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = (() => {
  const s = process.env["SESSION_SECRET"];
  if (!s || s.length < 16) {
    // In production, require a strong secret. In dev, warn loudly.
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("SESSION_SECRET env var is required in production and must be ≥16 chars");
    }
    process.stderr.write("⚠️  WARNING: SESSION_SECRET not set — using insecure dev fallback. Set it in production!\n");
    return "olcha-secret-2024-dev-only";
  }
  return s;
})();

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

/**
 * Login brute-force protection — tracks failed attempts per IP + identifier.
 * Blocks after 10 failures within 15 minutes. Clears on successful login.
 */
const loginAttempts = new Map<string, { fails: number; lockedUntil: number }>();
const LOGIN_WINDOW_MS = 15 * 60_000; // 15 minutes
const MAX_LOGIN_FAILS = 10;
const LOCKOUT_MS = 15 * 60_000;     // 15-minute lockout

export function checkLoginBruteForce(ip: string, identifier: string): { allowed: boolean; remainingMs?: number } {
  const key = `${ip}::${identifier.toLowerCase()}`;
  const now = Date.now();
  const rec = loginAttempts.get(key);

  if (rec && rec.lockedUntil > now) {
    return { allowed: false, remainingMs: rec.lockedUntil - now };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string, identifier: string): void {
  const key = `${ip}::${identifier.toLowerCase()}`;
  const now = Date.now();
  const rec = loginAttempts.get(key);

  if (!rec) {
    // First failure — start tracking
    loginAttempts.set(key, { fails: 1, lockedUntil: 0 });
    return;
  }
  // If a previous lockout period has expired, reset the counter
  if (rec.lockedUntil > 0 && rec.lockedUntil <= now) {
    loginAttempts.set(key, { fails: 1, lockedUntil: 0 });
    return;
  }
  rec.fails++;
  if (rec.fails >= MAX_LOGIN_FAILS) {
    rec.lockedUntil = now + LOCKOUT_MS;
  }
}

export function clearLoginAttempts(ip: string, identifier: string): void {
  loginAttempts.delete(`${ip}::${identifier.toLowerCase()}`);
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of ipHits.entries()) {
    if (rec.resetAt <= now) ipHits.delete(ip);
  }
  for (const [key, rec] of loginAttempts.entries()) {
    if (rec.lockedUntil > 0 && rec.lockedUntil <= now) loginAttempts.delete(key);
  }
}, 5 * 60_000);

/**
 * Per-endpoint strict rate limiter — for sensitive routes (register, wallet, etc.)
 * Much tighter than the global 300/min limit.
 */
const endpointHits = new Map<string, { count: number; resetAt: number }>();

export function checkEndpointRateLimit(
  ip: string,
  endpoint: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const key = `${endpoint}::${ip}`;
  const now = Date.now();
  const rec = endpointHits.get(key);
  if (!rec || rec.resetAt <= now) {
    endpointHits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  rec.count++;
  return rec.count <= maxPerWindow;
}

// Clean up expired endpoint rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of endpointHits.entries()) {
    if (rec.resetAt <= now) endpointHits.delete(key);
  }
}, 5 * 60_000);

/**
 * Validate input strings — strips null bytes, checks max length.
 * Returns sanitized string or null if invalid.
 */
export function sanitizeInput(value: unknown, maxLen = 512): string | null {
  if (typeof value !== "string") return null;
  const s = value.replace(/\0/g, "").trim();
  if (s.length === 0 || s.length > maxLen) return null;
  return s;
}
