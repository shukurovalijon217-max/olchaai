import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const unread = req.query.unread === "true";
    let notifs;
    if (unread) {
      notifs = await db.select().from(notificationsTable).where(eq(notificationsTable.isRead, false)).orderBy(desc(notificationsTable.createdAt)).limit(50);
    } else {
      notifs = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);
    }
    res.json(notifs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    const result = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.isRead, false)).returning();
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

export default router;
