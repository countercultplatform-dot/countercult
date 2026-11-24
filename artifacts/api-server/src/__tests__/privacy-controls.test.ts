import { afterEach, describe, expect, it } from "vitest";
import supertest from "supertest";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import app from "../app.js";
import {
  db,
  entriesTable,
  exchangeDigestUnsubscribeTokensTable,
  magicLinkTokensTable,
  privacyRequestsTable,
  usersTable,
} from "@workspace/db";
import { hashExchangeDigestUnsubscribeToken } from "../lib/exchangeDigest.js";

const request = supertest(app);
const testEmails: string[] = [];
const testEntryIds: number[] = [];
const testTokenIds: number[] = [];
const testRequestIds: number[] = [];

async function createMember() {
  const email = `privacy-${crypto.randomUUID()}@example.test`;
  testEmails.push(email);
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: await bcrypt.hash("correct horse battery staple", 4),
    isApproved: true,
    newsletterOptIn: true,
  }).returning();
  if (!user) throw new Error("privacy test user was not created");

  const [entry] = await db.insert(entriesTable).values({
    name: "Privacy Regression Profile",
    kind: "artist",
    city: "Paris",
    country: "France",
    contactEmail: email,
    submittedBy: email,
    status: "published",
    isApproved: true,
    isHidden: false,
    tags: [],
    openTo: [],
    portfolioPhotos: [],
  }).returning();
  if (!entry) throw new Error("privacy test entry was not created");
  testEntryIds.push(entry.id);

  const [session] = await db.insert(magicLinkTokensTable).values({
    token: `privacy-session-${crypto.randomUUID()}`,
    email,
    entryId: entry.id,
    purpose: "session",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  }).returning();
  if (!session) throw new Error("privacy test session was not created");
  testTokenIds.push(session.id);
  return { email, entryId: entry.id, token: session.token };
}

afterEach(async () => {
  if (testRequestIds.length > 0) {
    await db.delete(privacyRequestsTable).where(or(...testRequestIds.map((id) => eq(privacyRequestsTable.id, id))));
  }
  if (testTokenIds.length > 0) {
    await db.delete(magicLinkTokensTable).where(or(...testTokenIds.map((id) => eq(magicLinkTokensTable.id, id))));
  }
  if (testEntryIds.length > 0) {
    await db.delete(entriesTable).where(or(...testEntryIds.map((id) => eq(entriesTable.id, id))));
  }
  for (const email of testEmails) {
    await db.delete(exchangeDigestUnsubscribeTokensTable).where(eq(exchangeDigestUnsubscribeTokensTable.email, email));
    await db.delete(privacyRequestsTable).where(eq(privacyRequestsTable.email, email));
    await db.delete(magicLinkTokensTable).where(eq(magicLinkTokensTable.email, email));
    await db.delete(entriesTable).where(or(eq(entriesTable.contactEmail, email), eq(entriesTable.submittedBy, email)));
    await db.delete(usersTable).where(eq(usersTable.email, email));
  }
  testEmails.length = 0;
  testEntryIds.length = 0;
  testTokenIds.length = 0;
  testRequestIds.length = 0;
});

