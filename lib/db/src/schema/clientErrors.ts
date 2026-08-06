import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

/* Client-side error reports (window.onerror / unhandledrejection) so we can
   see production frontend failures without waiting for user screenshots. */
export const clientErrors = pgTable("client_errors", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  userAgent: text("user_agent"),
  userId: integer("user_id"),
  count: integer("count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
