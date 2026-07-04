import { pool } from "@workspace/db";
import { logger } from "./logger.js";

const SEED_USERNAMES = [
  "nexusai",
  "asilbek_dev",
  "malika_art",
  "timur_music",
  "zulfiya_fit",
  "bekzod_travel",
  "nilufar_style",
  "sanjar_tech",
  "testuser",
  "demo_user",
];

// These 8 demo groups were seeded in the same batch as the accounts above but
// have no creator_id (NULL), so they can't be caught via target_users — they
// must be matched by name instead.
const SEED_GROUP_NAMES = [
  "Travel Nomads",
  "AI & Machine Learning",
  "Electronic Music Collective",
  "Uzbekistan Creators",
  "Fitness & Performance",
  "Global Photography",
  "Tech Entrepreneurs",
  "Fashion Forward",
];

// SEED_USERNAMES/SEED_GROUP_NAMES are static, hardcoded constants (not user
// input), so it is safe to embed them directly as SQL array literals. This
// whole script is also multi-statement (temp tables + many DELETEs), which
// node-postgres can only run via the simple query protocol — i.e. without a
// `params` argument at all.
const SEED_USERNAMES_SQL_LITERAL = `ARRAY[${SEED_USERNAMES.map((u) => `'${u}'`).join(",")}]::text[]`;
const SEED_GROUP_NAMES_SQL_LITERAL = `ARRAY[${SEED_GROUP_NAMES.map((g) => `'${g.replace(/'/g, "''")}'`).join(",")}]::text[]`;

