/**
 * Background job queue — BullMQ (Redis-backed) when Upstash is configured,
 * falls back to fire-and-forget setImmediate in dev / single-process mode.
 *
 * Queues:
 *   • notifications — push / email delivery
 *   • analytics     — interaction tracking, view recording
 *   • moderation    — AI content scanning
 *
 * Usage:
 *   import { enqueue, enqueueNotification, enqueueAnalytics } from "./queue";
 *
 *   // Generic fire-and-forget (works in both modes):
 *   enqueue(() => sendEmail(to, subject, body), "welcome-email");
 *
 *   // Named typed jobs (BullMQ only, silently falls back in dev):
 *   enqueueNotification({ userId, title, body });
 *   enqueueAnalytics({ event: "view", postId, userId });
 */
import { logger } from "./logger";
// ── Redis connection for BullMQ ───────────────────────────────────────────────
// Upstash native Redis endpoint: rediss://default:TOKEN@HOST:6380
// Constructed from the same REST vars the cache layer uses.
function stripQuotes(s) {
    if (!s)
        return s;
    const t = s.trim();
    return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
        ? t.slice(1, -1) : t;
}
const UPSTASH_REST_URL = stripQuotes(process.env["UPSTASH_REDIS_REST_URL"]);
const UPSTASH_REST_TOKEN = stripQuotes(process.env["UPSTASH_REDIS_REST_TOKEN"]);
// Build native Redis URL from REST URL (strip https://)
function buildNativeRedisUrl() {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN)
        return null;
    try {
        const host = new URL(UPSTASH_REST_URL).hostname;
        return `rediss://default:${UPSTASH_REST_TOKEN}@${host}:6380`;
    }
    catch {
        return null;
    }
}
let notifQueue = null;
let analyticsQueue = null;
let moderationQueue = null;
let bullReady = false;
async function initBullMQ() {
    const nativeUrl = buildNativeRedisUrl();
    if (!nativeUrl) {
        logger.info("[queue] BullMQ disabled — no Redis URL. Using fire-and-forget fallback.");
        return;
    }
    try {
        const { Queue, Worker } = await import("bullmq");
        const connection = {
            url: nativeUrl,
            maxRetriesPerRequest: null, // required by BullMQ
            enableOfflineQueue: false,
            lazyConnect: true,
            tls: {},
        };
        notifQueue = new Queue("notifications", { connection });
        analyticsQueue = new Queue("analytics", { connection });
        moderationQueue = new Queue("moderation", { connection });
        // ── Workers ──────────────────────────────────────────────────────────────
        // Notification worker
        new Worker("notifications", async (job) => {
            const { type, userId, title, body, data } = job.data;
            logger.info({ jobId: job.id, type, userId }, "[queue:notif] processing");
            // Dynamic import to avoid circular deps
            const { sendNotification } = await import("./pushNotifications");
            await sendNotification({ userId, title, body, data: data ?? {} });
        }, {
            connection,
            concurrency: 5,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });
        // Analytics worker
        new Worker("analytics", async (job) => {
            const { event, userId, postId, durationMs } = job.data;
            logger.debug({ jobId: job.id, event }, "[queue:analytics] processing");
            if (event === "view" && postId) {
                // posts table has no views_count column — view events are recorded
                // via user_interactions elsewhere; nothing to update here yet.
                void durationMs;
                void userId;
            }
        }, {
            connection,
            concurrency: 20,
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 50 },
        });
        // Moderation worker
        new Worker("moderation", async (job) => {
            const { contentType, contentId, text } = job.data;
            logger.info({ jobId: job.id, contentType, contentId }, "[queue:mod] processing");
            // Basic heuristic check — full AI scan is done inline by existing moderation routes
            const badWords = /spam|hate|violence|nude/i;
            if (text && badWords.test(text)) {
                logger.warn({ contentType, contentId }, "[queue:mod] flagged for review");
            }
        }, {
            connection,
            concurrency: 3,
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 25 },
        });
        bullReady = true;
        logger.info("[queue] BullMQ ready — 3 queues active (notifications, analytics, moderation)");
    }
    catch (err) {
        logger.warn({ err }, "[queue] BullMQ init failed — falling back to fire-and-forget");
    }
}
// Initialize asynchronously on module load
initBullMQ().catch(() => { });
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Generic fire-and-forget. Works in both BullMQ and fallback mode.
 * Use for any one-off async task that shouldn't block the HTTP response.
 */
export function enqueue(job, label = "job") {
    setImmediate(() => {
        job().catch((err) => logger.error({ err, label }, "Background job failed"));
    });
}
/**
 * Enqueue a push notification. Retried up to 3× by BullMQ.
 * Falls back to inline push in dev mode.
 */
export async function enqueueNotification(payload) {
    if (bullReady && notifQueue) {
        await notifQueue.add("push", payload, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
        });
    }
    else {
        // Fire-and-forget fallback
        enqueue(async () => {
            const { sendNotification } = await import("./pushNotifications");
            await sendNotification({
                userId: payload.userId,
                title: payload.title,
                body: payload.body,
                data: payload.data ?? {},
            });
        }, `notif:${payload.userId}`);
    }
}
/**
 * Enqueue an analytics event (view, like, share, etc.).
 * Non-critical — never throws, never blocks.
 */
export function enqueueAnalytics(payload) {
    if (bullReady && analyticsQueue) {
        analyticsQueue.add("event", payload, {
            attempts: 2,
            removeOnComplete: true,
        }).catch(() => { });
    }
    // else: silently skip — analytics are best-effort
}
/**
 * Enqueue a moderation scan for user-generated content.
 */
export function enqueueModeration(payload) {
    if (bullReady && moderationQueue) {
        moderationQueue.add("scan", payload, { attempts: 2 }).catch(() => { });
    }
}
export { bullReady };
