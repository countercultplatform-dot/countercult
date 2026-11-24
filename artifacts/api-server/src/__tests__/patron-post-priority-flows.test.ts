import express from "express";
import supertest from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  stripeRequestMock,
  sendCheckoutFailureAlertMock,
  dbInsertMock,
  dbInsertValuesMock,
  dbSelectMock,
  dbSelectFromMock,
  dbSelectOrderByMock,
  dbUpdateMock,
  dbUpdateSetMock,
  dbUpdateWhereMock,
  dbUpdateReturningMock,
  dbDeleteMock,
  dbDeleteWhereMock,
  dbDeleteReturningMock,
  studioAdminMock,
  patronPostQuestionsTableMock,
  patronPostSubscriptionsTableMock,
} = vi.hoisted(() => ({
  stripeRequestMock: vi.fn(),
  sendCheckoutFailureAlertMock: vi.fn(),
  dbInsertMock: vi.fn(),
  dbInsertValuesMock: vi.fn(),
  dbSelectMock: vi.fn(),
  dbSelectFromMock: vi.fn(),
  dbSelectOrderByMock: vi.fn(),
  dbUpdateMock: vi.fn(),
  dbUpdateSetMock: vi.fn(),
  dbUpdateWhereMock: vi.fn(),
  dbUpdateReturningMock: vi.fn(),
  dbDeleteMock: vi.fn(),
  dbDeleteWhereMock: vi.fn(),
  dbDeleteReturningMock: vi.fn(),
  studioAdminMock: vi.fn(),
  patronPostQuestionsTableMock: {
    id: "patron_post_questions.id",
    question: "patron_post_questions.question",
    status: "patron_post_questions.status",
    createdAt: "patron_post_questions.created_at",
    reviewedAt: "patron_post_questions.reviewed_at",
  },
  patronPostSubscriptionsTableMock: {
    id: "patron_post_subscriptions.id",
    stripeSubscriptionId: "patron_post_subscriptions.stripe_subscription_id",
    deliveryType: "patron_post_subscriptions.delivery_type",
    status: "patron_post_subscriptions.status",
  },
}));

vi.mock("express-rate-limit", () => ({
  default: () => (...args: unknown[]) => {
    const next = args[2];
    if (typeof next === "function") next();
  },
}));

vi.mock("../lib/stripeClient", () => ({
  stripeRequest: stripeRequestMock,
}));

vi.mock("@workspace/db", () => ({
  db: {
    insert: dbInsertMock,
    select: dbSelectMock,
    update: dbUpdateMock,
    delete: dbDeleteMock,
  },
  pool: {},
  patronPostQuestionsTable: patronPostQuestionsTableMock,
  patronPostSubscriptionsTable: patronPostSubscriptionsTableMock,
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count"),
  desc: vi.fn((value) => value),
  eq: vi.fn((left, right) => ({ left, right })),
}));

vi.mock("../lib/studioAuth", () => ({
  requireStudioAdmin: studioAdminMock,
}));

vi.mock("../lib/email", () => ({
  sendCollectiveFundWelcomeEmail: vi.fn(),
  sendPatronPostCheckoutFailureAlert: sendCheckoutFailureAlertMock,
  sendPatronPostPortalLinkEmail: vi.fn(),
  sendSketchyShonaDigitalWelcomeEmail: vi.fn(),
}));

import patronPostRouter, { refreshPatronPostStatuses } from "../routes/patronPost";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  Object.assign(req, { log: { error: () => undefined } });
  next();
});
app.use("/api", patronPostRouter);
const request = supertest(app);

