import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const pledgeEmailsTable = pgTable("pledge_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PledgeEmail = typeof pledgeEmailsTable.$inferSelect;
