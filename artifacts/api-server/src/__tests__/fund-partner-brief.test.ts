import { afterAll, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { randomInt, randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, fundApplicationsTable } from "@workspace/db";

vi.mock("../lib/email.js", () => ({
  sendFundApplicationEmail: vi.fn(),
  sendFundPartnerBriefEmail: vi.fn(),
}));

import app from "../app.js";
import { sendFundApplicationEmail, sendFundPartnerBriefEmail } from "../lib/email.js";

const request = supertest(app);
const uniqueClientIp = () => `10.${randomInt(1, 255)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
const fundApplicationTestEmails = [
  `fund-route-${randomUUID()}@example.test`,
  `fund-route-legacy-${randomUUID()}@example.test`,
];

afterAll(async () => {
  await db.delete(fundApplicationsTable).where(inArray(fundApplicationsTable.email, fundApplicationTestEmails));
});

const validBrief = {
  name: "Alex Partner",
  email: "alex@example.test",
  business: "Martha's Delicious Burgers",
  product: "Every burger meal",
  locations: "Berlin and Potsdam",
  contributionAmount: "€1 per sale",
  desiredCreativeWork: "Paid sets by local electronic artists",
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  artistBooking: true,
  production: false,
  notes: "We would like to start with a small pilot.",
  company: "",
};

const validApplication = {
  name: "Alex Partner",
  email: fundApplicationTestEmails[0],
  business: "Example Retail Group",
  location: "Berlin, Germany",
  website: "https://example.test",
  fundingRoute: "client_programme_budget",
  products: "A local artist residency and public programme",
  amountPerSale: "€25,000 programme budget",
  desiredCreativeWork: "community_programmes_residencies",
  notes: "A defined programme for the Berlin launch.",
};

describe("Fund application endpoint", () => {
  it("accepts a client-funded programme budget and includes its route in the notification", async () => {
    const response = await request
      .post("/api/fund/applications")
      .set("x-forwarded-for", uniqueClientIp())
      .send(validApplication)
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    expect(sendFundApplicationEmail).toHaveBeenCalledWith(expect.objectContaining({
      business: validApplication.business,
      fundingRoute: "client_programme_budget",
      amountPerSale: validApplication.amountPerSale,
    }));
  });

  it("keeps legacy applications on the sales-linked route by default", async () => {
    const { fundingRoute: _fundingRoute, ...legacyApplication } = validApplication;
    const legacyPayload = { ...legacyApplication, email: fundApplicationTestEmails[1] };

    await request
      .post("/api/fund/applications")
      .set("x-forwarded-for", uniqueClientIp())
      .send(legacyPayload)
      .expect(201);

    expect(sendFundApplicationEmail).toHaveBeenCalledWith(expect.objectContaining({
      fundingRoute: "sales_linked",
    }));
  });

  it("rejects unsupported Fund routes", async () => {
    await request
      .post("/api/fund/applications")
      .set("x-forwarded-for", uniqueClientIp())
      .send({ ...validApplication, fundingRoute: "grant" })
      .expect(400);
  });
});

describe("Fund partner brief endpoint", () => {
  it("accepts a complete brief for review", async () => {
    const response = await request
      .post("/api/fund/partner-brief")
      .set("x-forwarded-for", uniqueClientIp())
      .send(validBrief)
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    expect(sendFundPartnerBriefEmail).toHaveBeenCalledWith({
      name: validBrief.name,
      email: validBrief.email,
      business: validBrief.business,
      product: validBrief.product,
      locations: validBrief.locations,
      contributionAmount: validBrief.contributionAmount,
      desiredCreativeWork: validBrief.desiredCreativeWork,
      startDate: validBrief.startDate,
      endDate: validBrief.endDate,
      artistBooking: validBrief.artistBooking,
      production: validBrief.production,
      notes: validBrief.notes,
    });
  });

  it("rejects an end date before the start date", async () => {
    const response = await request
      .post("/api/fund/partner-brief")
      .set("x-forwarded-for", uniqueClientIp())
      .send({ ...validBrief, startDate: "2026-12-01", endDate: "2026-11-30" })
      .expect(400);

    expect(response.body.error).toContain("required Fund partner brief fields");
  });

  it("does not report success when email delivery fails", async () => {
    vi.mocked(sendFundPartnerBriefEmail).mockRejectedValueOnce(new Error("provider rejected email"));

    await request
      .post("/api/fund/partner-brief")
      .set("x-forwarded-for", uniqueClientIp())
      .send(validBrief)
      .expect(500);
  });

  it("requires the desired local creative work", async () => {
    const { desiredCreativeWork: _desiredCreativeWork, ...incompleteBrief } = validBrief;

    await request
      .post("/api/fund/partner-brief")
      .set("x-forwarded-for", uniqueClientIp())
      .send(incompleteBrief)
      .expect(400);
  });

  it("rejects a filled honeypot field", async () => {
    const callsBeforeRequest = vi.mocked(sendFundPartnerBriefEmail).mock.calls.length;

    await request
      .post("/api/fund/partner-brief")
      .set("x-forwarded-for", uniqueClientIp())
      .send({ ...validBrief, company: "spam" })
      .expect(400);

    expect(sendFundPartnerBriefEmail).toHaveBeenCalledTimes(callsBeforeRequest);
  });
});