-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reel_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reels" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text NOT NULL,
	"audio_track" text,
	"duration" integer DEFAULT 30,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hls_url" text,
	"hls_status" text DEFAULT 'pending',
	"type" text DEFAULT 'reel' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"media_url" text NOT NULL,
	"media_type" text DEFAULT 'photo' NOT NULL,
	"caption" text,
	"views_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"type" text DEFAULT 'photo' NOT NULL,
	"background_color" text
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"actor_name" text,
	"actor_avatar" text,
	"target_id" integer,
	"target_type" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"cover_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"password_hash" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"is_premium" boolean DEFAULT false NOT NULL,
	"country" text,
	"timezone" text,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp,
	"banned_reason" text,
	"notif_prefs" jsonb,
	"privacy_settings" jsonb,
	"phone" text,
	"ai_usage_count" integer DEFAULT 0 NOT NULL,
	"ghost_until" timestamp,
	"focus_shield" jsonb,
	"aura_color" text,
	"ai_usage_reset_at" date DEFAULT CURRENT_DATE NOT NULL,
	"e2e_public_key" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_key" UNIQUE("phone"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"following_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"content_text" text,
	"author_id" integer,
	"ai_score" real DEFAULT 0 NOT NULL,
	"ai_categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_verdict" text DEFAULT 'clean' NOT NULL,
	"auto_flagged" boolean DEFAULT false NOT NULL,
	"auto_blocked" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderator_id" integer,
	"moderator_note" text,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"reporter_id" integer,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"masked_number" text,
	"holder_name" text,
	"expiry_date" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"payment_method" text,
	"description" text,
	"reference" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"earnings_balance" integer DEFAULT 0 NOT NULL,
	"ad_revenue_balance" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" integer NOT NULL,
	"title" text NOT NULL,
	"thumbnail_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"viewer_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "creator_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"perks" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"creator_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_payment_at" timestamp DEFAULT now() NOT NULL,
	"next_payment_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_gifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"live_stream_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"gift_type" text NOT NULL,
	"gift_emoji" text NOT NULL,
	"coin_value" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"order_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"interaction_type" text NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"tags" text[],
	"category" text,
	"summary" text,
	"sentiment" text,
	"ai_metadata" text,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_analysis_unique" UNIQUE("content_id","content_type")
);
--> statement-breakpoint
CREATE TABLE "voice_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"audio_url" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"waveform_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_coins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_coins_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"google_book_id" text NOT NULL,
	"title" text NOT NULL,
	"authors" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"published_date" text,
	"page_count" integer,
	"categories" text,
	"language" text DEFAULT 'uz',
	"isbn" text,
	"status" text DEFAULT 'want_to_read' NOT NULL,
	"current_page" integer DEFAULT 0,
	"rating" integer,
	"review" text,
	"is_favorite" boolean DEFAULT false,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reel_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"monthly_price_cents" integer DEFAULT 999 NOT NULL,
	"yearly_discount_percent" integer DEFAULT 20 NOT NULL,
	"monthly_stripe_price_id" text,
	"yearly_stripe_price_id" text,
	"stripe_product_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "daily_quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"reward" integer DEFAULT 10 NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_quests_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "quest_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"quest_key" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"claimed_at" timestamp,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quest_progress_unique" UNIQUE("user_id","quest_key","date")
);
--> statement-breakpoint
CREATE TABLE "user_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "co_view_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invite_code" text NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "co_view_rooms_invite_code_key" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "co_view_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anon_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"emoji" text DEFAULT '💬' NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anon_zones_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "anon_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone_id" integer NOT NULL,
	"content" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"parent_id" integer,
	"video_url" text,
	"choice_text" text NOT NULL,
	"choice_emoji" text DEFAULT '👉' NOT NULL,
	"is_root" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_moods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mood" text NOT NULL,
	"energy_level" integer DEFAULT 5 NOT NULL,
	"note" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_twin_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"personality" text,
	"topics" text,
	"bio" text,
	"total_chats" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_twin_config_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "ai_twin_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"twin_owner_id" integer NOT NULL,
	"visitor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_twin_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"verdict" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"explanation" text,
	"sources" text,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fact_checks_post_id_key" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE "credibility_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"score" real DEFAULT 50 NOT NULL,
	"total_checked" integer DEFAULT 0 NOT NULL,
	"true_count" integer DEFAULT 0 NOT NULL,
	"false_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credibility_scores_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "co_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"creator_id" integer NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"canvas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "co_space_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"contribution" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "co_space_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_at" timestamp with time zone,
	"type" text DEFAULT 'text',
	"is_encrypted" boolean DEFAULT false,
	"e2e_nonce" text
);
--> statement-breakpoint
CREATE TABLE "platform_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_deduction_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_revenue_cents" integer NOT NULL,
	"total_expense_cents" integer NOT NULL,
	"net_profit_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monetization_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"revenue_per_mille" integer DEFAULT 50000 NOT NULL,
	"creator_share_percent" integer DEFAULT 70 NOT NULL,
	"min_views_threshold" integer DEFAULT 1000 NOT NULL,
	"video_rate_multiplier" integer DEFAULT 10 NOT NULL,
	"reel_rate_multiplier" integer DEFAULT 12 NOT NULL,
	"music_rate_multiplier" integer DEFAULT 8 NOT NULL,
	"movie_rate_multiplier" integer DEFAULT 20 NOT NULL,
	"min_payout_amount" integer DEFAULT 5000000 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"min_followers" integer DEFAULT 1000 NOT NULL,
	"min_total_views" integer DEFAULT 10000 NOT NULL,
	"min_content_count" integer DEFAULT 10 NOT NULL,
	"auto_approve" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"total_views" integer DEFAULT 0 NOT NULL,
	"monetized_views" integer DEFAULT 0 NOT NULL,
	"gross_earnings" integer DEFAULT 0 NOT NULL,
	"creator_earnings" integer DEFAULT 0 NOT NULL,
	"platform_earnings" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_details" text,
	"admin_note" text,
	"processed_by" integer,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_moderation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer,
	"content_preview" text,
	"author_id" integer,
	"ai_score" numeric(4, 2) DEFAULT '0' NOT NULL,
	"ai_categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_verdict" text DEFAULT 'clean' NOT NULL,
	"engine" text DEFAULT 'hybrid' NOT NULL,
	"action_taken" text DEFAULT 'none' NOT NULL,
	"warning_count_after" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_monetization" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'none' NOT NULL,
	"applied_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ads_enabled" boolean DEFAULT true NOT NULL,
	"super_thanks_enabled" boolean DEFAULT true NOT NULL,
	"membership_enabled" boolean DEFAULT false NOT NULL,
	"donation_min" integer DEFAULT 2000 NOT NULL,
	CONSTRAINT "creator_monetization_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" bigint NOT NULL,
	"original_price" bigint,
	"category" text DEFAULT 'other' NOT NULL,
	"condition" text DEFAULT 'new' NOT NULL,
	"media_urls" text,
	"thumbnail_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"stock" integer DEFAULT 1 NOT NULL,
	"location" text,
	"tags" text,
	"views_count" integer DEFAULT 0 NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" bigint NOT NULL,
	"total_price" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_method" text DEFAULT 'pickup' NOT NULL,
	"delivery_address" text,
	"notes" text,
	"tracking_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"media_url" text,
	"tags" text[],
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"media_urls" text[],
	"overlays" text,
	"audio_name" text,
	"poll_question" text,
	"poll_options" text,
	"mood" text,
	"filter_name" text,
	"scheduled_at" timestamp,
	"hot_take" boolean DEFAULT false,
	"aura_score" integer DEFAULT 0,
	"audio_url" text,
	"audio_trim_start" real,
	"audio_trim_end" real,
	"midnight_only" boolean DEFAULT false NOT NULL,
	"destruct_at" timestamp,
	"geo_lat" real,
	"geo_lng" real,
	"geo_radius_km" integer DEFAULT 0,
	"emotion_lock" boolean DEFAULT false,
	"locked_emotion" text,
	"live_mood_enabled" boolean DEFAULT false,
	"live_mood_score" integer DEFAULT 50,
	"series_name" text,
	"series_order" integer DEFAULT 1,
	"collab_canvas_enabled" boolean DEFAULT false,
	"collab_canvas_id" text,
	"media_verified" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_treasury" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_revenue" bigint DEFAULT 0 NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"total_withdrawn" bigint DEFAULT 0 NOT NULL,
	"premium_revenue" bigint DEFAULT 0 NOT NULL,
	"marketplace_revenue" bigint DEFAULT 0 NOT NULL,
	"gift_revenue" bigint DEFAULT 0 NOT NULL,
	"other_revenue" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"source" text NOT NULL,
	"description" text,
	"reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"avatar_url" text,
	"cover_url" text,
	"members_count" integer DEFAULT 0 NOT NULL,
	"posts_count" integer DEFAULT 0 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"category" text DEFAULT 'general',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"privacy_level" text DEFAULT 'public' NOT NULL,
	"join_type" text DEFAULT 'auto' NOT NULL,
	"group_type" text DEFAULT 'community',
	"icon" text DEFAULT '🌟',
	"theme_color" text DEFAULT '#7857ff',
	"max_members" integer DEFAULT 0,
	"settings" jsonb,
	"creator_id" integer,
	"invite_code" text,
	"pinned_post_id" integer,
	"rules_accepted_count" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"tags_list" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_admin_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ai_confidence" real DEFAULT 0,
	"status" text DEFAULT 'executed' NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_post_likes_post_id_user_id_key" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_votes_post_id_user_id_key" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"post_type" text DEFAULT 'text' NOT NULL,
	"reactions_count" integer DEFAULT 0 NOT NULL,
	"bookmarks_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_post_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_post_comment_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "group_post_comment_likes_comment_id_user_id_key" UNIQUE("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_post_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'heart' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_post_reactions_post_id_user_id_key" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"creator_id" integer NOT NULL,
	"question" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ends_at" timestamp with time zone,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"allow_multiple" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_poll_votes_poll_id_user_id_key" UNIQUE("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_post_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_post_bookmarks_post_id_user_id_key" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_post_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"reporter_id" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_post_reports_post_id_reporter_id_key" UNIQUE("post_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "hot_take_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hot_take_votes_post_id_user_id_key" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "banned_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"reason" text NOT NULL,
	"strikes" integer DEFAULT 1 NOT NULL,
	"permanent" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "banned_ips_ip_key" UNIQUE("ip")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"event_type" text NOT NULL,
	"path" text,
	"payload" text,
	"user_agent" text,
	"user_id" integer,
	"severity" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "infra_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"service_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"auto_pay_enabled" boolean DEFAULT true NOT NULL,
	"last_paid_at" timestamp with time zone,
	"next_due_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "infra_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"cost_id" integer NOT NULL,
	"provider" text NOT NULL,
	"service_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"paid_from" text DEFAULT 'treasury' NOT NULL,
	"notes" text,
	"paid_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "anon_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"content" text NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"name" text NOT NULL,
	"hashtag" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"days" integer DEFAULT 7 NOT NULL,
	"prize_pool" integer DEFAULT 0 NOT NULL,
	"judge_type" text DEFAULT 'vote' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reel_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"invitee_handle" text NOT NULL,
	"permission" text DEFAULT 'edit' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reel_id" integer,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_participants_unique" UNIQUE("challenge_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reel_watch_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reel_id" integer NOT NULL,
	"position_sec" integer DEFAULT 0 NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reel_watch_progress_unique" UNIQUE("user_id","reel_id")
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"xp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_streaks_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "grow_together_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"goal_text" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grow_together_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" integer NOT NULL,
	"user2_id" integer NOT NULL,
	"goal_text" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grow_together_connections_user1_id_user2_id_key" UNIQUE("user1_id","user2_id")
);
--> statement-breakpoint
CREATE TABLE "reel_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reel_id" integer NOT NULL,
	"editor_id" integer NOT NULL,
	"caption" text,
	"tags" text[],
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"uuid" text PRIMARY KEY NOT NULL,
	"cloudinary_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'expo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_user_id_token_key" UNIQUE("user_id","token")
);
--> statement-breakpoint
CREATE TABLE "translation_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"translated" jsonb NOT NULL,
	"cached_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_embeddings" (
	"post_id" integer PRIMARY KEY NOT NULL,
	"embedding" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_interest_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"embedding" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_id" integer NOT NULL,
	"blocked_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"ip" text,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"duration_ms" integer,
	"body_size" integer,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"url" text,
	"user_agent" text,
	"user_id" integer,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" text DEFAULT '❤️' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiber_qalqon_blocks" (
	"ip" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"suspicion" integer DEFAULT 0 NOT NULL,
	"blocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"permanent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiber_qalqon_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"ip" text NOT NULL,
	"detail" text,
	"suspicion" integer
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reel_id_reels_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_plans" ADD CONSTRAINT "creator_plans_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_plan_id_creator_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."creator_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_subscriber_id_users_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gifts" ADD CONSTRAINT "live_gifts_live_stream_id_live_streams_id_fk" FOREIGN KEY ("live_stream_id") REFERENCES "public"."live_streams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gifts" ADD CONSTRAINT "live_gifts_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gifts" ADD CONSTRAINT "live_gifts_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."product_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_comments" ADD CONSTRAINT "voice_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_comments" ADD CONSTRAINT "voice_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_coins" ADD CONSTRAINT "user_coins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_config" ADD CONSTRAINT "premium_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_view_rooms" ADD CONSTRAINT "co_view_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_view_members" ADD CONSTRAINT "co_view_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."co_view_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_view_members" ADD CONSTRAINT "co_view_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_posts" ADD CONSTRAINT "anon_posts_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."anon_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_branches" ADD CONSTRAINT "scenario_branches_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moods" ADD CONSTRAINT "user_moods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_twin_config" ADD CONSTRAINT "ai_twin_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_twin_chats" ADD CONSTRAINT "ai_twin_chats_twin_owner_id_fkey" FOREIGN KEY ("twin_owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_twin_chats" ADD CONSTRAINT "ai_twin_chats_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_twin_messages" ADD CONSTRAINT "ai_twin_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."ai_twin_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_checks" ADD CONSTRAINT "fact_checks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credibility_scores" ADD CONSTRAINT "credibility_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_spaces" ADD CONSTRAINT "co_spaces_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_space_members" ADD CONSTRAINT "co_space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."co_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_space_members" ADD CONSTRAINT "co_space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_space_tasks" ADD CONSTRAINT "co_space_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_space_tasks" ADD CONSTRAINT "co_space_tasks_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."co_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_deduction_requests" ADD CONSTRAINT "expense_deduction_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monetization_config" ADD CONSTRAINT "monetization_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_earnings" ADD CONSTRAINT "content_earnings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_moderation_events" ADD CONSTRAINT "ai_moderation_events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_monetization" ADD CONSTRAINT "creator_monetization_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_monetization" ADD CONSTRAINT "creator_monetization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."group_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."group_post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comment_likes" ADD CONSTRAINT "group_post_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."group_post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comment_likes" ADD CONSTRAINT "group_post_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_reactions" ADD CONSTRAINT "group_post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_reactions" ADD CONSTRAINT "group_post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_polls" ADD CONSTRAINT "group_polls_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_polls" ADD CONSTRAINT "group_polls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_poll_votes" ADD CONSTRAINT "group_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."group_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_poll_votes" ADD CONSTRAINT "group_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_bookmarks" ADD CONSTRAINT "group_post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_bookmarks" ADD CONSTRAINT "group_post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_reports" ADD CONSTRAINT "group_post_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_reports" ADD CONSTRAINT "group_post_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hot_take_votes" ADD CONSTRAINT "hot_take_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hot_take_votes" ADD CONSTRAINT "hot_take_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_questions" ADD CONSTRAINT "anon_questions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_collaborators" ADD CONSTRAINT "reel_collaborators_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_watch_progress" ADD CONSTRAINT "reel_watch_progress_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_watch_progress" ADD CONSTRAINT "reel_watch_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grow_together_goals" ADD CONSTRAINT "grow_together_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grow_together_connections" ADD CONSTRAINT "grow_together_connections_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grow_together_connections" ADD CONSTRAINT "grow_together_connections_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_versions" ADD CONSTRAINT "reel_versions_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_versions" ADD CONSTRAINT "reel_versions_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_embeddings" ADD CONSTRAINT "post_embeddings_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interest_profiles" ADD CONSTRAINT "user_interest_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "comments" USING btree ("post_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_post" ON "post_likes" USING btree ("post_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_post_likes_user" ON "post_likes" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reel_likes_reel" ON "reel_likes" USING btree ("reel_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reel_likes_user" ON "reel_likes" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reels_author" ON "reels" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reels_author_type" ON "reels" USING btree ("author_id" int4_ops,"type" int4_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reels_created" ON "reels" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_reels_views_count" ON "reels" USING btree ("views_count" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stories_author" ON "stories" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stories_created" ON "stories" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_story_views_story" ON "story_views" USING btree ("story_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "idx_follows_follower" ON "follows" USING btree ("follower_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_follows_following" ON "follows" USING btree ("following_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_user" ON "transactions" USING btree ("user_id" timestamp_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_wallet" ON "transactions" USING btree ("wallet_id" timestamp_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_user_interactions_perf" ON "user_interactions" USING btree ("content_type" int4_ops,"interaction_type" timestamp_ops,"content_id" int4_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_interactions_content_idx" ON "user_interactions" USING btree ("content_type" text_ops,"content_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_interactions_user_idx" ON "user_interactions" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "content_analysis_content_idx" ON "content_analysis" USING btree ("content_type" int4_ops,"content_id" text_ops);--> statement-breakpoint
CREATE INDEX "voice_comments_author_idx" ON "voice_comments" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "voice_comments_post_idx" ON "voice_comments" USING btree ("post_id" int4_ops);--> statement-breakpoint
CREATE INDEX "reel_comments_reel_id_idx" ON "reel_comments" USING btree ("reel_id" int4_ops);--> statement-breakpoint
CREATE INDEX "quest_progress_user_date_idx" ON "quest_progress" USING btree ("user_id" int4_ops,"date" int4_ops);--> statement-breakpoint
CREATE INDEX "user_titles_user_idx" ON "user_titles" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "co_view_members_room_idx" ON "co_view_members" USING btree ("room_id" int4_ops);--> statement-breakpoint
CREATE INDEX "anon_posts_zone_idx" ON "anon_posts" USING btree ("zone_id" int4_ops);--> statement-breakpoint
CREATE INDEX "scenarios_creator_idx" ON "scenarios" USING btree ("creator_id" int4_ops);--> statement-breakpoint
CREATE INDEX "branches_scenario_idx" ON "scenario_branches" USING btree ("scenario_id" int4_ops);--> statement-breakpoint
CREATE INDEX "moods_created_idx" ON "user_moods" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "moods_user_idx" ON "user_moods" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "twin_chats_owner_idx" ON "ai_twin_chats" USING btree ("twin_owner_id" int4_ops);--> statement-breakpoint
CREATE INDEX "twin_msgs_chat_idx" ON "ai_twin_messages" USING btree ("chat_id" int4_ops);--> statement-breakpoint
CREATE INDEX "fact_checks_post_idx" ON "fact_checks" USING btree ("post_id" int4_ops);--> statement-breakpoint
CREATE INDEX "co_spaces_category_idx" ON "co_spaces" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "co_spaces_creator_idx" ON "co_spaces" USING btree ("creator_id" int4_ops);--> statement-breakpoint
CREATE INDEX "co_space_members_space_idx" ON "co_space_members" USING btree ("space_id" int4_ops);--> statement-breakpoint
CREATE INDEX "co_space_tasks_space_idx" ON "co_space_tasks" USING btree ("space_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_updated" ON "chat_conversations" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "chat_participants_conv_idx" ON "chat_participants" USING btree ("conversation_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_participants_user" ON "chat_participants" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_conv_idx" ON "chat_messages" USING btree ("conversation_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_sender_created" ON "chat_messages" USING btree ("sender_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "content_earnings_author_idx" ON "content_earnings" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "content_earnings_content_idx" ON "content_earnings" USING btree ("content_type" int4_ops,"content_id" int4_ops);--> statement-breakpoint
CREATE INDEX "payout_requests_status_idx" ON "payout_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "payout_requests_user_idx" ON "payout_requests" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_mod_events_author" ON "ai_moderation_events" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_mod_events_created" ON "ai_moderation_events" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_mod_events_verdict" ON "ai_moderation_events" USING btree ("ai_verdict" text_ops);--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "user_sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "creator_monetization_status_idx" ON "creator_monetization" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_comment_likes_cmt" ON "comment_likes" USING btree ("comment_id" int4_ops,"user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_author" ON "posts" USING btree ("author_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_author_created" ON "posts" USING btree ("author_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_created" ON "posts" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_posts_type_created" ON "posts" USING btree ("type" text_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_ev_email" ON "email_verifications" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_group_posts_group" ON "group_posts" USING btree ("group_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_banned_ips_ip" ON "banned_ips" USING btree ("ip" text_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_ip" ON "security_events" USING btree ("ip" text_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_type" ON "security_events" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "anon_questions_recipient_idx" ON "anon_questions" USING btree ("recipient_id" int4_ops);--> statement-breakpoint
CREATE INDEX "challenges_creator_idx" ON "challenges" USING btree ("creator_id" int4_ops);--> statement-breakpoint
CREATE INDEX "challenges_status_idx" ON "challenges" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "reel_collaborators_owner_idx" ON "reel_collaborators" USING btree ("owner_id" int4_ops);--> statement-breakpoint
CREATE INDEX "challenge_participants_challenge_idx" ON "challenge_participants" USING btree ("challenge_id" int4_ops);--> statement-breakpoint
CREATE INDEX "reel_watch_progress_user_idx" ON "reel_watch_progress" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" USING btree ("blocked_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocker" ON "user_blocks" USING btree ("blocker_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "story_reactions_story_user_uniq" ON "story_reactions" USING btree ("story_id" int4_ops,"user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_kqb_expires" ON "kiber_qalqon_blocks" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_kqe_ip" ON "kiber_qalqon_events" USING btree ("ip" text_ops);--> statement-breakpoint
CREATE INDEX "idx_kqe_ts" ON "kiber_qalqon_events" USING btree ("ts" timestamptz_ops);
*/