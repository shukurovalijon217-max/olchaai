import { pgTable, serial, integer, text, timestamp, index, unique } from "drizzle-orm/pg-core";

export const userInteractionsTable = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  interactionType: text("interaction_type").notNull(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("user_interactions_user_idx").on(t.userId),
  index("user_interactions_content_idx").on(t.contentType, t.contentId),
]);

export const contentAnalysisTable = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  contentType: text("content_type").notNull(),
  tags: text("tags").array(),
  category: text("category"),
  summary: text("summary"),
  sentiment: text("sentiment"),
  aiMetadata: text("ai_metadata"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
}, (t) => [
  index("content_analysis_content_idx").on(t.contentType, t.contentId),
  unique("content_analysis_unique").on(t.contentType, t.contentId),
]);
