/**
 * Rate limiters — keyed by session userId (when logged in) or IP fallback.
 * Railway proxy-da barcha IP bir xil ko'ringani uchun session-based keying ishlatamiz.
 *
 * Tiers:
 *  auth      — 10 req/min  (login brute-force)
 *  ai        — 20 req/min  (OpenAI cost-drain)
 *  upload    — 30 req/min  (media spam)
 *  standard  — 120 req/min (general API — legitimate heavy users)
 */
import rateLimit, { type Options } from "express-rate-limit";
import type { Request, Response } from "express";

function sessionKey(req: Request): string {
  // Prefer session userId so authenticated users get their own bucket.
  // Fall back to X-Forwarded-For first real IP, then socket address.
  const uid = (req as any).session?.userId;
  if (uid) return `uid:${uid}`;
  const xff = req.headers["x-forwarded-for"];
  const ip = (typeof xff === "string" ? xff.split(",")[0] : undefined)
    ?? req.socket?.remoteAddress
    ?? "unknown";
  return `ip:${ip}`;
}

function makeLimit({ windowMs, max, ...rest }: Partial<Options> & { windowMs: number; max: number }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: sessionKey,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: "Juda ko'p so'rov yubordi — biroz kutib uring",
        retryAfterMs: windowMs,
      });
    },
    ...rest,
  });
}

/** 10 requests / 60s — login & register endpoints */
export const authRateLimit = makeLimit({ windowMs: 60_000, max: 10 });

/** 20 requests / 60s — AI chat, image gen, voice clone, moderation */
export const aiRateLimit = makeLimit({ windowMs: 60_000, max: 20 });

/** 30 requests / 60s — media upload, optimize-video, object storage */
export const uploadRateLimit = makeLimit({ windowMs: 60_000, max: 30 });

/** 120 requests / 60s — everything else (generous for real users) */
export const standardRateLimit = makeLimit({ windowMs: 60_000, max: 120 });
