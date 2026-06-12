import { Router } from "express";
import { db } from "@workspace/db";
import { factChecksTable, credibilityScoresTable, postsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

async function getOrCreateCredibility(userId: number) {
  const [existing] = await db.select().from(credibilityScoresTable).where(eq(credibilityScoresTable.userId, userId));
  if (existing) return existing;
  const [created] = await db.insert(credibilityScoresTable).values({ userId }).returning();
  return created;
}

router.get("/factcheck/:postId", async (req: any, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const [fc] = await db.select().from(factChecksTable).where(eq(factChecksTable.postId, postId));
    res.json(fc ?? null);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/factcheck/:postId", requireAuth, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const existing = await db.select().from(factChecksTable).where(eq(factChecksTable.postId, postId));
    if (existing.length > 0) { res.json(existing[0]); return; }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) { res.status(404).json({ error: "Post topilmadi" }); return; }

    const prompt = `Analyze this social media post for factual accuracy. Post content: "${post.content}"
    
Respond in JSON format:
{
  "verdict": "true|false|misleading|unverifiable",
  "confidence": 0-100,
  "explanation": "brief explanation in Uzbek (1-2 sentences)",
  "sources": "comma-separated source hints or empty string"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    let parsed: any = { verdict: "unverifiable", confidence: 0, explanation: "Tekshirib bo'lmadi", sources: "" };
    try { parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}"); } catch {}

    const [fc] = await db.insert(factChecksTable)
      .values({
        postId,
        verdict: parsed.verdict ?? "unverifiable",
        confidence: (parsed.confidence ?? 0) / 100,
        explanation: parsed.explanation ?? "",
        sources: parsed.sources ?? "",
      })
      .returning();

    const [postUser] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
    if (postUser) {
      const cred = await getOrCreateCredibility(postUser.id);
      const isTrue = parsed.verdict === "true";
      const isFalse = parsed.verdict === "false";
      const newTotal = cred.totalChecked + 1;
      const newTrue = cred.trueCount + (isTrue ? 1 : 0);
      const newFalse = cred.falseCount + (isFalse ? 1 : 0);
      const newScore = Math.max(0, Math.min(100, 50 + (newTrue - newFalse) * 5));
      await db.update(credibilityScoresTable)
        .set({ totalChecked: newTotal, trueCount: newTrue, falseCount: newFalse, score: newScore, updatedAt: new Date() })
        .where(eq(credibilityScoresTable.userId, postUser.id));
    }

    res.json(fc);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/credibility/leaderboard", async (req: any, res) => {
  try {
    const rows = await db
      .select({
        id: credibilityScoresTable.id,
        score: credibilityScoresTable.score,
        totalChecked: credibilityScoresTable.totalChecked,
        trueCount: credibilityScoresTable.trueCount,
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatar: usersTable.avatarUrl,
      })
      .from(credibilityScoresTable)
      .innerJoin(usersTable, eq(credibilityScoresTable.userId, usersTable.id))
      .orderBy(desc(credibilityScoresTable.score))
      .limit(50);
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/credibility/:userId", async (req: any, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) { res.status(400).json({ error: "Noto'g'ri ID" }); return; }
    const cred = await getOrCreateCredibility(userId);
    res.json(cred);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
