import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const coViewRoomsTable = pgTable("co_view_rooms", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  status: text("status").notNull().default("active"),
  inviteCode: text("invite_code").notNull().unique(),
  memberCount: integer("member_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const coViewMembersTable = pgTable("co_view_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => coViewRoomsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [
  index("co_view_members_room_idx").on(t.roomId),
]);

export type CoViewRoom = typeof coViewRoomsTable.$inferSelect;
export type CoViewMember = typeof coViewMembersTable.$inferSelect;
