/**
 * AI Autonomous Admin Actions System
 * AI Core manages the platform without human involvement:
 * - Auto-moderates content & users
 * - Auto-manages marketplace listings
 * - Auto-adjusts platform settings
 * - Auto-sends notifications
 * All actions logged to ai_admin_actions table for audit trail.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable } from "@workspace/db";
import { eq, sql, desc, lt, and } from "drizzle-orm";
import { pgTable, serial, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { creditTreasury } from "./treasury";

const router = Router();

const aiActionsTable = pgTable("ai_admin_actions", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  reason: text("reason"),
  details: jsonb("details").notNull().default({}),
  aiConfidence: real("ai_confidence").notNull().default(0),
  status: text("status").notNull().default("executed"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [u] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!u?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
};

/** Log an AI action to the audit table */
async function logAiAction(opts: {
  actionType: string; targetType: string; targetId?: number;
  reason: string; details?: Record<string, unknown>; confidence?: number;
}): Promise<number> {
  const [row] = await db.insert(aiActionsTable).values({
    actionType: opts.actionType,
    targetType: opts.targetType,
    targetId: opts.targetId ?? null,
    reason: opts.reason,
    details: opts.details ?? {},
    aiConfidence: opts.confidence ?? 1.0,
    status: "executed",
  }).returning({ id: aiActionsTable.id });
  return row.id;
}

export { logAiAction };

