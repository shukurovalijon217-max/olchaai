import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, inArray, gt } from "drizzle-orm";

const router = Router();
const GO_SERVICE = process.env.GO_SERVICE_URL ?? "http://localhost:8099";
const GHOST_DURATION_MS = 60 * 60 * 1000; // 1 hour

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.post("/ghost", requireAuth, async (req: any, res) => {
  try {
    const enable = !!req.body?.enable;
    const ghostUntil = enable ? new Date(Date.now() + GHOST_DURATION_MS) : null;
    await db.update(usersTable).set({ ghostUntil }).where(eq(usersTable.id, req.session.userId));
    res.json({ active: enable, ghostUntil });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/ghost/my", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db.select({ ghostUntil: usersTable.ghostUntil }).from(usersTable)
      .where(eq(usersTable.id, req.session.userId));
    const active = !!user?.ghostUntil && user.ghostUntil > new Date();
    res.json({ active, ghostUntil: active ? user!.ghostUntil : null });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

// Real online/offline presence for a set of user ids, honoring ghost mode + activity-status privacy.
// Never leaks presence for ghosted users or users who opted out of activityStatus.
router.get("/presence", requireAuth, async (req: any, res) => {
  try {
    const idsParam = String(req.query.ids ?? "");
    const ids = idsParam.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) { res.json({}); return; }

    const rows = await db.select({
      id: usersTable.id,
      ghostUntil: usersTable.ghostUntil,
      privacySettings: usersTable.privacySettings,
    }).from(usersTable).where(inArray(usersTable.id, ids));

    let goPresence: Record<string, boolean> = {};
    try {
      const r = await fetch(`${GO_SERVICE}/go/presence?ids=${ids.join(",")}`);
      if (r.ok) {
        const data = (await r.json()) as { presence?: Record<string, boolean> };
        goPresence = data.presence ?? {};
      }
    } catch {
      // Go service unreachable: treat everyone as offline rather than leaking stale state.
    }

    const result: Record<string, boolean> = {};
    for (const row of rows) {
      const isGhosted = !!row.ghostUntil && row.ghostUntil > new Date();
      const hidesActivity = row.privacySettings?.activityStatus === false;
      result[String(row.id)] = isGhosted || hidesActivity ? false : !!goPresence[String(row.id)];
    }
    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
