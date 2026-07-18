import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable, reelsTable, productsTable } from "@workspace/db";
import { ilike, or, eq, and, ne } from "drizzle-orm";
import { midnightVisibilityConditionForReq } from "../lib/midnightVisibility";
import { cacheAside } from "../lib/cache";
import { meiliSearch, isMeiliAvailable } from "../lib/meili";

const router = Router();

const LIMIT = 20;

// GET /search?q=...&type=all|users|posts|reels|products
router.get("/search", async (req: any, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const type = String(req.query.type ?? "all");
    const limit = Math.min(Number(req.query.limit ?? LIMIT), 50);

    if (!q || q.length < 1) {
      res.json({ users: [], posts: [], reels: [], products: [], query: q }); return;
    }

    const myId = req.session?.userId;
    const cacheKey = `${q}:${type}:${limit}:${myId ?? 0}`;

    const result = await cacheAside("search", cacheKey, async () => {
      /* ── 1. Try Meilisearch first (fast, typo-tolerant) ── */
      if (isMeiliAvailable()) {
        const meili = await meiliSearch(q, type, limit);
        if (meili) {
          // Filter out self from users
          const users = myId ? meili.users.filter(u => u.id !== myId) : meili.users;
          return { users, posts: meili.posts, reels: meili.reels, products: meili.products, query: q, source: "meilisearch" };
        }
      }

      /* ── 2. Fallback: PostgreSQL ILIKE ── */
      const like = `%${q}%`;
      const midnightCond = await midnightVisibilityConditionForReq(req);
      const [users, posts, reels, products] = await Promise.all([
        (type === "all" || type === "users")
          ? db.select({
              id: usersTable.id,
              username: usersTable.username,
              displayName: usersTable.displayName,
              avatarUrl: usersTable.avatarUrl,
              isVerified: usersTable.isVerified,
              bio: usersTable.bio,
            }).from(usersTable).where(
              and(
                or(ilike(usersTable.username, like), ilike(usersTable.displayName, like), ilike(usersTable.bio, like)),
                myId ? ne(usersTable.id, myId) : undefined,
              )
            ).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "posts")
          ? db.select({
              id: postsTable.id,
              content: postsTable.content,
              mediaUrl: postsTable.mediaUrl,
              authorId: postsTable.authorId,
              likesCount: postsTable.likesCount,
              commentsCount: postsTable.commentsCount,
              createdAt: postsTable.createdAt,
            }).from(postsTable).where(and(ilike(postsTable.content, like), midnightCond)).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "reels")
          ? db.select({
              id: reelsTable.id,
              caption: reelsTable.caption,
              thumbnailUrl: reelsTable.thumbnailUrl,
              videoUrl: reelsTable.videoUrl,
              authorId: reelsTable.authorId,
              viewsCount: reelsTable.viewsCount,
              likesCount: reelsTable.likesCount,
            }).from(reelsTable).where(ilike(reelsTable.caption, like)).limit(limit)
          : Promise.resolve([]),

        (type === "all" || type === "products")
          ? db.select({
              id: productsTable.id,
              title: productsTable.title,
              price: productsTable.price,
              thumbnailUrl: productsTable.thumbnailUrl,
              category: productsTable.category,
              condition: productsTable.condition,
              location: productsTable.location,
              sellerId: productsTable.sellerId,
              rating: productsTable.rating,
              status: productsTable.status,
            }).from(productsTable).where(
              and(
                or(ilike(productsTable.title, like), ilike(productsTable.description, like)),
                eq(productsTable.status, "active"),
              )
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

export default router;
