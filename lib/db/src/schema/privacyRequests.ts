import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const privacyRequestsTable = pgTable(
  "privacy_requests",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    requestType: text("request_type").notNull(),
    status: text("status").notNull().default("pending"),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    emailIndex: index("privacy_requests_email_idx").on(table.email),
    statusIndex: index("privacy_requests_status_idx").on(table.status, table.createdAt),
  }),
);

export type PrivacyRequest = typeof privacyRequestsTable.$inferSelect;