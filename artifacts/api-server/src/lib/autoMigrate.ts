import { logger } from "./logger.js";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const MIGRATIONS = [
  `ALTER TABLE reels ADD COLUMN IF NOT EXISTS hls_url TEXT`,
  `ALTER TABLE reels ADD COLUMN IF NOT EXISTS hls_status TEXT DEFAULT 'pending'`,
  `ALTER TABLE reels ADD COLUMN IF NOT EXISTS audio_track TEXT`,
  `ALTER TABLE reels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'reel'`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS hot_take BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS aura_score REAL`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_trim_start REAL`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_trim_end REAL`,
  `ALTER TABLE creator_monetization ADD COLUMN IF NOT EXISTS ads_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE creator_monetization ADD COLUMN IF NOT EXISTS super_thanks_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE creator_monetization ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE creator_monetization ADD COLUMN IF NOT EXISTS donation_min INTEGER NOT NULL DEFAULT 2000`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_prefs JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT`,
  `CREATE TABLE IF NOT EXISTS upload_sessions (
    uuid TEXT PRIMARY KEY,
    cloudinary_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON user_sessions (expire)`,
  `CREATE TABLE IF NOT EXISTS translation_cache (
    cache_key TEXT PRIMARY KEY,
    translated JSONB NOT NULL,
    cached_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  /* ── Performance indexes ───────────────────────────────────── */
  `CREATE INDEX IF NOT EXISTS idx_transactions_wallet  ON transactions (wallet_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user    ON transactions (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_comment_likes_cmt    ON comment_likes (comment_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_story_views_story    ON story_views (story_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_group_posts_group    ON group_posts (group_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_reels_author_type    ON reels (author_id, type, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_type_created   ON posts (type, created_at DESC)`,
];

export async function autoMigrate(): Promise<void> {
  let ok = 0;
  let fail = 0;
  for (const stmt of MIGRATIONS) {
    try {
      await db.execute(sql.raw(stmt));
      ok++;
    } catch (err: any) {
      // "column already exists" is expected on repeat boots — ignore
      const msg: string = err?.message ?? "";
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        ok++;
      } else {
        logger.warn({ err: msg, stmt: stmt.slice(0, 80) }, "autoMigrate: non-fatal stmt error");
        fail++;
      }
    }
  }
  logger.info({ ok, fail, total: MIGRATIONS.length }, "autoMigrate: done");
}
