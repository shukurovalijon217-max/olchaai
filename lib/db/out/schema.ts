import { pgTable, index, foreignKey, serial, integer, text, timestamp, boolean, unique, jsonb, date, real, numeric, varchar, json, bigint, type AnyPgColumn, bigserial, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const comments = pgTable("comments", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	authorId: integer("author_id").notNull(),
	content: text().notNull(),
	likesCount: integer("likes_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_comments_author").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("idx_comments_post").using("btree", table.postId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "comments_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "comments_post_id_posts_id_fk"
		}),
]);

export const postLikes = pgTable("post_likes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_post_likes_post").using("btree", table.postId.asc().nullsLast().op("int4_ops")),
	index("idx_post_likes_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_likes_post_id_posts_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "post_likes_user_id_users_id_fk"
		}),
]);

export const reelLikes = pgTable("reel_likes", {
	id: serial().primaryKey().notNull(),
	reelId: integer("reel_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_reel_likes_reel").using("btree", table.reelId.asc().nullsLast().op("int4_ops")),
	index("idx_reel_likes_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.id],
			name: "reel_likes_reel_id_reels_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reel_likes_user_id_users_id_fk"
		}),
]);

export const reels = pgTable("reels", {
	id: serial().primaryKey().notNull(),
	authorId: integer("author_id").notNull(),
	videoUrl: text("video_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	caption: text().notNull(),
	audioTrack: text("audio_track"),
	duration: integer().default(30),
	likesCount: integer("likes_count").default(0).notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	viewsCount: integer("views_count").default(0).notNull(),
	tags: text().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	hlsUrl: text("hls_url"),
	hlsStatus: text("hls_status").default('pending'),
	type: text().default('reel').notNull(),
}, (table) => [
	index("idx_reels_author").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("idx_reels_author_type").using("btree", table.authorId.asc().nullsLast().op("int4_ops"), table.type.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_reels_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_reels_views_count").using("btree", table.viewsCount.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "reels_author_id_users_id_fk"
		}),
]);

export const stories = pgTable("stories", {
	id: serial().primaryKey().notNull(),
	authorId: integer("author_id").notNull(),
	mediaUrl: text("media_url").notNull(),
	mediaType: text("media_type").default('photo').notNull(),
	caption: text(),
	viewsCount: integer("views_count").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	type: text().default('photo').notNull(),
	backgroundColor: text("background_color"),
}, (table) => [
	index("idx_stories_author").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("idx_stories_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "stories_author_id_users_id_fk"
		}),
]);

export const storyViews = pgTable("story_views", {
	id: serial().primaryKey().notNull(),
	storyId: integer("story_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_story_views_story").using("btree", table.storyId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.id],
			name: "story_views_story_id_stories_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "story_views_user_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	message: text().notNull(),
	actorName: text("actor_name"),
	actorAvatar: text("actor_avatar"),
	targetId: integer("target_id"),
	targetType: text("target_type"),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_user_created").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	displayName: text("display_name").notNull(),
	email: text().notNull(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	coverUrl: text("cover_url"),
	isVerified: boolean("is_verified").default(false).notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	passwordHash: text("password_hash"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	isPremium: boolean("is_premium").default(false).notNull(),
	country: text(),
	timezone: text(),
	warningCount: integer("warning_count").default(0).notNull(),
	isBanned: boolean("is_banned").default(false).notNull(),
	bannedAt: timestamp("banned_at", { mode: 'string' }),
	bannedReason: text("banned_reason"),
	notifPrefs: jsonb("notif_prefs"),
	privacySettings: jsonb("privacy_settings"),
	phone: text(),
	aiUsageCount: integer("ai_usage_count").default(0).notNull(),
	ghostUntil: timestamp("ghost_until", { mode: 'string' }),
	focusShield: jsonb("focus_shield"),
	auraColor: text("aura_color"),
	aiUsageResetAt: date("ai_usage_reset_at").default(sql`CURRENT_DATE`).notNull(),
	e2EPublicKey: text("e2e_public_key"),
}, (table) => [
	index("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
	unique("users_phone_key").on(table.phone),
	unique("users_phone_unique").on(table.phone),
]);

export const follows = pgTable("follows", {
	id: serial().primaryKey().notNull(),
	followerId: integer("follower_id").notNull(),
	followingId: integer("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_follows_follower").using("btree", table.followerId.asc().nullsLast().op("int4_ops")),
	index("idx_follows_following").using("btree", table.followingId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "follows_following_id_users_id_fk"
		}),
]);

export const groupMembers = pgTable("group_members", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
	role: text().default('member').notNull(),
	isMuted: boolean("is_muted").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_members_group_id_groups_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_members_user_id_users_id_fk"
		}),
]);

export const moderationQueue = pgTable("moderation_queue", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	contentText: text("content_text"),
	authorId: integer("author_id"),
	aiScore: real("ai_score").default(0).notNull(),
	aiCategories: jsonb("ai_categories").default({}).notNull(),
	aiVerdict: text("ai_verdict").default('clean').notNull(),
	autoFlagged: boolean("auto_flagged").default(false).notNull(),
	autoBlocked: boolean("auto_blocked").default(false).notNull(),
	status: text().default('pending').notNull(),
	moderatorId: integer("moderator_id"),
	moderatorNote: text("moderator_note"),
	reportCount: integer("report_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "moderation_queue_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.moderatorId],
			foreignColumns: [users.id],
			name: "moderation_queue_moderator_id_users_id_fk"
		}),
]);

