/**
 * Kiber-Qalqon — Self-Healing DevOps & Hyper-Security Agent
 *
 * Monitors request patterns in real-time.
 * Detects: brute force, rate limit abuse, anomalous load, injection attempts.
 * Responds: blacklist IPs, escalate to Orchestrator, emit alerts.
 */

import { agentLog, agentAlert, agentWarn } from "./logger.js";

const AGENT = "Kiber-Qalqon";

const RATE_WINDOW_MS   = 60_000;   // 1-minute sliding window
const RATE_LIMIT       = 120;      // max requests per IP per window
const BRUTE_LIMIT      = 8;        // max auth failures before block
const SCAN_INTERVAL_MS = 5_000;    // scan every 5s
const BLACKLIST_TTL_MS = 15 * 60_000; // auto-unban after 15 min

interface IpRecord {
  requests: number[];        // timestamps of recent requests
  authFailures: number[];    // timestamps of failed auth attempts
  blockedUntil?: number;
  suspicionScore: number;
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

function pushEvent(ev: Omit<SecurityEvent, "ts">) {
  const full: SecurityEvent = { ts: Date.now(), ...ev };
  events.push(full);
  if (events.length > MAX_EVENTS) events.shift();
  return full;
}

function prune(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter(t => t > cutoff);
}

/** Called by the HTTP middleware on every incoming request */
export function trackRequest(ip: string): { blocked: boolean; reason?: string } {
  const rec = getOrCreate(ip);
  const now = Date.now();

  if (rec.blockedUntil && now < rec.blockedUntil) {
    return { blocked: true, reason: "IP blacklisted" };
  }
  if (rec.blockedUntil && now >= rec.blockedUntil) {
    delete rec.blockedUntil;
    pushEvent({ type: "UNBLOCKED", ip, detail: "TTL expired — IP reinstated" });
    agentLog(AGENT, `IP ${ip} unblocked (TTL expired)`);
  }

  rec.requests = prune(rec.requests, RATE_WINDOW_MS);
  rec.requests.push(now);

  if (rec.requests.length > RATE_LIMIT) {
    rec.blockedUntil = now + BLACKLIST_TTL_MS;
    rec.suspicionScore += 30;
    const ev = pushEvent({ type: "RATE_LIMIT", ip, detail: `${rec.requests.length} req/min — threshold ${RATE_LIMIT}` });
    agentAlert(AGENT, `Rate limit exceeded — blocking ${ip}`, { count: rec.requests.length, event: ev });
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
    rec.blockedUntil = now + BLACKLIST_TTL_MS;
    rec.suspicionScore += 50;
    const ev = pushEvent({
      type: "BRUTE_FORCE",
      ip,
      detail: `${rec.authFailures.length} failed auth attempts in 60s`,
    });
    agentAlert(AGENT, `Brute-force detected — blocking ${ip}`, { failures: rec.authFailures.length, event: ev });
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
    if (rec.suspicionScore >= 80) {
      rec.blockedUntil = Date.now() + BLACKLIST_TTL_MS;
      pushEvent({ type: "BLOCKED", ip, detail: "High suspicion score — auto-blocked" });
      agentAlert(AGENT, `High-risk IP ${ip} auto-blocked`, { score: rec.suspicionScore });
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
} {
  const now = Date.now();
  let blocked = 0;
  let recentThreats = 0;
  const cutoff = now - 5 * 60_000; // last 5 min

  for (const [, rec] of ipStore) {
    if (rec.blockedUntil && rec.blockedUntil > now) blocked++;
  }
  for (const ev of events) {
    if (ev.ts > cutoff && ev.type !== "UNBLOCKED") recentThreats++;
  }

  return {
    trackedIps: ipStore.size,
    blockedIps: blocked,
    totalEvents: events.length,
    recentThreats,
  };
}

/** Periodic background scan — decay scores, prune stale IPs */
function periodicScan() {
  const now = Date.now();
  let pruned = 0;
  let unbanned = 0;

  for (const [ip, rec] of ipStore) {
    rec.requests = prune(rec.requests, RATE_WINDOW_MS);
    rec.authFailures = prune(rec.authFailures, RATE_WINDOW_MS);

    if (rec.suspicionScore > 0) rec.suspicionScore = Math.max(0, rec.suspicionScore - 2);

    if (
      rec.requests.length === 0 &&
      rec.authFailures.length === 0 &&
      (!rec.blockedUntil || rec.blockedUntil < now) &&
      rec.suspicionScore === 0
    ) {
      ipStore.delete(ip);
      pruned++;
    }

    if (rec.blockedUntil && rec.blockedUntil < now) {
      delete rec.blockedUntil;
      pushEvent({ type: "UNBLOCKED", ip, detail: "TTL expired" });
      unbanned++;
    }
  }

  const stats = getStats();
  if (stats.blockedIps > 0 || stats.recentThreats > 0) {
    agentLog(AGENT, "Periodic scan complete", {
      trackedIps: stats.trackedIps,
      blockedIps: stats.blockedIps,
      recentThreats: stats.recentThreats,
      pruned,
      unbanned,
    });
  }
}

export function startSecurityAgent(): void {
  agentLog(AGENT, "Security agent started", {
    rateLimit: RATE_LIMIT,
    bruteLimit: BRUTE_LIMIT,
    scanIntervalMs: SCAN_INTERVAL_MS,
  });
  setInterval(periodicScan, SCAN_INTERVAL_MS);
}
