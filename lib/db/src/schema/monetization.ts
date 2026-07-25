import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/* ── Global admin-configurable settings ───────────────────────── */
export const monetizationConfigTable = pgTable("monetization_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  /* Revenue per 1000 views — in UZS tiyin (÷100 = UZS sum).
     Default 50 000 tiyin = 500 UZS per 1000 views             */
  revenuePerMille: integer("revenue_per_mille").notNull().default(50000),
  /* Creator's cut in percent (rest goes to platform admin)     */
  creatorSharePercent: integer("creator_share_percent").notNull().default(70),
  /* Views needed before content starts earning                 */
  minViewsThreshold: integer("min_views_threshold").notNull().default(1000),
  /* Per content-type rate multipliers ×10 (10 = 1.0x)         */
  videoRateMultiplier: integer("video_rate_multiplier").notNull().default(10),
  reelRateMultiplier: integer("reel_rate_multiplier").notNull().default(12),
  musicRateMultiplier: integer("music_rate_multiplier").notNull().default(8),
  movieRateMultiplier: integer("movie_rate_multiplier").notNull().default(20),
  /* Min earnings before payout can be requested (tiyin)        */
  minPayoutAmount: integer("min_payout_amount").notNull().default(5000000),
  /* ── Eligibility criteria for creator monetization program ── */
  minFollowers: integer("min_followers").notNull().default(1000),
  minTotalViews: integer("min_total_views").notNull().default(10000),
  minContentCount: integer("min_content_count").notNull().default(10),
  autoApprove: boolean("auto_approve").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => usersTable.id),
});

/* ── Per-creator monetization status (YouTube Partner Program) ── */
export const creatorMonetizationTable = pgTable("creator_monetization", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  /* none | applied | active | rejected | suspended               */
  status: text("status").notNull().default("none"),
  appliedAt: timestamp("applied_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Per-content earnings ledger ──────────────────────────────── */
export const contentEarningsTable = pgTable("content_earnings", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // video | reel | music | movie | post
  contentId: integer("content_id").notNull(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  totalViews: integer("total_views").notNull().default(0),
  monetizedViews: integer("monetized_views").notNull().default(0),
  grossEarnings: integer("gross_earnings").notNull().default(0),
  creatorEarnings: integer("creator_earnings").notNull().default(0),
  platformEarnings: integer("platform_earnings").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Creator payout requests ──────────────────────────────────── */
export const payoutRequestsTable = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
  adminNote: text("admin_note"),
  processedBy: integer("processed_by").references(() => usersTable.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MonetizationConfig = typeof monetizationConfigTable.$inferSelect;
export type CreatorMonetization = typeof creatorMonetizationTable.$inferSelect;
export type ContentEarning = typeof contentEarningsTable.$inferSelect;
export type PayoutRequest = typeof payoutRequestsTable.$inferSelect;
