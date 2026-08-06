import { Router, type IRouter, type Request, type Response } from "express";
import { db, clientErrors } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/* ── Simple in-memory rate limit: max 20 reports per IP per minute ── */
const hits = new Map<string, { count: number; resetAt: number }>();
function allow(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.resetAt) { hits.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  h.count++;
  return h.count <= 20;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
}, 120_000).unref();

/**
 * POST /api/client-errors — receive frontend error reports.
 * Anonymous allowed (errors often happen before login). Rate-limited per IP.
 * Deduped: same message within 10 min increments `count` instead of new row.
 */
router.post("/client-errors", async (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "?";
  if (!allow(ip)) return res.status(429).json({ ok: false });

  const { message, stack, url } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ ok: false });

  const msg = message.slice(0, 500);
  const stk = typeof stack === "string" ? stack.slice(0, 3000) : null;
  const pageUrl = typeof url === "string" ? url.slice(0, 500) : null;
  const ua = (req.headers["user-agent"] || "").slice(0, 300);
  const userId = (req.session as any)?.userId ?? null;

  // Visible in Railway logs immediately
  logger.error({ clientError: msg, url: pageUrl, userId }, "[client-error]");

  try {
    // Dedupe: bump count if the same message was seen in the last 10 minutes
    const updated = await db.execute(sql`
      UPDATE client_errors SET count = count + 1
      WHERE id = (
        SELECT id FROM client_errors
        WHERE message = ${msg} AND created_at > now() - interval '10 minutes'
        ORDER BY id DESC LIMIT 1
      ) RETURNING id`);
    const rows = (updated as any).rows ?? [];
    if (!rows.length) {
      await db.insert(clientErrors).values({ message: msg, stack: stk, url: pageUrl, userAgent: ua, userId });
    }
  } catch (e) {
    logger.warn({ err: e }, "[client-error] failed to persist");
  }
  return res.json({ ok: true });
});

/** GET /api/admin/client-errors — last 100 reports (admin only). */
router.get("/admin/client-errors", async (req: Request, res: Response) => {
  const role = (req.session as any)?.role;
  if (role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const rows = await db.select().from(clientErrors).orderBy(desc(clientErrors.id)).limit(100);
  return res.json(rows);
});

export default router;
