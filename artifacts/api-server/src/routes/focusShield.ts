import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, DEFAULT_FOCUS_SHIELD, type FocusShield } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

function normalize(input: any): FocusShield {
  const startHour = Number.isFinite(input?.startHour) ? Math.min(23, Math.max(0, Math.trunc(input.startHour))) : DEFAULT_FOCUS_SHIELD.startHour;
  const endHour = Number.isFinite(input?.endHour) ? Math.min(23, Math.max(0, Math.trunc(input.endHour))) : DEFAULT_FOCUS_SHIELD.endHour;
  const allowedUserIds = Array.isArray(input?.allowedUserIds)
    ? input.allowedUserIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
    : DEFAULT_FOCUS_SHIELD.allowedUserIds;
  return { enabled: !!input?.enabled, startHour, endHour, allowedUserIds };
}

router.get("/focus-shield/my", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db.select({ focusShield: usersTable.focusShield }).from(usersTable)
      .where(eq(usersTable.id, req.session.userId));
    res.json(user?.focusShield ?? DEFAULT_FOCUS_SHIELD);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.put("/focus-shield", requireAuth, async (req: any, res) => {
  try {
    const [existing] = await db.select({ focusShield: usersTable.focusShield }).from(usersTable)
      .where(eq(usersTable.id, req.session.userId));
    const merged = normalize({ ...(existing?.focusShield ?? DEFAULT_FOCUS_SHIELD), ...req.body });
    await db.update(usersTable).set({ focusShield: merged }).where(eq(usersTable.id, req.session.userId));
    res.json(merged);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
