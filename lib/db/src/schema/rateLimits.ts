import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const rateLimitsTable = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull().default(1),
  resetTime: timestamp("reset_time", { withTimezone: true }).notNull(),
});

export type RateLimit = typeof rateLimitsTable.$inferSelect;
