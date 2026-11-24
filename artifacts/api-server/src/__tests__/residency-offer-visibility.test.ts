import { describe, expect, it } from "vitest";
import { ListHomepageExchangePicksResponse } from "@workspace/api-zod";
import { canExposeResidencyOfferForProfile } from "../lib/residencyOfferVisibility.js";
import {
  isExchangePaidAdvert,
  isOneOffPaidGigAdvert,
  isLikelyServiceAdvertisement,
  orderHomepageExchangePicks,
  selectHomepageExchangePicks,
  validateAdvertOnlyOpportunityPost,
  validateHomepageExchangePickIds,
} from "../routes/residency.js";

const pendingProfile = {
  entryId: 42,
  entryApproved: false,
  entryStatus: "pending_review",
  entryHidden: false,
  entryDeletedAt: null,
};

describe("Exchange listing visibility during profile review", () => {
  it("keeps pending-profile listings visible to their owner", () => {
    expect(canExposeResidencyOfferForProfile(pendingProfile, true)).toBe(true);
  });

  it("hides pending-profile listings from everyone else", () => {
    expect(canExposeResidencyOfferForProfile(pendingProfile, false)).toBe(false);
  });

  it("releases saved listings after the profile is approved and published", () => {
    expect(canExposeResidencyOfferForProfile({
      ...pendingProfile,
      entryApproved: true,
      entryStatus: "published",
    }, false)).toBe(true);
  });

  it("does not release an approved entry until its profile is published", () => {
    expect(canExposeResidencyOfferForProfile({
      ...pendingProfile,
      entryApproved: true,
    }, false)).toBe(false);
  });

  it("keeps hidden or deleted profile listings unavailable, even to their owner", () => {
    expect(canExposeResidencyOfferForProfile({
      ...pendingProfile,
      entryHidden: true,
    }, true)).toBe(false);
    expect(canExposeResidencyOfferForProfile({
      ...pendingProfile,
      entryDeletedAt: new Date(),
    }, true)).toBe(false);
  });

  it("preserves offers that are not attached to a member profile", () => {
    expect(canExposeResidencyOfferForProfile({
      entryId: null,
      entryApproved: null,
      entryStatus: null,
      entryHidden: null,
      entryDeletedAt: null,
    }, false)).toBe(true);
  });
});

describe("paid work is posted through Adverts", () => {
  it("cross-lists only the specifically approved Norwich Open Call without inventing a rate", () => {
    const openCall = {
      id: 31,
      kind: "advert",
      city: "Norwich, UK",
      destination: "open call",
      tags: ["advert:free", "advert:hiring"],
      cost: null,
    };
    expect(isOneOffPaidGigAdvert(openCall)).toBe(true);
    expect(isExchangePaidAdvert(openCall)).toBe(true);
    expect(isExchangePaidAdvert({ ...openCall, id: 32 })).toBe(false);
    expect(isExchangePaidAdvert({ ...openCall, cost: "€250 flat", id: 32 })).toBe(true);
  });

  it("recognises a post advertising the poster's own services", () => {
    expect(isLikelyServiceAdvertisement(
      "I can offer service at: Graphic Design, coloring, lettering, photography.",
    )).toBe(true);
  });

  it("routes new paid hiring posts to the Adverts board", () => {
    expect(validateAdvertOnlyOpportunityPost({ kind: "gig" })).toContain("Adverts board");
  });

  it("does not allow service advertisements to be posted as Exchange gigs", () => {
    expect(validateAdvertOnlyOpportunityPost({ kind: "gig" })).toContain("Adverts board");
  });
});

describe("homepage Exchange picks", () => {
  it("keeps the two newest offers first and uses one older curator pick in slot three", () => {
    const safeOffers = [
      { id: 7, description: "Newest post" },
      { id: 6, description: "Second newest post" },
      { id: 3, description: "Curated post" },
      { id: 2, description: "Older post" },
    ];

    expect(selectHomepageExchangePicks([3, 99, 7], safeOffers)).toEqual([
      safeOffers[0],
      safeOffers[1],
      safeOffers[2],
    ]);
  });

  it("fills remaining homepage positions with the next newest offers", () => {
    const safeOffers = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(selectHomepageExchangePicks([2], safeOffers)).toEqual([
      safeOffers[0],
      safeOffers[1],
      safeOffers[2],
    ]);
  });

  it("shows the first three live offers when no picks are saved", () => {
    const safeOffers = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(selectHomepageExchangePicks([], safeOffers)).toEqual(safeOffers.slice(0, 3));
  });

  it("rejects duplicate IDs and offers missing from the active public-safe list", () => {
    const availableIds = new Set([3, 7]);
    expect(validateHomepageExchangePickIds([3, 3], availableIds)).toContain("unique");
    expect(validateHomepageExchangePickIds([3, 9], availableIds)).toContain("public-safe");
    expect(validateHomepageExchangePickIds([7, 3], availableIds)).toBeNull();
  });

  it("strips protected listing fields from the homepage response", () => {
    expect(ListHomepageExchangePicksResponse.parse([{
      id: 4,
      city: "Berlin",
      description: "A public-safe preview",
      isPublicPreview: true,
      contact: "private@example.com",
      visibility: "private",
      homepageFeaturedOrder: 1,
    }])).toEqual([{
      id: 4,
      city: "Berlin",
      description: "A public-safe preview",
      isPublicPreview: true,
    }]);
  });
});
