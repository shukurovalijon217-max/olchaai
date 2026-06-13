import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const platformExpensesTable = pgTable("platform_expenses", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  category:    text("category").notNull(), // 'hosting' | 'ai_api' | 'payment_processor' | 'storage' | 'other'
  amountCents: integer("amount_cents").notNull(), // USD cents per period
  currency:    text("currency").notNull().default("USD"),
  period:      text("period").notNull().default("monthly"), // 'monthly' | 'annual' | 'one_time'
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const expenseDeductionRequestsTable = pgTable("expense_deduction_requests", {
  id:                 serial("id").primaryKey(),
  totalRevenueCents:  integer("total_revenue_cents").notNull(),
  totalExpenseCents:  integer("total_expense_cents").notNull(),
  netProfitCents:     integer("net_profit_cents").notNull(),
  status:             text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy:         integer("approved_by").references(() => usersTable.id, { onDelete: "set null" }),
  approvedAt:         timestamp("approved_at"),
  notes:              text("notes"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});

export type PlatformExpense       = typeof platformExpensesTable.$inferSelect;
export type ExpenseDeductionRequest = typeof expenseDeductionRequestsTable.$inferSelect;
