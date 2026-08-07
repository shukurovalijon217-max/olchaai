/**
 * GET /api/webrtc/ice-servers
 *
 * Returns ICE server credentials for WebRTC calls.
 * Uses Metered.ca private TURN credentials when METERED_API_KEY is set;
 * falls back to well-known public STUN/TURN so calls still work without it.
 *
 * Enterprise behaviour: Metered credentials are short-lived (time-limited
 * HMAC tokens). Fresh credentials are fetched per-request so tokens are
 * always valid.  The response is cached for 55 s (tokens last 60 s).
 */
import { Router } from "express";
// requireAuth inline — avoids the missing-module import
const requireAuth = (req, res, next) => {
    if (!req.session?.userId && !req.session?.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};
const router = Router();
let cachedIce = null;
let cacheExpiresAt = 0;
const PUBLIC_FALLBACK = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];
async function fetchMeteredIce() {
    const apiKey = process.env.METERED_API_KEY;
    if (!apiKey)
        return PUBLIC_FALLBACK;
    // Return cached credentials if still valid
    if (cachedIce && Date.now() < cacheExpiresAt)
        return cachedIce;
    try {
        const res = await fetch(`https://gilosai.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok)
            throw new Error(`Metered API ${res.status}`);
        const servers = await res.json();
        cachedIce = [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            ...servers,
        ];
        cacheExpiresAt = Date.now() + 55_000; // 55 s — tokens last 60 s
        return cachedIce;
    }
    catch (err) {
        // Non-fatal: fall back to public servers
        console.warn("[webrtc] Metered TURN fetch failed, using fallback:", err.message);
        return PUBLIC_FALLBACK;
    }
}
/** GET /api/webrtc/ice-servers — authenticated */
router.get("/ice-servers", requireAuth, async (_req, res) => {
    try {
        const iceServers = await fetchMeteredIce();
        // Cache-Control: 50 s so clients refresh before tokens expire
        res.setHeader("Cache-Control", "private, max-age=50");
        res.json({ iceServers });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to get ICE servers" });
    }
});
export default router;
