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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupPostsTable = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true, membersCount: true, postsCount: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