describe("member privacy controls", () => {
  it("exports scoped data and records hide, unhide, and newsletter withdrawal actions", async () => {
    const member = await createMember();

    expect((await request.get("/api/privacy/export")).status).toBe(401);

    const exportResponse = await request
      .get("/api/privacy/export")
      .set("Authorization", `Bearer ${member.token}`);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers["content-disposition"]).toContain("countercult-data-export.json");
    expect(exportResponse.body.account).toMatchObject({ email: member.email, newsletterOptIn: true });
    expect(exportResponse.body.profiles).toHaveLength(1);
    expect(exportResponse.body.account).not.toHaveProperty("passwordHash");
    expect(exportResponse.body.sessionHistory[0]).not.toHaveProperty("token");

    const hideResponse = await request
      .post("/api/privacy/requests")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ requestType: "hide_profile" });
    expect(hideResponse.status).toBe(201);
    expect(hideResponse.body.request.status).toBe("completed");
    if (hideResponse.body.request.id) testRequestIds.push(hideResponse.body.request.id);

    const [hidden] = await db.select({ isHidden: entriesTable.isHidden }).from(entriesTable).where(eq(entriesTable.id, member.entryId));
    expect(hidden?.isHidden).toBe(true);

    const unhideResponse = await request
      .post("/api/privacy/requests")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ requestType: "unhide_profile" });
    expect(unhideResponse.status).toBe(201);
    if (unhideResponse.body.request.id) testRequestIds.push(unhideResponse.body.request.id);

    const newsletterResponse = await request
      .post("/api/privacy/requests")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ requestType: "newsletter_withdrawal" });
    expect(newsletterResponse.status).toBe(201);
    if (newsletterResponse.body.request.id) testRequestIds.push(newsletterResponse.body.request.id);

    const [updatedUser] = await db.select({ newsletterOptIn: usersTable.newsletterOptIn }).from(usersTable).where(eq(usersTable.email, member.email));
    expect(updatedUser?.newsletterOptIn).toBe(false);
  });

  it("queues deletion and lets an admin complete it without exposing unrelated fields", async () => {
    const member = await createMember();
    const adminPassword = process.env.ADMIN_PASSWORD;
    expect(adminPassword).toBeTruthy();

    const deletionResponse = await request
      .post("/api/privacy/requests")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ requestType: "delete", details: "Please remove my account." });
    expect(deletionResponse.status).toBe(201);
    expect(deletionResponse.body.request.status).toBe("pending");
    const requestId = deletionResponse.body.request.id as number;
    testRequestIds.push(requestId);

    const adminList = await request
      .get("/api/admin/privacy/requests")
      .set("x-admin-password", adminPassword!);
    expect(adminList.status).toBe(200);
    const listed = adminList.body.find((row: { id: number }) => row.id === requestId);
    expect(listed).toMatchObject({ email: member.email, requestType: "delete", status: "pending" });
    expect(listed).not.toHaveProperty("passwordHash");

    const completeResponse = await request
      .patch(`/api/admin/privacy/requests/${requestId}`)
      .set("x-admin-password", adminPassword!)
      .send({ status: "completed" });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.request.status).toBe("completed");

    const [deletedUser] = await db.select().from(usersTable).where(eq(usersTable.email, member.email));
    expect(deletedUser).toBeUndefined();
    const [redactedEntry] = await db.select().from(entriesTable).where(eq(entriesTable.id, member.entryId));
    expect(redactedEntry).toMatchObject({
      name: "deleted profile",
      status: "deleted",
      isHidden: true,
      contactEmail: null,
      heroPhoto: null,
    });
    const [deletedSession] = await db.select().from(magicLinkTokensTable).where(and(
      eq(magicLinkTokensTable.id, testTokenIds[0]!),
      eq(magicLinkTokensTable.purpose, "session"),
    ));
    expect(deletedSession).toBeUndefined();
  });

  it("does not unsubscribe on link-open, but confirms and applies the digest opt-out on submit", async () => {
    const member = await createMember();
    await db.update(usersTable)
      .set({ exchangeDigestOptIn: true, exchangeDigestOptedInAt: new Date() })
      .where(eq(usersTable.email, member.email));
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(exchangeDigestUnsubscribeTokensTable).values({
      email: member.email,
      tokenHash: hashExchangeDigestUnsubscribeToken(token),
    });

    const confirmation = await request
      .get("/api/exchange-digest/unsubscribe")
      .query({ token });
    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain("Stop the weekly Exchange email");
    const [unchanged] = await db
      .select({ exchangeDigestOptIn: usersTable.exchangeDigestOptIn })
      .from(usersTable)
      .where(eq(usersTable.email, member.email));
    expect(unchanged?.exchangeDigestOptIn).toBe(true);

    const unsubscribed = await request
      .post("/api/exchange-digest/unsubscribe")
      .query({ token });
    expect(unsubscribed.status).toBe(200);
    expect(unsubscribed.text).toContain("You’re unsubscribed");
    const [updated] = await db
      .select({
        exchangeDigestOptIn: usersTable.exchangeDigestOptIn,
        exchangeDigestOptedInAt: usersTable.exchangeDigestOptedInAt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, member.email));
    expect(updated?.exchangeDigestOptIn).toBe(false);
    expect(updated?.exchangeDigestOptedInAt).toBeNull();

    const usedLink = await request
      .get("/api/exchange-digest/unsubscribe")
      .query({ token });
    expect(usedLink.status).toBe(410);
  });
});