export const contentReports = pgTable("content_reports", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	reporterId: integer("reporter_id"),
	reason: text().notNull(),
	description: text(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "content_reports_reporter_id_users_id_fk"
		}),
]);

export const paymentMethods = pgTable("payment_methods", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	maskedNumber: text("masked_number"),
	holderName: text("holder_name"),
	expiryDate: text("expiry_date"),
	isDefault: boolean("is_default").default(false).notNull(),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payment_methods_user_id_users_id_fk"
		}),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	walletId: integer("wallet_id").notNull(),
	type: text().notNull(),
	amount: integer().notNull(),
	currency: text().default('UZS').notNull(),
	status: text().default('completed').notNull(),
	paymentMethod: text("payment_method"),
	description: text(),
	reference: text(),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_transactions_user").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	index("idx_transactions_wallet").using("btree", table.walletId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.walletId],
			foreignColumns: [wallets.id],
			name: "transactions_wallet_id_wallets_id_fk"
		}),
]);

export const platformSettings = pgTable("platform_settings", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("platform_settings_key_unique").on(table.key),
]);

export const wallets = pgTable("wallets", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	balance: integer().default(0).notNull(),
	earningsBalance: integer("earnings_balance").default(0).notNull(),
	adRevenueBalance: integer("ad_revenue_balance").default(0).notNull(),
	currency: text().default('UZS').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wallets_user_id_users_id_fk"
		}),
	unique("wallets_user_id_unique").on(table.userId),
]);

export const liveStreams = pgTable("live_streams", {
	id: serial().primaryKey().notNull(),
	hostId: integer("host_id").notNull(),
	title: text().notNull(),
	thumbnailUrl: text("thumbnail_url"),
	status: text().default('active').notNull(),
	viewerCount: integer("viewer_count").default(0).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [users.id],
			name: "live_streams_host_id_users_id_fk"
		}),
]);

export const creatorPlans = pgTable("creator_plans", {
	id: serial().primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	name: text().notNull(),
	description: text(),
	price: integer().notNull(),
	perks: text(),
	isActive: boolean("is_active").default(true).notNull(),
	subscriberCount: integer("subscriber_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "creator_plans_creator_id_users_id_fk"
		}),
]);

export const creatorSubscriptions = pgTable("creator_subscriptions", {
	id: serial().primaryKey().notNull(),
	subscriberId: integer("subscriber_id").notNull(),
	creatorId: integer("creator_id").notNull(),
	planId: integer("plan_id").notNull(),
	status: text().default('active').notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	lastPaymentAt: timestamp("last_payment_at", { mode: 'string' }).defaultNow().notNull(),
	nextPaymentAt: timestamp("next_payment_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "creator_subscriptions_creator_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [creatorPlans.id],
			name: "creator_subscriptions_plan_id_creator_plans_id_fk"
		}),
	foreignKey({
			columns: [table.subscriberId],
			foreignColumns: [users.id],
			name: "creator_subscriptions_subscriber_id_users_id_fk"
		}),
]);

export const liveGifts = pgTable("live_gifts", {
	id: serial().primaryKey().notNull(),
	liveStreamId: integer("live_stream_id").notNull(),
	senderId: integer("sender_id").notNull(),
	receiverId: integer("receiver_id").notNull(),
	giftType: text("gift_type").notNull(),
	giftEmoji: text("gift_emoji").notNull(),
	coinValue: integer("coin_value").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.liveStreamId],
			foreignColumns: [liveStreams.id],
			name: "live_gifts_live_stream_id_live_streams_id_fk"
		}),
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "live_gifts_receiver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "live_gifts_sender_id_users_id_fk"
		}),
]);

export const productReviews = pgTable("product_reviews", {
	id: serial().primaryKey().notNull(),
	reviewerId: integer("reviewer_id").notNull(),
	productId: integer("product_id").notNull(),
	orderId: integer("order_id"),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [productOrders.id],
			name: "product_reviews_order_id_product_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_reviews_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.reviewerId],
			foreignColumns: [users.id],
			name: "product_reviews_reviewer_id_users_id_fk"
		}),
]);

export const userInteractions = pgTable("user_interactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	interactionType: text("interaction_type").notNull(),
	durationMs: integer("duration_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_interactions_perf").using("btree", table.contentType.asc().nullsLast().op("int4_ops"), table.interactionType.asc().nullsLast().op("timestamp_ops"), table.contentId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("user_interactions_content_idx").using("btree", table.contentType.asc().nullsLast().op("text_ops"), table.contentId.asc().nullsLast().op("text_ops")),
	index("user_interactions_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const contentAnalysis = pgTable("content_analysis", {
	id: serial().primaryKey().notNull(),
	contentId: integer("content_id").notNull(),
	contentType: text("content_type").notNull(),
	tags: text().array(),
	category: text(),
	summary: text(),
	sentiment: text(),
	aiMetadata: text("ai_metadata"),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("content_analysis_content_idx").using("btree", table.contentType.asc().nullsLast().op("int4_ops"), table.contentId.asc().nullsLast().op("text_ops")),
	unique("content_analysis_unique").on(table.contentId, table.contentType),
]);

export const voiceComments = pgTable("voice_comments", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	authorId: integer("author_id").notNull(),
	audioUrl: text("audio_url").notNull(),
	durationMs: integer("duration_ms").default(0).notNull(),
	waveformData: text("waveform_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("voice_comments_author_idx").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("voice_comments_post_idx").using("btree", table.postId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "voice_comments_author_id_fkey"
		}),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "voice_comments_post_id_fkey"
		}).onDelete("cascade"),
]);

