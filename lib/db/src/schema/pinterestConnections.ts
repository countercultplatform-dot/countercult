import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const pinterestConnectionsTable = pgTable("pinterest_connections", {
  id: serial("id").primaryKey(),
  accountKey: text("account_key").notNull().unique().default("sketchy-shona"),
  username: text("username"),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  refreshTokenCiphertext: text("refresh_token_ciphertext"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PinterestConnection = typeof pinterestConnectionsTable.$inferSelect;