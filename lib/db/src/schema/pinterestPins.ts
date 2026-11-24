import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const pinterestPinsTable = pgTable("pinterest_pins", {
  id: serial("id").primaryKey(),
  accountKey: text("account_key").notNull().default("sketchy-shona"),
  artworkId: text("artwork_id").notNull().unique(),
  boardId: text("board_id").notNull().default("originals"),
  pinTitle: text("pin_title").notNull(),
  pinDescription: text("pin_description").notNull(),
  pinAltText: text("pin_alt_text").notNull(),
  status: text("status").notNull().default("queued"),
  pinterestPinId: text("pinterest_pin_id"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPinterestPinSchema = createInsertSchema(pinterestPinsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPinterestPin = z.infer<typeof insertPinterestPinSchema>;
export type PinterestPinRecord = typeof pinterestPinsTable.$inferSelect;