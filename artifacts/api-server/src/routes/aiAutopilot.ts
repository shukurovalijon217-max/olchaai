import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAutopilotStats, subscribeModerationSSE } from "../moderation/aiAutopilot.js";
import { getScaleMetrics } from "../middlewares/aiAutoScale.js";

const router = Router();

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const [u] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!u?.isAdmin) { res.status(403).json({ error: "Admin huquqi kerak" }); return; }
  next();
};

// AI Autopilot stats + recent events
router.get("/admin/ai/stats", requireAdmin, async (_req, res) => {
  try {
    const stats = await getAutopilotStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Auto-scale metrics
router.get("/admin/ai/scale", requireAdmin, (req, res) => {
  res.json(getScaleMetrics());
});

// SSE live moderation feed
router.get("/admin/ai/events/stream", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial heartbeat
  res.write(": connected\n\n");

  const unsub = subscribeModerationSSE((data: string) => {
    res.write(data);
  });

  // Heartbeat every 15s to keep connection alive
  const hb = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(hb); unsub(); }
  }, 15_000);

  req.on("close", () => { clearInterval(hb); unsub(); });
});

// Banned users list
router.get("/admin/ai/banned-users", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.execute<{
      id: number; username: string; display_name: string; warning_count: number;
      banned_at: string; banned_reason: string;
    }>(sql`
      SELECT id, username, display_name, warning_count, banned_at, banned_reason
      FROM users WHERE is_banned = true ORDER BY banned_at DESC LIMIT 50
    `);
    res.json({ users: Array.isArray(rows) ? rows : [] });
  } catch {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Unban user
router.post("/admin/ai/unban/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    await db.execute(sql`
      UPDATE users SET is_banned = false, banned_at = null, banned_reason = null, warning_count = 0
      WHERE id = ${userId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Users with warnings (not yet banned)
router.get("/admin/ai/warned-users", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.execute<{
      id: number; username: string; display_name: string; warning_count: number;
    }>(sql`
      SELECT id, username, display_name, warning_count
      FROM users WHERE warning_count > 0 AND is_banned = false
      ORDER BY warning_count DESC LIMIT 50
    `);
    res.json({ users: Array.isArray(rows) ? rows : [] });
  } catch {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Reset warnings for a user
router.post("/admin/ai/reset-warnings/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params["userId"]);
    await db.execute(sql`UPDATE users SET warning_count = 0 WHERE id = ${userId}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
