import { logger } from "./logger";

/**
 * Fire-and-forget background job queue.
 * Use for non-critical async work (analytics, notifications, moderation triggers)
 * so they never block the HTTP response.
 *
 * Example:
 *   enqueue(() => recordUserInteraction(userId, postId, "like"));
 */
export function enqueue(job: () => Promise<void>, label = "job"): void {
  setImmediate(() => {
    job().catch((err) => logger.error({ err, label }, "Background job failed"));
  });
}
