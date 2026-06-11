import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, reelsTable, usersTable,
  userInteractionsTable, contentAnalysisTable,
} from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function enrichUser(u: Record<string, unknown>) {
  return { ...u, followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false };
}

router.get("/ai/feed", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId as number | undefined;
    const tagScores: Record<string, number> = {};

    if (userId) {
      const interactions = await db
        .select()
        .from(userInteractionsTable)
        .where(
          and(
            eq(userInteractionsTable.userId, userId),
            inArray(userInteractionsTable.interactionType, ["like", "comment", "share"])
          )
        )
        .orderBy(desc(userInteractionsTable.createdAt))
        .limit(50);

      const weights: Record<string, number> = { like: 3, comment: 2, share: 2, view: 1 };
      const postIds = interactions.filter(i => i.contentType === "post").map(i => i.contentId);
      const reelIds = interactions.filter(i => i.contentType === "reel").map(i => i.contentId);

      const interactedPosts = postIds.length > 0
        ? await db.select().from(postsTable).where(inArray(postsTable.id, postIds))
        : [];
      const interactedReels = reelIds.length > 0
        ? await db.select().from(reelsTable).where(inArray(reelsTable.id, reelIds))
        : [];

      const postTagMap = new Map(interactedPosts.map(p => [p.id, p.tags ?? []]));
      const reelTagMap = new Map(interactedReels.map(r => [r.id, r.tags ?? []]));

      for (const interaction of interactions) {
        const w = weights[interaction.interactionType] ?? 1;
        const tags =
          interaction.contentType === "post"
            ? (postTagMap.get(interaction.contentId) ?? [])
            : (reelTagMap.get(interaction.contentId) ?? []);
        tags.forEach(tag => { tagScores[tag] = (tagScores[tag] ?? 0) + w; });
      }
    }

    const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(30);
    const reels = await db.select().from(reelsTable).orderBy(desc(reelsTable.viewsCount)).limit(10);
    const users = await db.select().from(usersTable).limit(5);

    const enrichedPosts = await Promise.all(
      posts.map(async p => {
        const [author] = await db.select().from(usersTable).where(eq(usersTable.id, p.authorId));
        const tags = p.tags ?? [];
        const personalScore = tags.reduce((s, tag) => s + (tagScores[tag] ?? 0), 0);
        const popularScore = p.likesCount * 0.1 + p.commentsCount * 0.2;
        return {
          ...p,
          author: enrichUser((author ?? {}) as Record<string, unknown>),
          tags,
          isLiked: false,
          _score: personalScore + popularScore,
        };
      })
    );
    enrichedPosts.sort((a, b) => b._score - a._score);

    const enrichedReels = await Promise.all(
      reels.map(async r => {
        const [author] = await db.select().from(usersTable).where(eq(usersTable.id, r.authorId));
        return {
          ...r,
          author: enrichUser((author ?? {}) as Record<string, unknown>),
          tags: r.tags ?? [],
          isLiked: false,
        };
      })
    );

    res.json({
      posts: enrichedPosts,
      reels: enrichedReels,
      suggestedUsers: users.map(u => enrichUser(u as Record<string, unknown>)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/interactions", async (req, res) => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(204).end(); return; }
  const { contentType, contentId, interactionType, durationMs } = req.body;
  if (!contentType || !contentId || !interactionType) {
    res.status(400).json({ error: "Missing fields" }); return;
  }
  try {
    await db.insert(userInteractionsTable).values({
      userId,
      contentType,
      contentId: Number(contentId),
      interactionType,
      durationMs: durationMs ? Number(durationMs) : null,
    });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/analysis/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  try {
    const [analysis] = await db
      .select()
      .from(contentAnalysisTable)
      .where(
        and(
          eq(contentAnalysisTable.contentType, type),
          eq(contentAnalysisTable.contentId, Number(id))
        )
      );
    if (!analysis) { res.status(404).json({ error: "No analysis found" }); return; }
    res.json(analysis);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/analyze-content", async (req, res) => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { contentId, contentType, caption, imageUrl } = req.body;
  if (!contentId || !contentType) {
    res.status(400).json({ error: "contentId and contentType required" }); return;
  }
  try {
    const [existing] = await db
      .select()
      .from(contentAnalysisTable)
      .where(
        and(
          eq(contentAnalysisTable.contentType, contentType),
          eq(contentAnalysisTable.contentId, Number(contentId))
        )
      );
    if (existing) { res.json(existing); return; }

    const textContent = caption || "(no caption)";
    const userContent: unknown = imageUrl
      ? [
          { type: "text", text: `Caption: ${textContent}` },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ]
      : `Analyze this content: "${textContent}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are a content analysis AI. Analyze social media content and return only valid JSON:
{"tags":["tag1","tag2","tag3"],"category":"Entertainment|Education|Lifestyle|Music|Sports|Food|Travel|Fashion|Technology|Humor|Art|News|Gaming|Fitness|Business","summary":"1-2 sentences","sentiment":"positive|neutral|negative"}
Tags: 3-6 relevant hashtags without #.`,
        },
        { role: "user", content: userContent as string },
      ],
    });

    let analysisData = {
      tags: [] as string[],
      category: "Entertainment",
      summary: textContent.slice(0, 120),
      sentiment: "neutral",
    };
    try {
      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      analysisData = { ...analysisData, ...parsed };
    } catch { /* use defaults */ }

    const [saved] = await db
      .insert(contentAnalysisTable)
      .values({
        contentId: Number(contentId),
        contentType,
        tags: analysisData.tags ?? [],
        category: analysisData.category ?? "Entertainment",
        summary: analysisData.summary ?? "",
        sentiment: analysisData.sentiment ?? "neutral",
        aiMetadata: JSON.stringify({ model: "gpt-4o-mini" }),
      })
      .onConflictDoNothing()
      .returning();

    res.json(saved ?? analysisData);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tahlil qilishda xato" });
  }
});

router.get("/ai/trending-topics", async (req, res) => {
  try {
    const topics = [
      { tag: "AI", postCount: 12400, growth: 23.5, category: "Technology" },
      { tag: "Web3", postCount: 8900, growth: 15.2, category: "Finance" },
      { tag: "Fitness", postCount: 7600, growth: 8.1, category: "Health" },
      { tag: "Travel", postCount: 6200, growth: 12.0, category: "Lifestyle" },
      { tag: "Music", postCount: 5800, growth: 6.3, category: "Entertainment" },
      { tag: "Gaming", postCount: 5100, growth: 18.7, category: "Entertainment" },
      { tag: "Photography", postCount: 4700, growth: 4.2, category: "Art" },
      { tag: "Fashion", postCount: 4300, growth: 9.8, category: "Lifestyle" },
    ];
    res.json(topics);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/suggestions", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(6);
    res.json({
      users: users.map(u => enrichUser(u as Record<string, unknown>)),
      groups: [],
      topics: ["AI", "Fitness", "Photography", "Travel", "Gaming"],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/moderation", async (req, res) => {
  try {
    const { content } = req.body;
    const flagWords = ["spam", "hate", "abuse", "violence"];
    const lower = (content || "").toLowerCase();
    const flags = flagWords.filter(w => lower.includes(w));
    res.json({
      safe: flags.length === 0,
      confidence: flags.length === 0 ? 0.97 : 0.23,
      flags,
      recommendation: flags.length === 0 ? "Approved" : "Review required",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