const CLEANUP_SQL = `
  CREATE TEMP TABLE target_users AS
    SELECT id FROM users WHERE username = ANY(${SEED_USERNAMES_SQL_LITERAL});

  CREATE TEMP TABLE target_posts AS
    SELECT id FROM posts WHERE author_id IN (SELECT id FROM target_users);

  CREATE TEMP TABLE target_reels AS
    SELECT id FROM reels WHERE author_id IN (SELECT id FROM target_users);

  CREATE TEMP TABLE target_groups AS
    SELECT id FROM groups
    WHERE creator_id IN (SELECT id FROM target_users)
       OR name = ANY(${SEED_GROUP_NAMES_SQL_LITERAL});

  DELETE FROM comment_likes WHERE user_id IN (SELECT id FROM target_users)
    OR comment_id IN (
      SELECT id FROM comments
      WHERE author_id IN (SELECT id FROM target_users)
         OR post_id IN (SELECT id FROM target_posts)
    );

  DELETE FROM story_views WHERE user_id IN (SELECT id FROM target_users)
    OR story_id IN (SELECT id FROM stories WHERE author_id IN (SELECT id FROM target_users));

  DELETE FROM comments WHERE author_id IN (SELECT id FROM target_users)
    OR post_id IN (SELECT id FROM target_posts);

  DELETE FROM post_likes WHERE user_id IN (SELECT id FROM target_users)
    OR post_id IN (SELECT id FROM target_posts);

  DELETE FROM reel_likes WHERE user_id IN (SELECT id FROM target_users)
    OR reel_id IN (SELECT id FROM target_reels);

  DELETE FROM reel_comments WHERE author_id IN (SELECT id FROM target_users);
  DELETE FROM voice_comments WHERE author_id IN (SELECT id FROM target_users);
  DELETE FROM stories WHERE author_id IN (SELECT id FROM target_users);
  DELETE FROM notifications WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM follows WHERE follower_id IN (SELECT id FROM target_users)
    OR following_id IN (SELECT id FROM target_users);
  DELETE FROM group_members WHERE user_id IN (SELECT id FROM target_users)
    OR group_id IN (SELECT id FROM target_groups);
  DELETE FROM challenge_participants WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM challenges WHERE creator_id IN (SELECT id FROM target_users);
  DELETE FROM co_view_members WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM co_view_rooms WHERE host_id IN (SELECT id FROM target_users);
  DELETE FROM content_earnings WHERE author_id IN (SELECT id FROM target_users);
  DELETE FROM content_reports WHERE reporter_id IN (SELECT id FROM target_users);
  DELETE FROM creator_monetization WHERE reviewed_by IN (SELECT id FROM target_users)
    OR user_id IN (SELECT id FROM target_users);
  DELETE FROM creator_plans WHERE creator_id IN (SELECT id FROM target_users);
  DELETE FROM creator_subscriptions WHERE subscriber_id IN (SELECT id FROM target_users)
    OR creator_id IN (SELECT id FROM target_users);
  DELETE FROM live_gifts WHERE receiver_id IN (SELECT id FROM target_users)
    OR sender_id IN (SELECT id FROM target_users);
  DELETE FROM live_streams WHERE host_id IN (SELECT id FROM target_users);
  DELETE FROM moderation_queue WHERE moderator_id IN (SELECT id FROM target_users)
    OR author_id IN (SELECT id FROM target_users);
  DELETE FROM monetization_config WHERE updated_by IN (SELECT id FROM target_users);
  DELETE FROM payment_methods WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM payout_requests WHERE processed_by IN (SELECT id FROM target_users)
    OR user_id IN (SELECT id FROM target_users);
  DELETE FROM premium_config WHERE updated_by IN (SELECT id FROM target_users);
  DELETE FROM product_orders WHERE buyer_id IN (SELECT id FROM target_users)
    OR seller_id IN (SELECT id FROM target_users);
  DELETE FROM product_reviews WHERE reviewer_id IN (SELECT id FROM target_users);
  DELETE FROM products WHERE seller_id IN (SELECT id FROM target_users);
  DELETE FROM quest_progress WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM reel_collaborators WHERE owner_id IN (SELECT id FROM target_users);
  DELETE FROM reel_watch_progress WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM transactions WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM user_coins WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM user_streaks WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM user_titles WHERE user_id IN (SELECT id FROM target_users);
  DELETE FROM wallets WHERE user_id IN (SELECT id FROM target_users);
  UPDATE groups SET pinned_post_id = NULL WHERE pinned_post_id IN (
    SELECT id FROM group_posts WHERE group_id IN (SELECT id FROM target_groups)
  );
  DELETE FROM groups WHERE id IN (SELECT id FROM target_groups);

  DELETE FROM reels WHERE id IN (SELECT id FROM target_reels);
  DELETE FROM posts WHERE id IN (SELECT id FROM target_posts);
  DELETE FROM users WHERE id IN (SELECT id FROM target_users);
`;

let ran = false;

export async function cleanupSeedData(): Promise<void> {
  if (ran) return;
  ran = true;

  const client = await pool.connect();
  try {
    const { rows: existingUsers } = await client.query(
      "SELECT id, username FROM users WHERE username = ANY($1::text[])",
      [SEED_USERNAMES],
    );
    const { rows: existingGroups } = await client.query(
      "SELECT id, name FROM groups WHERE name = ANY($1::text[])",
      [SEED_GROUP_NAMES],
    );
    if (existingUsers.length === 0 && existingGroups.length === 0) {
      logger.info("Seed data cleanup: no seed/demo accounts or groups found, nothing to do");
      return;
    }

    logger.info(
      {
        userCount: existingUsers.length,
        usernames: existingUsers.map((r) => r.username),
        groupCount: existingGroups.length,
        groupNames: existingGroups.map((r) => r.name),
      },
      "Seed data cleanup: removing seed/demo accounts, groups, and their content",
    );

    await client.query("BEGIN");
    await client.query(CLEANUP_SQL);
    await client.query("COMMIT");

    logger.info(
      { userCount: existingUsers.length, groupCount: existingGroups.length },
      "Seed data cleanup: done",
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error({ err }, "Seed data cleanup failed (non-fatal)");
  } finally {
    client.release();
  }
}
