import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  balance: integer("balance").notNull().default(0),
  earningsBalance: integer("earnings_balance").notNull().default(0),
  adRevenueBalance: integer("ad_revenue_balance").notNull().default(0),
  currency: text("currency").notNull().default("UZS"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id),
  type: text("type").notNull(), // deposit | withdrawal | transfer_in | transfer_out | ad_revenue | content_revenue | referral
  amount: integer("amount").notNull(), // in UZS tiyin (÷100 = UZS)
  currency: text("currency").notNull().default("UZS"),
  status: text("status").notNull().default("completed"), // pending | completed | failed | cancelled
  paymentMethod: text("payment_method"), // visa | mastercard | click | payme | global | internal
  description: text("description"),
  reference: text("reference"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(), // visa | mastercard | click | payme | global
  title: text("title").notNull(),
  maskedNumber: text("masked_number"),
  holderName: text("holder_name"),
  expiryDate: text("expiry_date"),
  isDefault: boolean("is_default").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethodsTable).omit({ id: true, createdAt: true });

export type Wallet = typeof walletsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
