import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

/* ── GET /ice-config — WebRTC ICE server config (STUN + TURN) ── */
router.get("/ice-config", (_req, res) => {
  type IceServer = { urls: string; username?: string; credential?: string };
  const servers: IceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const turnUrl  = process.env["TURN_SERVER_URL"];
  const turnUser = process.env["TURN_USERNAME"];
  const turnCred = process.env["TURN_CREDENTIAL"];
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    servers.push({ urls: turnUrl.replace(/:80$/, ":443").replace(/:3478$/, ":443"), username: turnUser, credential: turnCred });
    servers.push({ urls: `${turnUrl.replace(/^turn:/, "turn:")}?transport=tcp`.replace(/:443\?transport=tcp$/, ":443?transport=tcp"), username: turnUser, credential: turnCred });
  } else {
    // Fallback: multiple public TURN servers (higher reliability than single provider)
    const fallbacks = [
      { urls: "turn:openrelay.metered.ca:80",              username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443",             username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:relay.metered.ca:80",                  username: "e6c9f0f8fbdc2e6b1b8f0c2b", credential: "XKtB/VzKyvLAHq/v" },
      { urls: "turn:relay.metered.ca:443",                 username: "e6c9f0f8fbdc2e6b1b8f0c2b", credential: "XKtB/VzKyvLAHq/v" },
    ];
    servers.push(...fallbacks);
  }
  res.set("Cache-Control", "public, max-age=300");
  res.json({ iceServers: servers });
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

export default router;
