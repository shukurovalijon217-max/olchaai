/**
 * mediaVerifier — background startup job that marks posts with non-R2 or
 * unreachable media URLs as media_verified = false so the AI feed skips them.
 *
 * Only runs a HEAD check for posts that already look like R2 URLs but whose
 * verified flag is still true. Non-R2 URLs are immediately marked false
 * without a network call.
 */
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { logger } from "./logger.js";

const R2_DOMAIN = "https://media.olchaai.com/";
const MEDIA_TYPES = ["photo", "video"] as const;
const BATCH = 50;

export async function verifyMediaUrls(): Promise<void> {
  try {
    logger.info("[mediaVerifier] Starting media URL verification pass");

    // Step 1: Mark posts whose media_url is present but NOT an R2 URL as unverified immediately
    const nonR2Posts = await db
      .select({ id: postsTable.id, mediaUrl: postsTable.mediaUrl })
      .from(postsTable)
      .where(
        and(
          isNotNull(postsTable.mediaUrl),
          eq(postsTable.mediaVerified, true),
          inArray(postsTable.type, [...MEDIA_TYPES]),
        )
      )
      .limit(500);

    const nonR2Ids = nonR2Posts
      .filter(p => p.mediaUrl && !p.mediaUrl.startsWith(R2_DOMAIN))
      .map(p => p.id);

    if (nonR2Ids.length > 0) {
      logger.info(`[mediaVerifier] Marking ${nonR2Ids.length} non-R2 posts as unverified`);
      for (let i = 0; i < nonR2Ids.length; i += BATCH) {
        const batch = nonR2Ids.slice(i, i + BATCH);
        await db
          .update(postsTable)
          .set({ mediaVerified: false })
          .where(inArray(postsTable.id, batch));
      }
    }

    // Step 2: HEAD-check R2 posts (limit to 100 to keep startup fast)
    const r2Posts = await db
      .select({ id: postsTable.id, mediaUrl: postsTable.mediaUrl })
      .from(postsTable)
      .where(
        and(
          isNotNull(postsTable.mediaUrl),
          eq(postsTable.mediaVerified, true),
          inArray(postsTable.type, [...MEDIA_TYPES]),
        )
      )
      .limit(100);

    const r2Candidates = r2Posts.filter(
      p => p.mediaUrl && p.mediaUrl.startsWith(R2_DOMAIN)
    );

    const broken: number[] = [];
    await Promise.allSettled(
      r2Candidates.map(async (p) => {
        try {
          const res = await fetch(p.mediaUrl!, { method: "HEAD", signal: AbortSignal.timeout(5000) });
          if (!res.ok) broken.push(p.id);
        } catch {
          broken.push(p.id);
        }
      })
    );

    if (broken.length > 0) {
      logger.info(`[mediaVerifier] Marking ${broken.length} unreachable R2 posts as unverified`);
      for (let i = 0; i < broken.length; i += BATCH) {
        const batch = broken.slice(i, i + BATCH);
        await db
          .update(postsTable)
          .set({ mediaVerified: false })
          .where(inArray(postsTable.id, batch));
      }
    }

    logger.info("[mediaVerifier] Media URL verification pass complete");
  } catch (err) {
    logger.warn({ err }, "[mediaVerifier] Verification pass errored (non-fatal)");
  }
}
