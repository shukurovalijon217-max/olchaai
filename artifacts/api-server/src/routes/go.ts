/**
 * /api/go/* — Proxy routes to the OlchaAI Go real-time microservice.
 * Exposes Go service capabilities (feed ranking, trending, WS stats) via the main API.
 */
import { Router, Request, Response } from "express";

const router = Router();
const GO_SERVICE = process.env.GO_SERVICE_URL ?? "http://localhost:8099";

async function proxyToGo(path: string, req: Request, res: Response, method = "GET") {
  try {
    const url = `${GO_SERVICE}${path}`;
    const opts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (method === "POST" && req.body) {
      opts.body = JSON.stringify(req.body);
    }
    const r = await fetch(url, opts);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(503).json({ error: "Go service unavailable", detail: String(err) });
  }
}

// Health check of the Go service
router.get("/health", async (req: Request, res: Response) => {
  await proxyToGo("/go/health", req, res);
});

// Feed ranking — POST array of posts, get back ranked+scored list
router.post("/rank", async (req: Request, res: Response) => {
  await proxyToGo("/go/rank", req, res, "POST");
});

// Trending hashtags
router.get("/trending", async (req: Request, res: Response) => {
  await proxyToGo("/go/trending", req, res);
});

// WebSocket connection stats
router.get("/stats", async (req: Request, res: Response) => {
  await proxyToGo("/go/stats", req, res);
});

// Internal: push a real-time notification to a user via Go WS hub
// SECURITY: this endpoint MUST only be callable by internal Express services.
// We block it here so that external users cannot broadcast arbitrary messages
// to all connected clients (userId=0 → broadcastAll attack).
router.post("/notify", (req: Request, res: Response) => {
  // Only allow requests that carry the internal service secret.
  // Express calls Go directly via the notifyGo() helper — this Express-side
  // route must never be reachable by an authenticated or unauthenticated client.
  const secret = req.headers["x-internal-secret"];
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  if (!expected || secret !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  proxyToGo("/go/notify", req, res, "POST");
});

export default router;
