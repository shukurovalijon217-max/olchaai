import { Router } from "express";
import { db } from "@workspace/db";
import { anonQuestionsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { scanContentAsync } from "../moderation/aiFilter.js";
import { applyAutopilotDecision } from "../moderation/aiAutopilot.js";

const router = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Kirish talab qilinadi" });
    return null;
  }
  return userId;
}

/**
 * anon_inbox: simple in-memory per-IP rate limiter for the public "ask"
 * endpoint — max 5 anonymous questions per IP per hour, separate from the
 * general API-wide rate limiter (which is meant for abuse, not spam).
 */
const askHits = new Map<string, { count: number; resetAt: number }>();
const ASK_WINDOW_MS = 60 * 60_000;
const ASK_MAX = 5;
function checkAskRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = askHits.get(ip);
  if (!rec || rec.resetAt <= now) {
    askHits.set(ip, { count: 1, resetAt: now + ASK_WINDOW_MS });
    return true;
  }
  rec.count++;
  return rec.count <= ASK_MAX;
}

// Public: send an anonymous question to a user
router.post("/anon-inbox/:userId/ask", async (req: any, res) => {
  try {
    const recipientId = Number(req.params.userId);
    if (isNaN(recipientId)) { res.status(400).json({ error: "Noto'g'ri foydalanuvchi" }); return; }

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkAskRateLimit(ip)) {
      res.status(429).json({ error: "Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring." }); return;
    }

    const { content } = req.body;
    const trimmed = (content ?? "").toString().trim();
    if (!trimmed || trimmed.length > 500) {
      res.status(400).json({ error: "Savol 1-500 belgi bo'lishi kerak" }); return;
    }

    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId));
    if (!recipient) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }

    const scan = await scanContentAsync(trimmed);
    if (scan.autoBlock) {
      res.status(422).json({ error: "Savol avtomatik bloklandi — qoidalarga zid kontent." }); return;
    }

    const [question] = await db.insert(anonQuestionsTable)
      .values({ recipientId, content: trimmed })
      .returning();

    await applyAutopilotDecision({
      scan, authorId: recipientId,
      contentType: "anon_question", contentId: question.id, contentText: trimmed,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Own inbox
router.get("/anon-inbox", async (req: any, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const questions = await db.select().from(anonQuestionsTable)
      .where(eq(anonQuestionsTable.recipientId, userId))
      .orderBy(desc(anonQuestionsTable.createdAt))
      .limit(100);
    res.json(questions);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Answer a question in your own inbox
router.post("/anon-inbox/:id/answer", async (req: any, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const id = Number(req.params.id);
    const { answer } = req.body;
    const trimmed = (answer ?? "").toString().trim();
    if (!trimmed || trimmed.length > 1000) {
      res.status(400).json({ error: "Javob 1-1000 belgi bo'lishi kerak" }); return;
    }

    const [question] = await db.select().from(anonQuestionsTable)
      .where(and(eq(anonQuestionsTable.id, id), eq(anonQuestionsTable.recipientId, userId)));
    if (!question) { res.status(404).json({ error: "Savol topilmadi" }); return; }

    const [updated] = await db.update(anonQuestionsTable)
      .set({ answer: trimmed, answeredAt: new Date() })
      .where(eq(anonQuestionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
