/**
 * NEXUS Security Shield — Pentagon-grade auto-defense middleware
 *
 * Layers:
 *  1. DB-persisted IP ban list (survives restarts)
 *  2. Attack pattern detection (SQLi, XSS, path traversal, SSTI, XXE, prototype pollution, cmd injection)
 *  3. Progressive strike system → 3 strikes = 15min ban, 5 = 24h ban, 10 = permanent
 *  4. Request anomaly detection (scanner UAs, massive headers, null-byte abuse)
 *  5. Honeypot trap — common scanner/hacker probe paths auto-ban the IP immediately
 *  6. Session hijacking detection — IP change mid-session
 *  7. Security event logging to DB
 *  8. Decoy response — attack responses look like random server errors to confuse tools
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and, gt, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/* ─── DB Tables ─────────────────────────────────────────────────── */
const bannedIpsTable = pgTable("banned_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason").notNull(),
  strikes: integer("strikes").notNull().default(1),
  permanent: boolean("permanent").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

const securityEventsTable = pgTable("security_events", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  eventType: text("event_type").notNull(),
  path: text("path"),
  payload: text("payload"),
  userAgent: text("user_agent"),
  userId: integer("user_id"),
  severity: text("severity").notNull().default("medium"), // low | medium | high | critical
  createdAt: timestamp("created_at").defaultNow(),
});

/* ─── Ensure tables exist ──────────────────────────────────────── */
async function ensureTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        strikes INTEGER NOT NULL DEFAULT 1,
        permanent BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        event_type TEXT NOT NULL,
        path TEXT,
        payload TEXT,
        user_agent TEXT,
        user_id INTEGER,
        severity TEXT NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
  } catch { /* tables may already exist */ }
}
ensureTables().catch(() => {});

/* ─── In-memory cache for performance (DB is source of truth) ───── */
const memBanCache = new Map<string, { permanent: boolean; expiresAt: number | null }>();
const strikeCache = new Map<string, number>();

async function loadBanCache() {
  try {
    const rows = await db.select().from(bannedIpsTable);
    for (const row of rows) {
      memBanCache.set(row.ip, {
        permanent: row.permanent,
        expiresAt: row.expiresAt ? row.expiresAt.getTime() : null,
      });
      strikeCache.set(row.ip, row.strikes);
    }
  } catch { /* DB not ready yet */ }
}
// Load on startup, refresh every 5 minutes
loadBanCache().catch(() => {});
setInterval(() => loadBanCache().catch(() => {}), 5 * 60_000);

/* ─── Ban management ────────────────────────────────────────────── */
async function banIp(ip: string, reason: string, durationMs: number | "permanent", extraStrikes = 1) {
  const permanent = durationMs === "permanent";
  const expiresAt = permanent ? null : new Date(Date.now() + (durationMs as number));
  const currentStrikes = strikeCache.get(ip) ?? 0;
  const newStrikes = currentStrikes + extraStrikes;

  try {
    await db.execute(sql`
      INSERT INTO banned_ips (ip, reason, strikes, permanent, expires_at)
      VALUES (${ip}, ${reason}, ${newStrikes}, ${permanent}, ${expiresAt})
      ON CONFLICT (ip) DO UPDATE SET
        reason = EXCLUDED.reason,
        strikes = banned_ips.strikes + ${extraStrikes},
        permanent = ${permanent} OR banned_ips.permanent,
        expires_at = CASE
          WHEN ${permanent} OR banned_ips.permanent THEN NULL
          ELSE GREATEST(banned_ips.expires_at, ${expiresAt})
        END
    `);
  } catch { /* non-fatal */ }

  memBanCache.set(ip, { permanent, expiresAt: expiresAt?.getTime() ?? null });
  strikeCache.set(ip, newStrikes);
}

function isBanned(ip: string): boolean {
  const rec = memBanCache.get(ip);
  if (!rec) return false;
  if (rec.permanent) return true;
  if (rec.expiresAt && rec.expiresAt > Date.now()) return true;
  // Ban expired
  memBanCache.delete(ip);
  return false;
}

