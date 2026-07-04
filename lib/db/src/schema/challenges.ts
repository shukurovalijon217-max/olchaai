import { pgTable, text, serial, integer, jsonb, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  hashtag: text("hashtag").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  days: integer("days").notNull().default(7),
  prizePool: integer("prize_pool").notNull().default(0),
  judgeType: text("judge_type").notNull().default("vote"),
  status: text("status").notNull().default("active"),
  settings: jsonb("settings").notNull().default({}),
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("challenges_creator_idx").on(t.creatorId),
  index("challenges_status_idx").on(t.status),
]);

export const challengeParticipantsTable = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challengesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  reelId: integer("reel_id"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [
  unique("challenge_participants_unique").on(t.challengeId, t.userId),
  index("challenge_participants_challenge_idx").on(t.challengeId),
]);

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ id: true, createdAt: true, status: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipantsTable.$inferSelect;
