import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import supertest from "supertest";
import { db, artHouseApplicationsTable } from "@workspace/db";
import app from "../app";
import { deleteAccountData } from "../routes/privacy";

const originalAdminPassword = process.env.ADMIN_PASSWORD;
const originalNodeEnv = process.env.NODE_ENV;
const testEmails: string[] = [];

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "test-art-house-admin-password";
  process.env.NODE_ENV = "test";
});

afterAll(async () => {
  for (const email of testEmails) {
    await db.delete(artHouseApplicationsTable).where(eq(artHouseApplicationsTable.email, email));
  }
  if (originalAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = originalAdminPassword;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

function createApplicationPayload(email: string) {
  return {
    name: "Application Test",
    email,
    applyingAs: "solo",
    portfolioUrl: "https://example.org/work",
    availableFrom: "2026-12-16",
    availableTo: "2026-12-20",
    residencyPlan: "I would use the time to make a small body of new work.",
    sharedLiving: "I communicate clearly and respect shared spaces and routines.",
    friendsDescription: "My friends would describe me as thoughtful, curious, and reliable.",
    networkMember: false,
    networkConnection: "",
    considerPatronPost: true,
    privacyConsent: true,
    honeypot: "",
  };
}

function uniqueEmail() {
  const email = `art-house-test-${crypto.randomUUID()}@example.org`;
  testEmails.push(email);
  return email;
}

describe("Countercult Art Houses applications", () => {
  it("saves a partial-stay application, including optional Patron Post interest", async () => {
    const email = uniqueEmail();
    const response = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.42")
      .send(createApplicationPayload(email));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ submitted: true });

    const [saved] = await db.select().from(artHouseApplicationsTable).where(eq(artHouseApplicationsTable.email, email));
    expect(saved).toMatchObject({
      email,
      applyingAs: "solo",
      availableForAllDates: false,
      availableFrom: "2026-12-16",
      availableTo: "2026-12-20",
      friendsDescription: "My friends would describe me as thoughtful, curious, and reliable.",
      networkMember: false,
      considerPatronPost: true,
      status: "new",
    });
    expect(saved.privacyConsentAt).toBeInstanceOf(Date);
  });

  it("keeps application review behind Studio access and allows status updates", async () => {
    const email = uniqueEmail();
    await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.43")
      .send(createApplicationPayload(email))
      .expect(201);

    await supertest(app).get("/api/studio/art-house-applications").expect(401);

    const listResponse = await supertest(app)
      .get("/api/studio/art-house-applications")
      .set("x-admin-password", "test-art-house-admin-password")
      .expect(200);
    const application = listResponse.body.find((record: { email: string }) => record.email === email);
    expect(application).toMatchObject({
      email,
      availableForAllDates: false,
      availableFrom: "2026-12-16",
      availableTo: "2026-12-20",
      friendsDescription: "My friends would describe me as thoughtful, curious, and reliable.",
      considerPatronPost: true,
      status: "new",
    });

    const updated = await supertest(app)
      .patch(`/api/studio/art-house-applications/${application.id}`)
      .set("x-admin-password", "test-art-house-admin-password")
      .send({ status: "reviewed" })
      .expect(200);
    expect(updated.body.status).toBe("reviewed");
    expect(updated.body.reviewedAt).toBeTruthy();
  });

  it("rejects impossible or out-of-range dates, invalid links, and incomplete duo details", async () => {
    const outOfRangePayload = { ...createApplicationPayload(uniqueEmail()), availableFrom: "2026-12-15" };
    const outOfRange = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.44")
      .send(outOfRangePayload);
    expect(outOfRange.status).toBe(400);

    const impossibleDatePayload = { ...createApplicationPayload(uniqueEmail()), availableFrom: "2026-12-32" };
    const impossibleDate = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.49")
      .send(impossibleDatePayload);
    expect(impossibleDate.status).toBe(400);

    const invertedDatesPayload = {
      ...createApplicationPayload(uniqueEmail()),
      availableFrom: "2026-12-21",
      availableTo: "2026-12-20",
    };
    const invertedDates = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.48")
      .send(invertedDatesPayload);
    expect(invertedDates.status).toBe(400);

    const invalidLinkPayload = { ...createApplicationPayload(uniqueEmail()), portfolioUrl: "ftp://example.org/work" };
    const invalidLink = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.45")
      .send(invalidLinkPayload);
    expect(invalidLink.status).toBe(400);

    const incompleteDuoPayload = { ...createApplicationPayload(uniqueEmail()), applyingAs: "duo" };
    const incompleteDuo = await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.46")
      .send(incompleteDuoPayload);
    expect(incompleteDuo.status).toBe(400);
  });

  it("includes residency applications in data removal requests", async () => {
    const email = uniqueEmail();
    await supertest(app)
      .post("/api/applications/art-houses")
      .set("x-forwarded-for", "198.51.100.47")
      .send(createApplicationPayload(email))
      .expect(201);

    const deletion = await deleteAccountData(email);
    expect(deletion.deletedArtHouseApplications).toBe(1);
    const remaining = await db.select({ id: artHouseApplicationsTable.id })
      .from(artHouseApplicationsTable)
      .where(eq(artHouseApplicationsTable.email, email));
    expect(remaining).toHaveLength(0);
  });
});
