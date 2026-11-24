import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import app from "../app.js";
import { db, entriesTable } from "@workspace/db";

const request = supertest(app);
const createdIds: number[] = [];
const adminPassword = "curation-import-test-admin";

beforeEach(() => vi.stubEnv("ADMIN_PASSWORD", adminPassword));

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const id of createdIds) {
    await db.delete(entriesTable).where(eq(entriesTable.id, id));
  }
  createdIds.length = 0;
});

describe("curated pin import", () => {
  it("publishes pins without inventing a contact email and makes repeat imports idempotent", async () => {
    const sourceKey = `crab-${crypto.randomUUID()}`;
    const input = {
      entries: [{
        sourceKey,
        name: `Curated import test ${crypto.randomUUID()}`,
        kind: "space",
        city: "Test Village",
        country: "Test Country",
        lat: 41.25,
        lng: -8.75,
        url: "https://example.test/venue",
        tags: ["CRAB"],
      }],
    };

    const first = await request
      .post("/api/admin/entries/curation-import")
      .set("x-admin-password", adminPassword)
      .send(input);

    expect(first.status).toBe(201);
    expect(first.body.results).toHaveLength(1);
    expect(first.body.results[0]).toMatchObject({ sourceKey, action: "created" });
    const id = first.body.results[0].id as number;
    createdIds.push(id);

    const [saved] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
    expect(saved).toMatchObject({
      kind: "space",
      city: "Test Village",
      country: "Test Country",
      status: "published",
      isApproved: true,
      visibility: "public",
      mapEligible: true,
      contactEmail: null,
      lat: 41.25,
      lng: -8.75,
    });

    const repeat = await request
      .post("/api/admin/entries/curation-import")
      .set("x-admin-password", adminPassword)
      .send(input);
    expect(repeat.status).toBe(201);
    expect(repeat.body.results[0]).toMatchObject({ sourceKey, id, action: "existing" });
  });

  it("rejects imports without admin authentication", async () => {
    const response = await request
      .post("/api/admin/entries/curation-import")
      .send({ entries: [] });

    expect(response.status).toBe(401);
  });

  it("rebuilds a tester entry in place and preserves its id", async () => {
    const name = `Rural collective test ${crypto.randomUUID()}`;
    const [original] = await db.insert(entriesTable).values({
      name: `Tester ${name}`,
      kind: "space",
      city: "Old City",
      country: "Old Country",
      tags: [],
      subcultures: [],
      isApproved: true,
      status: "published",
      visibility: "public",
      mapEligible: true,
      isClaimed: false,
      claimedEmail: null,
      isHidden: false,
    }).returning();
    if (!original) throw new Error("tester row was not created");
    createdIds.push(original.id);

    const response = await request
      .post("/api/admin/entries/curation-import")
      .set("x-admin-password", adminPassword)
      .send({
        entries: [{
          sourceKey: `crab-${crypto.randomUUID()}`,
          replaceEntryId: original.id,
          name,
          kind: "artist",
          city: "Anceu, Galicia",
          country: "Spain",
          lat: 42.3,
          lng: -8.4,
          url: "https://example.test/collective",
          tags: ["CRAB", "collective"],
        }],
      });

    expect(response.status).toBe(201);
    expect(response.body.results[0]).toMatchObject({ id: original.id, action: "existing" });
    const [rebuilt] = await db.select().from(entriesTable).where(eq(entriesTable.id, original.id));
    expect(rebuilt).toMatchObject({
      name,
      kind: "artist",
      city: "Anceu, Galicia",
      status: "published",
      isApproved: true,
      mapEligible: true,
      isHidden: false,
    });
  });
});
