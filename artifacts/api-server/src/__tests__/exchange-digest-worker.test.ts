import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";

const { sendDigestMock } = vi.hoisted(() => ({
  sendDigestMock: vi.fn(),
}));

vi.mock("../lib/email.js", () => ({
  sendExchangeDigestEmail: sendDigestMock,
}));

import { db, exchangeDigestDeliveriesTable, exchangeDigestUnsubscribeTokensTable, residencyOffersTable, usersTable } from "@workspace/db";
import { runWeeklyExchangeDigest } from "../lib/exchangeDigest.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalResendApiKey = process.env.RESEND_API_KEY;
const emails: string[] = [];
const offerIds: number[] = [];
const deliveryIds: number[] = [];

afterEach(async () => {
  if (offerIds.length) {
    await db.delete(residencyOffersTable).where(inArray(residencyOffersTable.id, offerIds));
  }
  if (emails.length) {
    await db.delete(exchangeDigestUnsubscribeTokensTable).where(or(...emails.map((email) => eq(exchangeDigestUnsubscribeTokensTable.email, email))));
    await db.delete(exchangeDigestDeliveriesTable).where(or(...emails.map((email) => eq(exchangeDigestDeliveriesTable.recipientEmail, email))));
    await db.delete(usersTable).where(or(...emails.map((email) => eq(usersTable.email, email))));
  }
  sendDigestMock.mockReset();
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalResendApiKey;
  emails.length = 0;
  offerIds.length = 0;
  deliveryIds.length = 0;
});

describe("weekly Exchange digest worker", () => {
  it("sends once to approved, opted-in accounts and excludes private listings", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    sendDigestMock.mockResolvedValue(undefined);

    const approvedEmail = `digest-approved-${crypto.randomUUID()}@example.test`;
    const pendingEmail = `digest-pending-${crypto.randomUUID()}@example.test`;
    const noConsentEmail = `digest-no-consent-${crypto.randomUUID()}@example.test`;
    emails.push(approvedEmail, pendingEmail, noConsentEmail);

    await db.insert(usersTable).values([
      { email: approvedEmail, isApproved: true, exchangeDigestOptIn: true, exchangeDigestOptedInAt: new Date() },
      { email: pendingEmail, isApproved: false, exchangeDigestOptIn: true, exchangeDigestOptedInAt: new Date() },
      { email: noConsentEmail, isApproved: true, exchangeDigestOptIn: false },
    ]);

    const baseListing = {
      entryId: null,
      claimerEmail: null,
      posterName: "Test Exchange Poster",
      city: "Berlin",
      description: "A specific, active Exchange offer.",
      kind: "swap",
      destination: "studio space for a mural",
      cost: null,
      tags: [],
      photos: [],
      publicPhotos: [],
      isActive: true,
      createdAt: new Date("2026-11-26T12:00:00.000Z"),
      posterEmail: approvedEmail,
    };
    const insertedOffers = await db.insert(residencyOffersTable).values([
      { ...baseListing, visibility: "public" },
      { ...baseListing, destination: "private draft", visibility: "private" },
    ]).returning({ id: residencyOffersTable.id });
    offerIds.push(...insertedOffers.map((offer) => offer.id));

    await runWeeklyExchangeDigest(new Date("2026-12-02T12:00:00.000Z"));
    expect(sendDigestMock).toHaveBeenCalledOnce();
    expect(sendDigestMock.mock.calls[0]?.[0]).toBe(approvedEmail);
    expect(sendDigestMock.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({ title: "studio space for a mural", category: "Barter & trade" }),
    ]);
    expect(sendDigestMock.mock.calls[0]?.[3]).toMatch(/^exchange-digest-2026-11-30-/);

    const savedDeliveries = await db
      .select({ id: exchangeDigestDeliveriesTable.id, recipientEmail: exchangeDigestDeliveriesTable.recipientEmail, status: exchangeDigestDeliveriesTable.status })
      .from(exchangeDigestDeliveriesTable)
      .where(and(
        eq(exchangeDigestDeliveriesTable.periodStart, "2026-11-30"),
        inArray(exchangeDigestDeliveriesTable.recipientEmail, emails),
      ));
    deliveryIds.push(...savedDeliveries.map((delivery) => delivery.id));
    expect(savedDeliveries).toEqual([
      expect.objectContaining({ recipientEmail: approvedEmail, status: "sent" }),
    ]);

    await runWeeklyExchangeDigest(new Date("2026-12-02T12:15:00.000Z"));
    expect(sendDigestMock).toHaveBeenCalledOnce();
  });

  it("does not send before the scheduled Paris morning", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    await runWeeklyExchangeDigest(new Date("2026-11-30T07:59:00.000Z"));
    expect(sendDigestMock).not.toHaveBeenCalled();
  });
});
