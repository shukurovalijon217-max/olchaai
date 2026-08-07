/* Legacy tables that exist in the database but were historically defined
   inline in artifacts/api-server. Declared here (introspected via drizzle-kit
   pull) so `drizzle-kit push` no longer tries to drop them or prompts
   interactively during post-merge setup. Do NOT remove without dropping the
   tables intentionally. */
import { pgTable, index, foreignKey, serial, integer, text, timestamp, boolean, unique, jsonb, real, varchar, json, uniqueIndex } from "drizzle-orm/pg-core";
import { bigserial, bigint, numeric, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { postsTable } from "./posts";
import { usersTable } from "./users";
import { reelsTable } from "./reels";

export const userSessions = pgTable("user_sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
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
			foreignColumns: [postsTable.id],
			name: "post_votes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id],
			name: "post_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("post_votes_post_id_user_id_key").on(table.postId, table.userId),
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
			foreignColumns: [postsTable.id],
			name: "hot_take_votes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.id],
			name: "hot_take_votes_user_id_fkey"
		}).onDelete("cascade"),
	unique("hot_take_votes_post_id_user_id_key").on(table.postId, table.userId),
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
			foreignColumns: [usersTable.id],
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
			foreignColumns: [usersTable.id],
			name: "grow_together_connections_user1_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.user2Id],
			foreignColumns: [usersTable.id],
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
			foreignColumns: [usersTable.id],
			name: "reel_versions_editor_id_fkey"
		}),
	foreignKey({
			columns: [table.reelId],
			foreignColumns: [reelsTable.id],
			name: "reel_versions_reel_id_fkey"
		}).onDelete("cascade"),
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
			foreignColumns: [postsTable.id],
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
			foreignColumns: [usersTable.id],
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
			foreignColumns: [usersTable.id],
			name: "user_blocks_blocked_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blockerId],
			foreignColumns: [usersTable.id],
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
			foreignColumns: [usersTable.id],
			name: "ai_moderation_events_author_id_fkey"
		}).onDelete("set null"),
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
