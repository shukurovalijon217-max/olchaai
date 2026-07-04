import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

export const anonQuestionsTable = pgTable("anon_questions", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("anon_questions_recipient_idx").on(t.recipientId),
]);

export const insertAnonQuestionSchema = createInsertSchema(anonQuestionsTable).omit({
  id: true,
  answer: true,
  answeredAt: true,
  createdAt: true,
});

export type AnonQuestion = typeof anonQuestionsTable.$inferSelect;
export type InsertAnonQuestion = z.infer<typeof insertAnonQuestionSchema>;
