import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Private messages submitted through an active commercial space's public form. */
export const spaceEnquiriesTable = pgTable("space_enquiries", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  enquiryType: text("enquiry_type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("space_enquiries_entry_created_idx").on(table.entryId, table.createdAt)]);

export const insertSpaceEnquirySchema = createInsertSchema(spaceEnquiriesTable).omit({ id: true, createdAt: true });
export type InsertSpaceEnquiry = z.infer<typeof insertSpaceEnquirySchema>;
export type SpaceEnquiry = typeof spaceEnquiriesTable.$inferSelect;