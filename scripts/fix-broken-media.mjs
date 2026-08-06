#!/usr/bin/env node
/**
 * fix-broken-media.mjs
 *
 * One-time migration: finds all posts with a non-null mediaUrl, issues a HEAD
 * request for each one, and sets mediaUrl = NULL / type = 'text' for any URL
 * that returns a 4xx or 5xx status (or fails to connect).
 *
 * Usage:
 *   NEON_DATABASE_URL=<url> node scripts/fix-broken-media.mjs
 *   # or if DATABASE_URL is already set:
 *   node scripts/fix-broken-media.mjs
 *
 * Dry-run (no DB writes):
 *   DRY_RUN=1 node scripts/fix-broken-media.mjs
 *
 * Concurrency can be tuned via CONCURRENCY env var (default 10).
 */

import pg from "pg";

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL or NEON_DATABASE_URL must be set.");
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === "1";
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY) || 10);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 8000;

if (DRY_RUN) console.log("[fix-broken-media] DRY RUN — no DB writes will happen.\n");

// ── DB connection ─────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Issue a HEAD request to `url` with a timeout.
 * Returns { ok: true } if status < 400, otherwise { ok: false, status }.
 * On network error returns { ok: false, status: null, error: message }.
 */
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status >= 400) {
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: null, error: err.message };
  }
}

/**
 * Run `tasks` (array of async functions) at most `concurrency` at a time.
 */
async function pLimit(tasks, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    // Fetch all posts with a non-null, non-empty mediaUrl
    const { rows: posts } = await client.query(
      `SELECT id, media_url FROM posts WHERE media_url IS NOT NULL AND media_url <> '' ORDER BY id`
    );

    console.log(`[fix-broken-media] Found ${posts.length} post(s) with a non-null mediaUrl.`);
    if (posts.length === 0) {
      console.log("[fix-broken-media] Nothing to do.");
      return;
    }

    let checkedCount = 0;
    let brokenCount = 0;
    let fixedCount = 0;

    const tasks = posts.map((post) => async () => {
      const { id, media_url: url } = post;

      // Skip clearly non-HTTP values (data URIs, etc.)
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        console.log(`  [${id}] SKIP non-HTTP url: ${url.slice(0, 80)}`);
        checkedCount++;
        brokenCount++;
        if (!DRY_RUN) {
          await client.query(
            `UPDATE posts SET media_url = NULL, type = 'text' WHERE id = $1`,
            [id]
          );
          fixedCount++;
        }
        return;
      }

      const result = await checkUrl(url);
      checkedCount++;

      if (result.ok) {
        // URL is alive — leave it alone
        return;
      }

      // URL is broken
      brokenCount++;
      const reason = result.error ?? `HTTP ${result.status}`;
      console.log(`  [${id}] BROKEN (${reason}): ${url.slice(0, 100)}`);

      if (!DRY_RUN) {
        await client.query(
          `UPDATE posts SET media_url = NULL, type = 'text' WHERE id = $1`,
          [id]
        );
        fixedCount++;
      }
    });

    await pLimit(tasks, CONCURRENCY);

    console.log(`\n[fix-broken-media] Done.`);
    console.log(`  Checked : ${checkedCount}`);
    console.log(`  Broken  : ${brokenCount}`);
    console.log(`  Fixed   : ${DRY_RUN ? `${brokenCount} (dry-run, not applied)` : fixedCount}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[fix-broken-media] Fatal error:", err);
  process.exit(1);
});
