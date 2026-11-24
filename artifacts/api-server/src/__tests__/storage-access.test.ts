import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, entriesTable, magicLinkTokensTable, residencyOffersTable, studioArtworksTable, usersTable } from "@workspace/db";

const storageState = vi.hoisted(() => ({
  objectPaths: [] as string[],
}));

vi.mock("../lib/objectStorage.js", () => ({
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "/bucket/private";
    }

    normalizeObjectEntityPath(value: string) {
      if (value === "https://storage.googleapis.com/bucket/private/uploads/test.jpg") {
        return "/objects/uploads/test.jpg";
      }
      return value;
    }

    async getObjectEntityFile(path: string) {
      storageState.objectPaths.push(path);
      return { name: path };
    }

    async downloadObject() {
      return new Response("storage fixture", {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    }

    async canAccessObjectEntity() {
      return false;
    }
  },
}));

import app from "../app.js";

const request = supertest(app);
const insertedEntryIds: number[] = [];
const insertedOfferIds: number[] = [];
const insertedArtworkIds: string[] = [];
const insertedEmails: string[] = [];
const insertedTokens: string[] = [];
const originalAdminPassword = process.env.ADMIN_PASSWORD;

async function insertEntry(overrides: Partial<typeof entriesTable.$inferInsert> = {}) {
  const [entry] = await db.insert(entriesTable).values({
    name: `Storage access ${crypto.randomUUID()}`,
    kind: "artist",
    city: "Paris",
    country: "France",
    tags: [],
    subcultures: [],
    openTo: [],
    status: "published",
    isApproved: true,
    isHidden: false,
    visibility: "public",
    portfolioPhotos: [],
    ...overrides,
  }).returning();
  if (!entry) throw new Error("storage access test entry was not created");
  insertedEntryIds.push(entry.id);
  return entry;
}

async function insertSession(email: string, isApproved: boolean, entryId: number | null = null) {
  await db.insert(usersTable).values({
    email,
    isApproved,
    accountRole: "member",
  });
  insertedEmails.push(email);

  const token = `storage-test-${crypto.randomUUID()}`;
  await db.insert(magicLinkTokensTable).values({
    token,
    email,
    entryId,
    purpose: "session",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  insertedTokens.push(token);
  return token;
}

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "storage-test-admin-password";
});

