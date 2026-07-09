import { pgTable, text, serial, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
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
  hlsUrl: text("hls_url"),
  hlsStatus: text("hls_status").default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reelLikesTable = pgTable("reel_likes", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reelCommentsTable = pgTable("reel_comments", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reelWatchProgressTable = pgTable("reel_watch_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id, { onDelete: "cascade" }),
  positionSec: integer("position_sec").notNull().default(0),
  durationSec: integer("duration_sec").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("reel_watch_progress_unique").on(t.userId, t.reelId),
  index("reel_watch_progress_user_idx").on(t.userId),
]);

export const reelCollaboratorsTable = pgTable("reel_collaborators", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  inviteeHandle: text("invitee_handle").notNull(),
  permission: text("permission").notNull().default("edit"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("reel_collaborators_owner_idx").on(t.ownerId),
]);

export const insertReelSchema = createInsertSchema(reelsTable).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, viewsCount: true });
export type InsertReel = z.infer<typeof insertReelSchema>;
export type Reel = typeof reelsTable.$inferSelect;
export type ReelComment = typeof reelCommentsTable.$inferSelect;
export type ReelWatchProgress = typeof reelWatchProgressTable.$inferSelect;
export type ReelCollaborator = typeof reelCollaboratorsTable.$inferSelect;
