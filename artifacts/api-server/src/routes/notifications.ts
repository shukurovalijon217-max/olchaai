import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, pushTokensTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { cacheAside, cacheDelPattern } from "../lib/cache";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const unread = req.query.unread === "true";
    const userId = (req.session as any)?.userId ?? 0;
    const notifs = await cacheAside("notifs", `${userId}:${unread}`, async () => {
      if (unread) {
        return db.select().from(notificationsTable).where(eq(notificationsTable.isRead, false)).orderBy(desc(notificationsTable.createdAt)).limit(50);
      }
      return db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);
    }, 10);
    res.json(notifs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    const result = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.isRead, false)).returning();
    cacheDelPattern("notifs:");
    res.json({ updated: result.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/notifications/clear", async (req, res) => {
  try {
    const result = await db.delete(notificationsTable).returning();
    res.json({ deleted: result.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Push token registration ── */
router.post("/push-token", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) { res.status(401).json({ error: "Login talab qilinadi" }); return; }
    const { token, platform = "expo" } = req.body ?? {};
    if (!token || typeof token !== "string") { res.status(400).json({ error: "token required" }); return; }
    await db
      .insert(pushTokensTable)
      .values({ userId, token, platform })
      .onConflictDoUpdate({ target: [pushTokensTable.userId, pushTokensTable.token], set: { updatedAt: new Date(), platform } });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.delete("/push-token", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) { res.status(401).json({ error: "Login talab qilinadi" }); return; }
    const { token } = req.body ?? {};
    if (token) {
      await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
    } else {
      await db.delete(pushTokensTable).where(eq(pushTokensTable.userId, userId));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.delete("/notifications/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [notif] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
    if (!notif) { res.status(404).json({ error: "Not found" }); return; }
    res.json(notif);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Web Push VAPID public key ── */
router.get("/notifications/vapid-key", (_req, res) => {
  const key = process.env["VAPID_PUBLIC_KEY"];
  if (!key) { res.status(503).json({ error: "Push not configured" }); return; }
  res.json({ publicKey: key });
});

/* ── Web Push subscription (browser) ── */
router.post("/notifications/push-subscribe", async (req: any, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) { res.status(401).json({ error: "Login talab qilinadi" }); return; }
    const sub = req.body?.subscription;
    if (!sub?.endpoint) { res.status(400).json({ error: "subscription required" }); return; }
    const token = JSON.stringify(sub);
    await db
      .insert(pushTokensTable)
      .values({ userId, token, platform: "web" })
      .onConflictDoUpdate({ target: [pushTokensTable.userId, pushTokensTable.token], set: { updatedAt: new Date(), platform: "web" } });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
