import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const moderationQueueTable = pgTable("moderation_queue", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // "post" | "reel" | "comment" | "story"
  contentId: integer("content_id").notNull(),
  contentText: text("content_text"),
  authorId: integer("author_id").references(() => usersTable.id),
  aiScore: real("ai_score").notNull().default(0),
  aiCategories: jsonb("ai_categories").$type<Record<string, number>>().notNull().default({}),
  aiVerdict: text("ai_verdict").notNull().default("clean"), // "clean" | "suspicious" | "violation"
  autoFlagged: boolean("auto_flagged").notNull().default(false),
  autoBlocked: boolean("auto_blocked").notNull().default(false),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "escalated"
  moderatorId: integer("moderator_id").references(() => usersTable.id),
  moderatorNote: text("moderator_note"),
  reportCount: integer("report_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const contentReportsTable = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  reporterId: integer("reporter_id").references(() => usersTable.id),
  reason: text("reason").notNull(), // "spam" | "hate" | "adult" | "violence" | "fake" | "other"
  description: text("description"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ModerationQueueItem = typeof moderationQueueTable.$inferSelect;
export type ContentReport = typeof contentReportsTable.$inferSelect;
