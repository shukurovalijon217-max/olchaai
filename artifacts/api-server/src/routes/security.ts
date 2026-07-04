/**
 * Security admin routes — view events, bans, unban IPs
 */
import { Router } from "express";
import type { RequestHandler } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSecurityStats, unbanIp } from "../middlewares/securityShield";
import { sql } from "drizzle-orm";

const router = Router();

const requireAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) { res.status(403).json({ error: "Admin huquqi talab qilinadi" }); return; }
  next();
};

router.use("/admin/security", requireAdmin);

/* GET /api/admin/security — events + ban list */
router.get("/admin/security", async (req, res) => {
  try {
    const stats = await getSecurityStats();

    // Summary counts — db.execute() returns QueryResult, use .rows pattern
    const criticalRes = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM security_events WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours'
    `);
    const bannedRes = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM banned_ips WHERE permanent = true OR expires_at > NOW()
    `);
    const todayRes = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const topAttackersRes = await db.execute(sql`
      SELECT ip, COUNT(*)::int as attacks, MAX(severity) as max_severity
      FROM security_events
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY ip ORDER BY attacks DESC LIMIT 10
    `);
    const attackTypesRes = await db.execute(sql`
      SELECT event_type, COUNT(*)::int as count
      FROM security_events
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY event_type ORDER BY count DESC LIMIT 10
    `);

    const r = (res: any) => res?.rows ?? [];

    res.json({
      summary: {
        criticalLast24h: r(criticalRes)[0]?.count ?? 0,
        bannedIps: r(bannedRes)[0]?.count ?? 0,
        eventsToday: r(todayRes)[0]?.count ?? 0,
      },
      recentEvents: stats.events,
      activeBans: stats.bans,
      topAttackers: r(topAttackersRes),
      attackTypes: r(attackTypesRes),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* DELETE /api/admin/security/ban/:ip — unban an IP */
router.delete("/admin/security/ban/:ip", async (req, res) => {
  try {
    const ip = req.params.ip;
    if (!ip || !/^[\d.:a-f]+$/i.test(ip)) {
      res.status(400).json({ error: "Noto'g'ri IP format" }); return;
    }
    const ok = await unbanIp(ip);
    res.json({ ok, ip });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* POST /api/admin/security/ban — manually ban an IP */
router.post("/admin/security/ban", async (req, res) => {
  try {
    const { ip, reason, permanent } = req.body as { ip: string; reason: string; permanent?: boolean };
    if (!ip || !/^[\d.:a-f]+$/i.test(ip)) {
      res.status(400).json({ error: "Noto'g'ri IP format" }); return;
    }
    await db.execute(sql`
      INSERT INTO banned_ips (ip, reason, strikes, permanent, expires_at)
      VALUES (${ip}, ${reason ?? "manual_ban"}, 10, ${permanent ?? false}, ${permanent ? null : new Date(Date.now() + 24 * 60 * 60_000)})
      ON CONFLICT (ip) DO UPDATE SET
        reason = EXCLUDED.reason,
        permanent = ${permanent ?? false},
        expires_at = EXCLUDED.expires_at
    `);
    res.json({ ok: true, ip, reason, permanent: permanent ?? false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
