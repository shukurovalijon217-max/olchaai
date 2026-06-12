import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const MOOD_TYPES = ["energetic", "calm", "creative", "philosophical", "social", "focused", "melancholic", "inspired"] as const;
export type MoodType = typeof MOOD_TYPES[number];

export const userMoodsTable = pgTable("user_moods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(),
  energyLevel: integer("energy_level").notNull().default(5),
  note: text("note"),
  isPublic: boolean("is_public").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("moods_user_idx").on(t.userId), index("moods_created_idx").on(t.createdAt)]);

export type UserMood = typeof userMoodsTable.$inferSelect;
