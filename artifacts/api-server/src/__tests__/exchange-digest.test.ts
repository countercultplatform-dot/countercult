import { describe, expect, it } from "vitest";
import {
  getExchangeDigestCategory,
  getExchangeDigestPeriod,
} from "../lib/exchangeDigest.js";

describe("weekly Exchange digest schedule", () => {
  it("starts on Monday at 09:00 Europe/Paris and uses the previous Monday-to-Monday window", () => {
    const beforeSendTime = getExchangeDigestPeriod(new Date("2026-11-30T07:59:00.000Z"));
    expect(beforeSendTime).toMatchObject({
      periodStart: "2026-11-30",
      due: false,
      windowStart: new Date("2026-11-23T00:00:00.000Z"),
      windowEnd: new Date("2026-11-30T00:00:00.000Z"),
    });

    const afterSendTime = getExchangeDigestPeriod(new Date("2026-11-30T08:00:00.000Z"));
    expect(afterSendTime.periodStart).toBe("2026-11-30");
    expect(afterSendTime.due).toBe(true);
  });

  it("catches up later in the week and keeps the Monday period stable", () => {
    const period = getExchangeDigestPeriod(new Date("2026-12-02T12:00:00.000Z"));
    expect(period.periodStart).toBe("2026-11-30");
    expect(period.due).toBe(true);
  });
});

describe("Exchange digest listing eligibility", () => {
  it("includes listed paid gigs and the specifically approved Norwich Open Call", () => {
    expect(getExchangeDigestCategory({
      id: 80, kind: "advert", city: "Berlin", destination: "Open call",
      tags: ["advert:hiring"], cost: "€500",
    })).toBe("Paid gig");
    expect(getExchangeDigestCategory({
      id: 31, kind: "advert", city: "Norwich, UK", destination: "Open Call",
      tags: ["advert:hiring"], cost: null,
    })).toBe("Paid gig");
    expect(getExchangeDigestCategory({
      id: 31, kind: "advert", city: "Berlin", destination: "Open Call",
      tags: ["advert:hiring"], cost: null,
    })).toBeNull();
  });

  it("labels board post types and excludes legacy demand posts", () => {
    const baseOffer = { city: "Berlin", destination: null, tags: [], cost: null };
    expect(getExchangeDigestCategory({ ...baseOffer, id: 1, kind: "swap" })).toBe("Barter & trade");
    expect(getExchangeDigestCategory({ ...baseOffer, id: 2, kind: "free_space" })).toBe("Space available");
    expect(getExchangeDigestCategory({ ...baseOffer, id: 3, kind: "looking" })).toBeNull();
  });
});
