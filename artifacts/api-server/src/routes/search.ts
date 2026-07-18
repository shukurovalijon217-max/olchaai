import { Router } from "express";
import { db, readDb } from "@workspace/db";
import { usersTable, postsTable, reelsTable, productsTable } from "@workspace/db";
import { ilike, or, eq, and, ne, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { cacheAside } from "../lib/cache";
import { meiliSearch, isMeiliAvailable } from "../lib/meili";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();
const LIMIT = 20;

/* ── OpenAI for semantic search ───────────────────────────────── */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const resp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 1000),
    });
    return resp.data[0]!.embedding;
  } catch {
    return null;
  }
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

/* ── GET /search?q=...&type=all|users|posts|reels|products ──── */
router.get("/search", async (req: any, res) => {
  try {
    const q     = String(req.query.q ?? "").trim();
    const type  = String(req.query.type ?? "all");
    const limit = Math.min(Number(req.query.limit ?? LIMIT), 50);

    if (!q || q.length < 1) {
      res.json({ users: [], posts: [], reels: [], products: [], query: q }); return;
    }

    const myId     = req.session?.userId;
    const cacheKey = `${q}:${type}:${limit}:${myId ?? 0}`;

    const result = await cacheAside("search", cacheKey, async () => {
      /* ── 1. Try Meilisearch first (fast, typo-tolerant) ── */
      if (isMeiliAvailable()) {
        const meili = await meiliSearch(q, type, limit);
        if (meili) {
          const users = myId ? meili.users.filter((u: any) => u.id !== myId) : meili.users;
          return { users, posts: meili.posts, reels: meili.reels, products: meili.products, query: q, source: "meilisearch" };
        }
      }

      /* ── 2. Fallback: PostgreSQL ILIKE ── */
      const like = `%${q}%`;
      const midnightCond = await midnightVisibilityConditionForReq(req);
      const [users, posts, reels, products] = await Promise.all([
        (type === "all" || type === "users")
          ? readDb.select({
              id: usersTable.id, username: usersTable.username,
              displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl,
              isVerified: usersTable.isVerified, bio: usersTable.bio,
            }).from(usersTable).where(
              and(
                or(ilike(usersTable.username, like), ilike(usersTable.displayName, like), ilike(usersTable.bio, like)),
                myId ? ne(usersTable.id, myId) : undefined,
              )
            ).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "posts")
          ? readDb.select({
              id: postsTable.id, content: postsTable.content, mediaUrl: postsTable.mediaUrl,
              authorId: postsTable.authorId, likesCount: postsTable.likesCount,
              commentsCount: postsTable.commentsCount, createdAt: postsTable.createdAt,
            }).from(postsTable).where(and(ilike(postsTable.content, like), midnightCond)).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "reels")
          ? readDb.select({
              id: reelsTable.id, caption: reelsTable.caption, thumbnailUrl: reelsTable.thumbnailUrl,
              videoUrl: reelsTable.videoUrl, authorId: reelsTable.authorId,
              viewsCount: reelsTable.viewsCount, likesCount: reelsTable.likesCount,
            }).from(reelsTable).where(ilike(reelsTable.caption, like)).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "products")
          ? readDb.select({
              id: productsTable.id, title: productsTable.title, price: productsTable.price,
              thumbnailUrl: productsTable.thumbnailUrl, category: productsTable.category,
              condition: productsTable.condition, location: productsTable.location,
              sellerId: productsTable.sellerId, rating: productsTable.rating, status: productsTable.status,
            }).from(productsTable).where(
              and(or(ilike(productsTable.title, like), ilike(productsTable.description, like)), eq(productsTable.status, "active"))
            ).limit(limit)
          : Promise.resolve([]),
      ]);
      return { users, posts, reels, products, query: q, source: "db" };
    }, 30);

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Qidirishda xato" });
  }
});

/* ── GET /search/semantic?q=...&limit=10 ──────────────────────
   Semantic search using OpenAI embeddings + cosine similarity.
   Returns posts ranked by semantic relevance to the query.
   ─────────────────────────────────────────────────────────── */
router.get("/search/semantic", async (req: any, res) => {
  try {
    const q     = String(req.query.q ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 10), 30);

    if (!q || q.length < 2) {
      res.json({ posts: [], query: q, source: "semantic" }); return;
    }

    /* 1. Embed the query */
    const queryVec = await embedQuery(q);
    if (!queryVec) {
      res.json({ posts: [], query: q, source: "semantic", error: "embedding_unavailable" }); return;
    }

    /* 2. Load all post embeddings (JSONB array) */
    const rows = await readDb.execute(sql`
      SELECT pe.post_id, pe.embedding,
             p.content, p.media_url, p.author_id, p.likes_count, p.comments_count, p.created_at
      FROM post_embeddings pe
      JOIN posts p ON p.id = pe.post_id
      WHERE p.deleted_at IS NULL
      LIMIT 2000
    `);

    const rawRows = (rows as any).rows ?? (rows as any) ?? [];

    /* 3. Cosine similarity for each post */
    const scored: Array<{ score: number; post: any }> = [];
    for (const row of rawRows) {
      try {
        const emb: number[] = typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;
        if (!Array.isArray(emb)) continue;
        const score = cosine(queryVec, emb);
        scored.push({ score, post: row });
      } catch { /* skip malformed embedding */ }
    }

    /* 4. Sort by similarity, take top N */
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    /* 5. Fetch author info for top posts */
    const authorIds = [...new Set(top.map(t => Number(t.post.author_id)).filter(Boolean))];
    const authors = authorIds.length
      ? await readDb.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified })
          .from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

    const posts = top.map(({ score, post }) => ({
      id:            post.post_id,
      content:       post.content,
      mediaUrl:      post.media_url,
      authorId:      post.author_id,
      likesCount:    post.likes_count,
      commentsCount: post.comments_count,
      createdAt:     post.created_at,
      author:        authorMap[post.author_id] ?? null,
      _similarity:   Math.round(score * 100) / 100,
    }));

    logger.info({ query: q, results: posts.length }, "Semantic search completed");
    res.json({ posts, query: q, source: "semantic", total: rawRows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Semantic qidirishda xato" });
  }
});

export default router;
