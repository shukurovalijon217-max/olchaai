import { Router } from "express";
import { db } from "@workspace/db";
import {
  moderationQueueTable, contentReportsTable,
  postsTable, usersTable
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { scanContent } from "../moderation/aiFilter";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  const [u] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!u?.isAdmin) { res.status(403).json({ error: "Admin huquqi kerak" }); return; }
  next();
};

// Scan content (internal helper exposed for testing)
router.post("/moderation/scan", requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: "text talab qilinadi" }); return; }
  res.json(scanContent(text));
});

// User reports content
router.post("/moderation/report", requireAuth, async (req: any, res) => {
  try {
    const { contentType, contentId, reason, description } = req.body;
    if (!contentType || !contentId || !reason) {
      res.status(400).json({ error: "contentType, contentId va reason talab qilinadi" }); return;
    }

    const [report] = await db.insert(contentReportsTable).values({
      contentType, contentId, reporterId: req.session.userId, reason, description,
    }).returning();

    // Check if already in moderation queue
    const existing = await db.select().from(moderationQueueTable)
      .where(and(eq(moderationQueueTable.contentType, contentType), eq(moderationQueueTable.contentId, contentId)));

    if (existing.length > 0) {
      await db.update(moderationQueueTable)
        .set({ reportCount: sql`${moderationQueueTable.reportCount} + 1` })
        .where(eq(moderationQueueTable.id, existing[0].id));
    } else {
      // Auto-add to queue with AI scan
      let contentText = "";
      if (contentType === "post") {
        const [post] = await db.select().from(postsTable).where(eq(postsTable.id, contentId));
        contentText = post?.content ?? "";
      }
      const scan = scanContent(contentText);
      await db.insert(moderationQueueTable).values({
        contentType, contentId, contentText, aiScore: scan.score,
        aiCategories: scan.categories, aiVerdict: scan.verdict,
        autoFlagged: false, reportCount: 1,
      });
    }

    res.status(201).json({ ok: true, reportId: report.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- Admin endpoints ---

// Get moderation queue
router.get("/admin/moderation/queue", requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as string) || "pending";
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Number(req.query.offset) || 0;

    const items = await db.select().from(moderationQueueTable)
      .where(status === "all" ? undefined : eq(moderationQueueTable.status, status))
      .orderBy(desc(moderationQueueTable.createdAt))
      .limit(limit).offset(offset);

    res.json({ items, total: items.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get moderation stats
router.get("/admin/moderation/stats", requireAdmin, async (req, res) => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable);
    const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable).where(eq(moderationQueueTable.status, "pending"));
    const [approved] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable).where(eq(moderationQueueTable.status, "approved"));
    const [rejected] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable).where(eq(moderationQueueTable.status, "rejected"));
    const [autoBlocked] = await db.select({ count: sql<number>`count(*)::int` }).from(moderationQueueTable).where(eq(moderationQueueTable.autoBlocked, true));
    const [reports] = await db.select({ count: sql<number>`count(*)::int` }).from(contentReportsTable);

    res.json({
      total: total.count, pending: pending.count, approved: approved.count,
      rejected: rejected.count, autoBlocked: autoBlocked.count,
      totalReports: reports.count,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Resolve moderation item
router.patch("/admin/moderation/:id/resolve", requireAdmin, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const { action, note } = req.body as { action: "approved" | "rejected" | "escalated"; note?: string };

    if (!["approved", "rejected", "escalated"].includes(action)) {
      res.status(400).json({ error: "action: approved | rejected | escalated bo'lishi kerak" }); return;
    }

    const [item] = await db.select().from(moderationQueueTable).where(eq(moderationQueueTable.id, id));
    if (!item) { res.status(404).json({ error: "Topilmadi" }); return; }

    await db.update(moderationQueueTable).set({
      status: action, moderatorId: req.session.userId,
      moderatorNote: note ?? null, resolvedAt: new Date(),
    }).where(eq(moderationQueueTable.id, id));

    // If rejected → flag or delete post
    if (action === "rejected" && item.contentType === "post") {
      await db.update(postsTable).set({ isFlagged: true }).where(eq(postsTable.id, item.contentId));
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Re-scan content with AI
router.post("/admin/moderation/:id/rescan", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db.select().from(moderationQueueTable).where(eq(moderationQueueTable.id, id));
    if (!item) { res.status(404).json({ error: "Topilmadi" }); return; }

    const scan = scanContent(item.contentText ?? "");
    await db.update(moderationQueueTable).set({
      aiScore: scan.score, aiCategories: scan.categories, aiVerdict: scan.verdict,
    }).where(eq(moderationQueueTable.id, id));

    res.json({ ok: true, scan });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete post from queue action
router.delete("/admin/moderation/:id/delete-content", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db.select().from(moderationQueueTable).where(eq(moderationQueueTable.id, id));
    if (!item) { res.status(404).json({ error: "Topilmadi" }); return; }

    if (item.contentType === "post") {
      await db.delete(postsTable).where(eq(postsTable.id, item.contentId));
    }
    await db.update(moderationQueueTable).set({ status: "rejected", resolvedAt: new Date() }).where(eq(moderationQueueTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
