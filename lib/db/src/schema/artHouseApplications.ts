import { createInsertSchema } from "drizzle-zod";
import { boolean, date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const artHouseApplicationsTable = pgTable("art_house_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  applyingAs: text("applying_as").notNull(),
  secondArtistName: text("second_artist_name"),
  portfolioUrl: text("portfolio_url").notNull(),
  availableForAllDates: boolean("available_for_all_dates").notNull(),
  availableFrom: date("available_from", { mode: "string" }),
  availableTo: date("available_to", { mode: "string" }),
  residencyPlan: text("residency_plan").notNull(),
  sharedLiving: text("shared_living").notNull(),
  friendsDescription: text("friends_description").notNull(),
  networkMember: boolean("network_member").notNull(),
  networkConnection: text("network_connection").notNull().default(""),
  considerPatronPost: boolean("consider_patron_post").notNull().default(false),
  privacyConsentAt: timestamp("privacy_consent_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertArtHouseApplicationSchema = createInsertSchema(artHouseApplicationsTable).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertArtHouseApplication = z.infer<typeof insertArtHouseApplicationSchema>;
export type ArtHouseApplication = typeof artHouseApplicationsTable.$inferSelect;