/* ─── Security event logging ────────────────────────────────────── */
async function logSecurityEvent(
  ip: string,
  eventType: string,
  path: string,
  severity: "low" | "medium" | "high" | "critical",
  payload?: string,
  userAgent?: string,
  userId?: number,
) {
  try {
    await db.insert(securityEventsTable).values({
      ip,
      eventType,
      path,
      severity,
      payload: payload?.slice(0, 500),
      userAgent: userAgent?.slice(0, 256),
      userId: userId ?? null,
    });
  } catch { /* non-fatal */ }
}

/* ─── Attack pattern definitions ────────────────────────────────── */

// SQL Injection — union-based, error-based, boolean-based, time-based
const SQL_INJECT_RE = /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bFROM\b|\bDROP\b.*\bTABLE\b|\bINSERT\b.*\bINTO\b|\bDELETE\b.*\bFROM\b|\bEXEC\b.*\(|SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\(|0x[0-9a-f]{4,}|'.*OR.*'.*=.*'|--\s*$|\/\*.*\*\/|xp_cmdshell|LOAD_FILE|INTO\s+OUTFILE)/gi;

// XSS — script tags, event handlers, javascript: URIs, data: URIs with html
const XSS_RE = /<\s*script[\s>]|javascript\s*:|data\s*:\s*text\/html|on(?:load|error|click|mouse|key|focus|blur|change|input|submit|pointerover|pointerout)\s*=|<\s*iframe|<\s*object|<\s*embed|<\s*svg\s.*on|expression\s*\(/gi;

// Path traversal
const PATH_TRAVERSAL_RE = /\.\.[\\/]|%2e%2e[\\/]|%252e%252e|\.\.%2f|%2e%2e%2f/gi;

// Command injection
const CMD_INJECT_RE = /[;&|`$(){}[\]]\s*(?:cat|ls|id|whoami|curl|wget|bash|sh|python|perl|ruby|nc|ncat|netcat|chmod|chown|rm\s+-|mv\s+\/|cp\s+\/|dd\s+if=|base64\s+|xxd\s+)/gi;

// Server-Side Template Injection
const SSTI_RE = /\{\{.*\}\}|\$\{.*\}|<%.*%>|#\{.*\}|\[%.*%\]/g;

// XXE / XML injection
const XXE_RE = /<!(?:DOCTYPE|ENTITY)[^>]*(?:SYSTEM|PUBLIC)\s+["'][^"']*["']/gi;

// Prototype pollution
const PROTO_RE = /__proto__|constructor\[prototype\]|prototype\[constructor\]/gi;

// SSRF — internal network probing
const SSRF_RE = /(?:https?|ftp|file|gopher|ldap):\/\/(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|::1|fd[0-9a-f]{2}:|fc00:)/gi;

interface AttackMatch {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  sample: string;
}

function scanValue(value: string): AttackMatch | null {
  const pairs: [RegExp, string, "medium" | "high" | "critical"][] = [
    [SQL_INJECT_RE, "sql_injection", "critical"],
    [XSS_RE, "xss", "high"],
    [CMD_INJECT_RE, "command_injection", "critical"],
    [PATH_TRAVERSAL_RE, "path_traversal", "high"],
    [SSTI_RE, "ssti", "high"],
    [XXE_RE, "xxe", "critical"],
    [PROTO_RE, "prototype_pollution", "high"],
    [SSRF_RE, "ssrf", "critical"],
  ];
  for (const [re, type, severity] of pairs) {
    re.lastIndex = 0;
    const m = re.exec(value);
    if (m) return { type, severity, sample: m[0].slice(0, 80) };
  }
  return null;
}

function deepScan(obj: unknown, depth = 0): AttackMatch | null {
  if (depth > 6) return null;
  if (typeof obj === "string") return scanValue(obj);
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 30)) {
      const r = deepScan(item, depth + 1);
      if (r) return r;
    }
  } else if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj).slice(0, 50)) {
      const r = deepScan(key, depth + 1) ?? deepScan((obj as Record<string, unknown>)[key], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/* ─── Honeypot paths — instant ban for anyone probing these ─────── */
const HONEYPOT_PATHS = new Set([
  "/admin", "/wp-admin", "/wp-login.php", "/phpmyadmin", "/phpMyAdmin",
  "/.env", "/.git/config", "/.git/HEAD", "/config.php", "/configuration.php",
  "/xmlrpc.php", "/wp-content", "/wp-includes", "/backup", "/db.sql",
  "/database.sql", "/.htaccess", "/web.config", "/server-status", "/server-info",
  "/actuator", "/actuator/health", "/actuator/env", "/actuator/mappings",
  "/api/v1/secret", "/api/debug", "/api/config", "/console", "/manager/html",
  "/jmx-console", "/invoker/EJBInvokerServlet", "/shell.php", "/cmd.php",
  "/eval.php", "/upload.php", "/test.php", "/info.php", "/phpinfo.php",
  "/_profiler", "/_debug", "/telescope", "/horizon", "/.DS_Store",
  "/etc/passwd", "/etc/shadow", "/proc/self/environ",
]);

/* ─── Scanner / bot user agent patterns ────────────────────────── */
const SCANNER_UA_RE = /(?:nikto|sqlmap|nmap|masscan|zgrab|zap|burpsuite|w3af|dirbuster|dirb|gobuster|feroxbuster|wfuzz|hydra|medusa|nessus|openvas|qualys|nuclei|metasploit|havij|acunetix|appscan|webinspect|skipfish|commix|xsser|subfinder|amass|shodan|censys|fofa|zoomeye|zgrab2|httprobe|httpx|dalfox|ghauri|sqlninja|bbscan)/i;

/* ─── Decoy responses — confuse attackers about the stack ───────── */
const DECOYS = [
  { status: 500, body: { error: "Internal Server Error", code: "ECONNRESET" } },
  { status: 502, body: { error: "Bad Gateway" } },
  { status: 503, body: { error: "Service Unavailable", retryAfter: 30 } },
  { status: 404, body: { error: "Not Found" } },
  { status: 403, body: { error: "Forbidden" } },
];
function decoyResponse(res: Response): void {
  const d = DECOYS[Math.floor(Math.random() * DECOYS.length)];
  res.status(d.status).json(d.body);
}

/* ─── Extract real IP ────────────────────────────────────────────── */
function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.socket?.remoteAddress ?? "unknown";
}

/** IPs that must NEVER be banned (localhost, internal infra) */
const TRUSTED_IPS = new Set([
  "127.0.0.1", "::1", "::ffff:127.0.0.1",
  "0.0.0.0", "::ffff:0.0.0.0",
]);
function isTrusted(ip: string): boolean {
  return TRUSTED_IPS.has(ip) || ip.startsWith("172.") || ip.startsWith("10.");
}

/* ─── Strike system ──────────────────────────────────────────────── */
const BAN_DURATIONS: Record<number, number | "permanent"> = {
  3: 15 * 60_000,          // 3 strikes → 15 min
  5: 60 * 60_000,          // 5 strikes → 1 hour
  7: 24 * 60 * 60_000,     // 7 strikes → 24 hours
  10: "permanent",         // 10 strikes → permanent
};

async function strike(ip: string, reason: string, path: string, severity: "medium" | "high" | "critical", payload?: string, ua?: string, userId?: number) {
  await logSecurityEvent(ip, reason, path, severity, payload, ua, userId);
  const currentStrikes = strikeCache.get(ip) ?? 0;
  const newStrikes = currentStrikes + 1;

  let duration: number | "permanent" | undefined;
  for (const threshold of [10, 7, 5, 3]) {
    if (newStrikes >= threshold) {
      duration = BAN_DURATIONS[threshold];
      break;
    }
  }

  if (duration !== undefined) {
    await banIp(ip, reason, duration);
    logger.warn({ ip, reason, strikes: newStrikes, duration }, "NEXUS Shield: IP banned");
  } else {
    // Just record the strike
    strikeCache.set(ip, newStrikes);
    try {
      await db.execute(sql`
        INSERT INTO banned_ips (ip, reason, strikes, permanent)
        VALUES (${ip}, ${reason}, ${newStrikes}, false)
        ON CONFLICT (ip) DO UPDATE SET strikes = banned_ips.strikes + 1
      `);
    } catch { /* non-fatal */ }
  }
}

/* ─── Main Shield Middleware ─────────────────────────────────────── */
export async function securityShield(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = getIp(req);
  const path = req.path ?? "/";
  const ua = (req.headers["user-agent"] ?? "").slice(0, 300);
  const userId = (req.session as { userId?: number })?.userId;

  // ── 0. Always allow trusted/internal IPs ───────────────────────
  if (isTrusted(ip)) { next(); return; }

  // ── 1. Check ban list ──────────────────────────────────────────
  if (isBanned(ip)) {
    logger.warn({ ip, path }, "NEXUS Shield: banned IP attempted access");
    decoyResponse(res);
    return;
  }

  // ── 2. Honeypot trap ────────────────────────────────────────────
  const lowerPath = path.toLowerCase();
  for (const hp of HONEYPOT_PATHS) {
    if (lowerPath === hp.toLowerCase() || lowerPath.startsWith(hp.toLowerCase() + "/") || lowerPath.startsWith(hp.toLowerCase() + "?")) {
      await banIp(ip, `honeypot:${path}`, "permanent");
      await logSecurityEvent(ip, "honeypot_trap", path, "critical", undefined, ua, userId);
      logger.warn({ ip, path }, "NEXUS Shield: honeypot triggered → PERMANENT BAN");
      decoyResponse(res);
      return;
    }
  }

  // ── 3. Scanner user-agent detection ──────────────────────────
  if (SCANNER_UA_RE.test(ua)) {
    await banIp(ip, `scanner_ua:${ua.slice(0, 80)}`, 24 * 60 * 60_000);
    await logSecurityEvent(ip, "scanner_user_agent", path, "high", ua.slice(0, 200), ua, userId);
    logger.warn({ ip, ua: ua.slice(0, 80) }, "NEXUS Shield: scanner UA detected → 24h ban");
    decoyResponse(res);
    return;
  }

  // ── 4. Oversized headers / header anomalies ───────────────────
  const totalHeaderSize = Object.values(req.headers)
    .flat()
    .join("")
    .length;
  if (totalHeaderSize > 8192) {
    await strike(ip, "oversized_headers", path, "medium", `headerSize:${totalHeaderSize}`, ua, userId);
    res.status(431).json({ error: "Request Header Fields Too Large" });
    return;
  }

  // ── 5. Null-byte in URL ─────────────────────────────────────────
  if (req.url.includes("\0") || req.url.includes("%00")) {
    await strike(ip, "null_byte_url", path, "high", req.url.slice(0, 200), ua, userId);
    res.status(400).json({ error: "Bad Request" });
    return;
  }

  // ── 6. Path traversal in URL ─────────────────────────────────
  PATH_TRAVERSAL_RE.lastIndex = 0;
  if (PATH_TRAVERSAL_RE.test(decodeURIComponent(req.url))) {
    await strike(ip, "path_traversal_url", path, "high", req.url.slice(0, 200), ua, userId);
    await banIp(ip, "path_traversal", 60 * 60_000);
    decoyResponse(res);
    return;
  }

  // ── 7. Attack patterns in query string ──────────────────────
  const queryStr = req.url.split("?")[1] ?? "";
  if (queryStr.length > 0) {
    let decoded = "";
    try { decoded = decodeURIComponent(queryStr); } catch { decoded = queryStr; }
    const queryAttack = scanValue(decoded);
    if (queryAttack) {
      const qSev = queryAttack.severity === "low" ? "medium" : queryAttack.severity;
      await strike(ip, `query_${queryAttack.type}`, path, qSev, decoded.slice(0, 200), ua, userId);
      await banIp(ip, queryAttack.type, queryAttack.severity === "critical" ? 24 * 60 * 60_000 : 60 * 60_000);
      decoyResponse(res);
      return;
    }
  }

  // ── 8. Deep-scan request body ────────────────────────────────
  // Skip body scanning for trusted first-party endpoints whose payloads
  // legitimately contain {{variable}} i18next placeholders (false-positive SSTI).
  const BODY_SCAN_SKIP_PATHS = new Set(["/api/translate-ui-batch", "/api/translate"]);
  if (req.body && typeof req.body === "object" && !BODY_SCAN_SKIP_PATHS.has(path)) {
    const bodyAttack = deepScan(req.body);
    if (bodyAttack) {
      const bSev = bodyAttack.severity === "low" ? "medium" : bodyAttack.severity;
      await strike(ip, `body_${bodyAttack.type}`, path, bSev, bodyAttack.sample, ua, userId);
      await banIp(ip, bodyAttack.type, bodyAttack.severity === "critical" ? 24 * 60 * 60_000 : 60 * 60_000);
      decoyResponse(res);
      return;
    }
  }

  // ── 9. Session hijacking detection ─────────────────────────
  const sess = req.session as { userId?: number; boundIp?: string };
  if (sess.userId && sess.boundIp && sess.boundIp !== ip) {
    logger.warn({ userId: sess.userId, origIp: sess.boundIp, newIp: ip }, "NEXUS Shield: session IP change detected");
    await logSecurityEvent(ip, "session_hijack_attempt", path, "critical", `origIp:${sess.boundIp}`, ua, sess.userId);
    req.session.destroy(() => {});
    res.status(401).json({ error: "Sessiya xavfsizligi buzildi. Qayta kirish kerak." });
    return;
  }
  // Bind session to IP on first use
  if (sess.userId && !sess.boundIp) {
    sess.boundIp = ip;
  }

  next();
}

/* ─── Admin endpoint: get security events + ban list ────────────── */
export async function getSecurityStats() {
  try {
    const [events, bans] = await Promise.all([
      db.select().from(securityEventsTable)
        .orderBy(sql`created_at DESC`)
        .limit(50),
      db.select().from(bannedIpsTable)
        .orderBy(sql`created_at DESC`)
        .limit(100),
    ]);
    return { events, bans };
  } catch {
    return { events: [], bans: [] };
  }
}

export async function unbanIp(ip: string) {
  try {
    await db.execute(sql`DELETE FROM banned_ips WHERE ip = ${ip}`);
    memBanCache.delete(ip);
    strikeCache.delete(ip);
    return true;
  } catch {
    return false;
  }
}

/* ─── Adaptive AI Shield — orqa fonda o'zi ishlaydi ────────────── */
async function runAdaptiveSweep() {
  try {
    // So'nggi 1 soat ichida 3+ ta hujum qilgan va hali ban bo'lmagan IPlarni top
    const hotIps = await db.execute(sql`
      SELECT ip, COUNT(*) as event_count, MAX(severity) as max_severity,
             array_agg(DISTINCT event_type) as attack_types
      FROM security_events
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND ip NOT IN (SELECT ip FROM banned_ips WHERE permanent = true OR expires_at > NOW())
      GROUP BY ip
      HAVING COUNT(*) >= 3
      ORDER BY event_count DESC
      LIMIT 50
    `);

    const rows = (hotIps as any).rows ?? [];

    for (const row of rows) {
      const count = Number(row.event_count);
      const sev = row.max_severity as string;

      // Critical hujum → darhol permanent ban
      if (sev === "critical" || count >= 10) {
        await banIp(row.ip, `AI adaptive: ${count} attacks (${sev})`, "permanent", count);
        logger.warn({ ip: row.ip, count, sev }, "Adaptive AI Shield: permanent ban applied");
      }
      // Ko'p urinish → 24 soat ban
      else if (count >= 6 || sev === "high") {
        await banIp(row.ip, `AI adaptive: ${count} attacks (${sev})`, 24 * 60 * 60_000, count);
        logger.warn({ ip: row.ip, count, sev }, "Adaptive AI Shield: 24h ban applied");
      }
      // Shubhali → 1 soat ban
      else {
        await banIp(row.ip, `AI adaptive: ${count} suspicious events`, 60 * 60_000, 1);
        logger.info({ ip: row.ip, count }, "Adaptive AI Shield: 1h ban applied");
      }
    }

    // Muddati o'tgan banlarni tozalash
    await db.execute(sql`
      DELETE FROM banned_ips
      WHERE permanent = false AND expires_at < NOW()
    `);

    // 30 kundan eski eventlarni arxivlash
    await db.execute(sql`
      DELETE FROM security_events
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);

    if (rows.length > 0) {
      logger.info({ banned: rows.length }, "Adaptive AI Shield sweep complete");
    }
  } catch (err) {
    logger.error({ err }, "Adaptive AI Shield sweep error");
  }
}

// Serverda ishga tushganda 30 soniya o'tib birinchi sweep, keyin har soatda
setTimeout(() => runAdaptiveSweep().catch(() => {}), 30_000);
setInterval(() => runAdaptiveSweep().catch(() => {}), 60 * 60_000);
