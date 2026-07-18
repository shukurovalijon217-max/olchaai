import { createHmac } from "crypto";
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import e2eRouter from "./e2e";
import storageRouter from "./storage";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import reelsRouter from "./reels";
import storiesRouter from "./stories";
import messagesRouter from "./messages";
import groupsRouter from "./groups";
import notificationsRouter from "./notifications";
import aiRouter from "./ai";
import adminRouter from "./admin";
import stripeRouter from "./stripe";
import moderationRouter from "./moderation";
import goRouter from "./go";
import mediaRouter from "./media";
import walletRouter from "./wallet";
import liveRouter from "./live";
import giftsRouter from "./gifts";
import creatorRouter from "./creator";
import searchRouter from "./search";
import marketplaceRouter from "./marketplace";
import openaiChatRouter from "./openai-chat";
import libraryRouter from "./library";
import voiceCommentsRouter from "./voiceComments";
import gamificationRouter from "./gamification";
import coviewRouter from "./coview";
import anonRouter from "./anon";
import scenariosRouter from "./scenarios";
import moodRouter from "./mood";
import aiTwinRouter from "./aiTwin";
import factCheckRouter from "./factCheck";
import coSpacesRouter from "./coSpaces";
import translateRouter from "./translate";
import muniAiRouter from "./muniAi";
import voiceTranslateRouter from "./voiceTranslate";
import nexusCoreRouter from "./nexusCore";
import platformCostsRouter from "./platformCosts";
import aiAutopilotRouter from "./aiAutopilot";
import monetizationRouter from "./monetization";
import gifsRouter from "./gifs";
import treasuryRouter from "./treasury";
import aiAdminActionsRouter from "./aiAdminActions";
import securityRouter from "./security";
import infraCostsRouter from "./infraCosts";
import anonInboxRouter from "./anonInbox";
import ghostRouter from "./ghost";
import focusShieldRouter from "./focusShield";
import challengesRouter from "./challenges";
import otubeAiRouter from "./otubeAi";
import growTogetherRouter from "./growTogether";
import socialAuraRouter from "./socialAura";

const router: IRouter = Router();

/* ── GET /ice-config — WebRTC ICE server config ── */
type IceServer = { urls: string; username?: string; credential?: string };

/**
 * Generate time-limited TURN credentials for self-hosted Coturn.
 * Uses HMAC-SHA1 shared-secret auth (RFC 8489 / Coturn use-auth-secret).
 * Credentials expire after `ttlSeconds` (default 24h).
 */
function coturnCredentials(secret: string, domain: string, ttlSeconds = 86400): IceServer[] {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:olchaai`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return [
    { urls: `stun:${domain}:3478` },
    { urls: `turn:${domain}:3478`,               username, credential },
    { urls: `turn:${domain}:3478?transport=tcp`, username, credential },
    { urls: `turns:${domain}:5349`,              username, credential },
    { urls: `turns:${domain}:5349?transport=tcp`,username, credential },
  ];
}

async function fetchMeteredIceServers(): Promise<IceServer[]> {
  const apiKey = process.env["METERED_API_KEY"];
  if (!apiKey) return [];
  const url = `https://gilos.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return [];
    const data = await r.json() as IceServer[];
    if (!Array.isArray(data) || data.length === 0) return [];
    return data;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

router.get("/ice-config", async (_req, res) => {
  const STUN: IceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // 1. O'z Coturn serverimiz (COTURN_DOMAIN + COTURN_SECRET env bo'lsa)
  const coturnDomain = process.env["COTURN_DOMAIN"];
  const coturnSecret = process.env["COTURN_SECRET"];
  if (coturnDomain && coturnSecret) {
    const turnServers = coturnCredentials(coturnSecret, coturnDomain);
    // Credentials 24h davom etadi, har 12 soatda yangi credential beriladi
    res.set("Cache-Control", "private, max-age=43200");
    res.json({ iceServers: [...STUN, ...turnServers] });
    return;
  }

  // 2. Metered TURN (agar COTURN sozlanmagan bo'lsa)
  const metered = await fetchMeteredIceServers();
  if (metered.length > 0) {
    res.set("Cache-Control", "public, max-age=300");
    res.json({ iceServers: [...STUN, ...metered] });
    return;
  }

  // 3. Fallback: bepul openrelay
  const fallbackTurn: IceServer[] = [
    { urls: "turn:openrelay.metered.ca:80",                username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443",               username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ];
  res.set("Cache-Control", "public, max-age=60");
  res.json({ iceServers: [...STUN, ...fallbackTurn] });
});

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(socialAuraRouter);
router.use(usersRouter);
router.use(postsRouter);
router.use(reelsRouter);
router.use(storiesRouter);
router.use(messagesRouter);
router.use(groupsRouter);
router.use(notificationsRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(stripeRouter);
router.use(moderationRouter);
router.use("/go", goRouter);
router.use("/media", mediaRouter);
router.use(walletRouter);
router.use(liveRouter);
router.use(giftsRouter);
router.use(creatorRouter);
router.use(searchRouter);
router.use(marketplaceRouter);
router.use(openaiChatRouter);
router.use(libraryRouter);
router.use(voiceCommentsRouter);
router.use(gamificationRouter);
router.use(coviewRouter);
router.use(anonRouter);
router.use(scenariosRouter);
router.use(moodRouter);
router.use(aiTwinRouter);
router.use(factCheckRouter);
router.use(coSpacesRouter);
router.use(translateRouter);
router.use(muniAiRouter);
router.use(voiceTranslateRouter);
router.use(nexusCoreRouter);
router.use(platformCostsRouter);
router.use(aiAutopilotRouter);
router.use(monetizationRouter);
router.use(gifsRouter);
router.use(treasuryRouter);
router.use(aiAdminActionsRouter);
router.use(securityRouter);
router.use(infraCostsRouter);
router.use(anonInboxRouter);
router.use(ghostRouter);
router.use(focusShieldRouter);
router.use(challengesRouter);
router.use(otubeAiRouter);
router.use(growTogetherRouter);
router.use(e2eRouter);

export default router;
