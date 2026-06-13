/**
 * AI Autopilot Engine
 * Handles: warnings, auto-ban, event logging, SSE broadcast
 * Every piece of user-generated content flows through this.
 */
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { pgTable, serial, integer, text, numeric, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import type { AiScanResult } from "./aiFilter.js";

/* ─── inline table refs (avoid circular imports) ─────────────────── */
const aiModerationEventsTable = pgTable("ai_moderation_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id"),
  contentPreview: text("content_preview"),
  authorId: integer("author_id"),
  aiScore: numeric("ai_score", { precision: 4, scale: 2 }).notNull().default("0"),
  aiCategories: jsonb("ai_categories").notNull().default({}),
  aiVerdict: text("ai_verdict").notNull().default("clean"),
  engine: text("engine").notNull().default("hybrid"),
  actionTaken: text("action_taken").notNull().default("none"),
  warningCountAfter: integer("warning_count_after").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export interface AutopilotDecision {
  action: "none" | "flagged" | "deleted" | "warned" | "banned";
  warningCount: number;
  isBanned: boolean;
  message?: string;
  eventId?: number;
}

/* ─── SSE subscribers ─────────────────────────────────────────────── */
const sseClients = new Set<(data: string) => void>();

export function subscribeModerationSSE(send: (data: string) => void): () => void {
  sseClients.add(send);
  return () => sseClients.delete(send);
}

function broadcastEvent(event: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client(data); } catch { sseClients.delete(client); }
  }
}

/* ─── Warning thresholds ──────────────────────────────────────────── */
const WARN_THRESHOLD = 3;   // auto-ban after N warnings
const MAX_PREVIEW_LEN = 120;

function preview(text: string): string {
  if (!text) return "";
  return text.slice(0, MAX_PREVIEW_LEN) + (text.length > MAX_PREVIEW_LEN ? "…" : "");
}

/**
 * Main autopilot decision function.
 * Call after scanContentAsync to apply warnings/bans and log the event.
 */
export async function applyAutopilotDecision(opts: {
  scan: AiScanResult;
  authorId: number | null | undefined;
  contentType: string;
  contentId: number | null;
  contentText: string;
}): Promise<AutopilotDecision> {
  const { scan, authorId, contentType, contentId, contentText } = opts;
  let action: AutopilotDecision["action"] = "none";
  let warningCount = 0;
  let isBanned = false;
  let message: string | undefined;

  // Determine base action from scan
  if (scan.autoBlock || scan.verdict === "violation") {
    action = "deleted";
  } else if (scan.verdict === "suspicious") {
    action = "flagged";
  }

  // Warning / ban flow — only for authenticated users with violations
  if (authorId && (scan.verdict === "violation" || scan.autoBlock)) {
    try {
      const [user] = await db.select({
        warningCount: sql<number>`warning_count`,
        isBanned: sql<boolean>`is_banned`,
      }).from(usersTable).where(eq(usersTable.id, authorId));

      if (user && !user.isBanned) {
        const newWarningCount = (user.warningCount ?? 0) + 1;
        warningCount = newWarningCount;

        if (newWarningCount >= WARN_THRESHOLD) {
          // Auto-ban
          isBanned = true;
          action = "banned";
          await db.execute(sql`
            UPDATE users SET
              warning_count = ${newWarningCount},
              is_banned = true,
              banned_at = now(),
              banned_reason = ${"AI autopilot: " + (scan.topCategory ?? "policy_violation") + " (score: " + scan.score + ")"}
            WHERE id = ${authorId}
          `);
          message = `Siz avtomatik tarzda bloklangansiz — qoidabuzarlik aniqlandi (${scan.topCategory ?? "qoidabuzarlik"}). Hisob qaydnomangiz o'chirildi.`;
        } else {
          // Issue warning
          action = "warned";
          await db.execute(sql`
            UPDATE users SET warning_count = ${newWarningCount} WHERE id = ${authorId}
          `);
          const remaining = WARN_THRESHOLD - newWarningCount;
          message = `⚠️ Ogohlantirish ${newWarningCount}/${WARN_THRESHOLD}: Kontentingiz qoidalarga zid (${scan.topCategory ?? "taqiqlangan kontent"}). Yana ${remaining} ta ogohlantirish — va hisobingiz bloklanadi.`;
        }
      } else if (user?.isBanned) {
        isBanned = true;
        action = "banned";
        message = "Hisobingiz bloklanganligini sababli kontent nashr etib bo'lmaydi.";
      }
    } catch { /* non-fatal */ }
  }

  // Log to ai_moderation_events
  let eventId: number | undefined;
  try {
    const eventType =
      action === "banned" ? "user_banned"
        : action === "warned" ? "warning_issued"
        : action === "deleted" ? "auto_block"
        : scan.verdict === "suspicious" ? "suspicious"
        : "clean";

    const [ev] = await db.insert(aiModerationEventsTable).values({
      eventType,
      contentType,
      contentId: contentId ?? null,
      contentPreview: preview(contentText),
      authorId: authorId ?? null,
      aiScore: String(scan.score),
      aiCategories: scan.categories as any,
      aiVerdict: scan.verdict,
      engine: scan.engine ?? "hybrid",
      actionTaken: action,
      warningCountAfter: warningCount,
    }).returning({ id: aiModerationEventsTable.id });
    eventId = ev?.id;

    // SSE broadcast
    broadcastEvent({
      id: eventId,
      eventType,
      contentType,
      contentPreview: preview(contentText),
      authorId,
      aiScore: scan.score,
      aiVerdict: scan.verdict,
      topCategory: scan.topCategory,
      action,
      warningCountAfter: warningCount,
      engine: scan.engine,
      createdAt: new Date().toISOString(),
    });
  } catch { /* non-fatal */ }

  return { action, warningCount, isBanned, message, eventId };
}

/* ─── Stats helpers ───────────────────────────────────────────────── */
async function countQuery(q: ReturnType<typeof sql>): Promise<number> {
  const result = await db.execute(q) as any;
  const rows = result?.rows ?? result;
  return Number(rows?.[0]?.count ?? 0);
}

export async function getAutopilotStats() {
  const [total, violations, suspicious, autoBlocked, warned, bannedUsers, todayEvents] =
    await Promise.all([
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events`),
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events WHERE ai_verdict = 'violation'`),
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events WHERE ai_verdict = 'suspicious'`),
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events WHERE action_taken IN ('deleted','banned')`),
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events WHERE action_taken = 'warned'`),
      countQuery(sql`SELECT count(*)::int AS count FROM users WHERE is_banned = true`),
      countQuery(sql`SELECT count(*)::int AS count FROM ai_moderation_events WHERE created_at >= now() - interval '24 hours'`),
    ]);

  const recentResult = await db.execute(sql`
    SELECT id, event_type, content_type, content_preview, author_id, ai_score, ai_verdict,
           ai_categories, action_taken, warning_count_after, engine, created_at
    FROM ai_moderation_events
    ORDER BY created_at DESC LIMIT 50
  `) as any;
  const recentEvents = recentResult?.rows ?? recentResult ?? [];

  return { total, violations, suspicious, autoBlocked, warned, bannedUsers, todayEvents, recentEvents };
}
