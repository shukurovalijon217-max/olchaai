import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption").notNull(),
  audioTrack: text("audio_track"),
  duration: integer("duration").default(30),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reelLikesTable = pgTable("reel_likes", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReelSchema = createInsertSchema(reelsTable).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, viewsCount: true });
export type InsertReel = z.infer<typeof insertReelSchema>;
export type Reel = typeof reelsTable.$inferSelect;
