import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import app from "../app.js";
import { db, entriesTable, magicLinkTokensTable, residencyOffersTable, usersTable } from "@workspace/db";

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

const request = supertest(app);
const testEmails: string[] = [];
const testEntryIds: number[] = [];
const testOfferIds: number[] = [];
const adminPassword = "space-claim-test-admin";

function uniqueEmail() {
  const email = `space-claim-${crypto.randomUUID()}@example.test`;
  testEmails.push(email);
  return email;
}

async function insertPublicSpace(kind: "space" | "artist" = "space", tags: string[] = []) {
  const [entry] = await db.insert(entriesTable).values({
    name: `Claim test space ${crypto.randomUUID()}`,
    kind,
    city: "Test City",
    country: "Test Country",
    tags,
    subcultures: [],
    openTo: [],
    isApproved: true,
    visibility: "public",
    mapEligible: true,
    isClaimed: false,
    claimedEmail: null,
    isHidden: false,
    status: "published",
  }).returning();
  if (!entry) throw new Error("test space was not created");
  testEntryIds.push(entry.id);
  return entry;
}

async function insertInvitation(email: string, entryId: number, rawToken = crypto.randomBytes(32).toString("hex")) {
  await db.insert(magicLinkTokensTable).values({
    token: crypto.createHash("sha256").update(rawToken).digest("hex"),
    email,
    entryId,
    purpose: "space_claim",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return rawToken;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSWORD", adminPassword);
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_DEV_TO", "claim-test-inbox@example.test");
  resendSend.mockReset();
  resendSend.mockResolvedValue({ data: { id: "claim-test-email" }, error: null });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const offerId of testOfferIds) {
    await db.delete(residencyOffersTable).where(eq(residencyOffersTable.id, offerId));
  }
  testOfferIds.length = 0;
  for (const email of testEmails) {
    await db.delete(magicLinkTokensTable).where(eq(magicLinkTokensTable.email, email));
    await db.delete(usersTable).where(eq(usersTable.email, email));
  }
  for (const entryId of testEntryIds) {
    await db.delete(magicLinkTokensTable).where(eq(magicLinkTokensTable.entryId, entryId));
    await db.delete(entriesTable).where(eq(entriesTable.id, entryId));
  }
  testEmails.length = 0;
  testEntryIds.length = 0;
});

