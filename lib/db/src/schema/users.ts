import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  isApproved: boolean("is_approved").notNull().default(false),
  canPostPartnerOffers: boolean("can_post_partner_offers").notNull().default(false),
  accountRole: text("account_role").notNull().default("member"),
  displayName: text("display_name"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  signupSource: text("signup_source"),
  signupMedium: text("signup_medium"),
  signupCampaign: text("signup_campaign"),
  signupReferrerDomain: text("signup_referrer_domain"),
  signupLandingPath: text("signup_landing_path"),
  signupReportedSource: text("signup_reported_source"),
  newsletterOptIn: boolean("newsletter_opt_in").notNull().default(false),
  newsletterOptedInAt: timestamp("newsletter_opted_in_at", { withTimezone: true }),
  exchangeDigestOptIn: boolean("exchange_digest_opt_in").notNull().default(false),
  exchangeDigestOptedInAt: timestamp("exchange_digest_opted_in_at", { withTimezone: true }),
  dataProcessingConsentVersion: text("data_processing_consent_version"),
  dataProcessingConsentAt: timestamp("data_processing_consent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
