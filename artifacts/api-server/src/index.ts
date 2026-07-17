import cluster from "node:cluster";
import os from "node:os";
import { logger } from "./lib/logger";

const WORKERS = Math.max(1, Math.min(
  parseInt(process.env["WEB_CONCURRENCY"] ?? "1", 10) || 1,
  os.cpus().length,
  4
));

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
  const { initTFEngine } = await import("./moderation/tfEngine.js");
  const { cleanupSeedData } = await import("./lib/cleanupSeedData.js");
  const { autoMigrate } = await import("./lib/autoMigrate.js");

  // Run DB migrations before accepting traffic — safe to run on every boot
  if (cluster.worker?.id === 1) {
    await autoMigrate().catch((err) => logger.warn({ err }, "autoMigrate failed (non-fatal)"));
  }

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

  // ── Background: TF engine (non-blocking, won't affect uptime) ──
  if (cluster.worker?.id === 1) {
    logger.info("Stripe ready (direct API mode — no DB schema required)");

    // TF engine — async, memory-intensive, runs only on worker 1
    initTFEngine()
      .then(() => logger.info("TensorFlow.js engine ready"))
      .catch((err) => logger.warn({ err }, "TF engine unavailable — using rule-based only"));

    // One-time, idempotent removal of leftover seed/demo accounts and their
    // content (safe to run on every boot — no-ops once already cleaned).
    cleanupSeedData().catch((err) => logger.warn({ err }, "Seed data cleanup errored (non-fatal)"));

    // Pre-warm top language translation cache so all users get instant translations
    const { warmOnStartup } = await import("./lib/warmTranslations.js");
    warmOnStartup("v6").catch((err) => logger.warn({ err }, "warmTranslations startup failed (non-fatal)"));
  }
}
