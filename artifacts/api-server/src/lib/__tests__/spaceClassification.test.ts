import { describe, expect, it } from "vitest";
import {
  deriveSpaceClassification,
  effectiveSpaceClassification,
  isCanonicalEntryOwner,
} from "../spaceClassification";

describe("space classification", () => {
  it("uses intended commercial use rather than venue or organisation label", () => {
    expect(deriveSpaceClassification({ organizationModel: "hospitality", intendedCommercialUse: false })).toBe("independent");
    expect(deriveSpaceClassification({ organizationModel: "artist_run", intendedCommercialUse: true })).toBe("commercial");
  });

  it("keeps unanswered declarations in the review queue and honors an admin override", () => {
    expect(deriveSpaceClassification({ organizationModel: "community" })).toBe("needs_review");
    expect(effectiveSpaceClassification({ derivedClassification: "commercial", reviewedClassification: "independent" })).toBe("independent");
  });

  it("does not give a nominator ownership of a space", () => {
    const entry = { contactEmail: "owner@example.test", claimedEmail: null };
    expect(isCanonicalEntryOwner(entry, "owner@example.test")).toBe(true);
    expect(isCanonicalEntryOwner(entry, "nominator@example.test")).toBe(false);
    expect(isCanonicalEntryOwner({ ...entry, claimedEmail: "claimed@example.test" }, "claimed@example.test")).toBe(true);
  });
});