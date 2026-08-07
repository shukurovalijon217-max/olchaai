import { Router } from "express";
import { db } from "@workspace/db";
import { userBooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai, AI_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
const router = Router();
router.get("/library/books", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const books = await db.select().from(userBooksTable)
            .where(eq(userBooksTable.userId, req.session.userId))
            .orderBy(userBooksTable.addedAt);
        res.json(books);
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.post("/library/books", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { googleBookId, title, authors, description, thumbnailUrl, publishedDate, pageCount, categories, language, isbn } = req.body;
    if (!googleBookId || !title) {
        res.status(400).json({ error: "googleBookId and title required" });
        return;
    }
    try {
        const existing = await db.select({ id: userBooksTable.id }).from(userBooksTable)
            .where(and(eq(userBooksTable.userId, req.session.userId), eq(userBooksTable.googleBookId, googleBookId)));
        if (existing.length > 0) {
            res.status(409).json({ error: "Kitob allaqachon kutubxonangizda" });
            return;
        }
        const [book] = await db.insert(userBooksTable).values({
            userId: req.session.userId,
            googleBookId,
            title,
            authors: typeof authors === "string" ? authors : authors?.join(", ") ?? "",
            description,
            thumbnailUrl,
            publishedDate,
            pageCount,
            categories: typeof categories === "string" ? categories : categories?.join(", ") ?? null,
            language,
            isbn,
        }).returning();
        res.status(201).json(book);
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.patch("/library/books/:id", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = Number(req.params.id);
    const { status, currentPage, rating, review, isFavorite } = req.body;
    try {
        const [existing] = await db.select().from(userBooksTable)
            .where(and(eq(userBooksTable.id, id), eq(userBooksTable.userId, req.session.userId)));
        if (!existing) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const updates = { updatedAt: new Date() };
        if (status !== undefined)
            updates.status = status;
        if (currentPage !== undefined)
            updates.currentPage = currentPage;
        if (rating !== undefined)
            updates.rating = rating;
        if (review !== undefined)
            updates.review = review;
        if (isFavorite !== undefined)
            updates.isFavorite = isFavorite;
        const [updated] = await db.update(userBooksTable).set(updates).where(eq(userBooksTable.id, id)).returning();
        res.json(updated);
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/library/books/:id", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = Number(req.params.id);
    try {
        await db.delete(userBooksTable)
            .where(and(eq(userBooksTable.id, id), eq(userBooksTable.userId, req.session.userId)));
        res.status(204).end();
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
function olCover(coverId, size = "M") {
    if (!coverId)
        return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
function mapOpenLibDoc(doc) {
    const coverId = doc.cover_i;
    const authors = doc.author_name ?? [];
    const isbns = doc.isbn ?? [];
    const langs = doc.language ?? [];
    const subjects = doc.subject ?? [];
    return {
        id: String(doc.key ?? doc.edition_key ?? Math.random()),
        title: String(doc.title ?? "Nomsiz"),
        authors,
        description: doc.first_sentence ?? null,
        thumbnailUrl: olCover(coverId),
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
        pageCount: doc.number_of_pages_median ?? null,
        categories: subjects.slice(0, 5),
        language: langs[0] ?? null,
        isbn: isbns[0] ?? null,
    };
}
router.get("/library/search", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { q, maxResults = "20" } = req.query;
    if (!q) {
        res.status(400).json({ error: "q required" });
        return;
    }
    try {
        const limit = Math.min(Number(maxResults), 40);
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,language,isbn,first_sentence`;
        const response = await fetch(url, { headers: { "User-Agent": "GILOS/1.0 (social platform)" } });
        const data = await response.json();
        res.json({
            items: (data.docs ?? []).map(d => mapOpenLibDoc(d)),
            totalItems: data.numFound ?? 0,
        });
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Qidiruv xatosi" });
    }
});
router.get("/library/search/popular", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const subjects = ["novel", "science_fiction", "self-help", "programming", "history", "biography"];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    try {
        const url = `https://openlibrary.org/subjects/${subject}.json?limit=12`;
        const response = await fetch(url, { headers: { "User-Agent": "GILOS/1.0 (social platform)" } });
        const data = await response.json();
        const items = (data.works ?? []).map((w) => {
            const work = w;
            const coverId = work.cover_id;
            const authors = (work.authors ?? []).map(a => a.name);
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
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Xato" });
    }
});
// ── AI Search ──────────────────────────────────────────────────────────────
router.get("/library/ai-search", async (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { q } = req.query;
    if (!q?.trim()) {
        res.status(400).json({ error: "q required" });
        return;
    }
    try {
        // Run OpenAI analysis and Open Library search in parallel
        const [aiResult, olResult] = await Promise.allSettled([
            openai.chat.completions.create({
                model: AI_CHAT_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Sen kutubxona va kitob tavsiyachisi AI assistantsan. Foydalanuvchi qidiruv so'rovi berayotgan. 
JSON formatda quyidagilarni qaytar:
{
  "summary": "2-3 jumlali qisqa tavsif (o'zbek tilida)",
  "topics": ["tegishli mavzu 1", "mavzu 2", "mavzu 3"],
  "suggestedSearches": ["aniqroq qidiruv 1", "qidiruv 2", "qidiruv 3"],
  "bookTypes": ["kitob turi 1", "kitob turi 2"],
  "webQuery": "optimallashtirilgan web qidiruv so'rovi (inglizcha)"
}
Faqat JSON qaytargin, boshqa matn yo'q.`,
                    },
                    { role: "user", content: `Qidiruv so'rovi: "${q}"` },
                ],
                max_tokens: 400,
                response_format: { type: "json_object" },
            }),
            fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,language,isbn,first_sentence`, { headers: { "User-Agent": "GILOS/1.0" } }).then(r => r.json()),
        ]);
        let aiData = {};
        let aiAvailable = false;
        if (aiResult.status === "fulfilled") {
            try {
                const content = aiResult.value.choices[0]?.message?.content ?? "{}";
                aiData = JSON.parse(content);
                aiAvailable = Object.keys(aiData).length > 0;
            }
            catch { /* ignore */ }
        }
        else {
            req.log.warn({ code: aiResult.reason?.code }, "openai unavailable");
        }
        let books = olResult.status === "fulfilled"
            ? (olResult.value.docs ?? []).map(d => mapOpenLibDoc(d))
            : [];
        // If no books found with original query and AI gave us an English webQuery, retry with it
        if (books.length === 0 && aiData.webQuery && String(aiData.webQuery) !== q) {
            try {
                const fbUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(String(aiData.webQuery))}&limit=6&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,language,isbn,first_sentence`;
                const fbResp = await fetch(fbUrl, { headers: { "User-Agent": "GILOS/1.0" } });
                const fbData = await fbResp.json();
                books = (fbData.docs ?? []).map(d => mapOpenLibDoc(d));
            }
            catch { /* ignore */ }
        }
        const webQ = String(aiData.webQuery ?? q);
        res.json({
            query: q,
            ai: aiData,
            aiAvailable,
            books,
            webSearches: {
                google: `https://www.google.com/search?q=${encodeURIComponent(webQ)}`,
                yandex: `https://yandex.com/search/?text=${encodeURIComponent(webQ)}`,
                scholar: `https://scholar.google.com/scholar?q=${encodeURIComponent(webQ)}`,
            },
        });
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "AI qidiruv xatosi" });
    }
});
// ── Translation (MyMemory free API) ─────────────────────────────────────────
router.get("/library/translate", async (req, res) => {
    const { q, from = "auto", to = "en" } = req.query;
    if (!q?.trim()) {
        res.status(400).json({ error: "q required" });
        return;
    }
    try {
        const langpair = from === "auto" ? `${from}|${to}` : `${from}|${to}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${langpair}&de=olcha@olchaai.com`;
        const resp = await fetch(url, { headers: { "User-Agent": "GILOS/1.0" } });
        if (!resp.ok) {
            res.status(502).json({ error: "Translation service unavailable" });
            return;
        }
        const data = await resp.json();
        if (data.responseStatus === 429) {
            res.status(429).json({ error: "Tarjima cheklovi. Keyinroq urinib ko'ring." });
            return;
        }
        res.json({
            translatedText: data.responseData?.translatedText ?? "",
            detectedLanguage: data.responseData?.detectedLanguage ?? from,
            quality: data.responseData?.match ?? 0,
        });
    }
    catch (err) {
        req.log.error(err);
        res.status(500).json({ error: "Tarjima xatosi" });
    }
});
export default router;