export const userCoins = pgTable("user_coins", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	balance: integer().default(0).notNull(),
	totalEarned: integer("total_earned").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_coins_user_id_fkey"
		}),
	unique("user_coins_user_id_key").on(table.userId),
]);

export const userBooks = pgTable("user_books", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	googleBookId: text("google_book_id").notNull(),
	title: text().notNull(),
	authors: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	publishedDate: text("published_date"),
	pageCount: integer("page_count"),
	categories: text(),
	language: text().default('uz'),
	isbn: text(),
	status: text().default('want_to_read').notNull(),
	currentPage: integer("current_page").default(0),
	rating: integer(),
	review: text(),
	isFavorite: boolean("is_favorite").default(false),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_books_user_id_fkey"
		}).onDelete("cascade"),
]);

export const reelComments = pgTable("reel_comments", {
	id: serial().primaryKey().notNull(),
	reelId: integer("reel_id").notNull(),
	authorId: integer("author_id").notNull(),
	content: text().notNull(),
	likesCount: integer("likes_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reel_comments_reel_id_idx").using("btree", table.reelId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "reel_comments_author_id_fkey"
		}),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.id],
			name: "reel_comments_reel_id_fkey"
		}).onDelete("cascade"),
]);

export const premiumConfig = pgTable("premium_config", {
	id: integer().default(1).primaryKey().notNull(),
	monthlyPriceCents: integer("monthly_price_cents").default(999).notNull(),
	yearlyDiscountPercent: integer("yearly_discount_percent").default(20).notNull(),
	monthlyStripePriceId: text("monthly_stripe_price_id"),
	yearlyStripePriceId: text("yearly_stripe_price_id"),
	stripeProductId: text("stripe_product_id"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	updatedBy: integer("updated_by"),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "premium_config_updated_by_fkey"
		}),
]);

export const dailyQuests = pgTable("daily_quests", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	reward: integer().default(10).notNull(),
	target: integer().default(1).notNull(),
	type: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("daily_quests_key_key").on(table.key),
]);

export const questProgress = pgTable("quest_progress", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	questKey: text("quest_key").notNull(),
	progress: integer().default(0).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	date: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("quest_progress_user_date_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "quest_progress_user_id_fkey"
		}),
	unique("quest_progress_unique").on(table.userId, table.questKey, table.date),
]);

export const userTitles = pgTable("user_titles", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_titles_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_titles_user_id_fkey"
		}),
]);

export const aiConversations = pgTable("ai_conversations", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: integer("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_conversations_user_id_fkey"
		}).onDelete("cascade"),
]);

export const aiMessages = pgTable("ai_messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "ai_messages_conversation_id_fkey"
		}).onDelete("cascade"),
]);

export const coViewRooms = pgTable("co_view_rooms", {
	id: serial().primaryKey().notNull(),
	hostId: integer("host_id").notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	status: text().default('active').notNull(),
	inviteCode: text("invite_code").notNull(),
	memberCount: integer("member_count").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [users.id],
			name: "co_view_rooms_host_id_fkey"
		}),
	unique("co_view_rooms_invite_code_key").on(table.inviteCode),
]);

export const coViewMembers = pgTable("co_view_members", {
	id: serial().primaryKey().notNull(),
	roomId: integer("room_id").notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("co_view_members_room_idx").using("btree", table.roomId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [coViewRooms.id],
			name: "co_view_members_room_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "co_view_members_user_id_fkey"
		}),
]);

export const anonZones = pgTable("anon_zones", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	topic: text().notNull(),
	description: text(),
	emoji: text().default('💬').notNull(),
	postCount: integer("post_count").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("anon_zones_slug_key").on(table.slug),
]);

export const anonPosts = pgTable("anon_posts", {
	id: serial().primaryKey().notNull(),
	zoneId: integer("zone_id").notNull(),
	content: text().notNull(),
	likes: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("anon_posts_zone_idx").using("btree", table.zoneId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.zoneId],
			foreignColumns: [anonZones.id],
			name: "anon_posts_zone_id_fkey"
		}).onDelete("cascade"),
]);

export const scenarios = pgTable("scenarios", {
	id: serial().primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	title: text().notNull(),
	description: text(),
	thumbnail: text(),
	isPublished: boolean("is_published").default(false).notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("scenarios_creator_idx").using("btree", table.creatorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "scenarios_creator_id_fkey"
		}).onDelete("cascade"),
]);

export const scenarioBranches = pgTable("scenario_branches", {
	id: serial().primaryKey().notNull(),
	scenarioId: integer("scenario_id").notNull(),
	parentId: integer("parent_id"),
	videoUrl: text("video_url"),
	choiceText: text("choice_text").notNull(),
	choiceEmoji: text("choice_emoji").default('👉').notNull(),
	isRoot: boolean("is_root").default(false).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("branches_scenario_idx").using("btree", table.scenarioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.scenarioId],
			foreignColumns: [scenarios.id],
			name: "scenario_branches_scenario_id_fkey"
		}).onDelete("cascade"),
]);

export const userMoods = pgTable("user_moods", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	mood: text().notNull(),
	energyLevel: integer("energy_level").default(5).notNull(),
	note: text(),
	isPublic: boolean("is_public").default(true).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("moods_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("moods_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_moods_user_id_fkey"
		}).onDelete("cascade"),
]);

