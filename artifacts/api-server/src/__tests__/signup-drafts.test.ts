import { describe, expect, it } from "vitest";
import { signupDraftPayloadSchema } from "../routes/signupDrafts.js";

describe("saved signup drafts", () => {
  it("preserves space-path and profile fields needed to resume the application", () => {
    const result = signupDraftPayloadSchema.parse({
      screen: "details",
      detailsStep: "submit",
      kind: "space",
      physicalSpaceConfirmed: true,
      name: "Example Studio",
      socialHandle: "https://example.test/studio",
      locationText: "Berlin",
      countryText: "Germany",
      customProfileTagInput: "artist-run",
      blurb: "A community space with a long-running programme for local artists.",
      shareChoices: ["studio"],
      lookingFor: [],
      openTo: [],
      password: "must never be saved",
      adultConfirmed: true,
      dataProcessingConsent: true,
      consented: true,
    });

    expect(result).toMatchObject({
      screen: "details",
      detailsStep: "submit",
      kind: "space",
      physicalSpaceConfirmed: true,
      customProfileTagInput: "artist-run",
      blurb: "A community space with a long-running programme for local artists.",
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("adultConfirmed");
    expect(result).not.toHaveProperty("dataProcessingConsent");
    expect(result).not.toHaveProperty("consented");
  });
});
