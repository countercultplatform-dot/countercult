import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { entriesTable } from "./entries";

export const entryRatingsTable = pgTable("entry_ratings", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  raterEntryId: integer("rater_entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EntryRating = typeof entryRatingsTable.$inferSelect;
