import {
  pgTable,
  text,
  serial,
  doublePrecision,
  boolean,
  json,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type WebsitePreview = {
  sourceUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  fetchedAt: string;
};

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  secondaryKind: text("secondary_kind"),
  tags: text("tags").array().notNull().default([]),
  city: text("city").notNull(),
  country: text("country").notNull(),
  postal: text("postal"),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  blurb: text("blurb"),
  url: text("url"),
  websitePreview: json("website_preview").$type<WebsitePreview | null>().default(null),
  heroPhoto: text("hero_photo"),
  portfolioPhotos: text("portfolio_photos").array().notNull().default([]),
  isApproved: boolean("is_approved").notNull().default(false),
  visibility: text("visibility").notNull().default("public"),
  profileVisibilityConsentVersion: text("profile_visibility_consent_version"),
  profileVisibilityConsentAt: timestamp("profile_visibility_consent_at", { withTimezone: true }),
  publicProfileConsentVersion: text("public_profile_consent_version"),
  publicProfileConsentAt: timestamp("public_profile_consent_at", { withTimezone: true }),
  archiveConsentVersion: text("archive_consent_version"),
  archiveConsentAt: timestamp("archive_consent_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  mapEligible: boolean("map_eligible").notNull().default(true),
  discoveredLinks: json("discovered_links").$type<{ platform: string; url: string }[]>(),
  isClaimed: boolean("is_claimed").notNull().default(false),
  isCommunitySubmitted: boolean("is_community_submitted").notNull().default(false),
  submissionRelationship: text("submission_relationship"),
  claimedEmail: text("claimed_email"),
  subcultures: text("subcultures").array().notNull().default([]),
  scrapingConsent: boolean("scraping_consent").notNull().default(false),
  externalLinks: json("external_links").$type<{ platform: string; url: string }[]>().default([]),
  experiences: json("experiences").$type<{ title?: string; description?: string; date?: string; location?: string; url?: string }[]>().default([]),
  shopUrl: text("shop_url"),
  offerings: text("offerings"),
  basedIn: text("based_in").array().notNull().default([]),
  contactEmail: text("contact_email"),
  status: text("status").notNull().default("pending_review"),
  submittedBy: text("submitted_by"),
  verificationToken: text("verification_token"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  isPro: boolean("is_pro").notNull().default(false),
  viewCount: text("view_count").notNull().default("0"),
  swapType: text("swap_type"),
  spacePrivacy: text("space_privacy"),
  financialStructure: text("financial_structure"),
  costDetails: text("cost_details"),
  durationTerms: text("duration_terms"),
  vibeTags: text("vibe_tags"),
  dealbreakers: text("dealbreakers"),
  noiseAndGuests: text("noise_and_guests"),
  contactMethod: text("contact_method"),
  contactHandle: text("contact_handle"),
  openTo: text("open_to").array().notNull().default([]),
  joinReason: text("join_reason"),
  discoverySource: text("discovery_source"),
  networkNextSteps: text("network_next_steps"),
  spaceOfferAvailable: boolean("space_offer_available").notNull().default(false),
  spaceOfferTypes: text("space_offer_types").array().notNull().default([]),
  spaceOfferCategory: text("space_offer_category"),
  spaceOfferPricing: text("space_offer_pricing"),
  spaceOfferDetails: text("space_offer_details"),
  isVoiceFeatured: boolean("is_voice_featured").notNull().default(false),
  curatedBy: text("curated_by"),
  referredBy: text("referred_by"),
  paymentStatus: text("payment_status").notNull().default("free_tier"),
  organizationModel: text("organization_model"),
  intendedCommercialUse: boolean("intended_commercial_use"),
  commercialUseDescription: text("commercial_use_description"),
  declaredClassification: text("declared_classification"),
  derivedClassification: text("derived_classification").notNull().default("needs_review"),
  reviewedClassification: text("reviewed_classification"),
  classificationReviewedAt: timestamp("classification_reviewed_at", { withTimezone: true }),
  approvalEmailSent: boolean("approval_email_sent").notNull().default(false),
  approvalFollowupEmailStatus: text("approval_followup_email_status").notNull().default("not_scheduled"),
  approvalFollowupEmailId: text("approval_followup_email_id"),
  approvalFollowupScheduledAt: timestamp("approval_followup_scheduled_at", { withTimezone: true }),
  isHidden: boolean("is_hidden").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertEntrySchema = createInsertSchema(entriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;