const envKeys = [
  "NODE_ENV",
  "PATRON_POST_MEMBERSHIP_PRICE_ID",
  "PATRON_POST_POSTAGE_PRICE_ID",
  "PATRON_POST_EARLY_SUPPORTER_COUPON_ID",
  "PATRON_POST_DIGITAL_PRICE_ID",
  "COUNTERCULT_PATRON_POST_MEMBERSHIP_PRICE_ID",
  "COUNTERCULT_PATRON_POST_POSTAGE_PRICE_ID",
  "COUNTERCULT_PATRON_POST_EARLY_SUPPORTER_COUPON_ID",
  "COUNTERCULT_PATRON_POST_DIGITAL_PRICE_ID",
] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.PATRON_POST_MEMBERSHIP_PRICE_ID = "price_sketchy_member_test";
  process.env.PATRON_POST_POSTAGE_PRICE_ID = "price_sketchy_postage_test";
  process.env.PATRON_POST_EARLY_SUPPORTER_COUPON_ID = "coupon_sketchy_hold_test";
  process.env.PATRON_POST_DIGITAL_PRICE_ID = "price_sketchy_digital_test";
  process.env.COUNTERCULT_PATRON_POST_MEMBERSHIP_PRICE_ID = "price_countercult_member_test";
  process.env.COUNTERCULT_PATRON_POST_POSTAGE_PRICE_ID = "price_countercult_postage_test";
  process.env.COUNTERCULT_PATRON_POST_EARLY_SUPPORTER_COUPON_ID = "coupon_countercult_hold_test";
  process.env.COUNTERCULT_PATRON_POST_DIGITAL_PRICE_ID = "price_countercult_digital_test";
  stripeRequestMock.mockReset();
  sendCheckoutFailureAlertMock.mockReset().mockResolvedValue(undefined);
  dbInsertMock.mockReset().mockReturnValue({ values: dbInsertValuesMock });
  dbInsertValuesMock.mockReset().mockResolvedValue(undefined);
  dbSelectMock.mockReset().mockReturnValue({ from: dbSelectFromMock });
  dbSelectFromMock.mockReset().mockReturnValue({ orderBy: dbSelectOrderByMock });
  dbSelectOrderByMock.mockReset().mockResolvedValue([]);
  dbUpdateMock.mockReset().mockReturnValue({ set: dbUpdateSetMock });
  dbUpdateSetMock.mockReset().mockReturnValue({ where: dbUpdateWhereMock });
  dbUpdateWhereMock.mockReset().mockReturnValue({ returning: dbUpdateReturningMock });
  dbUpdateReturningMock.mockReset().mockResolvedValue([]);
  dbDeleteMock.mockReset().mockReturnValue({ where: dbDeleteWhereMock });
  dbDeleteWhereMock.mockReset().mockReturnValue({ returning: dbDeleteReturningMock });
  dbDeleteReturningMock.mockReset().mockResolvedValue([]);
  studioAdminMock.mockReset().mockReturnValue(true);
  stripeRequestMock.mockImplementation(async (path: string) => {
    if (
      path === "/v1/prices/price_sketchy_member_test"
      || path === "/v1/prices/price_countercult_member_test"
    ) {
      return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 1100, recurring: { interval: "month" } };
    }
    if (path === "/v1/prices/price_sketchy_digital_test" || path === "/v1/prices/price_countercult_digital_test") {
      return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 700, recurring: { interval: "month", interval_count: 1 } };
    }
    if (path === "/v1/prices/price_sketchy_postage_test" || path === "/v1/prices/price_countercult_postage_test") {
      return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 200, recurring: { interval: "month" } };
    }
    if (path === "/v1/coupons/coupon_sketchy_hold_test" || path === "/v1/coupons/coupon_countercult_hold_test") {
      return {
        id: path.split("/").at(-1),
        livemode: false,
        valid: true,
        amount_off: 200,
        currency: "eur",
        duration: "forever",
        max_redemptions: null,
        times_redeemed: 0,
      };
    }
    if (path === "/v1/checkout/sessions") {
      return { id: "cs_test_mock", url: "https://checkout.stripe.test/session" };
    }
    throw new Error(`Unexpected mocked Stripe request: ${path}`);
  });
});

