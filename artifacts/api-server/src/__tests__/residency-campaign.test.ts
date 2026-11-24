import { describe, expect, it } from "vitest";
import { validateExchangeResidencyPost } from "../routes/residency.js";

const basePost = {
  kind: "swap",
  tags: ["exchange residency"],
  photos: ["/api/storage/objects/uploads/room.jpg"],
  availableFrom: "1 February 2027",
  availableTo: "28 February 2027",
};

describe("Exchange Residency campaign rules", () => {
  it("accepts a fixed-date room exchange with a photo", () => {
    expect(validateExchangeResidencyPost(basePost)).toBeNull();
  });

  it("requires a room photo", () => {
    expect(validateExchangeResidencyPost({ ...basePost, photos: [] })).toContain("photo");
  });

  it("rejects non-room offers", () => {
    expect(validateExchangeResidencyPost({ ...basePost, kind: "workshop" })).toContain("room exchanges");
  });

  it("rejects dates outside the fixed first cohort", () => {
    expect(validateExchangeResidencyPost({ ...basePost, availableTo: "1 March 2027" })).toContain("fixed cohort dates");
  });

  it("rejects the retired self-led exchange label", () => {
    expect(validateExchangeResidencyPost({
      ...basePost,
      tags: ["self-led exchange"],
      photos: [],
      availableFrom: "February 2027",
      availableTo: "March 2027",
    })).toContain("no longer");
  });
});