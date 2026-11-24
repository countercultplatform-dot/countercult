import { describe, expect, it } from "vitest";
import { assertStripeMode, expectedStripeLivemode } from "./stripeMode";

describe("Patron Post Stripe mode guard", () => {
  it("uses test mode outside production", () => {
    expect(expectedStripeLivemode("development")).toBe(false);
    expect(expectedStripeLivemode("test")).toBe(false);
    expect(() => assertStripeMode(false, "membership price", "development")).not.toThrow();
  });

  it("allows live prices only in production", () => {
    expect(expectedStripeLivemode("production")).toBe(true);
    expect(() => assertStripeMode(true, "membership price", "production")).not.toThrow();
  });

  it("rejects live prices outside production", () => {
    expect(() => assertStripeMode(true, "membership price", "development"))
      .toThrow(/test checkout requires a matching Stripe test-mode membership price/);
  });

  it("rejects test prices in production", () => {
    expect(() => assertStripeMode(false, "postage price", "production"))
      .toThrow(/live checkout requires a matching Stripe live-mode postage price/);
  });
});