export const aiTwinConfig = pgTable("ai_twin_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	isEnabled: boolean("is_enabled").default(false).notNull(),
	personality: text(),
	topics: text(),
	bio: text(),
	totalChats: integer("total_chats").default(0).notNull(),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_twin_config_user_id_fkey"
		}).onDelete("cascade"),
	unique("ai_twin_config_user_id_key").on(table.userId),
]);

export const aiTwinChats = pgTable("ai_twin_chats", {
	id: serial().primaryKey().notNull(),
	twinOwnerId: integer("twin_owner_id").notNull(),
	visitorId: integer("visitor_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("twin_chats_owner_idx").using("btree", table.twinOwnerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.twinOwnerId],
			foreignColumns: [users.id],
			name: "ai_twin_chats_twin_owner_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.visitorId],
			foreignColumns: [users.id],
			name: "ai_twin_chats_visitor_id_fkey"
		}).onDelete("cascade"),
]);

export const aiTwinMessages = pgTable("ai_twin_messages", {
	id: serial().primaryKey().notNull(),
	chatId: integer("chat_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("twin_msgs_chat_idx").using("btree", table.chatId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [aiTwinChats.id],
			name: "ai_twin_messages_chat_id_fkey"
		}).onDelete("cascade"),
]);

export const factChecks = pgTable("fact_checks", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	verdict: text().notNull(),
	confidence: real().default(0).notNull(),
	explanation: text(),
	sources: text(),
	checkedAt: timestamp("checked_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("fact_checks_post_idx").using("btree", table.postId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "fact_checks_post_id_fkey"
		}).onDelete("cascade"),
	unique("fact_checks_post_id_key").on(table.postId),
]);

export const credibilityScores = pgTable("credibility_scores", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	score: real().default(50).notNull(),
	totalChecked: integer("total_checked").default(0).notNull(),
	trueCount: integer("true_count").default(0).notNull(),
	falseCount: integer("false_count").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "credibility_scores_user_id_fkey"
		}).onDelete("cascade"),
	unique("credibility_scores_user_id_key").on(table.userId),
]);

export const coSpaces = pgTable("co_spaces", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().default('general').notNull(),
	creatorId: integer("creator_id").notNull(),
	memberCount: integer("member_count").default(1).notNull(),
	status: text().default('open').notNull(),
	canvas: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("co_spaces_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("co_spaces_creator_idx").using("btree", table.creatorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "co_spaces_creator_id_fkey"
		}).onDelete("cascade"),
]);

export const coSpaceMembers = pgTable("co_space_members", {
	id: serial().primaryKey().notNull(),
	spaceId: integer("space_id").notNull(),
	userId: integer("user_id").notNull(),
	role: text().default('member').notNull(),
	contribution: integer().default(0).notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("co_space_members_space_idx").using("btree", table.spaceId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [coSpaces.id],
			name: "co_space_members_space_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "co_space_members_user_id_fkey"
		}).onDelete("cascade"),
]);

export const coSpaceTasks = pgTable("co_space_tasks", {
	id: serial().primaryKey().notNull(),
	spaceId: integer("space_id").notNull(),
	title: text().notNull(),
	description: text(),
	assigneeId: integer("assignee_id"),
	status: text().default('open').notNull(),
	priority: text().default('medium').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("co_space_tasks_space_idx").using("btree", table.spaceId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "co_space_tasks_assignee_id_fkey"
		}),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [coSpaces.id],
			name: "co_space_tasks_space_id_fkey"
		}).onDelete("cascade"),
]);

export const chatConversations = pgTable("chat_conversations", {
	id: serial().primaryKey().notNull(),
	lastMessage: text("last_message"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chat_conversations_updated").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const chatParticipants = pgTable("chat_participants", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	userId: integer("user_id").notNull(),
}, (table) => [
	index("chat_participants_conv_idx").using("btree", table.conversationId.asc().nullsLast().op("int4_ops")),
	index("idx_chat_participants_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_participants_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_participants_user_id_fkey"
		}).onDelete("cascade"),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	senderId: integer("sender_id").notNull(),
	content: text().notNull(),
	mediaUrl: text("media_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	type: text().default('text'),
	isEncrypted: boolean("is_encrypted").default(false),
	e2ENonce: text("e2e_nonce"),
}, (table) => [
	index("chat_messages_conv_idx").using("btree", table.conversationId.asc().nullsLast().op("int4_ops")),
	index("idx_chat_messages_sender_created").using("btree", table.senderId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_messages_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "chat_messages_sender_id_fkey"
		}).onDelete("cascade"),
]);

export const platformExpenses = pgTable("platform_expenses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	amountCents: integer("amount_cents").notNull(),
	currency: text().default('USD').notNull(),
	period: text().default('monthly').notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const expenseDeductionRequests = pgTable("expense_deduction_requests", {
	id: serial().primaryKey().notNull(),
	totalRevenueCents: integer("total_revenue_cents").notNull(),
	totalExpenseCents: integer("total_expense_cents").notNull(),
	netProfitCents: integer("net_profit_cents").notNull(),
	status: text().default('pending').notNull(),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "expense_deduction_requests_approved_by_fkey"
		}).onDelete("set null"),
]);

