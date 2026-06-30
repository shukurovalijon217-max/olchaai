import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  membersCount: integer("members_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  isPrivate: boolean("is_private").notNull().default(false),
  category: text("category").default("general"),
  privacyLevel: text("privacy_level").notNull().default("public"),
  joinType: text("join_type").notNull().default("auto"),
  groupType: text("group_type").default("community"),
  icon: text("icon").default("🌟"),
  themeColor: text("theme_color").default("#7857ff"),
  maxMembers: integer("max_members").default(0),
  settings: jsonb("settings"),
  creatorId: integer("creator_id").references(() => usersTable.id),
  inviteCode: text("invite_code"),
  pinnedPostId: integer("pinned_post_id"),
  verifiedAt: timestamp("verified_at"),
  tagsList: jsonb("tags_list").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("member"),
  isMuted: boolean("is_muted").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupPostsTable = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  postType: text("post_type").notNull().default("text"),
  isPinned: boolean("is_pinned").notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  reactionsCount: integer("reactions_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  bookmarksCount: integer("bookmarks_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostLikesTable = pgTable("group_post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => groupPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostReactionsTable = pgTable("group_post_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => groupPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull().default("heart"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostCommentsTable = pgTable("group_post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => groupPostsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostCommentLikesTable = pgTable("group_post_comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => groupPostCommentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
});

export const groupPollsTable = pgTable("group_polls", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").notNull().default([]),
  endsAt: timestamp("ends_at"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  allowMultiple: boolean("allow_multiple").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPollVotesTable = pgTable("group_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => groupPollsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostBookmarksTable = pgTable("group_post_bookmarks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => groupPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupPostReportsTable = pgTable("group_post_reports", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => groupPostsTable.id, { onDelete: "cascade" }),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true, membersCount: true, postsCount: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
