import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const uploadSessions = pgTable("upload_sessions", {
  uuid: text("uuid").primaryKey(),
  cloudinaryUrl: text("cloudinary_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
