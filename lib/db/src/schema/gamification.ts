import { pgTable, serial, integer, text, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userCoinsTable = pgTable("user_coins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  balance: integer("balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyQuestsTable = pgTable("daily_quests", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  reward: integer("reward").notNull().default(10),
  target: integer("target").notNull().default(1),
  type: text("type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const questProgressTable = pgTable("quest_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  questKey: text("quest_key").notNull(),
  progress: integer("progress").notNull().default(0),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("quest_progress_unique").on(t.userId, t.questKey, t.date),
  index("quest_progress_user_date_idx").on(t.userId, t.date),
]);

export const userTitlesTable = pgTable("user_titles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (t) => [
  index("user_titles_user_idx").on(t.userId),
]);

export type UserCoins = typeof userCoinsTable.$inferSelect;
export type DailyQuest = typeof dailyQuestsTable.$inferSelect;
export type QuestProgress = typeof questProgressTable.$inferSelect;
export type UserTitle = typeof userTitlesTable.$inferSelect;
