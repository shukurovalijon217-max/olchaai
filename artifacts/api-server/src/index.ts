import cluster from "node:cluster";
import os from "node:os";
import { logger } from "./lib/logger";

const WORKERS = Math.max(1, Math.min(os.cpus().length, 4));

if (cluster.isPrimary) {
  logger.info({ workers: WORKERS, cpus: os.cpus().length }, "Primary starting workers");

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn({ pid: worker.process.pid, code, signal }, "Worker died — restarting");
    setTimeout(() => cluster.fork(), 1000);
  });
} else {
  const { default: app } = await import("./app.js");
  const { runMigrations } = await import("stripe-replit-sync");
  const { getStripeSync } = await import("./stripe/stripeClient.js");
  const { initTFEngine } = await import("./moderation/tfEngine.js");

  const rawPort = process.env["PORT"];
  if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

  // ── Start server FIRST so healthcheck passes immediately ──────────
  await new Promise<void>((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) { reject(err); return; }
      logger.info({ port, workerId: cluster.worker?.id }, "Worker listening");
      resolve();
    });
  });

  // ── Background: Stripe + TF (non-blocking, won't affect uptime) ──
  if (cluster.worker?.id === 1) {
    // Stripe setup — runs async, server already accepting requests
    (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        logger.warn("DATABASE_URL not set — skipping Stripe init");
        return;
      }

      const retry = async <T>(fn: () => Promise<T>, attempts = 3, delayMs = 2000): Promise<T> => {
        for (let i = 0; i < attempts; i++) {
          try { return await fn(); }
          catch (err) {
            if (i === attempts - 1) throw err;
            logger.warn({ attempt: i + 1, err }, "Retrying Stripe init step...");
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        throw new Error("unreachable");
      };

      try {
        logger.info("Initializing Stripe schema...");
        await retry(() => runMigrations({ databaseUrl }));
        logger.info("Stripe schema ready");

        const stripeSync = await getStripeSync();
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
        if (domain) {
          await retry(() =>
            stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`)
          );
          logger.info("Stripe webhook configured");
        }

        stripeSync.syncBackfill()
          .then(() => logger.info("Stripe data synced"))
          .catch((err) => logger.warn({ err }, "Stripe backfill error (non-fatal)"));

      } catch (err) {
        logger.warn({ err }, "Stripe init failed (non-fatal) — payments may be unavailable");
      }
    })();

    // TF engine — async, memory-intensive, runs only on worker 1
    initTFEngine()
      .then(() => logger.info("TensorFlow.js engine ready"))
      .catch((err) => logger.warn({ err }, "TF engine unavailable — using rule-based only"));
  }
}
