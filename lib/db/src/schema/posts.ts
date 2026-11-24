import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // 'editorial' | 'member'
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorName: text("author_name").notNull(),
  authorEntryId: integer("author_entry_id"),
  authorEmail: text("author_email"),
  heroImage: text("hero_image"),
  tags: text("tags").array().notNull().default([]),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Post = typeof postsTable.$inferSelect;
export type NewPostInsert = typeof postsTable.$inferInsert;
