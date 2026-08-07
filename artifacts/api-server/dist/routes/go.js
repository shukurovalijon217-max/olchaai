/**
 * /api/go/* — Proxy routes to the GILOS Go real-time microservice.
 * Exposes Go service capabilities (feed ranking, trending, WS stats) via the main API.
 */
import { Router } from "express";
const router = Router();
const GO_SERVICE = process.env.GO_SERVICE_URL ?? "http://localhost:8099";
async function proxyToGo(path, req, res, method = "GET") {
    try {
        const url = `${GO_SERVICE}${path}`;
        const opts = {
            method,
            headers: { "Content-Type": "application/json" },
        };
        if (method === "POST" && req.body) {
            opts.body = JSON.stringify(req.body);
        }
        const r = await fetch(url, opts);
        const data = await r.json();
        res.status(r.status).json(data);
    }
    catch (err) {
        res.status(503).json({ error: "Go service unavailable", detail: String(err) });
    }
}
// Health check of the Go service
router.get("/health", async (req, res) => {
    await proxyToGo("/go/health", req, res);
});
// Feed ranking — POST array of posts, get back ranked+scored list
router.post("/rank", async (req, res) => {
    await proxyToGo("/go/rank", req, res, "POST");
});
// Trending hashtags
router.get("/trending", async (req, res) => {
    await proxyToGo("/go/trending", req, res);
});
// WebSocket connection stats
router.get("/stats", async (req, res) => {
    await proxyToGo("/go/stats", req, res);
});
// Internal: push a real-time notification to a user via Go WS hub
router.post("/notify", async (req, res) => {
    await proxyToGo("/go/notify", req, res, "POST");
});
export default router;
