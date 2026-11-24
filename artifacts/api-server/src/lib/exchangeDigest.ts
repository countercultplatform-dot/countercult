import crypto from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  db,
  entriesTable,
  exchangeDigestDeliveriesTable,
  exchangeDigestUnsubscribeTokensTable,
  residencyOffersTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { sendExchangeDigestEmail } from "./email.js";

const PARIS_TIME_ZONE = "Europe/Paris";
const SEND_AFTER_HOUR = 9;
const STALE_CLAIM_MS = 60 * 60 * 1000;
const FAILED_RETRY_DELAY_MS = 60 * 60 * 1000;

export type ExchangeDigestListing = {
  id: number;
  title: string;
  city: string;
  category: string;
  description: string;
  cost: string | null;
};

function dateKeyAsUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function asDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getExchangeDigestPeriod(now: Date): {
  periodStart: string;
  windowStart: Date;
  windowEnd: Date;
  due: boolean;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  const weekday = dateKeyAsUtcDate(localDate).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = dateKeyAsUtcDate(localDate);
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  const periodStart = asDateKey(monday);
  const windowStart = new Date(monday);
  windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  const isMondayBeforeSendTime = weekday === 1 && Number(part("hour")) < SEND_AFTER_HOUR;

  return {
    periodStart,
    windowStart,
    windowEnd: monday,
    due: !isMondayBeforeSendTime,
  };
}

function createUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashExchangeDigestUnsubscribeToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hasAdvertTag(tags: string[], value: string): boolean {
  return tags.some((tag) => tag.trim().toLowerCase() === value);
}

function hasSpecificPaidRate(value: string | null): boolean {
  return /[1-9]/.test(value ?? "");
}

export function getExchangeDigestCategory(offer: {
  id: number;
  kind: string;
  city: string;
  destination: string | null;
  tags: string[];
  cost: string | null;
}): string | null {
  const normalizedKind = offer.kind.trim().toLowerCase();
  if (normalizedKind === "advert") {
    const isApprovedNorwichException = offer.id === 31 &&
      offer.city.trim().toLowerCase() === "norwich, uk" &&
      offer.destination?.trim().toLowerCase() === "open call";
    const listedPaidGig = hasAdvertTag(offer.tags, "advert:hiring") &&
      (hasSpecificPaidRate(offer.cost) || isApprovedNorwichException);
    return listedPaidGig ? "Paid gig" : null;
  }
  if (normalizedKind === "gig") return hasSpecificPaidRate(offer.cost) ? "Paid gig" : null;
  if (normalizedKind === "looking") return null;
  if (normalizedKind === "swap" || normalizedKind === "skill_share") return "Barter & trade";
  if (["workshop", "concert", "free_space", "venue_offer"].includes(normalizedKind)) return "Space available";
  return "Exchange listing";
}

async function getNewExchangeListings(windowStart: Date, windowEnd: Date): Promise<ExchangeDigestListing[]> {
  const rows = await db
    .select({
      id: residencyOffersTable.id,
      kind: residencyOffersTable.kind,
      city: residencyOffersTable.city,
      destination: residencyOffersTable.destination,
      description: residencyOffersTable.description,
      cost: residencyOffersTable.cost,
      tags: residencyOffersTable.tags,
    })
    .from(residencyOffersTable)
    .innerJoin(usersTable, eq(usersTable.email, residencyOffersTable.posterEmail))
    .leftJoin(entriesTable, eq(entriesTable.id, residencyOffersTable.entryId))
    .where(and(
      eq(residencyOffersTable.isActive, true),
      inArray(residencyOffersTable.visibility, ["public", "network"]),
      gte(residencyOffersTable.createdAt, windowStart),
      lt(residencyOffersTable.createdAt, windowEnd),
      eq(usersTable.isApproved, true),
      or(
        isNull(residencyOffersTable.entryId),
        and(
          eq(entriesTable.isApproved, true),
          eq(entriesTable.status, "published"),
          eq(entriesTable.isHidden, false),
          isNull(entriesTable.deletedAt),
        ),
      ),
    ))
    .orderBy(desc(residencyOffersTable.createdAt))
    .limit(100);

  return rows.flatMap((row) => {
    const category = getExchangeDigestCategory(row);
    if (!category) return [];
    return [{
      id: row.id,
      title: row.destination?.trim() || category,
      city: row.city,
      category,
      description: row.description,
      cost: row.cost,
    }];
  });
}

