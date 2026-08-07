import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
/* ── Ensure audit_logs table exists (idempotent) ──────────────── */
let tableReady = false;
async function ensureTable() {
    if (tableReady)
        return;
    try {
        await db.execute(sql `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          BIGSERIAL PRIMARY KEY,
        user_id     INTEGER,
        ip          TEXT,
        method      TEXT        NOT NULL,
        path        TEXT        NOT NULL,
        status_code INTEGER,
        duration_ms INTEGER,
        body_size   INTEGER,
        user_agent  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await db.execute(sql `
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
        tableReady = true;
    }
    catch (err) {
        logger.warn({ err }, "[audit] Table init failed (non-fatal)");
    }
}
ensureTable();
/* ── Middleware ──────────────────────────────────────────────── */
const AUDIT_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export function auditLogMiddleware(req, res, next) {
    if (!AUDIT_METHODS.has(req.method))
        return next();
    // Skip health + stripe webhook (noise / raw body)
    if (req.path === "/healthz" || req.path.includes("/stripe/webhook"))
        return next();
    const start = Date.now();
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
        ?? req.socket.remoteAddress ?? "unknown";
    res.on("finish", () => {
        if (!tableReady)
            return;
        const userId = req.session?.userId;
        const durationMs = Date.now() - start;
        const bodySize = req.headers["content-length"] ? Number(req.headers["content-length"]) : 0;
        // Fire-and-forget — never block the response
        db.execute(sql `
      INSERT INTO audit_logs (user_id, ip, method, path, status_code, duration_ms, body_size, user_agent)
      VALUES (
        ${userId ?? null},
        ${ip},
        ${req.method},
        ${req.path.slice(0, 255)},
        ${res.statusCode},
        ${durationMs},
        ${bodySize},
        ${(req.headers["user-agent"] ?? "").slice(0, 255)}
      )
    `).catch(() => { });
    });
    next();
}
