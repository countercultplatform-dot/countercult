import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const patronPostQuestionsTable = pgTable("patron_post_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  index("patron_post_questions_created_at_idx").on(table.createdAt),
  index("patron_post_questions_status_idx").on(table.status),
]);

export type PatronPostQuestion = typeof patronPostQuestionsTable.$inferSelect;
