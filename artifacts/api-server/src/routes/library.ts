import { Router } from "express";
import { db } from "@workspace/db";
import { userBooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/library/books", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const books = await db.select().from(userBooksTable)
      .where(eq(userBooksTable.userId, req.session.userId))
      .orderBy(userBooksTable.addedAt);
    res.json(books);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/library/books", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { googleBookId, title, authors, description, thumbnailUrl, publishedDate, pageCount, categories, language, isbn } = req.body;
  if (!googleBookId || !title) { res.status(400).json({ error: "googleBookId and title required" }); return; }
  try {
    const existing = await db.select({ id: userBooksTable.id }).from(userBooksTable)
      .where(and(eq(userBooksTable.userId, req.session.userId), eq(userBooksTable.googleBookId, googleBookId)));
    if (existing.length > 0) { res.status(409).json({ error: "Kitob allaqachon kutubxonangizda" }); return; }
    const [book] = await db.insert(userBooksTable).values({
      userId: req.session.userId,
      googleBookId,
      title,
      authors: typeof authors === "string" ? authors : (authors as string[])?.join(", ") ?? "",
      description,
      thumbnailUrl,
      publishedDate,
      pageCount,
      categories: typeof categories === "string" ? categories : (categories as string[])?.join(", ") ?? null,
      language,
      isbn,
    }).returning();
    res.status(201).json(book);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/library/books/:id", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const { status, currentPage, rating, review, isFavorite } = req.body;
  try {
    const [existing] = await db.select().from(userBooksTable)
      .where(and(eq(userBooksTable.id, id), eq(userBooksTable.userId, req.session.userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const updates: Partial<typeof userBooksTable.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (currentPage !== undefined) updates.currentPage = currentPage;
    if (rating !== undefined) updates.rating = rating;
    if (review !== undefined) updates.review = review;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;
    const [updated] = await db.update(userBooksTable).set(updates).where(eq(userBooksTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/library/books/:id", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  try {
    await db.delete(userBooksTable)
      .where(and(eq(userBooksTable.id, id), eq(userBooksTable.userId, req.session.userId)));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/library/search", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { q, maxResults = "20" } = req.query as { q?: string; maxResults?: string };
  if (!q) { res.status(400).json({ error: "q required" }); return; }
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}&langRestrict=uz&orderBy=relevance`;
    const response = await fetch(url);
    const data = await response.json() as { items?: unknown[]; totalItems?: number };
    res.json({
      items: (data.items || []).map((item: unknown) => {
        const i = item as Record<string, unknown>;
        const vi = (i.volumeInfo || {}) as Record<string, unknown>;
        const il = (vi.imageLinks || {}) as Record<string, string>;
        return {
          id: i.id,
          title: vi.title || "Nomsiz",
          authors: vi.authors || [],
          description: vi.description || null,
          thumbnailUrl: il.thumbnail || il.smallThumbnail || null,
          publishedDate: vi.publishedDate || null,
          pageCount: vi.pageCount || null,
          categories: vi.categories || [],
          language: vi.language || "uz",
          isbn: (((vi.industryIdentifiers as unknown[]) || []) as Array<{ type: string; identifier: string }>)
            .find(x => x.type === "ISBN_13")?.identifier || null,
        };
      }),
      totalItems: data.totalItems || 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Qidiruv xatosi" });
  }
});

router.get("/library/search/popular", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const queries = ["o'zbek adabiyoti", "islom karimov", "science fiction", "python programming", "biznes"];
  const q = queries[Math.floor(Math.random() * queries.length)];
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&orderBy=relevance`;
    const response = await fetch(url);
    const data = await response.json() as { items?: unknown[] };
    const items = (data.items || []).map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const vi = (i.volumeInfo || {}) as Record<string, unknown>;
      const il = (vi.imageLinks || {}) as Record<string, string>;
      return {
        id: i.id,
        title: vi.title || "Nomsiz",
        authors: vi.authors || [],
        thumbnailUrl: il.thumbnail || il.smallThumbnail || null,
        publishedDate: vi.publishedDate || null,
        categories: vi.categories || [],
        language: vi.language || null,
      };
    });
    res.json({ items });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
