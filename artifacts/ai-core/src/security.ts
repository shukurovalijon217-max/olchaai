/**
 * Kiber-Qalqon — Self-Healing DevOps & Hyper-Security Agent
 *
 * Monitors request patterns in real-time.
 * Detects: brute force, rate limit abuse, anomalous load, injection attempts.
 * Responds: blacklist IPs, escalate to Orchestrator, emit alerts.
 *
 * IP blocks are persisted to PostgreSQL so they survive server restarts.
 * On startup the full active block list is loaded back into memory.
 */

import pg from "pg";
import { agentLog, agentAlert, agentWarn } from "./logger.js";

const AGENT = "Kiber-Qalqon";

const RATE_WINDOW_MS   = 60_000;       // 1-minute sliding window
const RATE_LIMIT       = 120;          // max requests per IP per window
const BRUTE_LIMIT      = 8;            // max auth failures before block
const SCAN_INTERVAL_MS = 5_000;        // memory scan every 5s
const DB_SYNC_INTERVAL = 60_000;       // DB sync every 60s
const BLACKLIST_TTL_MS = 15 * 60_000;  // auto-unban after 15 min

/* ── PostgreSQL pool ──────────────────────────────────────────────── */
let pool: pg.Pool | null = null;
try {
  if (process.env.DATABASE_URL) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    pool.on("error", () => { /* non-fatal — degrade to memory-only */ });
  }
} catch { /* no DB — memory-only mode */ }

async function dbRun(sql: string, params: unknown[] = []): Promise<pg.QueryResult | null> {
  if (!pool) return null;
  try {
    return await pool.query(sql, params);
  } catch {
    return null;
  }
}

/* ── Ensure tables exist ──────────────────────────────────────────── */
async function ensureTables(): Promise<void> {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS kiber_qalqon_blocks (
      ip          TEXT PRIMARY KEY,
      reason      TEXT NOT NULL,
      suspicion   INTEGER NOT NULL DEFAULT 0,
      blocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at  TIMESTAMPTZ,          -- NULL = permanent
      permanent   BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_kqb_expires ON kiber_qalqon_blocks(expires_at)`);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS kiber_qalqon_events (
      id          SERIAL PRIMARY KEY,
      ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type        TEXT NOT NULL,
      ip          TEXT NOT NULL,
      detail      TEXT,
      suspicion   INTEGER
    )
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_kqe_ts  ON kiber_qalqon_events(ts DESC)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_kqe_ip  ON kiber_qalqon_events(ip)`);
}

/* ── Persist a block to DB ────────────────────────────────────────── */
async function persistBlock(ip: string, reason: string, suspicion: number, expiresAt: number | null): Promise<void> {
  const exp = expiresAt ? new Date(expiresAt) : null;
  const permanent = expiresAt === null;
  await dbRun(
    `INSERT INTO kiber_qalqon_blocks (ip, reason, suspicion, expires_at, permanent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ip) DO UPDATE SET
       reason     = EXCLUDED.reason,
       suspicion  = GREATEST(kiber_qalqon_blocks.suspicion, EXCLUDED.suspicion),
       expires_at = CASE
                      WHEN EXCLUDED.permanent THEN NULL
                      WHEN kiber_qalqon_blocks.permanent THEN NULL
                      ELSE GREATEST(kiber_qalqon_blocks.expires_at, EXCLUDED.expires_at)
                    END,
       permanent  = kiber_qalqon_blocks.permanent OR EXCLUDED.permanent`,
    [ip, reason, suspicion, exp, permanent],
  );
}

/* ── Remove a block from DB (TTL expired or manual unban) ──────────── */
async function removeBlock(ip: string): Promise<void> {
  await dbRun(`DELETE FROM kiber_qalqon_blocks WHERE ip = $1`, [ip]);
}

/* ── Persist a security event to DB ─────────────────────────────────── */
async function persistEvent(type: string, ip: string, detail: string, suspicion?: number): Promise<void> {
  await dbRun(
    `INSERT INTO kiber_qalqon_events (type, ip, detail, suspicion) VALUES ($1, $2, $3, $4)`,
    [type, ip, detail, suspicion ?? null],
  );
}

/* ── Load active blocks from DB into memory on startup ────────────── */
async function loadBlocksFromDb(): Promise<void> {
  const res = await dbRun(
    `SELECT ip, reason, suspicion, expires_at, permanent
     FROM kiber_qalqon_blocks
     WHERE permanent = TRUE OR expires_at > NOW()`,
  );
  if (!res) return;
  let loaded = 0;
  for (const row of res.rows as { ip: string; reason: string; suspicion: number; expires_at: Date | null; permanent: boolean }[]) {
    const rec = getOrCreate(row.ip);
    rec.suspicionScore = row.suspicion;
    rec.blockedUntil = row.permanent ? Infinity : (row.expires_at ? row.expires_at.getTime() : undefined);
    loaded++;
  }
  if (loaded > 0) {
    agentLog(AGENT, `Loaded ${loaded} persistent IP block(s) from DB`, { count: loaded });
  }
}

