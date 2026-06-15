/**
 * User Experience & Analytics Agent
 *
 * Tracks system-level metrics: response times, memory, event loop lag.
 * Manages per-IP token buckets for adaptive rate limiting.
 * Queries DB for user activity trends.
 * Reports to orchestrator every 60s.
 */

import { agentLog, agentWarn } from "./logger.js";
import pg from "pg";

const AGENT = "Analytics";
const REPORT_INTERVAL_MS = 60_000;

let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// ── Request Metrics ────────────────────────────────────────────────────
interface Bucket { count: number; totalMs: number; errors: number }
const routeMetrics = new Map<string, Bucket>();
const METRICS_HISTORY: SystemSnapshot[] = [];
const MAX_HISTORY = 60;

export interface SystemSnapshot {
  ts: number;
  uptimeS: number;
  memMb: { rss: number; heap: number };
  eventLoopLagMs: number;
  requestsLastMin: number;
  errorsLastMin: number;
  avgResponseMs: number;
  dbPoolTotal: number;
  dbPoolIdle: number;
}

let requestsWindow: number[] = [];
let errorsWindow: number[] = [];

export function recordRequest(route: string, durationMs: number, isError: boolean) {
  const now = Date.now();
  requestsWindow.push(now);
  if (isError) errorsWindow.push(now);

  const b = routeMetrics.get(route) ?? { count: 0, totalMs: 0, errors: 0 };
  b.count++;
  b.totalMs += durationMs;
  if (isError) b.errors++;
  routeMetrics.set(route, b);
}

function measureEventLoopLag(): Promise<number> {
  return new Promise(resolve => {
    const t0 = Date.now();
    setImmediate(() => resolve(Date.now() - t0));
  });
}

async function snapshot(): Promise<SystemSnapshot> {
  const now = Date.now();
  const cutoff = now - 60_000;
  requestsWindow = requestsWindow.filter(t => t > cutoff);
  errorsWindow = errorsWindow.filter(t => t > cutoff);

  const mem = process.memoryUsage();
  const lag = await measureEventLoopLag();

  let totalMs = 0;
  let totalCount = 0;
  for (const b of routeMetrics.values()) {
    totalMs += b.totalMs;
    totalCount += b.count;
  }

  return {
    ts: now,
    uptimeS: Math.floor(process.uptime()),
    memMb: {
      rss: Math.round(mem.rss / 1_048_576),
      heap: Math.round(mem.heapUsed / 1_048_576),
    },
    eventLoopLagMs: lag,
    requestsLastMin: requestsWindow.length,
    errorsLastMin: errorsWindow.length,
    avgResponseMs: totalCount > 0 ? Math.round(totalMs / totalCount) : 0,
    dbPoolTotal: pool?.totalCount ?? 0,
    dbPoolIdle: pool?.idleCount ?? 0,
  };
}

export function getLatestSnapshot(): SystemSnapshot | null {
  return METRICS_HISTORY[METRICS_HISTORY.length - 1] ?? null;
}

export function getMetricsHistory(limit = 10): SystemSnapshot[] {
  return METRICS_HISTORY.slice(-limit);
}

// ── Token Bucket per IP ────────────────────────────────────────────────
interface TokenBucket { tokens: number; lastRefill: number }
const tokenBuckets = new Map<string, TokenBucket>();
const BUCKET_MAX = 60;
const REFILL_RATE = 1; // tokens per second

export function consumeToken(ip: string): boolean {
  const now = Date.now();
  let b = tokenBuckets.get(ip);
  if (!b) {
    b = { tokens: BUCKET_MAX - 1, lastRefill: now };
    tokenBuckets.set(ip, b);
    return true;
  }
  const elapsed = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(BUCKET_MAX, b.tokens + elapsed * REFILL_RATE);
  b.lastRefill = now;

  if (b.tokens < 1) return false;
  b.tokens--;
  return true;
}

// ── DB Activity Snapshot ───────────────────────────────────────────────
async function queryDbActivity(): Promise<Record<string, number>> {
  if (!pool) return {};
  try {
    const result = await pool.query<{ table_name: string; live_rows: string }>(`
      SELECT relname AS table_name, n_live_tup::text AS live_rows
      FROM pg_stat_user_tables
      WHERE n_live_tup > 0
      ORDER BY n_live_tup DESC
      LIMIT 10
    `);
    const out: Record<string, number> = {};
    for (const row of result.rows) out[row.table_name] = parseInt(row.live_rows, 10);
    return out;
  } catch {
    return {};
  }
}

// ── Periodic Report ────────────────────────────────────────────────────
async function report() {
  try {
    const snap = await snapshot();
    METRICS_HISTORY.push(snap);
    if (METRICS_HISTORY.length > MAX_HISTORY) METRICS_HISTORY.shift();

    const dbActivity = await queryDbActivity();

    const logData = {
      uptimeS: snap.uptimeS,
      memMb: snap.memMb,
      eventLoopLagMs: snap.eventLoopLagMs,
      requestsLastMin: snap.requestsLastMin,
      errorsLastMin: snap.errorsLastMin,
      avgResponseMs: snap.avgResponseMs,
      dbRows: dbActivity,
    };

    if (snap.eventLoopLagMs > 100) {
      agentWarn(AGENT, `Event loop lag elevated: ${snap.eventLoopLagMs}ms`, logData);
    } else if (snap.memMb.heap > 400) {
      agentWarn(AGENT, `Heap memory elevated: ${snap.memMb.heap}MB`, logData);
    } else {
      agentLog(AGENT, "Periodic analytics report", logData);
    }
  } catch (err) {
    agentWarn(AGENT, "Analytics report failed", { err });
  }
}

export function startAnalyticsAgent(): void {
  agentLog(AGENT, "Analytics agent started", {
    dbAvailable: !!pool,
    reportIntervalMs: REPORT_INTERVAL_MS,
    bucketMax: BUCKET_MAX,
  });
  void report();
  setInterval(() => void report(), REPORT_INTERVAL_MS);
}
