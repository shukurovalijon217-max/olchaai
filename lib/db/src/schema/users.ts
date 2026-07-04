import { pgTable, text, serial, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface NotifPrefs {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  groups: boolean;
  premium: boolean;
}

export interface PrivacySettings {
  privateProfile: boolean;
  activityStatus: boolean;
  readReceipts: boolean;
  suggestions: boolean;
  searchVisibility: boolean;
}

export interface FocusShield {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedUserIds: number[];
}

export const DEFAULT_FOCUS_SHIELD: FocusShield = {
  enabled: false, startHour: 22, endHour: 7, allowedUserIds: [],
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  likes: true, comments: true, followers: true,
  messages: true, groups: false, premium: false,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  privateProfile: false, activityStatus: true,
  readReceipts: true, suggestions: true, searchVisibility: true,
};

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  country: text("country"),
  timezone: text("timezone"),
  notifPrefs: jsonb("notif_prefs").$type<NotifPrefs>(),
  privacySettings: jsonb("privacy_settings").$type<PrivacySettings>(),
  aiUsageCount: integer("ai_usage_count").notNull().default(0),
  ghostUntil: timestamp("ghost_until"),
  focusShield: jsonb("focus_shield").$type<FocusShield>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const followsTable = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => usersTable.id),
  followingId: integer("following_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Follow = typeof followsTable.$inferSelect;
