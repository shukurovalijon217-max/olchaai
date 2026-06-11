import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { usersTable } from "./users";

export const voiceCommentsTable = pgTable("voice_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  audioUrl: text("audio_url").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  waveformData: text("waveform_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("voice_comments_post_idx").on(t.postId),
  index("voice_comments_author_idx").on(t.authorId),
]);

export type VoiceComment = typeof voiceCommentsTable.$inferSelect;
