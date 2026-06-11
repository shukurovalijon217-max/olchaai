import { Router } from "express";
import { db } from "@workspace/db";
import { voiceCommentsTable, usersTable, postsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" });
    return;
  }
  next();
};

async function enrichVoiceComment(vc: typeof voiceCommentsTable.$inferSelect) {
  const [author] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      isVerified: usersTable.isVerified,
    })
    .from(usersTable)
    .where(eq(usersTable.id, vc.authorId));
  return { ...vc, author: author ?? null };
}

router.get("/posts/:id/voice-comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (isNaN(postId)) { res.status(400).json({ error: "Noto'g'ri post ID" }); return; }

    const rows = await db
      .select()
      .from(voiceCommentsTable)
      .where(eq(voiceCommentsTable.postId, postId))
      .orderBy(desc(voiceCommentsTable.createdAt));

    const enriched = await Promise.all(rows.map(enrichVoiceComment));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:id/voice-comments", requireAuth, async (req: any, res) => {
  try {
    const postId = Number(req.params.id);
    if (isNaN(postId)) { res.status(400).json({ error: "Noto'g'ri post ID" }); return; }

    const { audioUrl, durationMs, waveformData } = req.body;
    if (!audioUrl) { res.status(400).json({ error: "audioUrl talab qilinadi" }); return; }

    const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
    if (!post) { res.status(404).json({ error: "Post topilmadi" }); return; }

    const [vc] = await db
      .insert(voiceCommentsTable)
      .values({
        postId,
        authorId: req.session.userId,
        audioUrl,
        durationMs: typeof durationMs === "number" ? Math.min(durationMs, 10_000) : 0,
        waveformData: waveformData ?? null,
      })
      .returning();

    res.status(201).json(await enrichVoiceComment(vc));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/posts/:postId/voice-comments/:id", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const [vc] = await db.select().from(voiceCommentsTable).where(eq(voiceCommentsTable.id, id));
    if (!vc) { res.status(404).json({ error: "Topilmadi" }); return; }
    if (vc.authorId !== req.session.userId) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

    await db.delete(voiceCommentsTable).where(eq(voiceCommentsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