afterAll(() => {
  if (originalAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = originalAdminPassword;
});

afterEach(async () => {
  if (insertedOfferIds.length) {
    await db.delete(residencyOffersTable).where(inArray(residencyOffersTable.id, insertedOfferIds));
    insertedOfferIds.length = 0;
  }
  if (insertedArtworkIds.length) {
    await db.delete(studioArtworksTable).where(inArray(studioArtworksTable.id, insertedArtworkIds));
    insertedArtworkIds.length = 0;
  }
  if (insertedTokens.length) {
    await db.delete(magicLinkTokensTable).where(inArray(magicLinkTokensTable.token, insertedTokens));
    insertedTokens.length = 0;
  }
  if (insertedEntryIds.length) {
    await db.delete(entriesTable).where(inArray(entriesTable.id, insertedEntryIds));
    insertedEntryIds.length = 0;
  }
  if (insertedEmails.length) {
    await db.delete(usersTable).where(inArray(usersTable.email, insertedEmails));
    insertedEmails.length = 0;
  }
  storageState.objectPaths.length = 0;
});

describe("private object route authorization", () => {
  it("serves exact media references from eligible public profiles", async () => {
    const heroPath = "/api/storage/objects/uploads/public-hero";
    const portfolioPath = "/api/storage/objects/uploads/public-work";
    await insertEntry({
      kind: "space",
      name: "Public Cultural Space",
      heroPhoto: heroPath,
      portfolioPhotos: [portfolioPath],
    });

    await request.get("/api/storage/objects/uploads/public-hero")
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
    await request.get("/api/storage/objects/uploads/public-work")
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
  });

  it("serves only the profile photo of a consented public artist to anonymous visitors", async () => {
    const heroPath = "/api/storage/objects/uploads/public-artist-hero";
    const portfolioPath = "/api/storage/objects/uploads/public-artist-work";
    await insertEntry({
      name: "Public Artist",
      kind: "artist",
      heroPhoto: heroPath,
      portfolioPhotos: [portfolioPath],
      publicProfileConsentAt: new Date(),
    });

    await request.get("/api/storage/objects/uploads/public-artist-hero")
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
    await request.get("/api/storage/objects/uploads/public-artist-work")
      .expect(404);
  });

  it("does not make an artist photo public without recorded public-profile consent", async () => {
    await insertEntry({
      name: "Unconsented Artist",
      kind: "artist",
      heroPhoto: "/api/storage/objects/uploads/unconsented-artist-hero",
    });

    await request.get("/api/storage/objects/uploads/unconsented-artist-hero").expect(404);
  });

  it("denies anonymous reads of unapproved, hidden, network-only, and unreferenced objects", async () => {
    const unapproved = await insertEntry({
      isApproved: false,
      heroPhoto: "/api/storage/objects/uploads/unapproved",
    });
    const hidden = await insertEntry({
      isHidden: true,
      heroPhoto: "/api/storage/objects/uploads/hidden",
    });
    const network = await insertEntry({
      visibility: "network",
      heroPhoto: "/api/storage/objects/uploads/network",
    });
    const testIds = [unapproved.id, hidden.id, network.id];
    expect(testIds).toHaveLength(3);

    await request.get("/api/storage/objects/uploads/unapproved").expect(404);
    await request.get("/api/storage/objects/uploads/hidden").expect(404);
    await request.get("/api/storage/objects/uploads/network").expect(404);
    await request.get("/api/storage/objects/uploads/not-linked").expect(404);
    expect(storageState.objectPaths).toHaveLength(0);
  });

  it("allows only website-prepared curated Studio artwork to be public", async () => {
    const publicId = `storage-art-${crypto.randomUUID()}`;
    const privateId = `storage-art-${crypto.randomUUID()}`;
    const photos = [{ name: "Artwork", objectPath: "/objects/uploads/studio-art" }];
    await db.insert(studioArtworksTable).values([
      {
        id: publicId,
        title: "Curated artwork",
        seoTitle: "Curated artwork",
        seoDescription: "Public Studio artwork used for storage authorization tests",
        seoKeywords: [],
        year: "",
        dimensions: "",
        medium: "Mixed media",
        price: "",
        availability: "Available",
        notes: "",
        photos,
        readiness: "Ready",
        destinations: {
          website: "Prepared",
          store: "Not prepared",
          social: "Not prepared",
          newsletter: "Not prepared",
          marketplaces: "Not prepared",
        },
      },
      {
        id: privateId,
        title: "Unprepared artwork",
        seoTitle: "Unprepared artwork",
        seoDescription: "Not public",
        seoKeywords: [],
        year: "",
        dimensions: "",
        medium: "Mixed media",
        price: "",
        availability: "Available",
        notes: "",
        photos: [{ name: "Artwork", objectPath: "/objects/uploads/unprepared-art" }],
        readiness: "Needs details",
        destinations: {
          website: "Prepared",
          store: "Not prepared",
          social: "Not prepared",
          newsletter: "Not prepared",
          marketplaces: "Not prepared",
        },
      },
    ]);
    insertedArtworkIds.push(publicId, privateId);

    await request.get("/api/storage/objects/uploads/studio-art")
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
    await request.get("/api/storage/objects/uploads/unprepared-art")
      .expect(404);
  });

  it("keeps network profile media limited to approved sessions and owners", async () => {
    const memberEmail = `network-member-${crypto.randomUUID()}@example.test`;
    const networkEntry = await insertEntry({
      contactEmail: `network-owner-${crypto.randomUUID()}@example.test`,
      visibility: "network",
      heroPhoto: "/api/storage/objects/uploads/network-photo",
    });
    const token = await insertSession(memberEmail, true);
    await request.get("/api/storage/objects/uploads/network-photo").expect(404);
    await request.get("/api/storage/objects/uploads/network-photo")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);

    const ownerEmail = `pending-owner-${crypto.randomUUID()}@example.test`;
    const pendingEntry = await insertEntry({
      contactEmail: ownerEmail,
      status: "pending",
      isApproved: false,
      visibility: "private",
      heroPhoto: "/api/storage/objects/uploads/pending-owner-photo",
    });
    const ownerToken = await insertSession(ownerEmail, false, pendingEntry.id);
    await request.get("/api/storage/objects/uploads/pending-owner-photo")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
    expect(networkEntry.id).toBeGreaterThan(0);
  });

  it("keeps Exchange photos out of anonymous reads and applies member visibility", async () => {
    const memberEmail = `exchange-member-${crypto.randomUUID()}@example.test`;
    const token = await insertSession(memberEmail, true);
    const [offer] = await db.insert(residencyOffersTable).values({
      kind: "collab",
      city: "Paris",
      description: "A public collaboration listing",
      tags: [],
      photos: ["/api/storage/objects/uploads/exchange-photo"],
      visibility: "public",
      isActive: true,
    }).returning();
    if (!offer) throw new Error("storage access test offer was not created");
    insertedOfferIds.push(offer.id);

    await request.get("/api/storage/objects/uploads/exchange-photo").expect(404);
    await request.get("/api/storage/objects/uploads/exchange-photo")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
  });

  it("serves private moderation previews only through the admin header", async () => {
    const path = "/objects/uploads/admin-preview";
    await request.get(`/api/admin/storage/preview?path=${encodeURIComponent(path)}`)
      .expect(401);
    await request.get(`/api/admin/storage/preview?path=${encodeURIComponent(path)}`)
      .set("x-admin-password", "storage-test-admin-password")
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);
    await request.get(`/api/admin/storage/preview?path=${encodeURIComponent("/objects/uploads/../secret")}`)
      .set("x-admin-password", "storage-test-admin-password")
      .expect(400);
  });
});