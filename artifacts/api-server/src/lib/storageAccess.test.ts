import { describe, expect, it } from "vitest";
import {
  canReadEntryMedia,
  canReadResidencyMedia,
  isPublicProfileMedia,
  isPublicStudioArtworkMedia,
  normalizeObjectEntityReference,
  objectReferenceCandidates,
  type EntryMediaReference,
  type ResidencyMediaReference,
  type StorageIdentity,
} from "./storageAccess";

const member: StorageIdentity = {
  email: "artist@example.com",
  entryId: 12,
  accountRole: "member",
  isApproved: true,
};

const pendingMember: StorageIdentity = {
  ...member,
  isApproved: false,
};

const publicEntry: EntryMediaReference = {
  kind: "space",
  name: "Public Cultural Space",
  heroPhoto: null,
  status: "published",
  isApproved: true,
  isHidden: false,
  visibility: "public",
  publicProfileConsentAt: null,
  deletedAt: null,
  contactEmail: "owner@example.com",
  claimedEmail: null,
};

const normalizeGcsUrl = (value: string) =>
  value === "https://storage.googleapis.com/bucket/private/uploads/photo.jpg"
    ? "/objects/uploads/photo.jpg"
    : value;

describe("storage object access policy", () => {
  it("normalizes only private object entity references and rejects traversal", () => {
    expect(normalizeObjectEntityReference(
      "/api/storage/objects/uploads/photo.jpg",
      normalizeGcsUrl,
    )).toBe("/objects/uploads/photo.jpg");
    expect(normalizeObjectEntityReference(
      "https://storage.googleapis.com/bucket/private/uploads/photo.jpg",
      normalizeGcsUrl,
    )).toBe("/objects/uploads/photo.jpg");
    expect(normalizeObjectEntityReference("/objects/uploads/../private.jpg", normalizeGcsUrl)).toBeNull();
    expect(normalizeObjectEntityReference("/public-objects/logo.png", normalizeGcsUrl)).toBeNull();
  });

  it("matches supported database forms for the same uploaded object", () => {
    expect(objectReferenceCandidates("/objects/uploads/photo.jpg", "/bucket/private")).toEqual([
      "/objects/uploads/photo.jpg",
      "/api/storage/objects/uploads/photo.jpg",
      "https://countercult.network/api/storage/objects/uploads/photo.jpg",
      "https://storage.googleapis.com/bucket/private/uploads/photo.jpg",
    ]);
    expect(objectReferenceCandidates(
      "/objects/uploads/photo.jpg",
      "/bucket/private",
      "https://preview.countercult.test",
    )).toContain("https://preview.countercult.test/api/storage/objects/uploads/photo.jpg");
    expect(objectReferenceCandidates(
      "/objects/uploads/photo.jpg",
      "/bucket/private",
      "https://preview.countercult.test",
    )).toContain("https://countercult.network/api/storage/objects/uploads/photo.jpg");
  });

  it("makes only eligible approved public profile media anonymously readable", () => {
    expect(isPublicProfileMedia(publicEntry)).toBe(true);
    expect(isPublicProfileMedia({ ...publicEntry, isHidden: true })).toBe(false);
    expect(isPublicProfileMedia({ ...publicEntry, visibility: "network" })).toBe(false);
    expect(isPublicProfileMedia({ ...publicEntry, isApproved: false })).toBe(false);
    expect(isPublicProfileMedia({ ...publicEntry, deletedAt: new Date() })).toBe(false);
  });

  it("exposes only the hero image of artists who consented to public profile visibility", () => {
    const unconsentedArtist: EntryMediaReference = {
      ...publicEntry,
      kind: "artist",
      name: "Unfeatured Artist",
      heroPhoto: "/objects/uploads/artist-hero.jpg",
    };
    const consentedArtist: EntryMediaReference = {
      ...unconsentedArtist,
      publicProfileConsentAt: new Date(),
    };

    expect(isPublicProfileMedia(unconsentedArtist, [unconsentedArtist.heroPhoto!])).toBe(false);
    expect(isPublicProfileMedia(consentedArtist, [consentedArtist.heroPhoto!])).toBe(true);
    expect(isPublicProfileMedia(consentedArtist, ["/objects/uploads/portfolio-photo.jpg"])).toBe(false);
    expect(isPublicProfileMedia(
      { ...consentedArtist, visibility: "network" },
      [consentedArtist.heroPhoto!],
    )).toBe(false);
  });

  it("keeps network profile media limited to approved members and owners", () => {
    const networkEntry = { ...publicEntry, visibility: "network" };
    expect(canReadEntryMedia(networkEntry, member)).toBe(true);
    expect(canReadEntryMedia(networkEntry, pendingMember)).toBe(false);
    expect(canReadEntryMedia(
      { ...networkEntry, isHidden: true },
      member,
    )).toBe(false);
    expect(canReadEntryMedia(
      { ...networkEntry, claimedEmail: " ARTIST@example.com " },
      pendingMember,
    )).toBe(true);
    expect(canReadEntryMedia(
      { ...publicEntry, kind: "artist" },
      member,
    )).toBe(true);
  });

  it("makes only curated, website-prepared artwork public", () => {
    const artwork = {
      readiness: "Ready",
      destinations: { website: "Prepared" },
      photos: [{ objectPath: "/objects/uploads/artwork.jpg" }],
    };
    expect(isPublicStudioArtworkMedia(artwork, "/objects/uploads/artwork.jpg", normalizeGcsUrl)).toBe(true);
    expect(isPublicStudioArtworkMedia(
      { ...artwork, readiness: "Needs details" },
      "/objects/uploads/artwork.jpg",
      normalizeGcsUrl,
    )).toBe(false);
    expect(isPublicStudioArtworkMedia(
      { ...artwork, destinations: { website: "Not prepared" } },
      "/objects/uploads/artwork.jpg",
      normalizeGcsUrl,
    )).toBe(false);
  });

  it("requires approved members for Exchange photos and enforces room-swap rules", () => {
    const offer: ResidencyMediaReference = {
      entryId: null,
      claimerEmail: null,
      posterEmail: "another@example.com",
      kind: "collab",
      duration: null,
      availableTo: null,
      visibility: "public",
      isActive: true,
      entryApproved: null,
      entryStatus: null,
      entryHidden: null,
      entryDeletedAt: null,
    };
    expect(canReadResidencyMedia(offer, member, false, new Date("2026-09-25"))).toBe(true);
    expect(canReadResidencyMedia(offer, pendingMember, false, new Date("2026-09-25"))).toBe(false);
    expect(canReadResidencyMedia(
      { ...offer, kind: "host" },
      member,
      false,
      new Date("2026-09-25"),
    )).toBe(false);
    expect(canReadResidencyMedia(
      { ...offer, kind: "host" },
      member,
      true,
      new Date("2026-09-25"),
    )).toBe(true);
    expect(canReadResidencyMedia(
      { ...offer, visibility: "private" },
      member,
      true,
      new Date("2026-09-25"),
    )).toBe(false);
    expect(canReadResidencyMedia(
      { ...offer, visibility: "private" },
      { ...member, email: "ANOTHER@example.com" },
      false,
      new Date("2026-09-25"),
    )).toBe(true);
  });

  it("lets only the owner read listing photos while their profile is pending", () => {
    const pendingOffer: ResidencyMediaReference = {
      entryId: member.entryId,
      claimerEmail: member.email,
      posterEmail: null,
      kind: "workshop",
      duration: null,
      availableTo: null,
      visibility: "public",
      isActive: true,
      entryApproved: false,
      entryStatus: "pending_review",
      entryHidden: false,
      entryDeletedAt: null,
    };
    expect(canReadResidencyMedia(pendingOffer, pendingMember, false, new Date("2026-09-25"))).toBe(true);
    expect(canReadResidencyMedia(
      pendingOffer,
      { ...pendingMember, entryId: 99, email: "other@example.com" },
      false,
      new Date("2026-09-25"),
    )).toBe(false);
    expect(canReadResidencyMedia(
      { ...pendingOffer, entryHidden: true },
      pendingMember,
      false,
      new Date("2026-09-25"),
    )).toBe(false);
  });

  it("does not serve ended short-term sublet photos to other members", () => {
    const endedOffer: ResidencyMediaReference = {
      entryId: null,
      claimerEmail: null,
      posterEmail: "another@example.com",
      kind: "host",
      duration: "short-term sublet",
      availableTo: "January 2025",
      visibility: "network",
      isActive: true,
      entryApproved: null,
      entryStatus: null,
      entryHidden: null,
      entryDeletedAt: null,
    };
    expect(canReadResidencyMedia(endedOffer, member, true, new Date("2026-09-25"))).toBe(false);
  });
});