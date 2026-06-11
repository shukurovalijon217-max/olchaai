import { pgTable, serial, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const anonZonesTable = pgTable("anon_zones", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  topic: text("topic").notNull(),
  description: text("description"),
  emoji: text("emoji").notNull().default("💬"),
  postCount: integer("post_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const anonPostsTable = pgTable("anon_posts", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull().references(() => anonZonesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("anon_posts_zone_idx").on(t.zoneId),
]);

export type AnonZone = typeof anonZonesTable.$inferSelect;
export type AnonPost = typeof anonPostsTable.$inferSelect;
