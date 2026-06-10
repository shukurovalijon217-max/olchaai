import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userBooksTable = pgTable("user_books", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  googleBookId: text("google_book_id").notNull(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  publishedDate: text("published_date"),
  pageCount: integer("page_count"),
  categories: text("categories"),
  language: text("language").default("uz"),
  isbn: text("isbn"),
  status: text("status").notNull().default("want_to_read"),
  currentPage: integer("current_page").default(0),
  rating: integer("rating"),
  review: text("review"),
  isFavorite: boolean("is_favorite").default(false),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserBook = typeof userBooksTable.$inferSelect;
export type InsertUserBook = typeof userBooksTable.$inferInsert;
