import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const residencyShortlistsTable = pgTable(
  "residency_shortlists",
  {
    id: serial("id").primaryKey(),
    applicantOfferId: integer("applicant_offer_id").notNull(),
    partnerOfferId: integer("partner_offer_id").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("shortlisted"),
    applicantContactedAt: timestamp("applicant_contacted_at", { withTimezone: true }),
    partnerContactedAt: timestamp("partner_contacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    applicantPartnerUnique: uniqueIndex("residency_shortlists_applicant_partner_unique").on(
      table.applicantOfferId,
      table.partnerOfferId,
    ),
  }),
);

export type ResidencyShortlist = typeof residencyShortlistsTable.$inferSelect;