export const monetizationConfig = pgTable("monetization_config", {
	id: serial().primaryKey().notNull(),
	enabled: boolean().default(true).notNull(),
	revenuePerMille: integer("revenue_per_mille").default(50000).notNull(),
	creatorSharePercent: integer("creator_share_percent").default(70).notNull(),
	minViewsThreshold: integer("min_views_threshold").default(1000).notNull(),
	videoRateMultiplier: integer("video_rate_multiplier").default(10).notNull(),
	reelRateMultiplier: integer("reel_rate_multiplier").default(12).notNull(),
	musicRateMultiplier: integer("music_rate_multiplier").default(8).notNull(),
	movieRateMultiplier: integer("movie_rate_multiplier").default(20).notNull(),
	minPayoutAmount: integer("min_payout_amount").default(5000000).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	updatedBy: integer("updated_by"),
	minFollowers: integer("min_followers").default(1000).notNull(),
	minTotalViews: integer("min_total_views").default(10000).notNull(),
	minContentCount: integer("min_content_count").default(10).notNull(),
	autoApprove: boolean("auto_approve").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "monetization_config_updated_by_fkey"
		}),
]);

export const contentEarnings = pgTable("content_earnings", {
	id: serial().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	authorId: integer("author_id").notNull(),
	totalViews: integer("total_views").default(0).notNull(),
	monetizedViews: integer("monetized_views").default(0).notNull(),
	grossEarnings: integer("gross_earnings").default(0).notNull(),
	creatorEarnings: integer("creator_earnings").default(0).notNull(),
	platformEarnings: integer("platform_earnings").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("content_earnings_author_idx").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("content_earnings_content_idx").using("btree", table.contentType.asc().nullsLast().op("int4_ops"), table.contentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "content_earnings_author_id_fkey"
		}),
]);

export const payoutRequests = pgTable("payout_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amount: integer().notNull(),
	status: text().default('pending').notNull(),
	paymentMethod: text("payment_method"),
	paymentDetails: text("payment_details"),
	adminNote: text("admin_note"),
	processedBy: integer("processed_by"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payout_requests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("payout_requests_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "payout_requests_processed_by_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payout_requests_user_id_fkey"
		}),
]);

export const aiModerationEvents = pgTable("ai_moderation_events", {
	id: serial().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id"),
	contentPreview: text("content_preview"),
	authorId: integer("author_id"),
	aiScore: numeric("ai_score", { precision: 4, scale:  2 }).default('0').notNull(),
	aiCategories: jsonb("ai_categories").default({}).notNull(),
	aiVerdict: text("ai_verdict").default('clean').notNull(),
	engine: text().default('hybrid').notNull(),
	actionTaken: text("action_taken").default('none').notNull(),
	warningCountAfter: integer("warning_count_after").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_mod_events_author").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("idx_ai_mod_events_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_ai_mod_events_verdict").using("btree", table.aiVerdict.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "ai_moderation_events_author_id_fkey"
		}).onDelete("set null"),
]);

export const userSessions = pgTable("user_sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const creatorMonetization = pgTable("creator_monetization", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	status: text().default('none').notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewedBy: integer("reviewed_by"),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	adsEnabled: boolean("ads_enabled").default(true).notNull(),
	superThanksEnabled: boolean("super_thanks_enabled").default(true).notNull(),
	membershipEnabled: boolean("membership_enabled").default(false).notNull(),
	donationMin: integer("donation_min").default(2000).notNull(),
}, (table) => [
	index("creator_monetization_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "creator_monetization_reviewed_by_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "creator_monetization_user_id_fkey"
		}),
	unique("creator_monetization_user_id_key").on(table.userId),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	sellerId: integer("seller_id").notNull(),
	title: text().notNull(),
	description: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	price: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	originalPrice: bigint("original_price", { mode: "number" }),
	category: text().default('other').notNull(),
	condition: text().default('new').notNull(),
	mediaUrls: text("media_urls"),
	thumbnailUrl: text("thumbnail_url"),
	status: text().default('active').notNull(),
	stock: integer().default(1).notNull(),
	location: text(),
	tags: text(),
	viewsCount: integer("views_count").default(0).notNull(),
	ordersCount: integer("orders_count").default(0).notNull(),
	rating: integer().default(0).notNull(),
	reviewsCount: integer("reviews_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "products_seller_id_users_id_fk"
		}),
]);

export const productOrders = pgTable("product_orders", {
	id: serial().primaryKey().notNull(),
	buyerId: integer("buyer_id").notNull(),
	sellerId: integer("seller_id").notNull(),
	productId: integer("product_id").notNull(),
	quantity: integer().default(1).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPrice: bigint("total_price", { mode: "number" }).notNull(),
	status: text().default('pending').notNull(),
	deliveryMethod: text("delivery_method").default('pickup').notNull(),
	deliveryAddress: text("delivery_address"),
	notes: text(),
	trackingInfo: text("tracking_info"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [users.id],
			name: "product_orders_buyer_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_orders_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [users.id],
			name: "product_orders_seller_id_users_id_fk"
		}),
]);

export const commentLikes = pgTable("comment_likes", {
	id: serial().primaryKey().notNull(),
	commentId: integer("comment_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_comment_likes_cmt").using("btree", table.commentId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [comments.id],
			name: "comment_likes_comment_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comment_likes_user_id_fkey"
		}),
]);

