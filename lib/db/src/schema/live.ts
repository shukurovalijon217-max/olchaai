import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const liveStreamsTable = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("active"),
  viewerCount: integer("viewer_count").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export type LiveStream = typeof liveStreamsTable.$inferSelect;
