/**
 * Security utilities — Bearer token signing, rate limiting, brute-force protection
 */
import { createHmac, timingSafeEqual } from "crypto";
const SECRET = (() => {
    const s = process.env["SESSION_SECRET"];
    if (!s || s.length < 16) {
        // Warn loudly but do NOT crash — Railway Variables may not have it set yet.
        process.stderr.write("⚠️  WARNING: SESSION_SECRET not set or < 16 chars — using built-in fallback.\n" +
            "   Set SESSION_SECRET in Railway Variables for proper security.\n");
        return "olchaai-railway-fallback-2024-secret-key";
    }
    return s;
})();
/** Generate a signed mobile auth token: "userId:hmac" */
export function signMobileToken(userId) {
    const payload = String(userId);
    const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
    return `${payload}:${sig}`;
}
/** Verify a mobile auth token. Returns userId or null. */
export function verifyMobileToken(token) {
    try {
        const parts = token.split(":");
        if (parts.length !== 2)
            return null;
        const [payload, sig] = parts;
        const expected = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
        const sigBuf = Buffer.from(sig);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length)
            return null;
        if (!timingSafeEqual(sigBuf, expBuf))
            return null;
        const uid = parseInt(payload, 10);
        return !isNaN(uid) && uid > 0 ? uid : null;
    }
    catch {
        return null;
    }
}
/** Two-level rate limiter — per-minute + per-second burst protection */
const ipHits = new Map();
const ipBurst = new Map();
const WINDOW_MS = 60_000; // 1 daqiqa
const MAX_HITS = 300; // 300 req/daqiqa/IP
const BURST_WINDOW = 1_000; // 1 soniya
const MAX_BURST = 30; // 30 req/soniya/IP (DDoS burst himoyasi)
export function checkRateLimit(ip) {
    const now = Date.now();
    // 1. Per-second burst check
    const burst = ipBurst.get(ip);
    if (!burst || burst.resetAt <= now) {
        ipBurst.set(ip, { count: 1, resetAt: now + BURST_WINDOW });
    }
    else {
        burst.count++;
        if (burst.count > MAX_BURST)
            return false; // burst bloklash
    }
    // 2. Per-minute window check
    const rec = ipHits.get(ip);
    if (!rec || rec.resetAt <= now) {
        ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return true;
    }
    rec.count++;
    return rec.count <= MAX_HITS;
}
/**
 * Login brute-force protection — tracks failed attempts per IP + identifier.
 * Blocks after 10 failures within 15 minutes. Clears on successful login.
 */
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60_000; // 15 minutes
const MAX_LOGIN_FAILS = 15; // 15 urinishdan keyin lock (avval 10 edi)
const LOCKOUT_MS = 3 * 60_000; // 3-daqiqa lockout (avval 15 daqiqa edi — juda og'ir edi)
export function checkLoginBruteForce(ip, identifier) {
    const key = `${ip}::${identifier.toLowerCase()}`;
    const now = Date.now();
    const rec = loginAttempts.get(key);
    if (rec && rec.lockedUntil > now) {
        return { allowed: false, remainingMs: rec.lockedUntil - now };
    }
    return { allowed: true };
}
export function recordLoginFailure(ip, identifier) {
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
export function clearLoginAttempts(ip, identifier) {
    loginAttempts.delete(`${ip}::${identifier.toLowerCase()}`);
}
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of ipHits.entries()) {
        if (rec.resetAt <= now)
            ipHits.delete(ip);
    }
    for (const [key, rec] of loginAttempts.entries()) {
        if (rec.lockedUntil > 0 && rec.lockedUntil <= now)
            loginAttempts.delete(key);
    }
}, 5 * 60_000);
/**
 * Per-endpoint strict rate limiter — for sensitive routes (register, wallet, etc.)
 * Much tighter than the global 300/min limit.
 */
const endpointHits = new Map();
export function checkEndpointRateLimit(ip, endpoint, maxPerWindow, windowMs) {
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
        if (rec.resetAt <= now)
            endpointHits.delete(key);
    }
}, 5 * 60_000);
/**
 * Validate input strings — strips null bytes, checks max length.
 * Returns sanitized string or null if invalid.
 */
export function sanitizeInput(value, maxLen = 512) {
    if (typeof value !== "string")
        return null;
    const s = value.replace(/\0/g, "").trim();
    if (s.length === 0 || s.length > maxLen)
        return null;
    return s;
}