export const posts = pgTable("posts", {
	id: serial().primaryKey().notNull(),
	authorId: integer("author_id").notNull(),
	content: text().notNull(),
	type: text().default('text').notNull(),
	mediaUrl: text("media_url"),
	tags: text().array(),
	likesCount: integer("likes_count").default(0).notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	sharesCount: integer("shares_count").default(0).notNull(),
	isFlagged: boolean("is_flagged").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	mediaUrls: text("media_urls").array(),
	overlays: text(),
	audioName: text("audio_name"),
	pollQuestion: text("poll_question"),
	pollOptions: text("poll_options"),
	mood: text(),
	filterName: text("filter_name"),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	hotTake: boolean("hot_take").default(false),
	auraScore: integer("aura_score").default(0),
	audioUrl: text("audio_url"),
	audioTrimStart: real("audio_trim_start"),
	audioTrimEnd: real("audio_trim_end"),
	midnightOnly: boolean("midnight_only").default(false).notNull(),
	destructAt: timestamp("destruct_at", { mode: 'string' }),
	geoLat: real("geo_lat"),
	geoLng: real("geo_lng"),
	geoRadiusKm: integer("geo_radius_km").default(0),
	emotionLock: boolean("emotion_lock").default(false),
	lockedEmotion: text("locked_emotion"),
	liveMoodEnabled: boolean("live_mood_enabled").default(false),
	liveMoodScore: integer("live_mood_score").default(50),
	seriesName: text("series_name"),
	seriesOrder: integer("series_order").default(1),
	collabCanvasEnabled: boolean("collab_canvas_enabled").default(false),
	collabCanvasId: text("collab_canvas_id"),
	mediaVerified: boolean("media_verified").default(true).notNull(),
}, (table) => [
	index("idx_posts_author").using("btree", table.authorId.asc().nullsLast().op("int4_ops")),
	index("idx_posts_author_created").using("btree", table.authorId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	index("idx_posts_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_posts_type_created").using("btree", table.type.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "posts_author_id_users_id_fk"
		}),
]);

export const platformTreasury = pgTable("platform_treasury", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalRevenue: bigint("total_revenue", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	availableBalance: bigint("available_balance", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	premiumRevenue: bigint("premium_revenue", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	marketplaceRevenue: bigint("marketplace_revenue", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	giftRevenue: bigint("gift_revenue", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	otherRevenue: bigint("other_revenue", { mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const treasuryTransactions = pgTable("treasury_transactions", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amount: bigint({ mode: "number" }).notNull(),
	source: text().notNull(),
	description: text(),
	reference: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const groups = pgTable("groups", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	avatarUrl: text("avatar_url"),
	coverUrl: text("cover_url"),
	membersCount: integer("members_count").default(0).notNull(),
	postsCount: integer("posts_count").default(0).notNull(),
	isPrivate: boolean("is_private").default(false).notNull(),
	category: text().default('general'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	privacyLevel: text("privacy_level").default('public').notNull(),
	joinType: text("join_type").default('auto').notNull(),
	groupType: text("group_type").default('community'),
	icon: text().default('🌟'),
	themeColor: text("theme_color").default('#7857ff'),
	maxMembers: integer("max_members").default(0),
	settings: jsonb(),
	creatorId: integer("creator_id"),
	inviteCode: text("invite_code"),
	pinnedPostId: integer("pinned_post_id"),
	rulesAcceptedCount: integer("rules_accepted_count").default(0).notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	tagsList: jsonb("tags_list").default([]),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "groups_creator_id_fkey"
		}),
	foreignKey({
			columns: [table.pinnedPostId],
			foreignColumns: [groupPosts.id],
			name: "groups_pinned_post_id_fkey"
		}).onDelete("set null"),
]);

export const aiAdminActions = pgTable("ai_admin_actions", {
	id: serial().primaryKey().notNull(),
	actionType: text("action_type").notNull(),
	targetType: text("target_type").notNull(),
	targetId: integer("target_id"),
	reason: text(),
	details: jsonb().default({}),
	aiConfidence: real("ai_confidence").default(0),
	status: text().default('executed').notNull(),
	executedAt: timestamp("executed_at", { mode: 'string' }).defaultNow().notNull(),
});

export const groupPostLikes = pgTable("group_post_likes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [groupPosts.id],
			name: "group_post_likes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_post_likes_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_post_likes_post_id_user_id_key").on(table.postId, table.userId),
]);

export const emailVerifications = pgTable("email_verifications", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	otp: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	verified: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ev_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const postVotes = pgTable("post_votes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	optionIndex: integer("option_index").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_votes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "post_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("post_votes_post_id_user_id_key").on(table.postId, table.userId),
]);

export const groupPosts = pgTable("group_posts", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	authorId: integer("author_id").notNull(),
	content: text().notNull(),
	mediaUrl: text("media_url"),
	likesCount: integer("likes_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	postType: text("post_type").default('text').notNull(),
	reactionsCount: integer("reactions_count").default(0).notNull(),
	bookmarksCount: integer("bookmarks_count").default(0).notNull(),
}, (table) => [
	index("idx_group_posts_group").using("btree", table.groupId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "group_posts_author_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_posts_group_id_fkey"
		}).onDelete("cascade"),
]);

export const groupPostComments = pgTable("group_post_comments", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	authorId: integer("author_id").notNull(),
	parentId: integer("parent_id"),
	content: text().notNull(),
	likesCount: integer("likes_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "group_post_comments_author_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "group_post_comments_parent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [groupPosts.id],
			name: "group_post_comments_post_id_fkey"
		}).onDelete("cascade"),
]);

export const groupPostCommentLikes = pgTable("group_post_comment_likes", {
	id: serial().primaryKey().notNull(),
	commentId: integer("comment_id").notNull(),
	userId: integer("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [groupPostComments.id],
			name: "group_post_comment_likes_comment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_post_comment_likes_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_post_comment_likes_comment_id_user_id_key").on(table.commentId, table.userId),
]);

export const groupPostReactions = pgTable("group_post_reactions", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	reactionType: text("reaction_type").default('heart').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [groupPosts.id],
			name: "group_post_reactions_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_post_reactions_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_post_reactions_post_id_user_id_key").on(table.postId, table.userId),
]);

