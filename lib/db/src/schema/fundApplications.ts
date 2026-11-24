import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const fundApplicationsTable = pgTable("fund_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  business: text("business").notNull(),
  location: text("location").notNull(),
  website: text("website").notNull().default(""),
  fundingRoute: text("funding_route").notNull().default("sales_linked"),
  products: text("products").notNull(),
  amountPerSale: text("amount_per_sale").notNull(),
  desiredCreativeWork: text("desired_creative_work").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
});

export const insertFundApplicationSchema = createInsertSchema(fundApplicationsTable).omit({
  id: true,
  createdAt: true,
  contactedAt: true,
});

export type InsertFundApplication = z.infer<typeof insertFundApplicationSchema>;
export type FundApplication = typeof fundApplicationsTable.$inferSelect;