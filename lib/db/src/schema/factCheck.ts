import { pgTable, serial, integer, text, timestamp, real, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const factChecksTable = pgTable("fact_checks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().unique().references(() => postsTable.id, { onDelete: "cascade" }),
  verdict: text("verdict").notNull(),
  confidence: real("confidence").notNull().default(0),
  explanation: text("explanation"),
  sources: text("sources"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
}, (t) => [index("fact_checks_post_idx").on(t.postId)]);

export const credibilityScoresTable = pgTable("credibility_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  score: real("score").notNull().default(50),
  totalChecked: integer("total_checked").notNull().default(0),
  trueCount: integer("true_count").notNull().default(0),
  falseCount: integer("false_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FactCheck = typeof factChecksTable.$inferSelect;
export type CredibilityScore = typeof credibilityScoresTable.$inferSelect;
