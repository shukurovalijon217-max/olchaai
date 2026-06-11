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

function olCover(coverId: number | null | undefined, size = "M"): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

function mapOpenLibDoc(doc: Record<string, unknown>) {
  const coverId = doc.cover_i as number | undefined;
  const authors = (doc.author_name as string[] | undefined) ?? [];
  const isbns = (doc.isbn as string[] | undefined) ?? [];
  const langs = (doc.language as string[] | undefined) ?? [];
  const subjects = (doc.subject as string[] | undefined) ?? [];
  return {
    id: String(doc.key ?? doc.edition_key ?? Math.random()),
    title: String(doc.title ?? "Nomsiz"),
    authors,
    description: (doc.first_sentence as string | undefined) ?? null,
    thumbnailUrl: olCover(coverId),
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
    pageCount: (doc.number_of_pages_median as number | undefined) ?? null,
    categories: subjects.slice(0, 5),
    language: langs[0] ?? null,
    isbn: isbns[0] ?? null,
  };
}

router.get("/library/search", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { q, maxResults = "20" } = req.query as { q?: string; maxResults?: string };
  if (!q) { res.status(400).json({ error: "q required" }); return; }
  try {
    const limit = Math.min(Number(maxResults), 40);
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q as string)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,language,isbn,first_sentence`;
    const response = await fetch(url, { headers: { "User-Agent": "OlCha/1.0 (social platform)" } });
    const data = await response.json() as { docs?: unknown[]; numFound?: number };
    res.json({
      items: (data.docs ?? []).map(d => mapOpenLibDoc(d as Record<string, unknown>)),
      totalItems: data.numFound ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Qidiruv xatosi" });
  }
});

router.get("/library/search/popular", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const subjects = ["novel", "science_fiction", "self-help", "programming", "history", "biography"];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  try {
    const url = `https://openlibrary.org/subjects/${subject}.json?limit=12`;
    const response = await fetch(url, { headers: { "User-Agent": "OlCha/1.0 (social platform)" } });
    const data = await response.json() as { works?: unknown[] };
    const items = (data.works ?? []).map((w: unknown) => {
      const work = w as Record<string, unknown>;
      const coverId = work.cover_id as number | undefined;
      const authors = ((work.authors as Array<{ name: string }>) ?? []).map(a => a.name);
      return {
        id: String(work.key ?? Math.random()),
        title: String(work.title ?? "Nomsiz"),
        authors,
        thumbnailUrl: olCover(coverId),
        publishedDate: work.first_publish_year ? String(work.first_publish_year) : null,
        categories: [],
        language: null,
      };
    });
    res.json({ items });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
