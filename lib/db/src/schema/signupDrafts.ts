import {
  pgTable,
  serial,
  text,
  json,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const signupDraftsTable = pgTable(
  "signup_drafts",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    reminderClaimedAt: timestamp("reminder_claimed_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    expiryIndex: index("signup_drafts_expiry_idx").on(table.expiresAt),
    reminderIndex: index("signup_drafts_reminder_idx").on(
      table.reminderSentAt,
      table.createdAt,
    ),
  }),
);

export type SignupDraft = typeof signupDraftsTable.$inferSelect;