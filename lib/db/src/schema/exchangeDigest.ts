import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const exchangeDigestDeliveriesTable = pgTable("exchange_digest_deliveries", {
  id: serial("id").primaryKey(),
  periodStart: date("period_start", { mode: "string" }).notNull(),
  recipientEmail: text("recipient_email").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  periodRecipientUnique: uniqueIndex("exchange_digest_deliveries_period_recipient_uidx")
    .on(table.periodStart, table.recipientEmail),
  statusPeriodIdx: index("exchange_digest_deliveries_status_period_idx")
    .on(table.status, table.periodStart),
}));

export const exchangeDigestUnsubscribeTokensTable = pgTable("exchange_digest_unsubscribe_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("exchange_digest_unsubscribe_tokens_email_idx").on(table.email),
}));
