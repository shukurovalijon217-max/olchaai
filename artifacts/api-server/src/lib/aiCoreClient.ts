/**
 * AI Core HTTP Client
 *
 * Bridge between API Server and the AI Core service (port 9000).
 * Every call has a short timeout + graceful fallback so a slow/down
 * AI Core never blocks the main request path.
 */

import { logger } from "./logger";

const AI_CORE_BASE = process.env["AI_CORE_URL"] ?? "http://localhost:9000";
const TIMEOUT_MS   = 3_000;

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_CORE_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    logger.warn({ err, path }, "aiCoreClient: call failed (non-fatal)");
    return null;
  }
}

async function get<T>(path: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_CORE_BASE}${path}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    logger.warn({ err, path }, "aiCoreClient: GET failed (non-fatal)");
    return null;
  }
}

/* ── Types ──────────────────────────────────────────────────────── */

export interface AiCoreModerationResult {
  id: string;
  flagged: boolean;
  action: "allow" | "review" | "block";
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  reason?: string;
  method: "openai" | "heuristic" | "combined";
  latencyMs: number;
}

export interface AiCoreQuickResult {
  flagged: boolean;
  method: "heuristic";
}

export interface AiCoreStatus {
  orchestrator: unknown;
  security: unknown;
  moderation: unknown;
  analytics: unknown;
  ts: string;
}

/* ── API ────────────────────────────────────────────────────────── */

/**
 * Full async moderation — uses OpenAI Moderation API + heuristics.
 * Returns null if AI Core is unreachable (caller should fall back).
 */
export async function moderateContent(
  id: string,
  content: string,
  authorId?: string | number,
  context: "post" | "comment" | "profile" | "message" = "post",
): Promise<AiCoreModerationResult | null> {
  return post<AiCoreModerationResult>("/ai-core/moderate", {
    id,
    content,
    authorId: authorId != null ? String(authorId) : undefined,
    context,
  });
}

/**
 * Instant heuristic-only check — synchronous on AI Core side, ~0ms.
 * Returns null if AI Core is unreachable.
 */
export async function quickModerate(content: string): Promise<AiCoreQuickResult | null> {
  return post<AiCoreQuickResult>("/ai-core/moderate/quick", { content });
}

/**
 * Report a failed authentication attempt.
 * AI Core tracks brute-force patterns across all IPs.
 */
export function reportAuthFailure(ip: string, identifier: string): void {
  post("/ai-core/security/report", {
    type:    "auth_failure",
    payload: ip,
    detail:  `Failed login attempt for identifier: ${identifier}`,
  }).catch(() => {});
}

/**
 * Report a detected attack pattern (injection, XSS, honeypot hit, etc.).
 * Fire-and-forget — never awaited so it can't block a response.
 */
export function reportAttack(
  ip: string,
  eventType: string,
  detail: string,
): void {
  post("/ai-core/security/report", {
    type:    eventType,
    payload: ip,
    detail,
  }).catch(() => {});
}

/**
 * Fetch current AI Core health + stats.
 */
export function getAiCoreStatus(): Promise<AiCoreStatus | null> {
  return get<AiCoreStatus>("/ai-core/status");
}

/**
 * Convert AI Core moderation result → aiFilter.ts AiScanResult shape.
 */
export function aiCoreResultToScanResult(r: AiCoreModerationResult): {
  score: number;
  categories: Record<string, number>;
  verdict: "clean" | "suspicious" | "violation";
  autoBlock: boolean;
  topCategory: string | null;
  engine: "ai-core";
} {
  const scores = r.scores as Record<string, number>;
  const maxScore = Object.values(scores).reduce((a, b) => Math.max(a, b), 0);
  const topCategory =
    Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const verdict =
    r.action === "block" ? "violation"
    : r.action === "review" ? "suspicious"
    : "clean";

  return {
    score:       Math.round(maxScore * 100) / 100,
    categories:  scores,
    verdict,
    autoBlock:   r.action === "block",
    topCategory,
    engine:      "ai-core",
  };
}
