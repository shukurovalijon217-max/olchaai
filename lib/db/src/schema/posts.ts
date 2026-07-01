import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"),
  mediaUrl: text("media_url"),
  mediaUrls: text("media_urls").array(),
  overlays: text("overlays"),
  audioName: text("audio_name"),
  audioUrl: text("audio_url"),
  audioTrimStart: text("audio_trim_start"),
  audioTrimEnd: text("audio_trim_end"),
  pollQuestion: text("poll_question"),
  pollOptions: text("poll_options"),
  mood: text("mood"),
  filterName: text("filter_name"),
  tags: text("tags").array(),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  isFlagged: boolean("is_flagged").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentLikesTable = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => commentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, sharesCount: true, isFlagged: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