afterEach(() => {
  for (const key of envKeys) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Patron Post priority flows", () => {
  it.each([
    {
      endpoint: "/api/patron-post/availability",
      couponPath: "/v1/coupons/coupon_sketchy_hold_test",
    },
    {
      endpoint: "/api/countercult-patron-post/availability",
      couponPath: "/v1/coupons/coupon_countercult_hold_test",
    },
  ])("keeps the physical price at €11 for $endpoint", async ({ endpoint }) => {
    const response = await request.get(endpoint).expect(200);

    expect(response.body).toMatchObject({
      earlySupporter: true,
      membershipCents: 900,
      totalCents: 1100,
    });
  });

  it.each([
    {
      endpoint: "/api/patron-post/availability",
      couponId: "coupon_sketchy_hold_test",
    },
    {
      endpoint: "/api/countercult-patron-post/availability",
      couponId: "coupon_countercult_hold_test",
    },
  ])("does not silently raise the physical price after its coupon expires at $endpoint", async ({ endpoint, couponId }) => {
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/prices/price_sketchy_member_test" || path === "/v1/prices/price_countercult_member_test") {
        return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 1100, recurring: { interval: "month" } };
      }
      if (path === "/v1/prices/price_sketchy_postage_test" || path === "/v1/prices/price_countercult_postage_test") {
        return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 200, recurring: { interval: "month" } };
      }
      if (path === `/v1/coupons/${couponId}`) {
        return {
          id: couponId,
          livemode: false,
          valid: false,
          amount_off: 200,
          currency: "eur",
          duration: "forever",
          max_redemptions: 50,
          times_redeemed: 50,
        };
      }
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const response = await request.get(endpoint).expect(503);
    expect(response.body.error).toContain("€11");
  });

  it("stores only the trimmed anonymous question for editorial review", async () => {
    const response = await request
      .post("/api/patron-post/questions")
      .send({ question: "  How do you find collaborators?  " })
      .expect(202);

    expect(response.body).toMatchObject({ submitted: true });
    expect(response.body.message).toContain("saved for review");
    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(dbInsertValuesMock).toHaveBeenCalledWith({ question: "How do you find collaborators?" });
  });

  it("rejects short anonymous questions without saving them", async () => {
    const response = await request
      .post("/api/patron-post/questions")
      .send({ question: "Too short" })
      .expect(400);

    expect(response.body.error).toContain("between 10 and 1,200 characters");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the question cannot be saved", async () => {
    dbInsertValuesMock.mockRejectedValue(new Error("database unavailable"));

    const response = await request
      .post("/api/patron-post/questions")
      .send({ question: "How do you keep an independent project going?" })
      .expect(503);

    expect(response.body.error).toContain("could not be saved");
  });

  it("lists questions for the authorized Studio OS without returning IP data", async () => {
    const question = {
      id: 7,
      question: "How do you keep making work?",
      status: "new",
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      reviewedAt: null,
    };
    dbSelectOrderByMock.mockResolvedValue([question]);

    const response = await request.get("/api/studio/patron-post/questions").expect(200);

    expect(response.body).toEqual([{
      ...question,
      createdAt: question.createdAt.toISOString(),
      reviewedAt: null,
    }]);
    expect(response.body[0]).not.toHaveProperty("ip");
    expect(dbSelectMock).toHaveBeenCalledOnce();
  });

  it("requires Studio OS access before listing anonymous questions", async () => {
    studioAdminMock.mockImplementation((_req, res) => {
      res.status(401).json({ error: "Studio access required." });
      return false;
    });

    await request.get("/api/studio/patron-post/questions").expect(401);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("lists live paid contributions separately from open or unpaid checkouts", async () => {
    stripeRequestMock.mockResolvedValue({
      has_more: false,
      data: [
        {
          id: "cs_countercult_paid",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360000,
          amount_total: 2500,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Countercult" },
          customer: { id: "cus_private" },
          customer_details: { email: "donor@example.com", name: "Private Donor" },
        },
        {
          id: "cs_shona_open",
          livemode: true,
          mode: "payment",
          status: "open",
          payment_status: "unpaid",
          created: 1795360100,
          amount_total: 1000,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Sketchy Shona" },
        },
        {
          id: "cs_countercult_unpaid",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "unpaid",
          created: 1795360200,
          amount_total: 1500,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Countercult" },
        },
        {
          id: "cs_test_paid",
          livemode: false,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360300,
          amount_total: 9900,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Countercult" },
        },
        {
          id: "cs_other_product",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360400,
          amount_total: 5000,
          currency: "eur",
          metadata: { product: "other_product", beneficiary: "Countercult" },
        },
        {
          id: "cs_unknown_beneficiary",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360500,
          amount_total: 5000,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Unknown" },
        },
      ],
    });

    const response = await request.get("/api/studio/patron-post/contributions").expect(200);

    expect(response.body.totals).toEqual([
      { beneficiary: "Countercult", currency: "eur", paidCount: 1, paidAmountCents: 2500 },
      { beneficiary: "Sketchy Shona", currency: "eur", paidCount: 0, paidAmountCents: 0 },
    ]);
    expect(response.body.contributions).toEqual([
      {
        id: "cs_countercult_unpaid",
        beneficiary: "Countercult",
        amountCents: 1500,
        currency: "eur",
        createdAt: new Date(1795360200 * 1000).toISOString(),
        status: "unpaid",
      },
      {
        id: "cs_shona_open",
        beneficiary: "Sketchy Shona",
        amountCents: 1000,
        currency: "eur",
        createdAt: new Date(1795360100 * 1000).toISOString(),
        status: "open",
      },
      {
        id: "cs_countercult_paid",
        beneficiary: "Countercult",
        amountCents: 2500,
        currency: "eur",
        createdAt: new Date(1795360000 * 1000).toISOString(),
        status: "paid",
      },
    ]);
    expect(JSON.stringify(response.body)).not.toContain("donor@example.com");
    expect(JSON.stringify(response.body)).not.toContain("Private Donor");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("requires Studio OS access before reading Stripe contributions", async () => {
    studioAdminMock.mockImplementation((_req, res) => {
      res.status(401).json({ error: "Studio access required." });
      return false;
    });

    await request.get("/api/studio/patron-post/contributions").expect(401);
    expect(stripeRequestMock).not.toHaveBeenCalled();
  });

  it("paginates Stripe sessions before calculating contribution totals", async () => {
    stripeRequestMock
      .mockResolvedValueOnce({
        has_more: true,
        data: [{
          id: "cs_first_page",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360000,
          amount_total: 1000,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Countercult" },
        }],
      })
      .mockResolvedValueOnce({
        has_more: false,
        data: [{
          id: "cs_second_page",
          livemode: true,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          created: 1795360100,
          amount_total: 2000,
          currency: "eur",
          metadata: { product: "patron_post_contribution", beneficiary: "Countercult" },
        }],
      });

    const response = await request.get("/api/studio/patron-post/contributions").expect(200);

    expect(stripeRequestMock).toHaveBeenCalledTimes(2);
    expect(stripeRequestMock.mock.calls[0][0]).toBe("/v1/checkout/sessions?limit=100");
    expect(stripeRequestMock.mock.calls[1][0]).toBe("/v1/checkout/sessions?limit=100&starting_after=cs_first_page");
    expect(response.body.totals[0]).toMatchObject({ paidCount: 2, paidAmountCents: 3000 });
    expect(response.body.contributions.map((record: { id: string }) => record.id)).toEqual([
      "cs_second_page",
      "cs_first_page",
    ]);
  });

  it("fails explicitly when Stripe pagination cannot advance", async () => {
    stripeRequestMock.mockResolvedValue({
      has_more: true,
      data: [],
    });

    const response = await request.get("/api/studio/patron-post/contributions").expect(503);

    expect(response.body.error).toBe("Contribution records could not be loaded.");
  });

  it("updates the anonymous question review status and timestamp", async () => {
    const reviewedAt = new Date("2026-11-20T12:00:00.000Z");
    dbUpdateReturningMock.mockResolvedValue([{
      id: 7,
      question: "How do you keep making work?",
      status: "reviewed",
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      reviewedAt,
    }]);

    const response = await request.patch("/api/studio/patron-post/questions/7")
      .send({ status: "reviewed" })
      .expect(200);

    expect(response.body.status).toBe("reviewed");
    expect(response.body.reviewedAt).toBe(reviewedAt.toISOString());
    expect(dbUpdateSetMock).toHaveBeenCalledWith({ status: "reviewed", reviewedAt: expect.any(Date) });
  });

  it("deletes an anonymous question from the Studio OS inbox", async () => {
    dbDeleteReturningMock.mockResolvedValue([{ id: 7 }]);

    await request.delete("/api/studio/patron-post/questions/7").expect(204);
    expect(dbDeleteMock).toHaveBeenCalledOnce();
  });

  it.each([
    {
      endpoint: "/api/patron-post/checkout",
      membershipPriceId: "price_sketchy_member_test",
      postagePriceId: "price_sketchy_postage_test",
      couponId: "coupon_sketchy_hold_test",
      successPath: "/sketchyshona/mail-club",
      cancelPath: "/sketchyshona/mail-club?cancelled=1",
      product: "patron_post",
    },
    {
      endpoint: "/api/countercult-patron-post/checkout",
      membershipPriceId: "price_countercult_member_test",
      postagePriceId: "price_countercult_postage_test",
      couponId: "coupon_countercult_hold_test",
      successPath: "/collective-fund/thanks",
      cancelPath: "/collective-fund?cancelled=1#join",
      product: "countercult_patron_post",
    },
  ])("builds the $product subscription checkout with its own prices and return route", async (flow) => {
    const response = await request
      .post(flow.endpoint)
      .set("Origin", "https://preview.replit.dev")
      .send({ gift: true, mailingFirstName: " Ada ", mailingLastName: " Lovelace " })
      .expect(200);

    expect(response.body.url).toBe("https://checkout.stripe.test/session");
    const fields = stripeRequestMock.mock.calls
      .find(([path, method]) => path === "/v1/checkout/sessions" && method === "POST")?.[2] as Record<string, string>;
    const checkoutCall = stripeRequestMock.mock.calls
      .find(([path, method]) => path === "/v1/checkout/sessions" && method === "POST");
    expect(checkoutCall?.[3]).toBe("2025-06-30.basil");
    expect(fields).toMatchObject({
      mode: "subscription",
      success_url: `https://preview.replit.dev${flow.successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://preview.replit.dev${flow.cancelPath}`,
      "line_items[0][price]": flow.membershipPriceId,
      "line_items[1][price]": flow.postagePriceId,
      "discounts[0][coupon]": flow.couponId,
      "metadata[product]": flow.product,
      "metadata[is_gift]": "true",
      "metadata[mailing_first_name]": "Ada",
      "metadata[mailing_last_name]": "Lovelace",
      "subscription_data[metadata][product]": flow.product,
      "subscription_data[metadata][mailing_first_name]": "Ada",
      "subscription_data[metadata][mailing_last_name]": "Lovelace",
    });
  });

  it.each([
    {
      endpoint: "/api/countercult-patron-post/digital-checkout",
      availability: "/api/countercult-patron-post/digital-availability",
      priceId: "price_countercult_digital_test",
      product: "countercult_digital_patron_post",
      successPath: "/collective-fund/thanks",
      cancelPath: "/snail?cancelled=1&membership_type=digital#snail-checkout",
    },
  ])("offers a separately priced €7 digital membership for $product", async (flow) => {
    const availability = await request.get(flow.availability).expect(200);
    expect(availability.body).toEqual({ available: true, amountCents: 700 });

    const response = await request
      .post(flow.endpoint)
      .set("Origin", "https://preview.replit.dev")
      .send({})
      .expect(200);

    expect(response.body.url).toBe("https://checkout.stripe.test/session");
    const checkoutCall = stripeRequestMock.mock.calls
      .find(([path, method]) => path === "/v1/checkout/sessions" && method === "POST");
    const fields = checkoutCall?.[2] as Record<string, string>;
    expect(checkoutCall?.[3]).toBe("2025-06-30.basil");
    expect(fields).toMatchObject({
      mode: "subscription",
      success_url: `https://preview.replit.dev${flow.successPath}?session_id={CHECKOUT_SESSION_ID}&delivery=digital`,
      cancel_url: `https://preview.replit.dev${flow.cancelPath}`,
      "line_items[0][price]": flow.priceId,
      "line_items[0][quantity]": "1",
      "metadata[product]": flow.product,
      "metadata[delivery_type]": "digital",
      "subscription_data[metadata][product]": flow.product,
      "subscription_data[metadata][delivery_type]": "digital",
      "subscription_data[billing_mode][type]": "flexible",
    });
    expect(fields).not.toHaveProperty("line_items[1][price]");
    expect(fields).not.toHaveProperty("shipping_address_collection[allowed_countries][0]");
    expect(fields).not.toHaveProperty("metadata[mailing_first_name]");
  });

  it("keeps Sketchy Shona digital checkout unavailable while preserving Countercult's digital tier", async () => {
    const availability = await request
      .get("/api/patron-post/digital-availability")
      .expect(200);
    expect(availability.body).toEqual({ available: false, amountCents: null });

    const response = await request
      .post("/api/patron-post/digital-checkout")
      .send({})
      .expect(410);
    expect(response.body.error).toContain("physical Patron Post only");
    expect(stripeRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    "/api/patron-post/checkout",
    "/api/countercult-patron-post/checkout",
  ])("rejects a membership checkout without both mailing names at $0", async (endpoint) => {
    const response = await request
      .post(endpoint)
      .send({ gift: false, mailingFirstName: "Ada" })
      .expect(400);

    expect(response.body.error).toBe("Enter the first and last name for the mailing.");
    expect(stripeRequestMock).not.toHaveBeenCalled();
  });

  it("rejects checkout confirmation when Stripe only has a one-part mailing name", async () => {
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/checkout/sessions/cs_test_one_name") {
        return {
          id: "cs_test_one_name",
          livemode: false,
          status: "complete",
          payment_status: "paid",
          customer: "cus_test_one_name",
          subscription: "sub_test_one_name",
          metadata: { product: "patron_post", is_gift: "false" },
          customer_details: { email: "reader@example.com", name: "Ada" },
          collected_information: { shipping_details: { name: "Ada", address: { line1: "1 Main Street" } } },
        };
      }
      if (path === "/v1/customers/cus_test_one_name") {
        return { id: "cus_test_one_name", email: "reader@example.com", name: "Ada" };
      }
      if (path === "/v1/subscriptions/sub_test_one_name") {
        return {
          id: "sub_test_one_name",
          status: "active",
          customer: "cus_test_one_name",
          metadata: { product: "patron_post" },
          items: { data: [] },
        };
      }
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const response = await request
      .post("/api/patron-post/complete")
      .send({ sessionId: "cs_test_one_name" })
      .expect(422);

    expect(response.body.error).toBe("The mailing recipient’s first and last name are required.");
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("saves the complete mailing name when Stripe returns a one-part shipping name", async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: 12 }]);
    const onConflictMock = vi.fn().mockReturnValue({ returning: returningMock });
    dbInsertValuesMock.mockReturnValue({ onConflictDoNothing: onConflictMock });
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/checkout/sessions/cs_test_full_name") {
        return {
          id: "cs_test_full_name",
          livemode: false,
          status: "complete",
          payment_status: "paid",
          amount_total: 1100,
          currency: "eur",
          customer: "cus_test_full_name",
          subscription: "sub_test_full_name",
          metadata: {
            product: "patron_post",
            is_gift: "false",
            mailing_first_name: "Test",
            mailing_last_name: "Recipient",
          },
          customer_details: {
            email: "reader@example.com",
            name: "Test",
            address: { line1: "1 Main Street", city: "Berlin", country: "DE" },
          },
          collected_information: {
            shipping_details: { name: "Test", address: { line1: "1 Main Street", city: "Berlin", country: "DE" } },
          },
        };
      }
      if (path === "/v1/customers/cus_test_full_name") {
        return { id: "cus_test_full_name", email: "reader@example.com", name: "Test" };
      }
      if (path === "/v1/subscriptions/sub_test_full_name") {
        return {
          id: "sub_test_full_name",
          status: "active",
          customer: "cus_test_full_name",
          metadata: {
            product: "patron_post",
            mailing_first_name: "Test",
            mailing_last_name: "Recipient",
          },
          items: { data: [{ current_period_end: 1_800_000_000 }] },
        };
      }
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const response = await request
      .post("/api/patron-post/complete")
      .send({ sessionId: "cs_test_full_name" })
      .expect(200);

    expect(response.body).toMatchObject({ completed: true, gift: false, product: "patron_post" });
    expect(dbInsertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      mailingName: "Test Recipient",
      addressLine1: "1 Main Street",
      stripeSubscriptionId: "sub_test_full_name",
    }));
  });

  it("confirms Sketchy Shona digital memberships without a mailing name or address", async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: 13 }]);
    const onConflictMock = vi.fn().mockReturnValue({ returning: returningMock });
    dbInsertValuesMock.mockReturnValue({ onConflictDoNothing: onConflictMock });
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/checkout/sessions/cs_test_digital") {
        return {
          id: "cs_test_digital",
          livemode: false,
          status: "complete",
          payment_status: "paid",
          amount_total: 700,
          currency: "eur",
          customer: "cus_test_digital",
          subscription: "sub_test_digital",
          metadata: {
            product: "sketchy_shona_digital_patron_post",
            delivery_type: "digital",
            is_gift: "false",
          },
          customer_details: { email: "reader@example.com", name: "Monthly Reader" },
        };
      }
      if (path === "/v1/customers/cus_test_digital") {
        return { id: "cus_test_digital", email: "reader@example.com", name: "Monthly Reader" };
      }
      if (path === "/v1/subscriptions/sub_test_digital") {
        return {
          id: "sub_test_digital",
          status: "active",
          customer: "cus_test_digital",
          metadata: { product: "sketchy_shona_digital_patron_post", delivery_type: "digital" },
          items: { data: [{ current_period_end: 1_800_000_000 }] },
        };
      }
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const response = await request
      .post("/api/patron-post/complete")
      .send({ sessionId: "cs_test_digital" })
      .expect(200);

    expect(response.body).toMatchObject({
      completed: true,
      gift: false,
      product: "sketchy_shona_digital_patron_post",
      deliveryType: "digital",
    });
    expect(dbInsertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      mailingName: "",
      addressLine1: "",
      stripeSubscriptionId: "sub_test_digital",
      deliveryType: "digital",
      amountCents: 700,
    }));
  });

  it("keeps digital memberships marked as no-envelope in the Studio OS subscriber data", async () => {
    const recordsMock = vi.fn().mockResolvedValue([{
      id: 14,
      stripeSubscriptionId: "sub_sketchy_digital_admin",
    }]);
    dbSelectMock.mockReturnValueOnce({ from: recordsMock });
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/subscriptions/sub_sketchy_digital_admin?expand%5B%5D=customer") {
        return {
          id: "sub_sketchy_digital_admin",
          status: "active",
          customer: "cus_sketchy_digital_admin",
          metadata: {
            product: "sketchy_shona_digital_patron_post",
            delivery_type: "digital",
          },
          items: { data: [{ current_period_end: 1_800_000_000 }] },
        };
      }
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const subscriberInfo = await refreshPatronPostStatuses();

    expect(subscriberInfo.get("sub_sketchy_digital_admin")).toEqual({
      signupSource: "sketchy_shona",
      deliveryType: "digital",
    });
    expect(dbUpdateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      deliveryType: "digital",
      status: "active",
    }));
  });

  it.each([
    { endpoint: "/api/patron-post/checkout", source: "sketchy_shona" },
    { endpoint: "/api/countercult-patron-post/checkout", source: "countercult" },
  ])("alerts on a failed $source membership checkout without exposing Stripe details", async ({ endpoint, source }) => {
    stripeRequestMock.mockImplementation(async (path: string) => {
      if (path === "/v1/prices/price_sketchy_member_test" || path === "/v1/prices/price_countercult_member_test") {
        return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 1100, recurring: { interval: "month" } };
      }
      if (path === "/v1/prices/price_sketchy_postage_test" || path === "/v1/prices/price_countercult_postage_test") {
        return { id: path.split("/").at(-1), livemode: false, currency: "eur", unit_amount: 200, recurring: { interval: "month" } };
      }
      if (path === "/v1/coupons/coupon_sketchy_hold_test" || path === "/v1/coupons/coupon_countercult_hold_test") {
        return {
          id: path.split("/").at(-1),
          livemode: false,
          valid: true,
          amount_off: 200,
          currency: "eur",
          duration: "forever",
          max_redemptions: null,
          times_redeemed: 0,
        };
      }
      if (path === "/v1/checkout/sessions") throw new Error("Stripe internal response detail");
      throw new Error(`Unexpected mocked Stripe request: ${path}`);
    });

    const response = await request
      .post(endpoint)
      .send({ gift: false, mailingFirstName: "Ada", mailingLastName: "Lovelace" })
      .expect(503);

    expect(response.body.error).toBe("Checkout didn’t open. Please try again, or report the problem below.");
    expect(response.body.error).not.toContain("Stripe internal response detail");
    expect(sendCheckoutFailureAlertMock).toHaveBeenCalledWith(source, "Stripe internal response detail");
  });
});