export const groupPolls = pgTable("group_polls", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	creatorId: integer("creator_id").notNull(),
	question: text().notNull(),
	options: jsonb().default([]).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }),
	isAnonymous: boolean("is_anonymous").default(false).notNull(),
	allowMultiple: boolean("allow_multiple").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "group_polls_creator_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_polls_group_id_fkey"
		}).onDelete("cascade"),
]);

export const groupPollVotes = pgTable("group_poll_votes", {
	id: serial().primaryKey().notNull(),
	pollId: integer("poll_id").notNull(),
	userId: integer("user_id").notNull(),
	optionIndex: integer("option_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pollId],
			foreignColumns: [groupPolls.id],
			name: "group_poll_votes_poll_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_poll_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_poll_votes_poll_id_user_id_key").on(table.pollId, table.userId),
]);

export const groupPostBookmarks = pgTable("group_post_bookmarks", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [groupPosts.id],
			name: "group_post_bookmarks_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_post_bookmarks_user_id_fkey"
		}).onDelete("cascade"),
	unique("group_post_bookmarks_post_id_user_id_key").on(table.postId, table.userId),
]);

export const groupPostReports = pgTable("group_post_reports", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	reporterId: integer("reporter_id").notNull(),
	reason: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [groupPosts.id],
			name: "group_post_reports_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "group_post_reports_reporter_id_fkey"
		}).onDelete("cascade"),
	unique("group_post_reports_post_id_reporter_id_key").on(table.postId, table.reporterId),
]);

export const hotTakeVotes = pgTable("hot_take_votes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	userId: integer("user_id").notNull(),
	vote: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "hot_take_votes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "hot_take_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("hot_take_votes_post_id_user_id_key").on(table.postId, table.userId),
]);

export const bannedIps = pgTable("banned_ips", {
	id: serial().primaryKey().notNull(),
	ip: text().notNull(),
	reason: text().notNull(),
	strikes: integer().default(1).notNull(),
	permanent: boolean().default(false).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_banned_ips_ip").using("btree", table.ip.asc().nullsLast().op("text_ops")),
	unique("banned_ips_ip_key").on(table.ip),
]);

export const securityEvents = pgTable("security_events", {
	id: serial().primaryKey().notNull(),
	ip: text().notNull(),
	eventType: text("event_type").notNull(),
	path: text(),
	payload: text(),
	userAgent: text("user_agent"),
	userId: integer("user_id"),
	severity: text().default('medium').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_security_events_ip").using("btree", table.ip.asc().nullsLast().op("text_ops")),
	index("idx_security_events_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
]);

export const infraCosts = pgTable("infra_costs", {
	id: serial().primaryKey().notNull(),
	provider: text().notNull(),
	serviceName: text("service_name").notNull(),
	amountCents: integer("amount_cents").notNull(),
	currency: text().default('USD').notNull(),
	billingCycle: text("billing_cycle").default('monthly').notNull(),
	autoPayEnabled: boolean("auto_pay_enabled").default(true).notNull(),
	lastPaidAt: timestamp("last_paid_at", { withTimezone: true, mode: 'string' }),
	nextDueAt: timestamp("next_due_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const infraPayments = pgTable("infra_payments", {
	id: serial().primaryKey().notNull(),
	costId: integer("cost_id").notNull(),
	provider: text().notNull(),
	serviceName: text("service_name").notNull(),
	amountCents: integer("amount_cents").notNull(),
	status: text().default('paid').notNull(),
	paidFrom: text("paid_from").default('treasury').notNull(),
	notes: text(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const anonQuestions = pgTable("anon_questions", {
	id: serial().primaryKey().notNull(),
	recipientId: integer("recipient_id").notNull(),
	content: text().notNull(),
	answer: text(),
	answeredAt: timestamp("answered_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("anon_questions_recipient_idx").using("btree", table.recipientId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "anon_questions_recipient_id_fkey"
		}).onDelete("cascade"),
]);

export const challenges = pgTable("challenges", {
	id: serial().primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	name: text().notNull(),
	hashtag: text().notNull(),
	category: text().notNull(),
	description: text(),
	days: integer().default(7).notNull(),
	prizePool: integer("prize_pool").default(0).notNull(),
	judgeType: text("judge_type").default('vote').notNull(),
	status: text().default('active').notNull(),
	settings: jsonb().default({}).notNull(),
	startsAt: timestamp("starts_at", { mode: 'string' }).defaultNow().notNull(),
	endsAt: timestamp("ends_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("challenges_creator_idx").using("btree", table.creatorId.asc().nullsLast().op("int4_ops")),
	index("challenges_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "challenges_creator_id_fkey"
		}),
]);

export const reelCollaborators = pgTable("reel_collaborators", {
	id: serial().primaryKey().notNull(),
	ownerId: integer("owner_id").notNull(),
	inviteeHandle: text("invitee_handle").notNull(),
	permission: text().default('edit').notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reel_collaborators_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "reel_collaborators_owner_id_fkey"
		}),
]);

export const challengeParticipants = pgTable("challenge_participants", {
	id: serial().primaryKey().notNull(),
	challengeId: integer("challenge_id").notNull(),
	userId: integer("user_id").notNull(),
	reelId: integer("reel_id"),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("challenge_participants_challenge_idx").using("btree", table.challengeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.challengeId],
			foreignColumns: [challenges.id],
			name: "challenge_participants_challenge_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "challenge_participants_user_id_fkey"
		}),
	unique("challenge_participants_unique").on(table.challengeId, table.userId),
]);