/* ── Purge expired blocks from DB ─────────────────────────────────── */
async function purgeExpiredBlocks(): Promise<void> {
  await dbRun(
    `DELETE FROM kiber_qalqon_blocks WHERE permanent = FALSE AND expires_at <= NOW()`,
  );
}

/* ── In-memory structures ──────────────────────────────────────────── */
interface IpRecord {
  requests: number[];
  authFailures: number[];
  blockedUntil?: number;     // timestamp ms, or Infinity for permanent
  suspicionScore: number;
  blockReason?: string;
}

interface SecurityEvent {
  ts: number;
  type: "BRUTE_FORCE" | "RATE_LIMIT" | "ANOMALY" | "INJECTION" | "BLOCKED" | "UNBLOCKED";
  ip: string;
  detail: string;
}

const ipStore = new Map<string, IpRecord>();
const events: SecurityEvent[] = [];
const MAX_EVENTS = 500;

function getOrCreate(ip: string): IpRecord {
  let rec = ipStore.get(ip);
  if (!rec) {
    rec = { requests: [], authFailures: [], suspicionScore: 0 };
    ipStore.set(ip, rec);
  }
  return rec;
}

function pushEvent(ev: Omit<SecurityEvent, "ts">): SecurityEvent {
  const full: SecurityEvent = { ts: Date.now(), ...ev };
  events.push(full);
  if (events.length > MAX_EVENTS) events.shift();
  return full;
}

function prune(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter(t => t > cutoff);
}

/** Block an IP: update memory + persist to DB */
function blockIp(ip: string, reason: string, ttlMs: number, rec: IpRecord): void {
  const now = Date.now();
  rec.blockedUntil = now + ttlMs;
  rec.blockReason  = reason;
  persistBlock(ip, reason, rec.suspicionScore, rec.blockedUntil).catch(() => {});
}

/* ── Public API ────────────────────────────────────────────────────── */

/** Called by the HTTP middleware on every incoming request */
export function trackRequest(ip: string): { blocked: boolean; reason?: string } {
  const rec = getOrCreate(ip);
  const now = Date.now();

  // Already blocked?
  if (rec.blockedUntil && now < rec.blockedUntil) {
    return { blocked: true, reason: rec.blockReason ?? "IP blacklisted" };
  }
  // Block expired — clean up
  if (rec.blockedUntil && now >= rec.blockedUntil) {
    delete rec.blockedUntil;
    delete rec.blockReason;
    pushEvent({ type: "UNBLOCKED", ip, detail: "TTL expired — IP reinstated" });
    agentLog(AGENT, `IP ${ip} unblocked (TTL expired)`);
    removeBlock(ip).catch(() => {});
  }

  rec.requests = prune(rec.requests, RATE_WINDOW_MS);
  rec.requests.push(now);

  if (rec.requests.length > RATE_LIMIT) {
    rec.suspicionScore += 30;
    const ev = pushEvent({ type: "RATE_LIMIT", ip, detail: `${rec.requests.length} req/min — threshold ${RATE_LIMIT}` });
    agentAlert(AGENT, `Rate limit exceeded — blocking ${ip}`, { count: rec.requests.length, event: ev });
    blockIp(ip, "Rate limit exceeded", BLACKLIST_TTL_MS, rec);
    persistEvent("RATE_LIMIT", ip, ev.detail, rec.suspicionScore).catch(() => {});
    return { blocked: true, reason: "Rate limit exceeded" };
  }

  return { blocked: false };
}

/** Called by auth routes on failed login */
export function trackAuthFailure(ip: string): void {
  const rec = getOrCreate(ip);
  const now = Date.now();
  rec.authFailures = prune(rec.authFailures, RATE_WINDOW_MS);
  rec.authFailures.push(now);

  if (rec.authFailures.length >= BRUTE_LIMIT) {
    rec.suspicionScore += 50;
    const ev = pushEvent({
      type: "BRUTE_FORCE",
      ip,
      detail: `${rec.authFailures.length} failed auth attempts in 60s`,
    });
    agentAlert(AGENT, `Brute-force detected — blocking ${ip}`, { failures: rec.authFailures.length, event: ev });
    blockIp(ip, "Brute-force login", BLACKLIST_TTL_MS, rec);
    persistEvent("BRUTE_FORCE", ip, ev.detail, rec.suspicionScore).catch(() => {});
  }
}