describe("verified space claim invitations", () => {
  it("allows a verified claim for a public collective pin", async () => {
    const entry = await insertPublicSpace("artist", ["collective", "CRAB"]);
    const email = uniqueEmail();
    const response = await request
      .post(`/api/admin/entries/${entry.id}/claim-invitations`)
      .set("x-admin-password", adminPassword)
      .send({ email, verificationConfirmed: true });

    expect(response.status).toBe(201);
    expect(resendSend).toHaveBeenCalledTimes(1);
    const message = resendSend.mock.calls[0]?.[0] as { text: string };
    expect(message.text).toContain("one-time claim code on the claim page");
  });

  it("sends an admin-verified invitation and stores only a token digest", async () => {
    const entry = await insertPublicSpace();
    const email = uniqueEmail();
    const scheduledAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const missingVerification = await request
      .post(`/api/admin/entries/${entry.id}/claim-invitations`)
      .set("x-admin-password", adminPassword)
      .send({ email, verificationConfirmed: false });
    expect(missingVerification.status).toBe(400);
    expect(resendSend).not.toHaveBeenCalled();

    const response = await request
      .post(`/api/admin/entries/${entry.id}/claim-invitations`)
      .set("x-admin-password", adminPassword)
      .send({ email, verificationConfirmed: true, scheduledAt: scheduledAt.toISOString() });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      entryId: entry.id,
      entryName: entry.name,
      email,
    });
    expect(resendSend).toHaveBeenCalledTimes(1);

    const emailMessage = resendSend.mock.calls[0]?.[0] as {
      html: string;
      subject: string;
      text: string;
      to: string;
      scheduledAt: string;
    };
    expect(emailMessage.to).toBe("claim-test-inbox@example.test");
    expect(emailMessage.subject).toContain(`We’ve added ${entry.name} to Countercult’s map`);
    const rawToken = emailMessage.text.match(/one-time claim code on the claim page: ([A-F0-9]{12})/)?.[1];
    expect(rawToken).toMatch(/^[A-F0-9]{12}$/);
    expect(emailMessage.scheduledAt).toBe(scheduledAt.toISOString());
    expect(emailMessage.text).toContain(`https://countercult.network/claim-space?entryId=${entry.id}`);
    expect(emailMessage.text).toContain(`https://countercult.network/entries/${entry.id}`);
    expect(emailMessage.text).toContain("Hi, I’m Shona, the artist known as Sketchy Shona");
    expect(emailMessage.text).toContain("information we could find publicly");
    expect(emailMessage.text).toContain("Claiming your pin and sharing there are free");
    expect(emailMessage.html).toContain('href="https://countercult.network/residency" style="color:#c6ff3d;">Explore Countercult Exchange</a>');
    expect(emailMessage.html).toContain(`href="https://countercult.network/entries/${entry.id}"`);
    expect(emailMessage.text).not.toMatch(/If we have anything wrong|rather not be listed|remove your email/);

    const [storedInvitation] = await db
      .select()
      .from(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.email, email),
        eq(magicLinkTokensTable.purpose, "space_claim"),
      ));
    expect(storedInvitation?.token).toBe(
      crypto.createHash("sha256").update(rawToken!).digest("hex"),
    );
    expect(storedInvitation?.token).not.toBe(rawToken);
    const expiresInMs = storedInvitation!.expiresAt.getTime() - Date.now();
    expect(expiresInMs).toBeGreaterThan(59 * 24 * 60 * 60 * 1000);
    expect(expiresInMs).toBeLessThanOrEqual(60 * 24 * 60 * 60 * 1000);
  });

  it("claims the live listing and activates partner Exchange posting access", async () => {
    const entry = await insertPublicSpace();
    const email = uniqueEmail();
    const rawToken = await insertInvitation(email, entry.id);

    const inspected = await request
      .post("/api/auth/space-claims/inspect")
      .set("x-forwarded-for", "198.51.100.201")
      .send({ token: rawToken });
    expect(inspected.status).toBe(200);
    expect(inspected.body).toMatchObject({
      entryId: entry.id,
      entryName: entry.name,
      city: entry.city,
      email,
      hasAccount: false,
      hasPassword: false,
    });

    const accepted = await request
      .post("/api/auth/space-claims/accept")
      .set("x-forwarded-for", "198.51.100.202")
      .send({
        token: rawToken,
        password: "a-long-space-password",
        displayName: "Space Claim Test",
      });

    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({
      ok: true,
      entryId: entry.id,
      entryName: entry.name,
      email,
      isApproved: false,
      canPostPartnerOffers: true,
      accountRole: "member",
    });
    expect(accepted.body.token).toMatch(/^[a-f0-9]{64}$/);

    const [claimedEntry] = await db
      .select()
      .from(entriesTable)
      .where(eq(entriesTable.id, entry.id));
    expect(claimedEntry).toMatchObject({
      id: entry.id,
      isClaimed: true,
      claimedEmail: email,
      isApproved: true,
      visibility: "public",
      status: "published",
      isHidden: false,
      mapEligible: true,
    });

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
    expect(users).toHaveLength(1);
    expect(users[0]?.isApproved).toBe(false);
    expect(users[0]?.canPostPartnerOffers).toBe(true);
    expect(users[0]?.accountRole).toBe("member");
    expect(users[0]?.displayName).toBe("Space Claim Test");
    expect(await bcrypt.compare("a-long-space-password", users[0]!.passwordHash!)).toBe(true);

    const session = await db
      .select()
      .from(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.token, accepted.body.token),
        eq(magicLinkTokensTable.purpose, "session"),
      ));
    expect(session).toHaveLength(1);
    expect(session[0]?.entryId).toBe(entry.id);

    const me = await request
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accepted.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.isApproved).toBe(false);
    expect(me.body.canPostPartnerOffers).toBe(true);
    expect(me.body.entries).toContainEqual(expect.objectContaining({ id: entry.id, name: entry.name }));

    const network = await request
      .get("/api/entries/network")
      .set("Authorization", `Bearer ${accepted.body.token}`);
    expect(network.status).toBe(403);

    const partnerOffer = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${accepted.body.token}`)
      .send({
        kind: "partner_offer",
        city: "Test City",
        description: "A verified partner offer for artists.",
        cost: "Discounted access for artists",
      });
    if (Number.isInteger(partnerOffer.body?.id)) testOfferIds.push(partnerOffer.body.id);
    expect(partnerOffer.status).toBe(201);
    expect(partnerOffer.body).toMatchObject({
      kind: "partner_offer",
      city: "Test City",
      claimerEmail: email,
    });
    const exchangeFeed = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${accepted.body.token}`);
    expect(exchangeFeed.status).toBe(200);
    expect(exchangeFeed.body).toHaveLength(1);
    expect(exchangeFeed.body[0]).toMatchObject({ id: partnerOffer.body.id, isOwn: true });

    const reused = await request
      .post("/api/auth/space-claims/accept")
      .set("x-forwarded-for", "198.51.100.203")
      .send({
        token: rawToken,
        password: "a-long-space-password",
        displayName: "Space Claim Test",
      });
    expect(reused.status).toBe(400);
  });

  it("requires the current password for an existing password account and leaves a failed invite usable", async () => {
    const entry = await insertPublicSpace();
    const email = uniqueEmail();
    const currentPassword = "existing-account-password";
    await db.insert(usersTable).values({
      email,
      passwordHash: await bcrypt.hash(currentPassword, 10),
      displayName: "Existing Member",
      isApproved: true,
      accountRole: "member",
    });
    const rawToken = await insertInvitation(email, entry.id);

    const wrongPassword = await request
      .post("/api/auth/space-claims/accept")
      .set("x-forwarded-for", "198.51.100.204")
      .send({ token: rawToken, password: "not-the-current-password" });
    expect(wrongPassword.status).toBe(401);

    const [stillUnused] = await db
      .select()
      .from(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.email, email),
        eq(magicLinkTokensTable.purpose, "space_claim"),
      ));
    expect(stillUnused?.usedAt).toBeNull();

    const accepted = await request
      .post("/api/auth/space-claims/accept")
      .set("x-forwarded-for", "198.51.100.205")
      .send({ token: rawToken, password: currentPassword });
    expect(accepted.status).toBe(200);
    expect(accepted.body.isApproved).toBe(true);
    expect(accepted.body.canPostPartnerOffers).toBe(true);
    expect(accepted.body.accountRole).toBe("member");
    expect(accepted.body.displayName).toBe("Existing Member");

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
    expect(users).toHaveLength(1);
    expect(users[0]?.passwordHash).toBeTruthy();
    expect(users[0]).toMatchObject({
      isApproved: true,
      accountRole: "member",
      canPostPartnerOffers: true,
    });
    const [claimedEntry] = await db
      .select()
      .from(entriesTable)
      .where(eq(entriesTable.id, entry.id));
    expect(claimedEntry?.status).toBe("published");
    expect(claimedEntry?.isApproved).toBe(true);
    expect(claimedEntry?.claimedEmail).toBe(email);
  });
});
