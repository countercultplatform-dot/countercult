import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const residencyOffersTable = pgTable("residency_offers", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id"),
  claimerEmail: text("claimer_email"),
  posterName: text("poster_name"),
  posterEmail: text("poster_email"),
  stripeSessionId: text("stripe_session_id"),
  kind: text("kind").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  availableFrom: text("available_from"),
  availableTo: text("available_to"),
  availabilityMode: text("availability_mode"),
  contact: text("contact"),
  destination: text("destination"),
  cost: text("cost"),
  duration: text("duration"),
  skillShareMode: text("skill_share_mode"),
  requestedReturn: text("requested_return"),
  virtualAvailable: boolean("virtual_available").notNull().default(false),
  capacity: text("capacity"),
  tags: text("tags").array().notNull().default([]),
  photos: text("photos").array().notNull().default([]),
  publicPhotos: text("public_photos").array().notNull().default([]),
  visibility: text("visibility").notNull().default("network"),
  isActive: boolean("is_active").notNull().default(true),
  homepageFeaturedOrder: integer("homepage_featured_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  renewedAt: timestamp("renewed_at", { withTimezone: true }),
});

export type ResidencyOffer = typeof residencyOffersTable.$inferSelect;
