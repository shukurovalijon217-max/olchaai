import { Router } from "express";
import { systemMonitor } from "../lib/systemMonitor";
import { isRedisActive } from "../lib/cache";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
const router = Router();
/* ── GET /healthz  (also /api/health) ───────────────────────── */
router.get(["/", "/healthz"], async (_req, res) => {
    const h = systemMonitor.health();
    const t = systemMonitor.traffic();
    // Quick DB connectivity check
    let dbOk = false;
    try {
        await db.execute(sql `SELECT 1`);
        dbOk = true;
    }
    catch { /* db unreachable */ }
    res.json({
        status: dbOk ? h.status : "critical",
        version: process.env["npm_package_version"] ?? "1.0.0",
        uptime: {
            seconds: h.uptimeSec,
            human: formatUptime(h.uptimeSec),
        },
        database: { ok: dbOk },
        cache: {
            mode: isRedisActive() ? "redis" : "in-memory",
            redis: isRedisActive(),
        },
        traffic: {
            totalRequests: h.totalRequests,
            currentRpm: t.currentRpm,
            loadLevel: t.loadLevel,
        },
        performance: {
            globalErrorRatePct: h.globalErrorRate,
            avgLatencyMs: h.avgLatencyMs,
            // top 5 slowest/most-erroring endpoints
            hotEndpoints: h.endpoints.slice(0, 5).map(e => ({
                endpoint: e.endpoint,
                p95Ms: e.p95LatencyMs,
                p99Ms: e.p99LatencyMs,
                errorCount: e.errorCount,
                totalRequests: e.totalRequests,
                circuit: e.circuitState,
            })),
        },
        healing: {
            recentEvents: h.healingEvents.slice(-10).map(ev => ({
                at: new Date(ev.at).toISOString(),
                endpoint: ev.endpoint,
                action: ev.action,
                detail: ev.detail,
            })),
        },
        timestamp: new Date().toISOString(),
    });
});
function formatUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0)
        return `${d}d ${h}h ${m}m`;
    if (h > 0)
        return `${h}h ${m}m`;
    if (m > 0)
        return `${m}m ${s}s`;
    return `${s}s`;
}
export default router;