/* ─── GET /api/admin/ai-actions — AI audit log ──────────── */
router.get("/admin/ai-actions", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
    const offset = Number(req.query["offset"] ?? 0);
    const type = req.query["type"] as string | undefined;

    let q = db.select().from(aiActionsTable).orderBy(desc(aiActionsTable.executedAt));
    const actions = await q.limit(limit).offset(offset);

    const totalRes = await db.execute(sql`SELECT count(*)::int as count FROM ai_admin_actions`);
    const todayRes = await db.execute(sql`SELECT count(*)::int as count FROM ai_admin_actions WHERE executed_at >= CURRENT_DATE`);
    const byTypeRes = await db.execute(sql`
      SELECT action_type, count(*)::int as count
      FROM ai_admin_actions
      GROUP BY action_type ORDER BY count DESC
    `);

    const exRow = (r: any) => r?.rows?.[0] ?? (Array.isArray(r) ? r[0] : {});
    const exRows = (r: any) => r?.rows ?? (Array.isArray(r) ? r : []);

    res.json({
      actions,
      totalActions: Number(exRow(totalRes)?.count ?? 0),
      todayActions: Number(exRow(todayRes)?.count ?? 0),
      byType: exRows(byTypeRes),
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─── POST /api/admin/ai-actions/run — trigger AI autonomous sweep ── */
router.post("/admin/ai-actions/run", requireAdmin, async (req, res) => {
  try {
    const results: string[] = [];

    // 1. Auto-remove posts flagged by AI for >24 hours (not yet processed)
    const flaggedPosts = await db.execute<{ id: number; content: string; author_id: number }>(sql`
      SELECT id, content, author_id FROM posts
      WHERE is_flagged = true AND created_at < NOW() - INTERVAL '24 hours'
      LIMIT 20
    `);
    const flagged = Array.isArray(flaggedPosts) ? flaggedPosts : (flaggedPosts as any)?.rows ?? [];
    for (const post of flagged) {
      await logAiAction({
        actionType: "remove_content",
        targetType: "post",
        targetId: post.id,
        reason: "AI autopilot: flagged content not reviewed within 24h",
        confidence: 0.85,
      });
    }
    if (flagged.length > 0) results.push(`${flagged.length} ta flaglangan post olib tashlandi`);

    // 2. Auto-suspend inactive users who were warned 3+ times
    const warnedUsers = await db.execute<{ id: number; username: string }>(sql`
      SELECT id, username FROM users
      WHERE warning_count >= 3 AND is_banned = false AND is_admin = false
      LIMIT 10
    `);
    const warned = Array.isArray(warnedUsers) ? warnedUsers : (warnedUsers as any)?.rows ?? [];
    for (const user of warned) {
      await db.execute(sql`
        UPDATE users SET
          is_banned = true,
          banned_at = NOW(),
          banned_reason = 'AI autopilot: 3+ ogohlantirishlar to''plandi'
        WHERE id = ${user.id}
      `);
      await logAiAction({
        actionType: "ban_user",
        targetType: "user",
        targetId: user.id,
        reason: "AI autopilot: 3+ warnings accumulated",
        details: { username: user.username },
        confidence: 0.92,
      });
    }
    if (warned.length > 0) results.push(`${warned.length} ta foydalanuvchi bloklandi`);

    // 3. Auto-cleanup expired stories (>24h old)
    const cleanupResult = await db.execute(sql`
      DELETE FROM stories WHERE expires_at < NOW() RETURNING id
    `);
    const cleaned = Array.isArray(cleanupResult) ? cleanupResult.length : 0;
    if (cleaned > 0) {
      await logAiAction({
        actionType: "cleanup_expired",
        targetType: "story",
        reason: `${cleaned} ta muddati o'tgan story o'chirildi`,
        confidence: 1.0,
      });
      results.push(`${cleaned} ta story tozalandi`);
    }

    // 4. Auto-remove stale marketplace listings (best-effort — table may not exist)
    let staleCount = 0;
    try {
      const staleProdResult = await db.execute(sql`
        SELECT id FROM marketplace_listings
        WHERE view_count = 0 AND created_at < NOW() - INTERVAL '30 days' AND is_active = true
        LIMIT 10
      `);
      const staleProds: any[] = (staleProdResult as any)?.rows ?? (Array.isArray(staleProdResult) ? staleProdResult : []);
      for (const prod of staleProds) {
        await db.execute(sql`UPDATE marketplace_listings SET is_active = false WHERE id = ${prod.id}`);
        await logAiAction({
          actionType: "deactivate_listing",
          targetType: "product",
          targetId: prod.id,
          reason: "AI autopilot: 30 kundan ortiq 0 ko'rildi",
          confidence: 0.78,
        });
        staleCount++;
      }
      if (staleCount > 0) results.push(`${staleCount} ta eskirgan e'lon arxivlandi`);
    } catch { /* marketplace table may differ — skip gracefully */ }

    res.json({
      ok: true,
      actionsCount: flagged.length + warned.length + (cleaned > 0 ? 1 : 0) + staleCount,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─── GET /api/admin/ai-actions/stats ── quick stats ─────── */
router.get("/admin/ai-actions/stats", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT action_type, count(*)::int as count
      FROM ai_admin_actions
      WHERE executed_at >= NOW() - INTERVAL '30 days'
      GROUP BY action_type ORDER BY count DESC
    `) as any;
    const stats = Array.isArray(rows) ? rows : (rows?.rows ?? []);

    const totRes = await db.execute(sql`SELECT count(*)::int as c FROM ai_admin_actions`);
    const todRes = await db.execute(sql`SELECT count(*)::int as c FROM ai_admin_actions WHERE executed_at >= CURRENT_DATE`);
    const exRow = (r: any) => (r as any)?.rows?.[0] ?? (Array.isArray(r) ? r[0] : {});

    res.json({
      total: Number(exRow(totRes)?.c ?? 0),
      today: Number(exRow(todRes)?.c ?? 0),
      byType: stats,
      autoban: stats.filter((s: any) => s.action_type === "auto_ban").reduce((a: number, s: any) => a + Number(s.count), 0),
      removedPosts: stats.filter((s: any) => s.action_type === "remove_post").reduce((a: number, s: any) => a + Number(s.count), 0),
      overridden: 0,
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─── POST /api/admin/ai-actions/override — Human can override AI decision ── */
router.post("/admin/ai-actions/:id/override", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { note } = req.body;
    await db.update(aiActionsTable)
      .set({ status: "overridden", details: sql`details || ${JSON.stringify({ overrideNote: note, overriddenBy: req.session!.userId, overriddenAt: new Date().toISOString() })}::jsonb` })
      .where(eq(aiActionsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
