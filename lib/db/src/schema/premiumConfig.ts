import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const premiumConfigTable = pgTable("premium_config", {
  id: integer("id").primaryKey().default(1),
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(999),
  yearlyDiscountPercent: integer("yearly_discount_percent").notNull().default(20),
  monthlyStripePriceId: text("monthly_stripe_price_id"),
  yearlyStripePriceId: text("yearly_stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => usersTable.id),
});

export type PremiumConfig = typeof premiumConfigTable.$inferSelect;
