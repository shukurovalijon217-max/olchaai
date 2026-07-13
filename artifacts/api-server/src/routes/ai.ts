import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, reelsTable, usersTable, postLikesTable,
  userInteractionsTable, contentAnalysisTable,
} from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkAIAccess, incrementAIUsage } from "../lib/aiAccess";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { getUserStatsMap } from "../lib/userStats";

const router = Router();

/* ── OpenAI config health check (public, no auth) ── */
router.get("/ai/config-status", (_req, res) => {
  const hasKey = !!process.env.OPENAI_API_KEY;
  res.json({
    openai: hasKey ? "configured" : "missing",
    status: hasKey ? "ok" : "error",
    message: hasKey ? "AI services ready" : "OPENAI_API_KEY environment variable is not set",
  });
});

function enrichUser(u: Record<string, unknown>, stats: any) {
  return { ...u, ...(stats || { followersCount: 0, followingCount: 0, postsCount: 0, isFollowing: false }) };
}

router.get("/ai/feed", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId as number | undefined;
    const tagScores: Record<string, number> = {};

    if (userId) {
      const interactions = await db
        .select()
        .from(userInteractionsTable)
        .where(eq(userInteractionsTable.userId, userId))
        .orderBy(desc(userInteractionsTable.createdAt))
        .limit(120);

      const postIds = [...new Set(interactions.filter(i => i.contentType === "post").map(i => i.contentId))];
      const reelIds = [...new Set(interactions.filter(i => i.contentType === "reel").map(i => i.contentId))];

      const interactedPosts = postIds.length > 0
        ? await db.select().from(postsTable).where(inArray(postsTable.id, postIds))
        : [];
      const interactedReels = reelIds.length > 0
        ? await db.select().from(reelsTable).where(inArray(reelsTable.id, reelIds))
        : [];

      const postTagMap = new Map(interactedPosts.map(p => [p.id, p.tags ?? []]));
      const reelTagMap = new Map(interactedReels.map(r => [r.id, r.tags ?? []]));

      for (const interaction of interactions) {
        // Dwell-time aware weights: longer view = stronger signal
        let w: number;
        if (interaction.interactionType === "like") w = 3;
        else if (interaction.interactionType === "comment") w = 2.5;
        else if (interaction.interactionType === "share") w = 2;
        else if (interaction.interactionType === "view") {
          // 0ms → 1pt, 5s → 1.5pt, 15s → 2pt, 30s+ → 4pt
          w = 1 + Math.min((interaction.durationMs ?? 0) / 10000, 3);
        } else w = 1;

        const tags =
          interaction.contentType === "post"
            ? (postTagMap.get(interaction.contentId) ?? [])
            : (reelTagMap.get(interaction.contentId) ?? []);
        tags.forEach(tag => { tagScores[tag] = (tagScores[tag] ?? 0) + w; });
      }
    }

    const midnightCond = await midnightVisibilityConditionForReq(req);
    const [posts, reels] = await Promise.all([
      db.select().from(postsTable).where(midnightCond).orderBy(desc(postsTable.createdAt)).limit(30),
      db.select().from(reelsTable).orderBy(desc(reelsTable.viewsCount)).limit(10),
    ]);

    /* Batch fetch all authors in 1 query (not N queries) */
    const allAuthorIds = [...new Set([
      ...posts.map(p => p.authorId),
      ...reels.map(r => r.authorId),
    ].filter(Boolean))] as number[];

    const authors = allAuthorIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, allAuthorIds))
      : [];
    const authorMap = new Map(authors.map(a => [a.id, a]));
    const statsMap = await getUserStatsMap(allAuthorIds, userId);

    /* Batch fetch liked status if logged in */
    const viewerId = userId;
    let likedPostIds = new Set<number>();
    if (viewerId && posts.length > 0) {
      const liked = await db
        .select({ postId: postLikesTable.postId })
        .from(postLikesTable)
        .where(and(
          inArray(postLikesTable.postId, posts.map(p => p.id)),
          eq(postLikesTable.userId, viewerId),
        ));
      likedPostIds = new Set(liked.map(l => l.postId));
    }

    const enrichedPosts = posts.map(p => {
      const author = authorMap.get(p.authorId as number) ?? {};
      const tags = p.tags ?? [];
      const personalScore = tags.reduce((s, tag) => s + (tagScores[tag] ?? 0), 0);
      const popularScore = (p.likesCount ?? 0) * 0.1 + (p.commentsCount ?? 0) * 0.2;
      const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
      const freshnessBoost = Math.max(0, 3 - ageHours / 8);
      return {
        ...p,
        likesCount: p.likesCount ?? 0,
        commentsCount: p.commentsCount ?? 0,
        author: enrichUser(author as Record<string, unknown>, statsMap.get(p.authorId as number)),
        tags,
        isLiked: likedPostIds.has(p.id),
        _score: personalScore + popularScore + freshnessBoost,
      };
    });
    enrichedPosts.sort((a, b) => b._score - a._score);

    const enrichedReels = reels.map(r => {
      const author = authorMap.get(r.authorId as number) ?? {};
      return {
        ...r,
        likesCount: r.likesCount ?? 0,
        commentsCount: r.commentsCount ?? 0,
        author: enrichUser(author as Record<string, unknown>, statsMap.get(r.authorId as number)),
        tags: r.tags ?? [],
        isLiked: false,
      };
    });

    /* Suggested users: only real accounts (exclude viewer themselves) */
    const suggestedUsers = authors
      .filter(u => u.id !== userId)
      .slice(0, 5)
      .map(u => enrichUser(u as Record<string, unknown>, statsMap.get(u.id)));

    /* Echo Detector: how much of the personalization signal is concentrated
     * in a single tag — a high share means the feed is stuck in a bubble. */
    const tagEntries = Object.entries(tagScores);
    const totalTagScore = tagEntries.reduce((s, [, v]) => s + v, 0);
    let echoScore = 0;
    let echoTopTag: string | null = null;
    if (totalTagScore > 0) {
      const [topTag, topScore] = tagEntries.sort((a, b) => b[1] - a[1])[0];
      echoScore = Math.round((topScore / totalTagScore) * 100);
      echoTopTag = topTag;
    }

    res.json({
      posts: enrichedPosts,
      reels: enrichedReels,
      suggestedUsers,
      echoScore,
      echoTopTag,
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

    const access = await checkAIAccess(userId);
    if (!access.allowed) {
      res.status(402).json({ error: "AI_LIMIT_REACHED", used: access.used, limit: access.limit, remaining: 0 });
      return;
    }

    const textContent = caption || "(no caption)";
    const userContent: unknown = imageUrl
      ? [
          { type: "text", text: `Caption: ${textContent}` },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ]
      : `Analyze this content: "${textContent}"`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
        aiMetadata: JSON.stringify({ model: "llama-3.3-70b-versatile" }),
      })
      .onConflictDoNothing()
      .returning();

    await incrementAIUsage(userId);
    res.json(saved ?? analysisData);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tahlil qilishda xato" });
  }
});

