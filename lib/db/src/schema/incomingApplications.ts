import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const incomingApplicationsTable = pgTable("incoming_applications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
