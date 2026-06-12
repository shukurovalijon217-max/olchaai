import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const coSpacesTable = pgTable("co_spaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  memberCount: integer("member_count").notNull().default(1),
  status: text("status").notNull().default("open"),
  canvas: text("canvas"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("co_spaces_creator_idx").on(t.creatorId), index("co_spaces_category_idx").on(t.category)]);

export const coSpaceMembersTable = pgTable("co_space_members", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").notNull().references(() => coSpacesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  contribution: integer("contribution").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [index("co_space_members_space_idx").on(t.spaceId)]);

export const coSpaceTasksTable = pgTable("co_space_tasks", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").notNull().references(() => coSpacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("co_space_tasks_space_idx").on(t.spaceId)]);

export type CoSpace = typeof coSpacesTable.$inferSelect;
export type CoSpaceMember = typeof coSpaceMembersTable.$inferSelect;
export type CoSpaceTask = typeof coSpaceTasksTable.$inferSelect;
