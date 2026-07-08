import { Router } from "express";
import { db } from "@workspace/db";
import { coViewRoomsTable, coViewMembersTable, usersTable, reelsTable, postsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.post("/coview/rooms", requireAuth, async (req: any, res) => {
  try {
    const { contentType, contentId } = req.body;
    if (!contentType || !contentId) { res.status(400).json({ error: "contentType va contentId talab qilinadi" }); return; }
    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const [room] = await db.insert(coViewRoomsTable).values({
      hostId: req.session.userId,
      contentType,
      contentId: Number(contentId),
      inviteCode,
    }).returning();
    await db.insert(coViewMembersTable).values({ roomId: room.id, userId: req.session.userId });
    res.status(201).json(room);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/coview/rooms/:code", requireAuth, async (req: any, res) => {
  try {
    const [room] = await db.select().from(coViewRoomsTable)
      .where(eq(coViewRoomsTable.inviteCode, req.params.code.toUpperCase()));
    if (!room) { res.status(404).json({ error: "Xona topilmadi" }); return; }
    const members = await db.select({
      id: usersTable.id, username: usersTable.username,
      displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl,
      isVerified: usersTable.isVerified,
    }).from(coViewMembersTable)
      .innerJoin(usersTable, eq(coViewMembersTable.userId, usersTable.id))
      .where(eq(coViewMembersTable.roomId, room.id));

    // Kontent ma'lumotlarini olib kelish (video URL uchun)
    let content: { videoUrl?: string | null; thumbnailUrl?: string | null; caption?: string | null; title?: string | null } | null = null;
    try {
      if (room.contentType === "reel") {
        const [reel] = await db.select({
          videoUrl: reelsTable.videoUrl,
          thumbnailUrl: reelsTable.thumbnailUrl,
          caption: reelsTable.caption,
        }).from(reelsTable).where(eq(reelsTable.id, room.contentId)).limit(1);
        content = reel ?? null;
      } else if (room.contentType === "post") {
        const [post] = await db.select({
          thumbnailUrl: postsTable.mediaUrl,
          title: postsTable.content,
        }).from(postsTable).where(eq(postsTable.id, room.contentId)).limit(1);
        content = post ?? null;
      }
    } catch { /* non-fatal */ }

    res.json({ ...room, members, content });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/coview/rooms/:code/join", requireAuth, async (req: any, res) => {
  try {
    const [room] = await db.select().from(coViewRoomsTable)
      .where(eq(coViewRoomsTable.inviteCode, req.params.code.toUpperCase()));
    if (!room) { res.status(404).json({ error: "Xona topilmadi" }); return; }
    if (room.status === "ended") { res.status(400).json({ error: "Xona tugagan" }); return; }
    const existing = await db.select().from(coViewMembersTable).where(eq(coViewMembersTable.roomId, room.id));
    if (!existing.find(m => m.userId === req.session.userId)) {
      await db.insert(coViewMembersTable).values({ roomId: room.id, userId: req.session.userId });
      await db.update(coViewRoomsTable).set({ memberCount: room.memberCount + 1 }).where(eq(coViewRoomsTable.id, room.id));
    }
    res.json({ success: true, roomId: room.id, inviteCode: room.inviteCode, contentType: room.contentType, contentId: room.contentId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/coview/rooms/:code/leave", requireAuth, async (req: any, res) => {
  try {
    const [room] = await db.select().from(coViewRoomsTable)
      .where(eq(coViewRoomsTable.inviteCode, req.params.code.toUpperCase()));
    if (!room) { res.status(404).json({ error: "Xona topilmadi" }); return; }
    await db.delete(coViewMembersTable).where(eq(coViewMembersTable.roomId, room.id));
    if (room.hostId === req.session.userId) {
      await db.update(coViewRoomsTable).set({ status: "ended", endedAt: new Date() }).where(eq(coViewRoomsTable.id, room.id));
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
