import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const patronPostSubscriptionsTable = pgTable("patron_post_subscriptions", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull().default(""),
  email: text("email").notNull(),
  mailingName: text("mailing_name").notNull().default(""),
  addressLine1: text("address_line_1").notNull().default(""),
  addressLine2: text("address_line_2").notNull().default(""),
  city: text("city").notNull().default(""),
  region: text("region").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  country: text("country").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  isGift: boolean("is_gift").notNull().default(false),
  deliveryType: text("delivery_type").notNull().default("physical"),
  status: text("status").notNull().default("incomplete"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  amountCents: integer("amount_cents").notNull().default(1100),
  currency: text("currency").notNull().default("eur"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("patron_post_subscriptions_email_idx").on(table.email),
  index("patron_post_subscriptions_status_idx").on(table.status),
]);

export type PatronPostSubscription = typeof patronPostSubscriptionsTable.$inferSelect;
