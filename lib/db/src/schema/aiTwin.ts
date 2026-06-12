import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiTwinConfigTable = pgTable("ai_twin_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  personality: text("personality"),
  topics: text("topics"),
  bio: text("bio"),
  totalChats: integer("total_chats").notNull().default(0),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiTwinChatsTable = pgTable("ai_twin_chats", {
  id: serial("id").primaryKey(),
  twinOwnerId: integer("twin_owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  visitorId: integer("visitor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("twin_chats_owner_idx").on(t.twinOwnerId)]);

export const aiTwinMessagesTable = pgTable("ai_twin_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => aiTwinChatsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("twin_msgs_chat_idx").on(t.chatId)]);

export type AiTwinConfig = typeof aiTwinConfigTable.$inferSelect;
export type AiTwinChat = typeof aiTwinChatsTable.$inferSelect;
export type AiTwinMessage = typeof aiTwinMessagesTable.$inferSelect;
