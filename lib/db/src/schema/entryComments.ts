import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { entriesTable } from "./entries";

export const entryCommentsTable = pgTable("entry_comments", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  authorEntryId: integer("author_entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EntryComment = typeof entryCommentsTable.$inferSelect;
