import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const scenariosTable = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("scenarios_creator_idx").on(t.creatorId)]);

export const scenarioBranchesTable = pgTable("scenario_branches", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull().references(() => scenariosTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  videoUrl: text("video_url"),
  choiceText: text("choice_text").notNull(),
  choiceEmoji: text("choice_emoji").notNull().default("👉"),
  isRoot: boolean("is_root").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("branches_scenario_idx").on(t.scenarioId)]);

export type Scenario = typeof scenariosTable.$inferSelect;
export type ScenarioBranch = typeof scenarioBranchesTable.$inferSelect;
