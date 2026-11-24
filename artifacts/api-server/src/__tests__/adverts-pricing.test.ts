import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  paymentsTable,
  residencyOffersTable,
} from "@workspace/db";

import app from "../app.js";

const request = supertest(app);
const cleanupEmails: string[] = [];

afterEach(async () => {
  for (const email of cleanupEmails) {
    await db.delete(paymentsTable).where(eq(paymentsTable.email, email));
    await db.delete(residencyOffersTable).where(eq(residencyOffersTable.posterEmail, email));
  }
  cleanupEmails.length = 0;
  vi.clearAllMocks();
});

describe("Free advert posting", () => {
  it("publishes an advert immediately without creating a Stripe payment", async () => {
    const posterEmail = `advert-free-${crypto.randomUUID()}@example.test`;
    cleanupEmails.push(posterEmail);

    const response = await request.post("/api/adverts").send({
      direction: "hiring",
      posterName: "Test poster",
      posterEmail,
      city: "Berlin",
      title: "Paid gig",
      description: "A test advert that should be published immediately for free.",
      contact: "https://example.test/contact",
      rate: "€250 flat",
      tier: "commercial",
    }).expect(201);
    expect(response.body).toEqual(expect.objectContaining({ published: true }));

    const offers = await db.select().from(residencyOffersTable);
    const advert = offers.find((offer) => offer.posterEmail === posterEmail);
    expect(advert?.isActive).toBe(true);
    expect(advert?.tags).toContain("advert:free");
    expect(advert?.tags).toContain("advert:hiring");
    expect(advert?.cost).toBe("€250 flat");

    const exchangeResponse = await request.get("/api/residency").expect(200);
    const exchangeAdvert = exchangeResponse.body.find((offer: { id: number }) => offer.id === response.body.id);
    expect(exchangeAdvert).toMatchObject({
      id: response.body.id,
      kind: "gig",
      cost: "€250 flat",
      contact: "https://example.test/contact",
      isPublicPreview: false,
    });

    const payments = await db.select().from(paymentsTable);
    expect(payments.some((payment) => payment.email === posterEmail)).toBe(false);
  });

  it("keeps hiring adverts without a stated rate off the Exchange board", async () => {
    const posterEmail = `advert-no-rate-${crypto.randomUUID()}@example.test`;
    cleanupEmails.push(posterEmail);
    const response = await request.post("/api/adverts").send({
      direction: "hiring",
      posterName: "Test poster",
      posterEmail,
      city: "Berlin",
      title: "Unpriced paid gig",
      description: "A hiring advert without a stated rate or budget.",
      contact: "test@example.test",
    }).expect(201);

    const exchangeResponse = await request.get("/api/residency").expect(200);
    expect(exchangeResponse.body.some((offer: { id: number }) => offer.id === response.body.id)).toBe(false);
  });

  it("keeps service adverts on Adverts even when a rate is supplied", async () => {
    const posterEmail = `advert-service-${crypto.randomUUID()}@example.test`;
    cleanupEmails.push(posterEmail);
    const response = await request.post("/api/adverts").send({
      direction: "service",
      posterName: "Test poster",
      posterEmail,
      city: "Berlin",
      title: "Graphic design services",
      description: "Offering graphic design services to artists and community spaces.",
      contact: "test@example.test",
      rate: "€50/hour",
    }).expect(201);

    const exchangeResponse = await request.get("/api/residency").expect(200);
    expect(exchangeResponse.body.some((offer: { id: number }) => offer.id === response.body.id)).toBe(false);
  });

  it("publishes open calls as their own non-cash Adverts category", async () => {
    const posterEmail = `advert-open-call-${crypto.randomUUID()}@example.test`;
    cleanupEmails.push(posterEmail);
    const response = await request.post("/api/adverts").send({
      direction: "open_call",
      posterName: "Test poster",
      posterEmail,
      city: "Berlin",
      title: "Music feature for Patron Post",
      description: "A non-cash open call for original music submissions.",
      contact: "@countercult_creatives",
    }).expect(201);

    const advertsResponse = await request.get("/api/adverts").expect(200);
    const advert = advertsResponse.body.find((item: { id: number }) => item.id === response.body.id);
    expect(advert).toMatchObject({
      direction: "open_call",
      rate: null,
      title: "Music feature for Patron Post",
    });

    const exchangeResponse = await request.get("/api/residency").expect(200);
    expect(exchangeResponse.body.some((offer: { id: number }) => offer.id === response.body.id)).toBe(false);
  });

  it("expires adverts at 14 days and returns the deadline for active posts", async () => {
    const oldEmail = `advert-old-${crypto.randomUUID()}@example.test`;
    const currentEmail = `advert-current-${crypto.randomUUID()}@example.test`;
    cleanupEmails.push(oldEmail, currentEmail);
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const oldCreatedAt = new Date(now - 15 * 24 * 60 * 60 * 1000);
    const currentCreatedAt = new Date(now - 13 * 24 * 60 * 60 * 1000);

    const [oldAdvert] = await db.insert(residencyOffersTable).values({
      kind: "advert",
      posterName: "Old poster",
      posterEmail: oldEmail,
      city: "Berlin",
      destination: "Old listing",
      description: "This advert should have expired already.",
      contact: "old@example.test",
      tags: ["advert:free", "advert:hiring"],
      isActive: true,
      visibility: "public",
      createdAt: oldCreatedAt,
    }).returning({ id: residencyOffersTable.id });
    const [currentAdvert] = await db.insert(residencyOffersTable).values({
      kind: "advert",
      posterName: "Current poster",
      posterEmail: currentEmail,
      city: "Berlin",
      destination: "Current listing",
      description: "This advert should remain visible for now.",
      contact: "current@example.test",
      tags: ["advert:free", "advert:hiring"],
      isActive: true,
      visibility: "public",
      createdAt: currentCreatedAt,
    }).returning({ id: residencyOffersTable.id });

    const response = await request.get("/api/adverts").expect(200);

    expect(response.body.some((advert: { id: number }) => advert.id === oldAdvert.id)).toBe(false);
    const current = response.body.find((advert: { id: number }) => advert.id === currentAdvert.id);
    expect(current).toMatchObject({
      id: currentAdvert.id,
      expiresAt: new Date(currentCreatedAt.getTime() + fourteenDays).toISOString(),
    });

    const records = await db.select({
      id: residencyOffersTable.id,
      isActive: residencyOffersTable.isActive,
    }).from(residencyOffersTable);
    expect(records.find((advert) => advert.id === oldAdvert.id)?.isActive).toBe(false);
    expect(records.find((advert) => advert.id === currentAdvert.id)?.isActive).toBe(true);
  });

  it("no longer exposes the advert checkout endpoint", async () => {
    await request.post("/api/adverts/checkout").send({}).expect(404);
  });
});
