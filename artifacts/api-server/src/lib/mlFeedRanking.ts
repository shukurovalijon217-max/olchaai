/**
 * ML Feed Ranking — TikTok-style deep personalization
 * OpenAI text-embedding-3-small + cosine similarity scoring
 *
 * Pipeline:
 *   1. Embed post content → store in post_embeddings table
 *   2. Build user interest vector from recent interactions (likes/views/comments)
 *   3. Rank candidate posts by cosine similarity to user profile
 *   4. Blend with recency + engagement signals (like TikTok's hybrid scoring)
 */
import OpenAI from "openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── Ensure tables ────────────────────────────────────────────── */
async function ensureTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS post_embeddings (
        post_id      INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        embedding    JSONB NOT NULL,
        content_hash TEXT  NOT NULL,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_interest_profiles (
        user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        embedding    JSONB NOT NULL,
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch { /* already exists */ }
}
ensureTables().catch(() => {});

/* ── Embedding helpers ────────────────────────────────────────── */
async function embed(text: string): Promise<number[]> {
  const resp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 2000), // model limit safe guard
  });
  return resp.data[0]!.embedding;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na  += a[i]! * a[i]!;
    nb  += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function avg(vecs: number[][]): number[] {
  if (!vecs.length) return [];
  const dim = vecs[0]!.length;
  const result = new Array<number>(dim).fill(0);
  for (const v of vecs) {
    for (let i = 0; i < dim; i++) result[i]! += v[i]!;
  }
  return result.map(x => x / vecs.length);
}

/* ── Post embedding (lazy, cached in DB) ─────────────────────── */
export async function getOrEmbedPost(postId: number, content: string): Promise<number[] | null> {
  try {
    const hash = Buffer.from(content.slice(0, 500)).toString("base64").slice(0, 32);

    // Check cache
    const cached = await db.execute(sql`
      SELECT embedding FROM post_embeddings WHERE post_id = ${postId} AND content_hash = ${hash}
    `);
    const row = (cached as any).rows?.[0];
    if (row?.embedding) {
      return typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding;
    }

    // Generate new embedding
    const vec = await embed(content);
    await db.execute(sql`
      INSERT INTO post_embeddings (post_id, embedding, content_hash)
      VALUES (${postId}, ${JSON.stringify(vec)}::jsonb, ${hash})
      ON CONFLICT (post_id) DO UPDATE SET embedding = EXCLUDED.embedding, content_hash = EXCLUDED.content_hash
    `);
    return vec;
  } catch (err) {
    logger.warn({ err, postId }, "mlFeedRanking: embed post failed");
    return null;
  }
}

/* ── User interest profile ────────────────────────────────────── */
export async function buildUserProfile(userId: number): Promise<number[] | null> {
  try {
    // Check fresh cached profile (< 2 hours old)
    const cached = await db.execute(sql`
      SELECT embedding FROM user_interest_profiles
      WHERE user_id = ${userId} AND updated_at > NOW() - INTERVAL '2 hours'
    `);
    const cachedRow = (cached as any).rows?.[0];
    if (cachedRow?.embedding) {
      return typeof cachedRow.embedding === "string"
        ? JSON.parse(cachedRow.embedding)
        : cachedRow.embedding;
    }

    // Collect recent interaction post embeddings (likes in last 30 days)
    const interacted = await db.execute(sql`
      SELECT pe.embedding
      FROM post_likes pl
      JOIN post_embeddings pe ON pe.post_id = pl.post_id
      WHERE pl.user_id = ${userId}
        AND pl.created_at > NOW() - INTERVAL '30 days'
      LIMIT 50
    `);
    const rows = (interacted as any).rows ?? [];

    if (rows.length < 3) return null; // not enough data for meaningful profile

    const vecs = rows.map((r: any) => {
      try {
        return typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding;
      } catch { return null; }
    }).filter(Boolean) as number[][];

    if (!vecs.length) return null;

    const profile = avg(vecs);

    // Persist profile
    await db.execute(sql`
      INSERT INTO user_interest_profiles (user_id, embedding, updated_at)
      VALUES (${userId}, ${JSON.stringify(profile)}::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
    `);

    return profile;
  } catch (err) {
    logger.warn({ err, userId }, "mlFeedRanking: build user profile failed");
    return null;
  }
}

/* ── Hybrid feed scorer ───────────────────────────────────────── */
interface ScoredPost {
  id: number;
  mlScore: number;      // cosine similarity 0..1
  finalScore: number;   // blended score
}

interface PostForScoring {
  id: number;
  content?: string | null;
  caption?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: Date | null;
}

export async function rankFeedPosts(
  posts: PostForScoring[],
  userId: number,
): Promise<number[]> {
  if (!posts.length) return [];

  try {
    const userProfile = await buildUserProfile(userId);

    // Embed all posts in parallel (fire-and-forget cached)
    const embeddings = await Promise.all(
      posts.map(p => {
        const text = [p.content, p.caption].filter(Boolean).join(" ").trim();
        return text ? getOrEmbedPost(p.id, text) : Promise.resolve(null);
      }),
    );

    const now = Date.now();
    const scored: ScoredPost[] = posts.map((p, i) => {
      const vec = embeddings[i];

      // ML similarity score
      const mlScore = userProfile && vec ? cosine(userProfile, vec) : 0;

      // Engagement score (log-normalized)
      const engagement = Math.log1p((p.likesCount ?? 0) + (p.commentsCount ?? 0) * 2);

      // Recency decay: half-life 6 hours (TikTok-like freshness boost)
      const ageMs = p.createdAt ? now - new Date(p.createdAt).getTime() : 86_400_000;
      const recency = Math.exp(-ageMs / (6 * 3_600_000));

      // Blend: 50% ML relevance + 30% recency + 20% engagement
      const finalScore = mlScore * 0.5 + recency * 0.3 + Math.min(engagement / 10, 1) * 0.2;

      return { id: p.id, mlScore, finalScore };
    });

    // Sort descending by final score
    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored.map(s => s.id);
  } catch (err) {
    logger.warn({ err, userId }, "mlFeedRanking: ranking failed, falling back to chronological");
    // Graceful fallback: return original order (chronological)
    return posts.map(p => p.id);
  }
}

/* ── Background task: pre-embed recent posts ─────────────────── */
export async function preEmbedRecentPosts(limit = 50): Promise<void> {
  try {
    const recent = await db.execute(sql`
      SELECT p.id,
             coalesce(p.content, '') || ' ' || coalesce(p.caption, '') AS text
      FROM posts p
      LEFT JOIN post_embeddings pe ON pe.post_id = p.id
      WHERE pe.post_id IS NULL
        AND p.created_at > NOW() - INTERVAL '7 days'
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `);
    const rows = (recent as any).rows ?? [];
    if (!rows.length) return;

    // Process in small batches to avoid OpenAI rate limits
    const BATCH = 5;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(
        batch.map((r: any) => {
          const text = (r.text ?? "").trim();
          if (!text) return Promise.resolve();
          return getOrEmbedPost(r.id, text).catch(() => {});
        }),
      );
      if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 200)); // rate-limit pause
    }
    logger.info({ count: rows.length }, "mlFeedRanking: pre-embedded posts");
  } catch (err) {
    logger.warn({ err }, "mlFeedRanking: preEmbed failed");
  }
}
