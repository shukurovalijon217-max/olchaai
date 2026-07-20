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
  /* ── Missing core tables (Railway fresh DB) ─────────────────── */
  `CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    earnings_balance INTEGER NOT NULL DEFAULT 0,
    ad_revenue_balance INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UZS',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    wallet_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UZS',
    status TEXT NOT NULL DEFAULT 'completed',
    payment_method TEXT,
    description TEXT,
    reference TEXT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS treasury_transactions (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    amount BIGINT NOT NULL,
    source TEXT NOT NULL,
    description TEXT,
    reference TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reels (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT NOT NULL,
    audio_track TEXT,
    duration INTEGER DEFAULT 30,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[],
    hls_url TEXT,
    hls_status TEXT DEFAULT 'pending',
    type TEXT NOT NULL DEFAULT 'reel',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reel_likes (
    id SERIAL PRIMARY KEY,
    reel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reel_comments (
    id SERIAL PRIMARY KEY,
    reel_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reel_collaborators (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    invitee_handle TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'edit',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reel_versions (
    id SERIAL PRIMARY KEY,
    reel_id INTEGER NOT NULL,
    editor_id INTEGER NOT NULL,
    caption TEXT,
    tags TEXT[],
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS reel_watch_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reel_id INTEGER NOT NULL,
    position_sec INTEGER NOT NULL DEFAULT 0,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'photo',
    caption TEXT,
    views_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS story_views (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_blocks (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_coins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    content_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_interest_profiles (
    user_id INTEGER NOT NULL,
    embedding JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_moods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mood TEXT NOT NULL,
    energy_level INTEGER NOT NULL DEFAULT 5,
    note TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_books (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    google_book_id TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    published_date TEXT,
    page_count INTEGER,
    categories TEXT,
    language TEXT DEFAULT 'uz',
    isbn TEXT,
    status TEXT NOT NULL DEFAULT 'want_to_read',
    current_page INTEGER DEFAULT 0,
    rating INTEGER,
    review TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_titles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS scenario_branches (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER NOT NULL,
    parent_id INTEGER,
    video_url TEXT,
    choice_text TEXT NOT NULL,
    choice_emoji TEXT NOT NULL DEFAULT '👉',
    is_root BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS voice_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    audio_url TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    waveform_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