export const reelWatchProgress = pgTable("reel_watch_progress", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	reelId: integer("reel_id").notNull(),
	positionSec: integer("position_sec").default(0).notNull(),
	durationSec: integer("duration_sec").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reel_watch_progress_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.id],
			name: "reel_watch_progress_reel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reel_watch_progress_user_id_fkey"
		}),
	unique("reel_watch_progress_unique").on(table.userId, table.reelId),
]);

export const userStreaks = pgTable("user_streaks", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	currentStreak: integer("current_streak").default(0).notNull(),
	longestStreak: integer("longest_streak").default(0).notNull(),
	lastActiveDate: text("last_active_date"),
	xp: integer().default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_streaks_user_id_fkey"
		}),
	unique("user_streaks_user_id_key").on(table.userId),
]);

export const growTogetherGoals = pgTable("grow_together_goals", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	goalText: text("goal_text").notNull(),
	category: text().default('general').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "grow_together_goals_user_id_fkey"
		}).onDelete("cascade"),
]);

export const growTogetherConnections = pgTable("grow_together_connections", {
	id: serial().primaryKey().notNull(),
	user1Id: integer("user1_id").notNull(),
	user2Id: integer("user2_id").notNull(),
	goalText: text("goal_text").notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.user1Id],
			foreignColumns: [users.id],
			name: "grow_together_connections_user1_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.user2Id],
			foreignColumns: [users.id],
			name: "grow_together_connections_user2_id_fkey"
		}).onDelete("cascade"),
	unique("grow_together_connections_user1_id_user2_id_key").on(table.user1Id, table.user2Id),
]);

export const reelVersions = pgTable("reel_versions", {
	id: serial().primaryKey().notNull(),
	reelId: integer("reel_id").notNull(),
	editorId: integer("editor_id").notNull(),
	caption: text(),
	tags: text().array(),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.editorId],
			foreignColumns: [users.id],
			name: "reel_versions_editor_id_fkey"
		}),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reels.id],
			name: "reel_versions_reel_id_fkey"
		}).onDelete("cascade"),
]);

export const uploadSessions = pgTable("upload_sessions", {
	uuid: text().primaryKey().notNull(),
	cloudinaryUrl: text("cloudinary_url").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const pushTokens = pgTable("push_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	platform: text().default('expo').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("push_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("push_tokens_user_id_token_key").on(table.userId, table.token),
]);

export const translationCache = pgTable("translation_cache", {
	cacheKey: text("cache_key").primaryKey().notNull(),
	translated: jsonb().notNull(),
	cachedAt: timestamp("cached_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const postEmbeddings = pgTable("post_embeddings", {
	postId: integer("post_id").primaryKey().notNull(),
	embedding: jsonb().notNull(),
	contentHash: text("content_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_embeddings_post_id_fkey"
		}).onDelete("cascade"),
]);

export const userInterestProfiles = pgTable("user_interest_profiles", {
	userId: integer("user_id").primaryKey().notNull(),
	embedding: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_interest_profiles_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userBlocks = pgTable("user_blocks", {
	id: serial().primaryKey().notNull(),
	blockerId: integer("blocker_id").notNull(),
	blockedId: integer("blocked_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_blocks_blocked").using("btree", table.blockedId.asc().nullsLast().op("int4_ops")),
	index("idx_user_blocks_blocker").using("btree", table.blockerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.blockedId],
			foreignColumns: [users.id],
			name: "user_blocks_blocked_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blockerId],
			foreignColumns: [users.id],
			name: "user_blocks_blocker_id_fkey"
		}).onDelete("cascade"),
	unique("user_blocks_blocker_id_blocked_id_key").on(table.blockerId, table.blockedId),
]);

export const adminSettings = pgTable("admin_settings", {
	id: integer().default(1).primaryKey().notNull(),
	settings: jsonb().default({}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: integer("user_id"),
	ip: text(),
	method: text().notNull(),
	path: text().notNull(),
	statusCode: integer("status_code"),
	durationMs: integer("duration_ms"),
	bodySize: integer("body_size"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_audit_logs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const clientErrors = pgTable("client_errors", {
	id: serial().primaryKey().notNull(),
	message: text().notNull(),
	stack: text(),
	url: text(),
	userAgent: text("user_agent"),
	userId: integer("user_id"),
	count: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const storyReactions = pgTable("story_reactions", {
	id: serial().primaryKey().notNull(),
	storyId: integer("story_id").notNull(),
	userId: integer("user_id").notNull(),
	emoji: text().default('❤️').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("story_reactions_story_user_uniq").using("btree", table.storyId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.id],
			name: "story_reactions_story_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "story_reactions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const kiberQalqonBlocks = pgTable("kiber_qalqon_blocks", {
	ip: text().primaryKey().notNull(),
	reason: text().notNull(),
	suspicion: integer().default(0).notNull(),
	blockedAt: timestamp("blocked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	permanent: boolean().default(false).notNull(),
}, (table) => [
	index("idx_kqb_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const kiberQalqonEvents = pgTable("kiber_qalqon_events", {
	id: serial().primaryKey().notNull(),
	ts: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: text().notNull(),
	ip: text().notNull(),
	detail: text(),
	suspicion: integer(),
}, (table) => [
	index("idx_kqe_ip").using("btree", table.ip.asc().nullsLast().op("text_ops")),
	index("idx_kqe_ts").using("btree", table.ts.desc().nullsFirst().op("timestamptz_ops")),
]);