async function claimDelivery(id: number, now: Date) {
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const retryBefore = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);
  const [claimed] = await db
    .update(exchangeDigestDeliveriesTable)
    .set({
      status: "sending",
      claimedAt: now,
      attempts: sql`${exchangeDigestDeliveriesTable.attempts} + 1`,
      lastError: null,
    })
    .where(and(
      eq(exchangeDigestDeliveriesTable.id, id),
      or(
        eq(exchangeDigestDeliveriesTable.status, "pending"),
        and(
          eq(exchangeDigestDeliveriesTable.status, "failed"),
          or(isNull(exchangeDigestDeliveriesTable.claimedAt), lt(exchangeDigestDeliveriesTable.claimedAt, retryBefore)),
        ),
        and(
          eq(exchangeDigestDeliveriesTable.status, "sending"),
          or(isNull(exchangeDigestDeliveriesTable.claimedAt), lt(exchangeDigestDeliveriesTable.claimedAt, staleBefore)),
        ),
      ),
    ))
    .returning();
  return claimed ?? null;
}

export async function runWeeklyExchangeDigest(now = new Date()): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) return;

  const period = getExchangeDigestPeriod(now);
  if (!period.due) return;

  const listings = await getNewExchangeListings(period.windowStart, period.windowEnd);
  if (listings.length === 0) return;

  const recipients = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(and(
      eq(usersTable.isApproved, true),
      eq(usersTable.exchangeDigestOptIn, true),
    ));
  if (recipients.length === 0) return;

  await db
    .insert(exchangeDigestDeliveriesTable)
    .values(recipients.map(({ email }) => ({
      periodStart: period.periodStart,
      recipientEmail: email,
      status: "pending",
    })))
    .onConflictDoNothing();

  const retryBefore = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const dueDeliveries = await db
    .select({
      id: exchangeDigestDeliveriesTable.id,
      recipientEmail: exchangeDigestDeliveriesTable.recipientEmail,
    })
    .from(exchangeDigestDeliveriesTable)
    .where(and(
      eq(exchangeDigestDeliveriesTable.periodStart, period.periodStart),
      or(
        eq(exchangeDigestDeliveriesTable.status, "pending"),
        and(
          eq(exchangeDigestDeliveriesTable.status, "failed"),
          or(isNull(exchangeDigestDeliveriesTable.claimedAt), lt(exchangeDigestDeliveriesTable.claimedAt, retryBefore)),
        ),
        and(
          eq(exchangeDigestDeliveriesTable.status, "sending"),
          or(isNull(exchangeDigestDeliveriesTable.claimedAt), lt(exchangeDigestDeliveriesTable.claimedAt, staleBefore)),
        ),
      ),
    ))
    .limit(100);

  for (const delivery of dueDeliveries) {
    const claim = await claimDelivery(delivery.id, now);
    if (!claim) continue;

    const [eligibleRecipient] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(and(
        eq(usersTable.email, delivery.recipientEmail),
        eq(usersTable.isApproved, true),
        eq(usersTable.exchangeDigestOptIn, true),
      ))
      .limit(1);

    if (!eligibleRecipient) {
      await db
        .update(exchangeDigestDeliveriesTable)
        .set({ status: "cancelled", claimedAt: null })
        .where(eq(exchangeDigestDeliveriesTable.id, delivery.id));
      continue;
    }

    const token = createUnsubscribeToken();
    const tokenHash = hashExchangeDigestUnsubscribeToken(token);
    try {
      await db.insert(exchangeDigestUnsubscribeTokensTable).values({
        email: delivery.recipientEmail,
        tokenHash,
      });
      await sendExchangeDigestEmail(
        delivery.recipientEmail,
        listings,
        token,
        `exchange-digest-${period.periodStart}-${delivery.id}`,
      );
      await db
        .update(exchangeDigestDeliveriesTable)
        .set({ status: "sent", sentAt: now, claimedAt: null, lastError: null })
        .where(eq(exchangeDigestDeliveriesTable.id, delivery.id));
    } catch (error) {
      await db.delete(exchangeDigestUnsubscribeTokensTable)
        .where(eq(exchangeDigestUnsubscribeTokensTable.tokenHash, tokenHash));
      const safeError = error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error";
      await db
        .update(exchangeDigestDeliveriesTable)
        .set({ status: "failed", claimedAt: now, lastError: safeError })
        .where(eq(exchangeDigestDeliveriesTable.id, delivery.id));
      logger.error({ deliveryId: delivery.id, err: error }, "Weekly Exchange digest delivery failed");
    }
  }
}
