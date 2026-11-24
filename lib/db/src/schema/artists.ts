import {
  pgTable,
  text,
  serial,
  boolean,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const artistsTable = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instagramUrl: text("instagram_url").notNull(),
  location: text("location").notNull(),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  bio: text("bio"),
  photos: text("photos").array().notNull().default([]),
  status: text("status").notNull().default("pending"),
  isClaimed: boolean("is_claimed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Artist = typeof artistsTable.$inferSelect;
