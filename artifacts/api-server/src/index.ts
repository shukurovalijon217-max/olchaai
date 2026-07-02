import cluster from "node:cluster";
import os from "node:os";
import { logger } from "./lib/logger";

// ── Cluster mode: use all CPU cores ─────────────────────────────
// Each worker is a full Express instance sharing the same port (OS balances).
// This multiplies throughput linearly with CPU cores (typically 2-4x on Replit).
const WORKERS = Math.max(1, Math.min(os.cpus().length, 4)); // cap at 4 workers

if (cluster.isPrimary) {
  logger.info({ workers: WORKERS, cpus: os.cpus().length }, "Primary starting workers");

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    // Auto-restart crashed workers (self-healing)
    logger.warn({ pid: worker.process.pid, code, signal }, "Worker died — restarting");
    setTimeout(() => cluster.fork(), 1000);
  });
} else {
  // ── Worker: run the actual Express server ──────────────────────
  const { default: app } = await import("./app.js");
  const { runMigrations } = await import("stripe-replit-sync");
  const { getStripeSync } = await import("./stripe/stripeClient.js");
  const { initTFEngine } = await import("./moderation/tfEngine.js");

  async function initStripe() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn("DATABASE_URL not set — skipping Stripe init");
      return;
    }
    try {
      // Only primary-like worker (id=1) runs migrations to avoid race
      if (cluster.worker?.id === 1) {
        logger.info("Initializing Stripe schema...");
        await runMigrations({ databaseUrl });
        logger.info("Stripe schema ready");
      }

      const stripeSync = await getStripeSync();
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      if (domain && cluster.worker?.id === 1) {
        await stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
        logger.info("Stripe webhook configured");
      }

      if (cluster.worker?.id === 1) {
        stripeSync.syncBackfill()
          .then(() => logger.info("Stripe data synced"))
          .catch((err) => logger.warn({ err }, "Stripe backfill error (non-fatal)"));
      }
    } catch (err) {
      logger.warn({ err }, "Stripe init failed (non-fatal) — check Stripe integration");
    }
  }

  const rawPort = process.env["PORT"];
  if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

  await initStripe();

  // TensorFlow.js — only on worker 1 to save RAM
  if (cluster.worker?.id === 1) {
    initTFEngine()
      .then(() => logger.info("TensorFlow.js engine ready"))
      .catch((err) => logger.warn({ err }, "TF engine unavailable — using rule-based only"));
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port, workerId: cluster.worker?.id }, "Worker listening");
  });
}
