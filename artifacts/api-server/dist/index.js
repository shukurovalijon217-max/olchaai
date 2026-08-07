import cluster from "node:cluster";
import os from "node:os";
import { logger } from "./lib/logger";
// SINGLE_PROCESS=1 → skip cluster (for Railway spawn-in-process deployment)
const SINGLE_PROCESS = process.env["SINGLE_PROCESS"] === "1" || process.env["SINGLE_PROCESS"] === "true";
async function runServer() {
    const { default: app } = await import("./app.js");
    const rawPort = process.env["PORT"];
    if (!rawPort)
        throw new Error("PORT environment variable is required but was not provided.");
    const port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0)
        throw new Error(`Invalid PORT value: "${rawPort}"`);
    // ── Start server FIRST so healthcheck passes immediately ──────────
    await new Promise((resolve, reject) => {
        app.listen(port, (err) => {
            if (err) {
                reject(err);
                return;
            }
            logger.info({ port, singleProcess: SINGLE_PROCESS }, "API server listening");
            resolve();
        });
    });
    // ── Background tasks (non-blocking) ────────────────────────────
    // Validate Stripe key on startup so misconfiguration is caught early
    import("./stripe/stripeClient.js").then(({ validateStripeKey }) => {
        validateStripeKey().catch((err) => logger.warn({ err }, "Stripe startup validation unexpectedly threw"));
    }).catch((err) => logger.warn({ err }, "Could not import stripeClient for startup check"));
    try {
        const { initTFEngine } = await import("./moderation/tfEngine.js");
        initTFEngine()
            .then(() => logger.info("TensorFlow.js engine ready"))
            .catch((err) => logger.warn({ err }, "TF engine unavailable — using rule-based only"));
    }
    catch (err) {
        logger.warn({ err }, "TF engine module unavailable");
    }
    try {
        const { cleanupSeedData } = await import("./lib/cleanupSeedData.js");
        cleanupSeedData().catch((err) => logger.warn({ err }, "Seed data cleanup errored (non-fatal)"));
    }
    catch (err) {
        logger.warn({ err }, "cleanupSeedData unavailable");
    }
    try {
        const { verifyMediaUrls } = await import("./lib/mediaVerifier.js");
        verifyMediaUrls().catch((err) => logger.warn({ err }, "Media URL verification errored (non-fatal)"));
    }
    catch (err) {
        logger.warn({ err }, "mediaVerifier unavailable");
    }
}
if (SINGLE_PROCESS) {
    // ── Single-process mode: no cluster, no fork overhead ──────────
    logger.info("Starting in single-process mode (SINGLE_PROCESS=1)");
    await runServer();
}
else {
    // ── Cluster mode: primary forks workers ────────────────────────
    const WORKERS = Math.max(1, Math.min(parseInt(process.env["WEB_CONCURRENCY"] ?? "1", 10) || 1, os.cpus().length, 4));
    if (cluster.isPrimary) {
        logger.info({ workers: WORKERS, cpus: os.cpus().length }, "Primary starting workers");
        for (let i = 0; i < WORKERS; i++)
            cluster.fork();
        cluster.on("exit", (worker, code, signal) => {
            logger.warn({ pid: worker.process.pid, code, signal }, "Worker died — restarting");
            setTimeout(() => cluster.fork(), 1000);
        });
    }
    else {
        await runServer();
    }
}