/** Check user-controlled strings for injection patterns */
export function scanForInjection(ip: string, payload: string): boolean {
  const patterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /'\s*or\s+'1'\s*=\s*'1/i,
    /;\s*drop\s+table/i,
    /\$\{.*\}/,
    /\{\{.*\}\}/,
    /__proto__/,
    /constructor\[/,
  ];

  const threat = patterns.some(p => p.test(payload));
  if (threat) {
    const rec = getOrCreate(ip);
    rec.suspicionScore += 20;
    const ev = pushEvent({ type: "INJECTION", ip, detail: "Injection pattern detected in payload" });
    agentWarn(AGENT, `Injection attempt from ${ip}`, { event: ev });
    persistEvent("INJECTION", ip, ev.detail, rec.suspicionScore).catch(() => {});

    if (rec.suspicionScore >= 80) {
      pushEvent({ type: "BLOCKED", ip, detail: "High suspicion score — auto-blocked" });
      agentAlert(AGENT, `High-risk IP ${ip} auto-blocked`, { score: rec.suspicionScore });
      blockIp(ip, "High suspicion score (injection attempts)", BLACKLIST_TTL_MS * 4, rec);
    }
  }
  return threat;
}

export function isBlocked(ip: string): boolean {
  const rec = ipStore.get(ip);
  if (!rec) return false;
  return !!rec.blockedUntil && Date.now() < rec.blockedUntil;
}

export function getRecentEvents(limit = 50): SecurityEvent[] {
  return events.slice(-limit).reverse();
}

export function getStats(): {
  trackedIps: number;
  blockedIps: number;
  totalEvents: number;
  recentThreats: number;
  dbConnected: boolean;
} {
  const now = Date.now();
  let blocked = 0;
  let recentThreats = 0;
  const cutoff = now - 5 * 60_000;

  for (const [, rec] of ipStore) {
    if (rec.blockedUntil && rec.blockedUntil > now) blocked++;
  }
  for (const ev of events) {
    if (ev.ts > cutoff && ev.type !== "UNBLOCKED") recentThreats++;
  }

  return {
    trackedIps:   ipStore.size,
    blockedIps:   blocked,
    totalEvents:  events.length,
    recentThreats,
    dbConnected:  pool !== null,
  };
}

/* ── Periodic background scan ──────────────────────────────────────── */
function periodicScan() {
  const now = Date.now();
  let pruned = 0;
  let unbanned = 0;

  for (const [ip, rec] of ipStore) {
    rec.requests    = prune(rec.requests, RATE_WINDOW_MS);
    rec.authFailures = prune(rec.authFailures, RATE_WINDOW_MS);

    // Gradually decay suspicion score
    if (rec.suspicionScore > 0) rec.suspicionScore = Math.max(0, rec.suspicionScore - 2);

    // TTL expired → unblock
    if (rec.blockedUntil && rec.blockedUntil !== Infinity && rec.blockedUntil < now) {
      delete rec.blockedUntil;
      delete rec.blockReason;
      pushEvent({ type: "UNBLOCKED", ip, detail: "TTL expired" });
      removeBlock(ip).catch(() => {});
      unbanned++;
    }

    // Prune completely idle IPs from memory (they stay in DB if blocked)
    if (
      rec.requests.length === 0 &&
      rec.authFailures.length === 0 &&
      !rec.blockedUntil &&
      rec.suspicionScore === 0
    ) {
      ipStore.delete(ip);
      pruned++;
    }
  }

  const stats = getStats();
  if (stats.blockedIps > 0 || stats.recentThreats > 0 || unbanned > 0) {
    agentLog(AGENT, "Periodic scan complete", {
      trackedIps:   stats.trackedIps,
      blockedIps:   stats.blockedIps,
      recentThreats: stats.recentThreats,
      pruned,
      unbanned,
      dbConnected:  stats.dbConnected,
    });
  }
}

/* ── Startup ────────────────────────────────────────────────────────── */
export async function startSecurityAgent(): Promise<void> {
  agentLog(AGENT, "Security agent starting…", {
    rateLimit:    RATE_LIMIT,
    bruteLimit:   BRUTE_LIMIT,
    scanIntervalMs: SCAN_INTERVAL_MS,
  });

  await ensureTables();
  await loadBlocksFromDb();

  // Periodic in-memory scan
  setInterval(periodicScan, SCAN_INTERVAL_MS);

  // Periodic DB purge of expired blocks
  setInterval(() => purgeExpiredBlocks().catch(() => {}), DB_SYNC_INTERVAL);

  agentLog(AGENT, "Security agent ready", { ...getStats() });
}
