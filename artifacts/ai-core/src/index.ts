/**
 * AI Core — Entry Point
 *
 * Starts all four autonomous agents, then opens the HTTP server.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 */

import { logger } from "./logger.js";
import { startSecurityAgent } from "./security.js";
import { startModerationAgent } from "./moderation.js";
import { startAnalyticsAgent } from "./analytics.js";
import { startOrchestrator } from "./orchestrator.js";
import { app } from "./server.js";

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT env var is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

// ── Boot sequence ──────────────────────────────────────────────────────
logger.info("╔══════════════════════════════════════════╗");
logger.info("║       OlchaAI — AI Core Service            ║");
logger.info("║  Fully Autonomous • Pentagon-Grade Sec   ║");
logger.info("╚══════════════════════════════════════════╝");

// startSecurityAgent is async — it loads DB blocks before the server accepts traffic
startSecurityAgent().then(() => {
  startModerationAgent();
  startAnalyticsAgent();
  startOrchestrator();
}).catch((err) => {
  logger.error({ err }, "Security agent failed to start — continuing in memory-only mode");
  startModerationAgent();
  startAnalyticsAgent();
  startOrchestrator();
});

const server = app.listen(port, () => {
  logger.info({ port }, "AI Core HTTP server listening");
  logger.info("All 4 autonomous agents running:");
  logger.info("  ✔ Kiber-Qalqon  (Security)   — 5s scan");
  logger.info("  ✔ Moderation    (Content)     — real-time queue");
  logger.info("  ✔ Analytics     (UX/Metrics)  — 60s report");
  logger.info("  ✔ Orchestrator  (AI Command)  — 30s heartbeat");
});

// ── Graceful shutdown ──────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal — draining…");
  server.close(() => {
    logger.info("HTTP server closed. Agents stopped. Goodbye.");
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — AI Core will restart");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
