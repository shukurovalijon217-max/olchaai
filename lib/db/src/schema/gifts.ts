import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { liveStreamsTable } from "./live";

export const liveGiftsTable = pgTable("live_gifts", {
  id: serial("id").primaryKey(),
  liveStreamId: integer("live_stream_id").notNull().references(() => liveStreamsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  giftType: text("gift_type").notNull(),
  giftEmoji: text("gift_emoji").notNull(),
  coinValue: integer("coin_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creatorPlansTable = pgTable("creator_plans", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  perks: text("perks"),
  isActive: boolean("is_active").notNull().default(true),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creatorSubscriptionsTable = pgTable("creator_subscriptions", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull().references(() => usersTable.id),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  planId: integer("plan_id").notNull().references(() => creatorPlansTable.id),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastPaymentAt: timestamp("last_payment_at").notNull().defaultNow(),
  nextPaymentAt: timestamp("next_payment_at").notNull(),
});

export type LiveGift = typeof liveGiftsTable.$inferSelect;
export type CreatorPlan = typeof creatorPlansTable.$inferSelect;
export type CreatorSubscription = typeof creatorSubscriptionsTable.$inferSelect;