router.get("/ai/trending-topics", async (req, res) => {
  try {
    const rows = await db.select({ tags: postsTable.tags, createdAt: postsTable.createdAt }).from(postsTable).limit(2000);
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const recentCounts: Record<string, number> = {};
    const priorCounts: Record<string, number> = {};
    for (const row of rows) {
      if (!Array.isArray(row.tags)) continue;
      const ageMs = now - new Date(row.createdAt).getTime();
      for (const tag of row.tags) {
        if (!tag || tag.startsWith("_")) continue;
        if (ageMs <= DAY_MS) recentCounts[tag] = (recentCounts[tag] ?? 0) + 1;
        else if (ageMs <= 2 * DAY_MS) priorCounts[tag] = (priorCounts[tag] ?? 0) + 1;
      }
    }
    const totalCounts: Record<string, number> = {};
    for (const row of rows) {
      if (!Array.isArray(row.tags)) continue;
      for (const tag of row.tags) {
        if (tag && !tag.startsWith("_")) totalCounts[tag] = (totalCounts[tag] ?? 0) + 1;
      }
    }

    const fromDb = Object.entries(totalCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, postCount]) => {
        const recent = recentCounts[tag] ?? 0;
        const prior = priorCounts[tag] ?? 0;
        const growth = prior > 0
          ? Math.round(((recent - prior) / prior) * 1000) / 10
          : recent > 0 ? 100 : 0;
        return { tag, postCount, growth, category: "Trending" };
      });

    res.json(fromDb);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/suggestions", async (req, res) => {
  try {
    const viewerId = (req.session as any)?.userId as number | undefined;
    const users = await db.select().from(usersTable).limit(6);
    const statsMap = await getUserStatsMap(users.map(u => u.id), viewerId);
    res.json({
      users: users.map(u => enrichUser(u as Record<string, unknown>, statsMap.get(u.id))),
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

/* ── AI group post text assist ───────────────────────────────── */
router.post("/ai/group-assist", async (req, res) => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { prompt, groupName, groupCategory } = req.body;
    if (!prompt?.trim()) { res.status(400).json({ error: "prompt required" }); return; }

    const access = await checkAIAccess(userId);
    if (!access.allowed) {
      res.status(402).json({ error: "AI_LIMIT_REACHED", used: access.used, limit: access.limit, remaining: 0 });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Siz "${groupName || "guruh"}" nomli guruh uchun post yozishga yordam berasiz (kategoriya: ${groupCategory || "umumiy"}). Foydalanuvchi ko'rsatmasi asosida qisqa, qiziqarli, va guruhga mos post matni yozing. 1-3 jumladan oshirmang. Faqat postning o'zini yozing, izoh qo'shmang.`,
        },
        { role: "user", content: prompt.trim() },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    await incrementAIUsage(userId);
    res.json({ text });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xizmati hozir mavjud emas" });
  }
});

/* ── AI video title/tag/caption suggestion (OTube upload) ───── */
router.post("/ai/video-suggest", async (req, res) => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { fileName } = req.body;

    const access = await checkAIAccess(userId);
    if (!access.allowed) {
      res.status(402).json({ error: "AI_LIMIT_REACHED", used: access.used, limit: access.limit, remaining: 0 });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Siz OlchaAI NEXUS video platformasi uchun video sarlavhasi, teglar va tavsif yozishga yordam berasiz. Fayl nomi asosida jozibali, qisqa sarlavha (60 belgigacha), 4-6 ta tegdan iborat ro'yxat va 1-2 jumlalik tavsif tuzing. Faqat JSON qaytaring: {"title": string, "tags": string[], "caption": string}. Boshqa hech narsa yozmang.`,
        },
        { role: "user", content: `Video fayl nomi: ${fileName || "video"}` },
      ],
      max_tokens: 220,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { title?: string; tags?: string[]; caption?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    await incrementAIUsage(userId);
    res.json({
      title: parsed.title || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
      caption: parsed.caption || "",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI xizmati hozir mavjud emas" });
  }
});

export default router;
