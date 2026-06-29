import { Router } from "express";

const router = Router();
const TENOR_KEY = "LIVDSRZULELA";

router.get("/gifs/search", async (req, res) => {
  try {
    const q = String(req.query.q || "funny").slice(0, 100);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${limit}&media_filter=minimal&contentfilter=medium`;
    const r = await fetch(url);
    if (!r.ok) { res.status(r.status).json({ results: [] }); return; }
    const data = await r.json() as { results: unknown[] };
    const results = (data.results || []).map((item: unknown) => {
      const t = item as { id: string; title: string; content_description: string; media: Record<string, { url: string; dims?: number[] }>[] };
      const media = t.media?.[0] ?? {};
      return {
        id: t.id,
        title: t.title || t.content_description || "",
        preview: media.tinygif?.url || media.nanogif?.url || media.gif?.url || "",
        original: media.gif?.url || media.mediumgif?.url || media.tinygif?.url || "",
      };
    }).filter((r: { preview: string }) => r.preview);
    res.json({ results });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ results: [] });
  }
});

export default router;
