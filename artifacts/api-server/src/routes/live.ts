import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { liveStreamsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: Request, res: Response, next: () => void) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" });
    return;
  }
  next();
};

// POST /live/start
router.post("/live/start", requireAuth, async (req: any, res) => {
  try {
    const { title, thumbnailUrl } = req.body as { title?: string; thumbnailUrl?: string };
    if (!title?.trim()) {
      res.status(400).json({ error: "Title required" });
      return;
    }
    const existing = await db
      .select({ id: liveStreamsTable.id })
      .from(liveStreamsTable)
      .where(and(eq(liveStreamsTable.hostId, req.session.userId), eq(liveStreamsTable.status, "active")));
    if (existing.length > 0) {
      res.status(409).json({ error: "Already live", liveId: existing[0].id });
      return;
    }
    const [stream] = await db
      .insert(liveStreamsTable)
      .values({ hostId: req.session.userId, title: title.trim(), thumbnailUrl: thumbnailUrl ?? null })
      .returning();
    const [host] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
    res.status(201).json({ ...stream, host: { id: host.id, username: host.username, displayName: host.displayName, avatarUrl: host.avatarUrl, isVerified: host.isVerified } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /live/:id/end
router.patch("/live/:id/end", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const [stream] = await db.select().from(liveStreamsTable).where(eq(liveStreamsTable.id, id));
    if (!stream) { res.status(404).json({ error: "Not found" }); return; }
    if (stream.hostId !== req.session.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const [updated] = await db
      .update(liveStreamsTable)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(liveStreamsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /live/active
router.get("/live/active", async (req, res) => {
  try {
    const streams = await db
      .select()
      .from(liveStreamsTable)
      .where(eq(liveStreamsTable.status, "active"))
      .orderBy(liveStreamsTable.startedAt);
    const enriched = await Promise.all(
      streams.map(async (s) => {
        const [host] = await db.select().from(usersTable).where(eq(usersTable.id, s.hostId));
        return { ...s, host: host ? { id: host.id, username: host.username, displayName: host.displayName, avatarUrl: host.avatarUrl, isVerified: host.isVerified } : null };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /live/:id
router.get("/live/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [stream] = await db.select().from(liveStreamsTable).where(eq(liveStreamsTable.id, id));
    if (!stream) { res.status(404).json({ error: "Not found" }); return; }
    const [host] = await db.select().from(usersTable).where(eq(usersTable.id, stream.hostId));
    res.json({ ...stream, host: host ? { id: host.id, username: host.username, displayName: host.displayName, avatarUrl: host.avatarUrl, isVerified: host.isVerified } : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /live/:id/viewers  (internal — update viewer count)
router.patch("/live/:id/viewers", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { delta } = req.body as { delta: number };
    const [stream] = await db.select({ viewerCount: liveStreamsTable.viewerCount }).from(liveStreamsTable).where(eq(liveStreamsTable.id, id));
    if (!stream) { res.status(404).json({ error: "Not found" }); return; }
    const newCount = Math.max(0, (stream.viewerCount ?? 0) + delta);
    await db.update(liveStreamsTable).set({ viewerCount: newCount }).where(eq(liveStreamsTable.id, id));
    res.json({ ok: true, viewerCount: newCount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
