import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const curatorCodesTable = pgTable("curator_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCuratorCodeSchema = createInsertSchema(curatorCodesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCuratorCode = z.infer<typeof insertCuratorCodeSchema>;
export type CuratorCode = typeof curatorCodesTable.$inferSelect;