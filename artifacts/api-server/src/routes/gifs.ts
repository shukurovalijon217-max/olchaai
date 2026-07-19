import { Router } from "express";

const router = Router();
const TENOR_KEY = "LIVDSRZULELA";

/* ── Proxy Tenor image through our server (avoids CDN blocks) ── */
router.get("/gifs/proxy", async (req, res) => {
  try {
    const raw = String(req.query.url || "");
    if (!raw || !raw.startsWith("https://media.tenor.com/")) {
      res.status(400).end(); return;
    }
    const r = await fetch(raw, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tenor.com/" },
    });
    if (!r.ok) { res.status(r.status).end(); return; }
    const ct = r.headers.get("content-type") || "image/gif";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const buf = await r.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    req.log.error(err);
    res.status(500).end();
  }
});

/* ── Search GIFs via Tenor v1 ── */
router.get("/gifs/search", async (req, res) => {
  try {
    const q = String(req.query.q || "funny").slice(0, 100);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${limit}&media_filter=minimal&contentfilter=medium`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tenor.com/" },
    });
    if (!r.ok) { res.status(200).json({ results: [] }); return; }
    const data = await r.json() as { results: unknown[] };

    const proxy = (tenorUrl: string) =>
      tenorUrl ? `/api/gifs/proxy?url=${encodeURIComponent(tenorUrl)}` : "";

    const results = (data.results || []).map((item: unknown) => {
      const t = item as {
        id: string; title: string; content_description: string;
        media: Record<string, { url: string; dims?: number[] }>[];
      };
      const media = t.media?.[0] ?? {};
      const previewRaw = media.tinygif?.url || media.nanogif?.url || media.gif?.url || "";
      const originalRaw = media.gif?.url || media.mediumgif?.url || media.tinygif?.url || "";
      return {
        id: t.id,
        title: t.title || t.content_description || "",
        preview: proxy(previewRaw),
        original: proxy(originalRaw),
        originalRaw,
      };
    }).filter((r: { preview: string }) => r.preview);

    res.json({ results });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ results: [] });
  }
});

export default router;
