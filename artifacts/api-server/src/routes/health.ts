import { Router, type IRouter } from "express";
import { pool, readPool } from "@workspace/db";

const router: IRouter = Router();

router.get(["/", "/healthz"], async (_req, res) => {
  const start = Date.now();

  /* ── Primary DB ping ── */
  let dbOk = false;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    dbOk = true;
  } catch { /* db unreachable */ }

  /* ── Read replica ping (may be the same pool as primary) ── */
  const hasReplica = readPool !== pool;
  let replicaOk = false;
  if (hasReplica) {
    try {
      const client = await readPool.connect();
      await client.query("SELECT 1");
      client.release();
      replicaOk = true;
    } catch { /* replica unreachable */ }
  }

  const latencyMs = Date.now() - start;
  const status = dbOk ? "ok" : "degraded";

  res
    .status(dbOk ? 200 : 503)
    .set("Cache-Control", "no-store")
    .json({
      status,
      db:          dbOk ? "ok" : "error",
      replica:     hasReplica ? (replicaOk ? "ok" : "error") : "not_configured",
      latencyMs,
      timestamp:   new Date().toISOString(),
    });
});

export default router;
