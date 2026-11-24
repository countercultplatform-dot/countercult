import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type StudioArtworkPhoto = {
  name: string;
  objectPath: string;
  src?: string;
};

export type StudioArtworkDestinations = {
  website: "Not prepared" | "Prepared";
  store: "Not prepared" | "Prepared";
  social: "Not prepared" | "Prepared";
  newsletter: "Not prepared" | "Prepared";
  marketplaces: "Not prepared" | "Prepared";
};

export const studioArtworksTable = pgTable("studio_artworks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  seoTitle: text("seo_title").notNull(),
  seoDescription: text("seo_description").notNull(),
  seoKeywords: text("seo_keywords").array().notNull().default([]),
  year: text("year").notNull().default(""),
  dimensions: text("dimensions").notNull().default(""),
  medium: text("medium").notNull(),
  price: text("price").notNull().default(""),
  availability: text("availability").notNull().default("Available"),
  notes: text("notes").notNull().default(""),
  photos: jsonb("photos").$type<StudioArtworkPhoto[]>().notNull(),
  readiness: text("readiness").notNull().default("Needs details"),
  destinations: jsonb("destinations").$type<StudioArtworkDestinations>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudioArtworkSchema = createInsertSchema(studioArtworksTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertStudioArtwork = z.infer<typeof insertStudioArtworkSchema>;
export type StudioArtwork = typeof studioArtworksTable.$inferSelect;