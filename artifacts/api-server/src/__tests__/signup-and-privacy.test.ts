import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import app from "../app.js";
import {
  db,
  entriesTable,
  magicLinkTokensTable,
  residencyOffersTable,
  usersTable,
} from "@workspace/db";
import {
  expireStaleListings,
  getPublicExchangeFacets,
  isNoCostExchangeArrangement,
  normalizeExchangeOfferCost,
  publicOfferDescription,
  validateSkillShareTerms,
  validateSpaceListingTerms,
  validateAdvertOnlyOpportunityPost,
} from "../routes/residency.js";

const request = supertest(app);
const DAY_MS = 24 * 60 * 60 * 1000;

describe("public Exchange description previews", () => {
  it("keeps short descriptions unchanged", () => {
    expect(publicOfferDescription("A clear, complete offer.")).toBe("A clear, complete offer.");
  });

  it("ends long previews at a nearby sentence and marks omitted text", () => {
    const description = "I am offering a “create your own character” workshop for children. Together we study how to create a character portrait from imagination. I’ll ask you to bring your own materials and help you select the right material for the session: type of paper and acrylic markers. Also would love to talk to the parent or guardian about the child’s experience with the materials.";
    const preview = publicOfferDescription(description);

    expect(preview.endsWith("markers. …")).toBe(true);
    expect(preview).not.toContain("parent or guardian");
  });

  it("ends at a complete word when no sentence boundary is nearby", () => {
    const description = Array.from({ length: 70 }, () => "workshop").join(" ");
    const preview = publicOfferDescription(description);

    expect(preview.endsWith("…")).toBe(true);
    expect(preview.slice(0, -1).endsWith("workshop")).toBe(true);
    expect(Array.from(preview).length).toBeLessThanOrEqual(320);
  });
});

describe("Exchange preview category coverage", () => {
  it("requires a non-cash return for every skill-share listing", () => {
    expect(validateSkillShareTerms("skill_share", "swap", "a sewing machine", "A one-hour portrait session")).toBeNull();
    expect(validateSkillShareTerms("skill_share", "swap", "  ")).toContain("exchange");
    expect(validateSkillShareTerms("skill_share", "free_offer", null)).toContain("non-cash");
    expect(validateSkillShareTerms("skill_share", "swap", "more exposure", "A risograph lesson")).toContain("specific");
    expect(validateSkillShareTerms("skill_share", "swap", "Follow me on Instagram", "A risograph lesson")).toContain("specific");
    expect(validateSkillShareTerms("skill_share", "swap", "A risograph lesson", "A risograph lesson")).toContain("different");
  });

  it("requires space listings to state whether they are free or paid", () => {
    expect(validateSpaceListingTerms("workshop", "free")).toBeNull();
    expect(validateSpaceListingTerms("concert", "€40/hour")).toBeNull();
    expect(validateSpaceListingTerms("workshop", "  ")).toContain("free or paid");
    expect(validateSpaceListingTerms("host", null)).toBeNull();
  });

  it("normalizes every reciprocal swap to free, including workspace swaps", () => {
    expect(normalizeExchangeOfferCost("swap", [], "€500")).toBe("free");
    expect(normalizeExchangeOfferCost("workshop", ["cc-exchange:arrangement:swap"], null)).toBe("free");
    expect(normalizeExchangeOfferCost("host", [], "€500")).toBe("€500");
    expect(isNoCostExchangeArrangement("workshop", ["cc-exchange:arrangement:swap"])).toBe(true);
  });

  const supportedKinds = [
    { kind: "host", categories: ["housing"] },
    { kind: "looking", categories: ["housing"] },
    { kind: "swap", categories: ["housing"] },
    { kind: "workshop", categories: ["spaces"] },
    { kind: "concert", categories: ["spaces"] },
    { kind: "free_space", categories: ["spaces"] },
    { kind: "venue_offer", categories: ["spaces"] },
    { kind: "skill_share", categories: ["skills"] },
    { kind: "open_call", categories: ["opportunities"] },
    { kind: "collab", categories: ["opportunities"] },
    { kind: "partner_offer", categories: ["tools"] },
  ] as const;

  it.each(supportedKinds)("assigns $kind listings to their browse category", ({ kind, categories }) => {
    expect(getPublicExchangeFacets(kind, [], "", null).categories).toEqual(categories);
  });

  it("keeps paid hiring adverts out of Exchange categories", () => {
    expect(getPublicExchangeFacets("gig", [], "", null).categories).toEqual([]);
  });

  it.each(["gig", "open_call", "collab"])("%s posts route to Adverts, not Exchange", (kind) => {
    expect(validateAdvertOnlyOpportunityPost({
      kind,
    })).toContain("Adverts board");
  });

  it("keeps skill swaps and partner resources eligible for Exchange", () => {
    expect(validateAdvertOnlyOpportunityPost({
      kind: "skill_share",
    })).toBeNull();
    expect(validateAdvertOnlyOpportunityPost({
      kind: "partner_offer",
    })).toBeNull();
  });

  it("keeps a room swap with workspace in both categories and identifies the swap subtype", () => {
    expect(getPublicExchangeFacets(
      "swap",
      ["cc-exchange:spaces:workspace"],
      "",
      null,
    )).toEqual({
      categories: ["housing", "spaces"],
      subfilters: ["housing_swap", "spaces_workspace", "spaces_swap"],
    });
  });

  it("classifies the Countercult artist open call as Housing and Spaces with a Residency subtype", () => {
    expect(getPublicExchangeFacets(
      "open_call",
      ["cc-exchange:housing:residency", "cc-exchange:spaces:workspace"],
      "A free residency with a shared workspace.",
      "10 days",
    )).toEqual({
      categories: ["housing", "spaces"],
      subfilters: ["housing_residency", "spaces_workspace"],
    });
  });

  it("recognizes a room or apartment offered for a workspace swap as Housing and Spaces", () => {
    expect(getPublicExchangeFacets(
      "workshop",
      ["cc-exchange:arrangement:swap"],
      "space type: room in a shared space\n\nA house swap for visiting artists.",
      null,
    )).toEqual({
      categories: ["housing", "spaces"],
      subfilters: ["housing_swap", "spaces_workspace", "spaces_swap"],
    });
  });

  it("shows skill swaps seeking a free stay in both Housing and Skills", () => {
    expect(getPublicExchangeFacets(
      "skill_share",
      ["cc-exchange:housing:skill-stay-request"],
      "I can offer photography and editing.",
      "10 nights",
    )).toEqual({
      categories: ["housing", "skills"],
      subfilters: ["housing_swap"],
    });
  });
});

type TestData = {
  emails: string[];
  entryIds: number[];
  offerIds: number[];
  tokenIds: number[];
};

let testData: TestData = { emails: [], entryIds: [], offerIds: [], tokenIds: [] };

function emailForTest() {
  const email = `regression-${crypto.randomUUID()}@example.test`;
  testData.emails.push(email);
  return email;
}

function entryForTest(overrides: Partial<typeof entriesTable.$inferInsert> = {}) {
  return {
    name: `Regression entry ${crypto.randomUUID()}`,
    kind: "artist",
    city: "Test City",
    country: "Test Country",
    tags: [],
    subcultures: [],
    openTo: [],
    status: "published",
    isApproved: true,
    isHidden: false,
    ...overrides,
  };
}

async function insertEntry(overrides: Partial<typeof entriesTable.$inferInsert> = {}) {
  const [entry] = await db.insert(entriesTable).values(entryForTest(overrides)).returning();
  if (!entry) throw new Error("test entry was not created");
  testData.entryIds.push(entry.id);
  return entry;
}

async function insertSession(email: string, entryId: number) {
  const token = `regression-session-${crypto.randomUUID()}`;
  const [session] = await db.insert(magicLinkTokensTable).values({
    token,
    email,
    entryId,
    purpose: "session",
    expiresAt: new Date(Date.now() + DAY_MS),
  }).returning();
  if (!session) throw new Error("test session was not created");
  testData.tokenIds.push(session.id);
  return token;
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();

  if (testData.offerIds.length > 0) {
    await db.delete(residencyOffersTable).where(
      or(...testData.offerIds.map((id) => eq(residencyOffersTable.id, id))),
    );
  }
  if (testData.tokenIds.length > 0) {
    await db.delete(magicLinkTokensTable).where(
      or(...testData.tokenIds.map((id) => eq(magicLinkTokensTable.id, id))),
    );
  }
  if (testData.entryIds.length > 0) {
    await db.delete(entriesTable).where(
      or(...testData.entryIds.map((id) => eq(entriesTable.id, id))),
    );
  }
  for (const email of testData.emails) {
    await db.delete(entriesTable).where(or(
      eq(entriesTable.contactEmail, email),
      eq(entriesTable.submittedBy, email),
      eq(entriesTable.claimedEmail, email),
    ));
    await db.delete(magicLinkTokensTable).where(eq(magicLinkTokensTable.email, email));
    await db.delete(usersTable).where(eq(usersTable.email, email));
  }

  testData = { emails: [], entryIds: [], offerIds: [], tokenIds: [] };
});

describe("member preferences", () => {
  it("loads saved defaults and updates only the signed-in profile", async () => {
    const email = emailForTest();
    await db.insert(usersTable).values({ email, displayName: "Preference Artist" });
    const profile = await insertEntry({
      contactEmail: email,
      submittedBy: email,
      tags: ["visual artist", "independent"],
    });
    const token = await insertSession(email, profile.id);

    const initial = await request
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(initial.status).toBe(200);
    expect(initial.body).toMatchObject({
      newsletterOptIn: false,
      ruralDiscoveryOptIn: false,
      exchangeDigestOptIn: false,
    });

    const enabled = await request
      .patch("/api/auth/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ newsletterOptIn: true, ruralDiscoveryOptIn: true, exchangeDigestOptIn: true });

    expect(enabled.status).toBe(200);
    expect(enabled.body).toEqual({ newsletterOptIn: true, ruralDiscoveryOptIn: true, exchangeDigestOptIn: true });

    const [savedUser] = await db
      .select({
        newsletterOptIn: usersTable.newsletterOptIn,
        exchangeDigestOptIn: usersTable.exchangeDigestOptIn,
        exchangeDigestOptedInAt: usersTable.exchangeDigestOptedInAt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    const [savedProfile] = await db
      .select({ tags: entriesTable.tags })
      .from(entriesTable)
      .where(eq(entriesTable.id, profile.id));
    expect(savedUser?.newsletterOptIn).toBe(true);
    expect(savedUser?.exchangeDigestOptIn).toBe(true);
    expect(savedUser?.exchangeDigestOptedInAt).toBeInstanceOf(Date);
    expect(savedProfile?.tags).toEqual(["visual artist", "independent", "rural"]);

    const disabled = await request
      .patch("/api/auth/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ newsletterOptIn: false, ruralDiscoveryOptIn: false, exchangeDigestOptIn: false });

    expect(disabled.status).toBe(200);
    expect(disabled.body).toEqual({ newsletterOptIn: false, ruralDiscoveryOptIn: false, exchangeDigestOptIn: false });
    const [removedProfileTag] = await db
      .select({ tags: entriesTable.tags })
      .from(entriesTable)
      .where(eq(entriesTable.id, profile.id));
    expect(removedProfileTag?.tags).toEqual(["visual artist", "independent"]);
  });

  it("rejects preference updates without a valid session", async () => {
    const response = await request
      .patch("/api/auth/preferences")
      .send({ newsletterOptIn: true, ruralDiscoveryOptIn: false });

    expect(response.status).toBe(401);
  });
});

describe("signup regressions", () => {
  it("verifies a member location before the signup can continue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "52.52",
        lon: "13.405",
        address: { city: "Berlin", country: "Germany" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.201")
      .send({ city: "Berlin", country: "Germany" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      city: "Berlin",
      country: "Germany",
    });
  });

  it("returns a retry prompt when geocoding times out", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("Geocoder request timed out", "TimeoutError"),
    );

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.205")
      .send({ city: "Reykjavik", country: "Iceland" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      field: "location",
      error: "We couldn't verify this city and country right now. Check the spelling and try again in a moment.",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("verifies Budapest when Nominatim returns the city name as its region", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "47.4818490",
        lon: "19.1449053",
        address: { region: "Budapest", country: "Hungary" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.209")
      .send({ city: "budapest", country: "Hungary" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      city: "Budapest",
      country: "Hungary",
    });
  });

  it("verifies a city returned in a regional address field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "35.0116",
        lon: "135.7681",
        address: { state: "Kyoto", country: "Japan" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.210")
      .send({ city: "Kyoto", country: "Japan" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, city: "Kyoto", country: "Japan" });
  });

  it("verifies a requested locality returned as a borough", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "40.6782",
        lon: "-73.9442",
        address: { borough: "Brooklyn", country: "United States" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.213")
      .send({ city: "Brooklyn", country: "United States" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      city: "Brooklyn",
      country: "United States",
    });
  });

  it("matches a city's provider name without requiring the same accents", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "-23.5505",
        lon: "-46.6333",
        name: "São Paulo",
        address: { country: "Brazil" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.211")
      .send({ city: "Sao Paulo", country: "Brazil" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, city: "São Paulo", country: "Brazil" });
  });

  it("does not mistake a different broad region for the requested city", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "47.4818490",
        lon: "19.1449053",
        address: { region: "Pest County", country: "Hungary" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.212")
      .send({ city: "Debrecen", country: "Hungary" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ field: "location" });
  });

  it.each([
    ["not a link", "198.51.100.205"],
    ["https://portfolio.example.test https://another.example.test", "198.51.100.206"],
  ])("rejects a work link that is not one HTTP(S) URL: %s", async (socialHandle, ip) => {
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", ip)
      .send({
        email: emailForTest(),
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Invalid Work Link Artist",
        socialHandle,
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      field: "socialHandle",
      error: "enter one valid website, portfolio, or social link beginning with https:// or http://",
    });
  });

  it("requires space applicants to confirm a real physical meeting place", async () => {
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.214")
      .send({
        email: emailForTest(),
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        password: "correct horse battery staple",
        kind: "space",
        physicalSpaceConfirmed: false,
        name: "Virtual Coworking Group",
        socialHandle: "https://example.test/virtual-coworking",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ field: "physicalSpaceConfirmed" });
  });

  it("accepts a confirmed physical-space application without artist-only looking-for answers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "48.8566",
        lon: "2.3522",
        address: { city: "Test City", country: "France" },
      }],
    } as Response);

    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.215")
      .send({
        email: emailForTest(),
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "space",
        physicalSpaceConfirmed: true,
        name: "Test Community Studio",
        socialHandle: "https://example.test/community-studio",
        city: "Test City",
        country: "France",
        blurb: "A physical community studio where artists meet, work, and share skills.",
        tags: "studio, community space",
        openTo: [],
        offeringChoices: ["skills / peer support"],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ok: true, isApproved: false });
  });

  it("reuses the verified location when the same member completes signup", async () => {
    const city = `Cache City ${crypto.randomUUID()}`;
    const country = `Cache Country ${crypto.randomUUID()}`;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          lat: "48.8566",
          lon: "2.3522",
          address: { city, country },
        }],
      } as Response)
      .mockRejectedValueOnce(new Error("the duplicate geocode should use the cached result"));

    const validation = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.203")
      .send({ city: city.toLowerCase(), country: country.toLowerCase() });

    expect(validation.status).toBe(200);
    expect(validation.body).toMatchObject({ city, country });

    const email = emailForTest();
    const registration = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.204")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Cached Location Artist",
        socialHandle: "https://portfolio.example.test/cached-location",
        city: validation.body.city,
        country: validation.body.country,
        blurb: "An independent artist looking for meaningful connections across the network.",
        tags: "visual artist",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        joinReason: "I want to join the network and meet other independent artists.",
      });

    expect(registration.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a location that cannot be mapped", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const response = await request
      .post("/api/auth/validate-location")
      .set("X-Forwarded-For", "198.51.100.202")
      .send({ city: "Nowhereville", country: "Narnia" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      field: "location",
      error: "We couldn't verify this city and country right now. Check the spelling and try again in a moment.",
    });
  });

  it("stores the new signup answers separately and accepts long responses without a character limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "43.6045",
        lon: "1.444",
        address: { city: "Test City", country: "France" },
      }],
    } as Response);

    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.99")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Short Reason Artist",
        socialHandle: "https://portfolio.example.test/short-reason",
        city: "Test City",
        country: "France",
        blurb: "An independent artist looking for meaningful connections across the network.",
        tags: "visual artist",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        discoverySource: "Instagram ".repeat(100),
        networkNextSteps: "I plan to share work and reach out to the network.",
      });

    expect(response.status).toBe(201);
    const [entry] = await db
      .select({
        discoverySource: entriesTable.discoverySource,
        networkNextSteps: entriesTable.networkNextSteps,
        joinReason: entriesTable.joinReason,
      })
      .from(entriesTable)
      .where(eq(entriesTable.id, response.body.entryId));

    expect(entry).toEqual({
      discoverySource: "Instagram ".repeat(100).trim(),
      networkNextSteps: "I plan to share work and reach out to the network.",
      joinReason: null,
    });
  });

  it("rejects a public member signup when profile publication consent is missing", async () => {
    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.100")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Consent Missing Artist",
        socialHandle: "https://portfolio.example.test/consent-missing",
        city: "Test City",
        country: "France",
        blurb: "A valid-looking public profile that must not be created without consent.",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        offerings: "skills / peer support",
        joinReason: "I want to join the network and meet other independent artists.",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      field: "publicProfileConsent",
      error: "please confirm that you understand your profile will be visible on the public internet before submitting",
    });
  });

  it("rejects signup when consent to collect and store application data is missing", async () => {
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.107")
      .send({
        email: emailForTest(),
        officialEmailConfirmed: true,
        adultConfirmed: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Data Consent Missing Artist",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      field: "dataProcessingConsent",
      error: "please consent to Countercult collecting, storing, and using your submitted information as explained in the Privacy Notice",
    });
  });

  it("rejects a network-only application when profile visibility consent is missing", async () => {
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.106")
      .send({
        email: emailForTest(),
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        profileVisibility: "network",
        password: "correct horse battery staple",
        name: "Network Consent Missing",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      field: "profileVisibilityConsent",
      error: "please confirm that you understand your profile will be visible to approved Countercult members before submitting",
    });
  });

  it("creates a pending account, entry, and session for a new signup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "48.8566",
        lon: "2.3522",
        address: { city: "Paris", country: "France" },
      }],
    } as Response);

    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.101")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "New Regression Artist",
        socialHandle: "https://portfolio.example.test/new-artist",
        city: "Test City",
        country: "France",
        blurb: "An independent artist looking for meaningful connections across the network.",
        tags: "sound artist, experimental music",
        openTo: ["collaboration"],
        offeringChoices: ["a workspace / studio", "skills / peer support"],
        offerings: "a workspace / studio, skills / peer support\n\nI can share rehearsal space and help other artists navigate the city.",
        joinReason: "Build with artists in my city.",
        discoverySource: "Instagram",
        signupSource: "instagram",
        signupMedium: "social",
        signupCampaign: "member-growth",
        signupReferrerDomain: "instagram.com",
        signupLandingPath: "/join",
        exchangeDigestOptIn: true,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      email,
      isApproved: false,
      newsletterOptIn: false,
      curatorCodeAccepted: false,
      referralAccepted: false,
    });
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.entryId).toEqual(expect.any(Number));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    expect(user).toMatchObject({
      email,
      isApproved: false,
      signupSource: "instagram",
      signupMedium: "social",
      signupCampaign: "member-growth",
      signupReferrerDomain: "instagram.com",
      signupLandingPath: "/join",
      signupReportedSource: "Instagram",
      exchangeDigestOptIn: true,
      exchangeDigestOptedInAt: expect.any(Date),
    });
    expect(user?.passwordHash).toEqual(expect.any(String));

    const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, response.body.entryId));
    expect(entry).toMatchObject({
      contactEmail: email,
      status: "pending_review",
      isApproved: false,
      publicProfileConsentVersion: "public-profile-v1",
      publicProfileConsentAt: expect.any(Date),
      name: "New Regression Artist",
      blurb: "An independent artist looking for meaningful connections across the network.",
      tags: ["sound artist", "experimental music"],
      offerings: "a studio / workspace, skill swaps\n\nI can share rehearsal space and help other artists navigate the city.",
      joinReason: "Build with artists in my city.",
    });
    const [consentingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    expect(consentingUser).toMatchObject({
      dataProcessingConsentVersion: "application-data-v2",
      dataProcessingConsentAt: expect.any(Date),
    });

    vi.stubEnv("ADMIN_PASSWORD", "signup-attribution-test-password");
    const unauthorizedAttribution = await request.get("/api/admin/signup-attribution");
    expect(unauthorizedAttribution.status).toBe(401);
    const attributionResponse = await request
      .get("/api/admin/signup-attribution")
      .set("x-admin-password", "signup-attribution-test-password");
    expect(attributionResponse.status).toBe(200);
    expect(attributionResponse.body).toContainEqual(expect.objectContaining({
      id: user?.id,
      displayName: "New Regression Artist",
      accountRole: "member",
      source: "instagram",
      medium: "social",
      campaign: "member-growth",
      referrerDomain: "instagram.com",
      landingPath: "/join",
      reportedSource: "Instagram",
    }));

    const [session] = await db.select().from(magicLinkTokensTable).where(
      and(
        eq(magicLinkTokensTable.token, response.body.token),
        eq(magicLinkTokensTable.purpose, "session"),
      ),
    );
    expect(session).toMatchObject({ email, entryId: response.body.entryId });
    testData.entryIds.push(response.body.entryId);
    testData.tokenIds.push(session!.id);
  });

  it("returns a conflict instead of a server error when duplicate signups race", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "48.8566",
        lon: "2.3522",
        address: { city: "Paris", country: "France" },
      }],
    } as Response);

    const email = emailForTest();
    const payload = {
      email,
      officialEmailConfirmed: true,
      adultConfirmed: true,
      dataProcessingConsent: true,
      publicProfileConsent: true,
      password: "correct horse battery staple",
      kind: "artist",
      name: "Concurrent Regression Artist",
      socialHandle: "https://portfolio.example.test/concurrent-artist",
      city: "Test City",
      country: "France",
      blurb: "An independent artist looking for meaningful connections across the network.",
      tags: "sound artist",
      openTo: ["collaboration"],
      offeringChoices: ["a workspace / studio"],
      joinReason: "I want to build useful relationships with artists in my city.",
    };

    const responses = await Promise.all([
      request.post("/api/auth/register").set("X-Forwarded-For", "198.51.100.211").send(payload),
      request.post("/api/auth/register").set("X-Forwarded-For", "198.51.100.212").send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(responses.find((response) => response.status === 409)?.body.error).toContain("account with this email already exists");

    const success = responses.find((response) => response.status === 201)!;
    expect(success.body.entryId).toEqual(expect.any(Number));
    testData.entryIds.push(success.body.entryId);
    const [session] = await db.select().from(magicLinkTokensTable).where(
      and(eq(magicLinkTokensTable.token, success.body.token), eq(magicLinkTokensTable.purpose, "session")),
    );
    expect(session).toBeDefined();
    testData.tokenIds.push(session!.id);
    expect(await db.select().from(usersTable).where(eq(usersTable.email, email))).toHaveLength(1);
  });

  it("creates an inner-network profile without public publication consent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "48.8566",
        lon: "2.3522",
        address: { city: "Paris", country: "France" },
      }],
    } as Response);

    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.105")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        profileVisibility: "network",
        profileVisibilityConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Network Only Artist",
        socialHandle: "https://portfolio.example.test/network-only",
        city: "Test City",
        country: "France",
        blurb: "An independent artist looking for meaningful connections across the network.",
        tags: "visual artist",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        offerings: "skills / peer support",
        joinReason: "I want to meet other independent artists inside the Countercult network.",
      });

    expect(response.status).toBe(201);
    expect(response.body.entryId).toEqual(expect.any(Number));

    const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, response.body.entryId));
    expect(entry).toMatchObject({
      visibility: "network",
      profileVisibilityConsentVersion: "profile-visibility-v1",
      profileVisibilityConsentAt: expect.any(Date),
      tags: ["visual artist"],
      publicProfileConsentVersion: null,
      publicProfileConsentAt: null,
      archiveConsentVersion: null,
      archiveConsentAt: null,
    });
    const [session] = await db.select().from(magicLinkTokensTable).where(
      and(eq(magicLinkTokensTable.token, response.body.token), eq(magicLinkTokensTable.purpose, "session")),
    );
    testData.entryIds.push(response.body.entryId);
    testData.tokenIds.push(session!.id);
  });

  it("allows a member signup without profile tags so they can add them after approval", async () => {
    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.108")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "Missing Type Artist",
        socialHandle: "https://portfolio.example.test/missing-type",
        city: "Test City",
        country: "France",
        blurb: "An independent artist looking for meaningful connections across the network.",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
      });

    expect(response.status).toBe(201);
    expect(response.body.entryId).toEqual(expect.any(Number));
    const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, response.body.entryId));
    expect(entry?.tags).toEqual([]);
  });

  it("allows member signup without a bio", async () => {
    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.109")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        kind: "artist",
        name: "No Bio Artist",
        socialHandle: "https://portfolio.example.test/no-bio",
        city: "Test City",
        country: "France",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
      });

    expect(response.status).toBe(201);
    const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, response.body.entryId));
    expect(entry?.blurb).toBeNull();
  });

  it("accepts a valid existing password and makes reset links single-use", async () => {
    const email = emailForTest();
    const password = "existing account password";
    await db.insert(usersTable).values({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      isApproved: true,
    });

    const loginResponse = await request
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.106")
      .send({ email: email.toUpperCase(), password });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({ ok: true, email, isApproved: true });
    testData.tokenIds.push(
      (await db.select({ id: magicLinkTokensTable.id }).from(magicLinkTokensTable).where(
        and(eq(magicLinkTokensTable.token, loginResponse.body.token), eq(magicLinkTokensTable.purpose, "session")),
      ))[0]!.id,
    );

    const resetToken = `regression-reset-${crypto.randomUUID()}`;
    const [resetRecord] = await db.insert(magicLinkTokensTable).values({
      token: resetToken,
      email,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + DAY_MS),
    }).returning({ id: magicLinkTokensTable.id });
    testData.tokenIds.push(resetRecord!.id);

    const resetResponse = await request
      .post("/api/auth/reset-password")
      .send({ token: resetToken, password: "new account password" });
    expect(resetResponse.status).toBe(200);

    const secondResetResponse = await request
      .post("/api/auth/reset-password")
      .send({ token: resetToken, password: "another account password" });
    expect(secondResetResponse.status).toBe(400);

    const newLoginResponse = await request
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.107")
      .send({ email, password: "new account password" });
    expect(newLoginResponse.status).toBe(200);
    const [newSession] = await db.select({ id: magicLinkTokensTable.id }).from(magicLinkTokensTable).where(
      and(eq(magicLinkTokensTable.token, newLoginResponse.body.token), eq(magicLinkTokensTable.purpose, "session")),
    );
    testData.tokenIds.push(newSession!.id);
  });

  it("keeps new partner accounts from publishing until approval", async () => {
    const email = emailForTest();
    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.104")
      .send({
        accountRole: "partner_poster",
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "correct horse battery staple",
        name: "Pending Institution",
        openTo: [],
        joinReason: "Partner account for sharing opportunities, resources, discounts, access, and space with artists.",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      email,
      isApproved: false,
      accountRole: "partner_poster",
      entryId: null,
    });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    expect(user).toMatchObject({
      email,
      accountRole: "partner_poster",
      isApproved: false,
    });

    const [session] = await db.select().from(magicLinkTokensTable).where(
      and(
        eq(magicLinkTokensTable.token, response.body.token),
        eq(magicLinkTokensTable.purpose, "session"),
      ),
    );
    expect(session).toBeDefined();
    testData.tokenIds.push(session!.id);

    const publishResponse = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${response.body.token}`)
      .send({
        kind: "gig",
        city: "Test City",
        description: "A paid opportunity that must wait for partner approval.",
        cost: "€100",
        visibility: "network",
      });

    expect(publishResponse.status).toBe(403);
    expect(publishResponse.body.error).toContain("approval is required");
  });
  it.each([
    ["independent", false, "independent"],
    ["commercial_operator", true, "commercial"],
  ] as const)(
    "accepts the %s space model and derives its use-based classification",
    async (organizationModel, intendedCommercialUse, expectedClassification) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [{
          lat: "48.8566",
          lon: "2.3522",
          address: { city: "Paris", country: "France" },
        }],
      } as Response);

      const email = emailForTest();
      const response = await request
        .post("/api/auth/register")
        .set("X-Forwarded-For", `198.51.101.${intendedCommercialUse ? 105 : 104}`)
        .send({
          email,
          officialEmailConfirmed: true,
          adultConfirmed: true,
          dataProcessingConsent: true,
          profileVisibility: "public",
          publicProfileConsent: true,
          password: "correct horse battery staple",
          kind: "space",
          physicalSpaceConfirmed: true,
          name: `Regression ${organizationModel} space`,
          socialHandle: "https://portfolio.example.test/space",
          city: "Test City",
          country: "France",
          tags: "artist-run space",
          blurb: "An independent cultural space with enough public context for the review process.",
          openTo: ["collaboration"],
          offeringChoices: ["space / venue"],
          offerings: "space / venue",
          joinReason: "We want to share cultural resources and build useful relationships across the network.",
          organizationModel,
          intendedCommercialUse,
        });

      expect(response.status).toBe(201);
      const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, response.body.entryId));
      expect(entry).toMatchObject({
        organizationModel,
        intendedCommercialUse,
        declaredClassification: expectedClassification,
        derivedClassification: expectedClassification,
      });
      testData.entryIds.push(response.body.entryId);
    },
  );

  it("resumes an incomplete signup only when the existing password matches", async () => {
    const email = emailForTest();
    const password = "resume this signup safely";
    await db.insert(usersTable).values({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      isApproved: false,
      exchangeDigestOptIn: true,
      exchangeDigestOptedInAt: new Date(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: "48.8566",
        lon: "2.3522",
        address: { city: "Paris", country: "France" },
      }],
    } as Response);

    const wrongPassword = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.102")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password: "not the existing password",
        name: "Should Not Resume",
        socialHandle: "https://portfolio.example.test/nope",
        city: "Test City",
        country: "France",
        tags: "visual artist",
        blurb: "This attempted profile includes enough context but should not resume without the password.",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        offerings: "skills / peer support",
        joinReason: "This attempt should not complete the signup because the password is wrong.",
      });
    expect(wrongPassword.status).toBe(409);
    const [unchangedDigestPreference] = await db
      .select({ exchangeDigestOptIn: usersTable.exchangeDigestOptIn })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    expect(unchangedDigestPreference?.exchangeDigestOptIn).toBe(true);

    const response = await request
      .post("/api/auth/register")
      .set("X-Forwarded-For", "198.51.100.103")
      .send({
        email,
        officialEmailConfirmed: true,
        adultConfirmed: true,
        dataProcessingConsent: true,
        publicProfileConsent: true,
        password,
        name: "Resumed Regression Artist",
        socialHandle: "https://portfolio.example.test/resumed-artist",
        city: "Test City",
        country: "France",
        tags: "visual artist",
        blurb: "I am completing an interrupted artist profile with useful context for reviewers.",
        openTo: ["collaboration"],
        offeringChoices: ["skills / peer support"],
        offerings: "skills / peer support",
        joinReason: "I am completing my interrupted signup and would like to meet collaborators.",
        exchangeDigestOptIn: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      email,
      isApproved: false,
    });
    expect(response.body.token).toEqual(expect.any(String));
    const [resumedUser] = await db
      .select({
        exchangeDigestOptIn: usersTable.exchangeDigestOptIn,
        exchangeDigestOptedInAt: usersTable.exchangeDigestOptedInAt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    expect(resumedUser?.exchangeDigestOptIn).toBe(false);
    expect(resumedUser?.exchangeDigestOptedInAt).toBeNull();

    const entries = await db.select().from(entriesTable).where(eq(entriesTable.contactEmail, email));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: "Resumed Regression Artist",
      status: "pending_review",
      isApproved: false,
    });
    testData.entryIds.push(entries[0]!.id);

    const sessions = await db.select().from(magicLinkTokensTable).where(and(
      eq(magicLinkTokensTable.email, email),
      eq(magicLinkTokensTable.purpose, "session"),
    ));
    expect(sessions).toHaveLength(1);
    testData.tokenIds.push(sessions[0]!.id);
  });
});

describe("public privacy regressions", () => {
  it("queues an anonymous space recommendation for review before it can be claimed", async () => {
    const ipOctets = crypto.randomBytes(2);
    const testIp = `198.51.${ipOctets[0]}.${ipOctets[1] || 1}`;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(
      JSON.stringify([{ lat: "52.5", lon: "13.4" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )).mockResolvedValueOnce(new Response(
      JSON.stringify([{ lat: "40.7", lon: "-73.9" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const suggestion = {
      name: "Community Studio Regression",
      city: "Berlin",
      country: "Germany",
      url: "https://community-studio.example.test",
      blurb: "A community-run studio with regular workshops, shared tools, and open cultural programming in Berlin.",
      tags: ["studio", "community"],
      offerings: "Affordable venue hire and workshops",
      offeringChoices: ["a venue / event space", "organizing artist coworking"],
      basedIn: ["Berlin"],
      networkNextSteps: "Meet local artists and share space opportunities.",
      discoverySource: "Community recommendation",
      profileVisibility: "network",
      profileVisibilityConsent: true,
      publicProfileConsent: true,
      adultConfirmed: true,
      spaceOfferAvailable: true,
      spaceOfferTypes: ["coworking / work sessions"],
      spaceOfferCategory: "work",
      spaceOfferPricing: "free",
      spaceOfferDetails: "Available for small artist gatherings.",
    };
    const createResponse = await request.post("/api/entries/space-suggestions").set("X-Forwarded-For", testIp).send(suggestion);
    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: suggestion.name,
      isCommunitySubmitted: true,
      isClaimed: false,
      reviewRequired: true,
    });
    testData.entryIds.push(createResponse.body.id);

    const [pendingEntry] = await db.select({
      status: entriesTable.status,
      isApproved: entriesTable.isApproved,
      isClaimed: entriesTable.isClaimed,
      submittedBy: entriesTable.submittedBy,
      contactEmail: entriesTable.contactEmail,
      address: entriesTable.address,
      submissionRelationship: entriesTable.submissionRelationship,
      visibility: entriesTable.visibility,
      url: entriesTable.url,
      blurb: entriesTable.blurb,
      tags: entriesTable.tags,
      offerings: entriesTable.offerings,
      basedIn: entriesTable.basedIn,
      spaceOfferAvailable: entriesTable.spaceOfferAvailable,
      spaceOfferCategory: entriesTable.spaceOfferCategory,
      publicProfileConsentAt: entriesTable.publicProfileConsentAt,
    }).from(entriesTable).where(eq(entriesTable.id, createResponse.body.id));
    expect(pendingEntry).toMatchObject({
      status: "pending_review",
      isApproved: false,
      isClaimed: false,
      submittedBy: null,
      contactEmail: null,
      address: null,
      submissionRelationship: "recommends",
      visibility: "public",
      url: suggestion.url,
      blurb: suggestion.blurb,
      tags: suggestion.tags,
      basedIn: suggestion.basedIn,
      spaceOfferAvailable: true,
      spaceOfferCategory: "work",
    });
    expect(pendingEntry.offerings).toContain("a venue / event space");
    expect(pendingEntry.offerings).toContain(suggestion.offerings);
    expect(pendingEntry.publicProfileConsentAt).toBeInstanceOf(Date);

    const listResponse = await request.get("/api/entries");
    const summary = listResponse.body.find((entry: { id: number }) => entry.id === createResponse.body.id);
    expect(summary).toBeUndefined();

    const detailResponse = await request.get(`/api/entries/${createResponse.body.id}`);
    expect(detailResponse.status).toBe(404);

    const duplicateResponse = await request.post("/api/entries/space-suggestions").set("X-Forwarded-For", testIp).send(suggestion);
    expect(duplicateResponse.status).toBe(409);

    const adminPassword = "community-space-review-admin";
    vi.stubEnv("ADMIN_PASSWORD", adminPassword);
    const pendingResponse = await request.get("/api/admin/entries/pending")
      .set("x-admin-password", adminPassword);
    expect(pendingResponse.status).toBe(200);
    const adminEntry = pendingResponse.body.find((entry: { id: number }) => entry.id === createResponse.body.id);
    expect(adminEntry).toMatchObject({
      id: createResponse.body.id,
      name: suggestion.name,
      url: suggestion.url,
      blurb: suggestion.blurb,
      tags: suggestion.tags,
      submissionRelationship: "recommends",
    });

    const approvalResponse = await request.post(`/api/admin/entries/${createResponse.body.id}/approve`)
      .set("x-admin-password", adminPassword)
      .send({});
    expect(approvalResponse.status).toBe(200);

    const approvedDetail = await request.get(`/api/entries/${createResponse.body.id}`);
    expect(approvedDetail.status).toBe(200);
    expect(approvedDetail.body).toMatchObject({
      isCommunitySubmitted: true,
      isClaimed: false,
      claimRequestAvailable: true,
      address: null,
    });
  });

  it("recognizes common name, city, and country formatting variants", async () => {
    const testIp = `198.51.${crypto.randomBytes(2)[0]}.${crypto.randomBytes(2)[1] || 1}`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(
      JSON.stringify([{ lat: "52.5", lon: "13.4" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const firstSuggestion = {
      name: "Café Kessel!",
      city: "Berlin",
      country: "Germany",
    };
    const firstResponse = await request
      .post("/api/entries/space-suggestions")
      .set("X-Forwarded-For", testIp)
      .send(firstSuggestion);
    expect(firstResponse.status).toBe(201);
    testData.entryIds.push(firstResponse.body.id);

    const duplicateResponse = await request
      .post("/api/entries/space-suggestions")
      .set("X-Forwarded-For", testIp)
      .send({
        ...firstSuggestion,
        name: "Cafe Kessel",
        city: "BERLIN",
        country: "GERMANY",
      });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toMatchObject({
      error: "a likely duplicate already exists",
      existingId: firstResponse.body.id,
      existingName: firstSuggestion.name,
    });
    expect(duplicateResponse.body).not.toHaveProperty("address");
    expect(duplicateResponse.body).not.toHaveProperty("submitterEmail");
  });

  it("allows the same space name in different cities", async () => {
    const testIp = `198.51.${crypto.randomBytes(2)[0]}.${crypto.randomBytes(2)[1] || 1}`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(
      JSON.stringify([{ lat: "52.5", lon: "13.4" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const suggestion = {
      name: "Common Studio",
      city: "Berlin",
      country: "Germany",
    };
    const firstResponse = await request
      .post("/api/entries/space-suggestions")
      .set("X-Forwarded-For", testIp)
      .send(suggestion);
    expect(firstResponse.status).toBe(201);
    testData.entryIds.push(firstResponse.body.id);

    const secondResponse = await request
      .post("/api/entries/space-suggestions")
      .set("X-Forwarded-For", testIp)
      .send({
        ...suggestion,
        city: "Amsterdam",
        country: "Netherlands",
      });

    expect(secondResponse.status).toBe(201);
    testData.entryIds.push(secondResponse.body.id);
    expect(secondResponse.body.id).not.toBe(firstResponse.body.id);
  });

  it("allows only one of two concurrent submissions for the same space", async () => {
    const testIp = `198.51.${crypto.randomBytes(2)[0]}.${crypto.randomBytes(2)[1] || 1}`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(
      JSON.stringify([{ lat: "52.5", lon: "13.4" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const name = `Concurrent Culture Studio ${crypto.randomUUID()}`;
    const suggestion = {
      name,
      city: "Berlin",
      country: "Germany",
    };

    const responses = await Promise.all([
      request.post("/api/entries/space-suggestions").set("X-Forwarded-For", testIp).send(suggestion),
      request.post("/api/entries/space-suggestions").set("X-Forwarded-For", testIp).send({
        ...suggestion,
        name: `${name}!`,
      }),
    ]);

    for (const response of responses) {
      if (response.status === 201 && response.body.id) testData.entryIds.push(response.body.id);
    }
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it("does not publicly return paused, unpublished, or unapproved entries", async () => {
    const visible = await insertEntry({
      name: "Visible Regression Entry",
      kind: "space",
      address: "123 Private Street",
      postal: "12345",
      lat: 1,
      lng: 2,
    });
    const paused = await insertEntry({
      name: "Paused Regression Entry",
      kind: "space",
      isHidden: true,
      lat: 3,
      lng: 4,
    });
    const unpublished = await insertEntry({
      name: "Unpublished Regression Entry",
      kind: "space",
      status: "pending_review",
      isApproved: false,
      lat: 5,
      lng: 6,
    });
    const unapprovedPublished = await insertEntry({
      name: "Unapproved Published Regression Entry",
      kind: "space",
      isApproved: false,
      lat: 7,
      lng: 8,
    });

    const listResponse = await request.get("/api/entries");
    expect(listResponse.status).toBe(200);
    const listedEntryIds = listResponse.body.map((entry: { id: number }) => entry.id);
    expect(listedEntryIds).toContain(visible.id);
    expect(listedEntryIds).not.toContain(paused.id);
    expect(listedEntryIds).not.toContain(unpublished.id);
    expect(listedEntryIds).not.toContain(unapprovedPublished.id);
    const listedVisible = listResponse.body.find((entry: { id: number }) => entry.id === visible.id);
    expect(listedVisible).not.toHaveProperty("postal");
    expect(listedVisible.lat).not.toBe(visible.lat);
    expect(listedVisible.lng).not.toBe(visible.lng);

    const pinsToken = await insertSession("pins-viewer@example.com", visible.id);
    const anonymousPinsResponse = await request.get("/api/entries/pins");
    expect(anonymousPinsResponse.status).toBe(200);
    const anonymousPinnedEntryIds = anonymousPinsResponse.body.map((entry: { id: number }) => entry.id);
    expect(anonymousPinnedEntryIds).toContain(visible.id);
    expect(anonymousPinsResponse.body.find((entry: { id: number }) => entry.id === visible.id).lat)
      .toBe(listedVisible.lat);

    const pinsResponse = await request
      .get("/api/entries/pins")
      .set("Authorization", `Bearer ${pinsToken}`);
    expect(pinsResponse.status).toBe(200);
    const pinnedEntryIds = pinsResponse.body.map((entry: { id: number }) => entry.id);
    expect(pinnedEntryIds).toContain(visible.id);
    expect(pinnedEntryIds).not.toContain(paused.id);
    expect(pinnedEntryIds).not.toContain(unpublished.id);
    expect(pinnedEntryIds).not.toContain(unapprovedPublished.id);
    const pinnedVisible = pinsResponse.body.find((entry: { id: number }) => entry.id === visible.id);
    expect(pinnedVisible.lat).toBe(listedVisible.lat);
    expect(pinnedVisible.lng).toBe(listedVisible.lng);

    const detailResponse = await request.get(`/api/entries/${visible.id}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.address).toBeNull();
    expect(detailResponse.body.postal).toBeNull();
    expect(detailResponse.body.lat).toBe(listedVisible.lat);
    expect(detailResponse.body.lng).toBe(listedVisible.lng);
    expect(detailResponse.body).not.toHaveProperty("contactEmail");
    expect(detailResponse.body).not.toHaveProperty("claimedEmail");
    expect(detailResponse.body).not.toHaveProperty("scrapingConsent");
    expect(detailResponse.body).not.toHaveProperty("discoveredLinks");
    expect(detailResponse.body).not.toHaveProperty("spaceOfferAvailable");
    expect(detailResponse.body).not.toHaveProperty("spaceOfferDetails");

    expect((await request.get(`/api/entries/${paused.id}`)).status).toBe(404);
    expect((await request.get(`/api/entries/${unpublished.id}`)).status).toBe(404);
    expect((await request.get(`/api/entries/${unapprovedPublished.id}`)).status).toBe(404);
  });

  it("keeps network-only profiles out of public responses but returns them to approved members", async () => {
    const networkEntry = await insertEntry({
      name: "Inner Network Regression Entry",
      visibility: "network",
      contactEmail: "network-entry@example.test",
      lat: 10,
      lng: 20,
    });
    const viewerEmail = emailForTest();
    await db.insert(usersTable).values({ email: viewerEmail, isApproved: true });
    const viewerToken = await insertSession(viewerEmail, networkEntry.id);

    expect((await request.get("/api/entries")).body.map((entry: { id: number }) => entry.id))
      .not.toContain(networkEntry.id);
    expect((await request.get(`/api/entries/${networkEntry.id}`)).status).toBe(404);

    const directoryResponse = await request
      .get("/api/entries/network")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(directoryResponse.status).toBe(200);
    const listedNetworkEntry = directoryResponse.body.find((entry: { id: number }) => entry.id === networkEntry.id);
    expect(listedNetworkEntry).toMatchObject({
      id: networkEntry.id,
      name: networkEntry.name,
      visibility: "network",
    });
    expect(listedNetworkEntry).not.toHaveProperty("contactEmail");
  });

  it("shows limited pins for legacy public artists without consent while keeping profiles and cards private", async () => {
    const publicFeaturedArtist = await insertEntry({
      name: "Sketchy Shona",
      kind: "artist",
      visibility: "public",
      city: "Berlin",
      country: "Germany",
      lat: 52.5,
      lng: 13.4,
      publicProfileConsentAt: new Date(),
      heroPhoto: "/objects/uploads/sketchy-shona-hero.jpg",
      tags: ["artist", "painting"],
      openTo: ["collaborations"],
      offerings: "skills / peer support, a workspace / studio\n\nprivate offering details",
    });
    const publicUnfeaturedArtist = await insertEntry({
      name: "Unfeatured Regression Artist",
      kind: "artist",
      visibility: "public",
      city: "Berlin",
      country: "Germany",
      lat: 51,
      lng: 12,
      publicProfileConsentAt: new Date(),
      heroPhoto: "/objects/uploads/unfeatured-artist-hero.jpg",
      tags: ["experimental", "painting"],
    });
    const unconsentedPublicArtist = await insertEntry({
      name: "Unconsented Regression Artist",
      kind: "artist",
      visibility: "public",
      city: "Lisbon",
      country: "Portugal",
      lat: 51.1,
      lng: 12.1,
      tags: ["experimental"],
      heroPhoto: "/objects/uploads/unconsented-artist-hero.jpg",
    });
    const networkFeaturedArtist = await insertEntry({
      name: "Carolina Leon (LOBA)",
      kind: "artist",
      visibility: "network",
      lat: 50,
      lng: 11,
    });
    const publicSpace = await insertEntry({
      name: "Public Regression Venue",
      kind: "space",
      lat: 49,
      lng: 10,
    });

    const memberEmail = emailForTest();
    await db.insert(usersTable).values({ email: memberEmail, isApproved: true });
    const memberToken = await insertSession(memberEmail, publicSpace.id);
    const partnerEmail = emailForTest();
    await db.insert(usersTable).values({
      email: partnerEmail,
      isApproved: true,
      accountRole: "partner_poster",
    });
    const partnerToken = await insertSession(partnerEmail, publicSpace.id);

    const publicEntriesResponse = await request.get("/api/entries");
    const publicEntryIds = publicEntriesResponse.body.map((entry: { id: number }) => entry.id);
    expect(publicEntryIds).toContain(publicSpace.id);
    expect(publicEntryIds).not.toContain(publicFeaturedArtist.id);
    expect(publicEntryIds).not.toContain(publicUnfeaturedArtist.id);
    expect(publicEntryIds).not.toContain(networkFeaturedArtist.id);

    const publicPinsResponse = await request.get("/api/entries/pins");
    const publicPins = publicPinsResponse.body as Array<Record<string, unknown> & { id: number }>;
    const publicPinIds = publicPins.map((entry) => entry.id);
    expect(publicPinIds).toContain(publicSpace.id);
    expect(publicPinIds).toContain(publicFeaturedArtist.id);
    expect(publicPinIds).toContain(publicUnfeaturedArtist.id);
    expect(publicPinIds).toContain(unconsentedPublicArtist.id);
    expect(publicPinIds).not.toContain(networkFeaturedArtist.id);
    const publicArtistPreview = publicPins.find((pin) => pin.id === publicFeaturedArtist.id);
    expect(publicArtistPreview).toMatchObject({
      name: "Sketchy Shona",
      kind: "artist",
      city: "Berlin",
      country: "Germany",
      tags: ["artist", "painting"],
      heroPhoto: "/objects/uploads/sketchy-shona-hero.jpg",
      isProfilePreview: true,
    });
    expect(publicArtistPreview).not.toHaveProperty("blurb");
    expect(publicArtistPreview).not.toHaveProperty("portfolioPhotos");
    expect(publicArtistPreview).not.toHaveProperty("contactEmail");
    expect(publicPins.find((pin) => pin.id === publicUnfeaturedArtist.id)?.name).toBe("Unfeatured Regression Artist");
    const unconsentedArtistPreview = publicPins.find((pin) => pin.id === unconsentedPublicArtist.id);
    expect(unconsentedArtistPreview).toMatchObject({
      name: "Unconsented Regression Artist",
      kind: "artist",
      city: "Lisbon",
      country: "Portugal",
      tags: ["experimental"],
      isProfilePreview: true,
    });
    expect(unconsentedArtistPreview).not.toHaveProperty("heroPhoto");
    expect(unconsentedArtistPreview).not.toHaveProperty("blurb");
    expect(unconsentedArtistPreview).not.toHaveProperty("portfolioPhotos");
    expect(unconsentedArtistPreview).not.toHaveProperty("contactEmail");

    const cardsResponse = await request.get("/api/entries/site-cards");
    expect(cardsResponse.status).toBe(200);
    const featuredCard = cardsResponse.body.find((card: { id: number }) => card.id === publicFeaturedArtist.id);
    expect(featuredCard).toMatchObject({
      id: publicFeaturedArtist.id,
      name: "Sketchy Shona",
      kind: "artist",
      city: "Berlin",
      country: "Germany",
      openTo: ["collaborations"],
      heroPhoto: "/objects/uploads/sketchy-shona-hero.jpg",
    });
    expect(featuredCard.offeringChoices).toEqual(expect.arrayContaining([
      "skill swaps",
      "a studio / workspace",
    ]));
    expect(featuredCard).not.toHaveProperty("offerings");
    expect(featuredCard).not.toHaveProperty("blurb");
    const unfeaturedCard = cardsResponse.body.find((card: { id: number }) => card.id === publicUnfeaturedArtist.id);
    expect(unfeaturedCard).toMatchObject({
      id: publicUnfeaturedArtist.id,
      name: "Unfeatured Regression Artist",
      kind: "artist",
      heroPhoto: "/objects/uploads/unfeatured-artist-hero.jpg",
    });
    const publicCardIds = cardsResponse.body.map((card: { id: number }) => card.id);
    expect(publicCardIds).not.toContain(networkFeaturedArtist.id);
    expect(publicCardIds).not.toContain(unconsentedPublicArtist.id);

    expect((await request.get(`/api/entries/${publicFeaturedArtist.id}`)).status).toBe(404);
    expect((await request.get(`/api/entries/${unconsentedPublicArtist.id}`)).status).toBe(404);
    expect((await request.get(`/api/entries/${publicFeaturedArtist.id}/comments`)).status).toBe(404);

    const memberEntriesResponse = await request
      .get("/api/entries")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(memberEntriesResponse.headers["cache-control"]).toContain("no-store");
    expect(memberEntriesResponse.body.map((entry: { id: number }) => entry.id))
      .toContain(publicFeaturedArtist.id);
    expect(memberEntriesResponse.body.map((entry: { id: number }) => entry.id))
      .toContain(networkFeaturedArtist.id);

    const memberPinsResponse = await request
      .get("/api/entries/pins")
      .set("Authorization", `Bearer ${memberToken}`);
    const memberPins = memberPinsResponse.body as Array<Record<string, unknown> & { id: number }>;
    expect(memberPins.map((entry) => entry.id)).toContain(publicFeaturedArtist.id);
    expect(memberPins.map((entry) => entry.id)).toContain(networkFeaturedArtist.id);
    expect(memberPins.find((pin) => pin.id === publicFeaturedArtist.id)).toMatchObject({
      name: "Sketchy Shona",
      isProfilePreview: false,
    });

    const memberDetailResponse = await request
      .get(`/api/entries/${publicFeaturedArtist.id}`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(memberDetailResponse.status).toBe(200);
    expect(memberDetailResponse.body.name).toBe("Sketchy Shona");

    expect((await request
      .get("/api/entries/network")
      .set("Authorization", `Bearer ${partnerToken}`)).status).toBe(403);
    expect((await request
      .get(`/api/entries/${publicFeaturedArtist.id}`)
      .set("Authorization", `Bearer ${partnerToken}`)).status).toBe(404);
  });

  it("rejects no-return skill-share offers", async () => {
    const email = emailForTest();
    const entry = await insertEntry({ name: "Practice Share Member", contactEmail: email });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const createResponse = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "skill_share",
        city: "Berlin",
        description: "A free risograph lesson.",
        skillShareMode: "free_offer",
        virtualAvailable: true,
      });

    expect(createResponse.status).toBe(400);
  });

  it("rejects skill-share offers that ask only for self-promotion", async () => {
    const email = emailForTest();
    const entry = await insertEntry({ name: "Barter Member", contactEmail: email });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const response = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "skill_share",
        city: "Berlin",
        description: "A free risograph lesson.",
        skillShareMode: "swap",
        requestedReturn: "More exposure",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("specific non-cash");
  });

  it("keeps the offered skill, requested return, and virtual option together in a public preview", async () => {
    const email = emailForTest();
    const entry = await insertEntry({ name: "Virtual Skill Swap Member", contactEmail: email });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const createResponse = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "skill_share",
        city: "Berlin",
        description: "Two hours of risograph printing instruction.",
        skillShareMode: "swap",
        requestedReturn: "Two hours of portfolio feedback.",
        virtualAvailable: true,
        cost: "€250",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      description: "Two hours of risograph printing instruction.",
      requestedReturn: "Two hours of portfolio feedback.",
      cost: "free",
      virtualAvailable: true,
    });
    testData.offerIds.push(createResponse.body.id);

    const listResponse = await request.get("/api/residency");
    const preview = listResponse.body.find((offer: { id: number }) => offer.id === createResponse.body.id);
    expect(preview).toMatchObject({
      description: "Two hours of risograph printing instruction.",
      requestedReturn: "Two hours of portfolio feedback.",
      virtualAvailable: true,
      isPublicPreview: true,
    });
  });

  it("uses explicit Exchange space subtypes in anonymous listing previews", async () => {
    const email = emailForTest();
    const entry = await insertEntry({ name: "Exchange Space Member", contactEmail: email });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const createResponse = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "workshop",
        city: "Marseille",
        description: "A flexible room for workshops and performances.",
        cost: "free",
        tags: ["cc-exchange:spaces:event"],
      });

    expect(createResponse.status).toBe(201);
    testData.offerIds.push(createResponse.body.id);

    const listResponse = await request.get("/api/residency");
    const anonymousOffer = listResponse.body.find((offer: { id: number }) => offer.id === createResponse.body.id);
    expect(anonymousOffer).toMatchObject({
      isPublicPreview: true,
      publicCategories: ["spaces"],
      publicSubfilters: ["spaces_event"],
    });
    expect(anonymousOffer).not.toHaveProperty("tags");
  });

  it("rejects space offers that omit whether access is free or paid", async () => {
    const email = emailForTest();
    const entry = await insertEntry({ name: "Unpriced Space Member", contactEmail: email });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const response = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "workshop",
        city: "Marseille",
        description: "A studio for small gatherings.",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("free or paid");
  });

  it("deactivates owner removals so admins can restore the original offer", async () => {
    const previousAdminPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = "regression-admin-password";

    try {
      const email = emailForTest();
      const entry = await insertEntry({ name: "Recoverable Offer Member", contactEmail: email });
      await db.insert(usersTable).values({ email, isApproved: true });
      const token = await insertSession(email, entry.id);

      const createResponse = await request
        .post("/api/residency")
        .set("Authorization", `Bearer ${token}`)
        .send({
          kind: "skill_share",
          city: "Paris",
          description: "A recoverable practice exchange.",
          skillShareMode: "swap",
          requestedReturn: "A set of watercolor brushes.",
        });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toMatchObject({
        visibility: "public",
        isActive: true,
      });
      testData.offerIds.push(createResponse.body.id);

      const removeResponse = await request
        .delete(`/api/residency/${createResponse.body.id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(removeResponse.status).toBe(204);

      const [deactivated] = await db
        .select()
        .from(residencyOffersTable)
        .where(eq(residencyOffersTable.id, createResponse.body.id));
      expect(deactivated).toMatchObject({
        id: createResponse.body.id,
        city: "Paris",
        description: "A recoverable practice exchange.",
        isActive: false,
      });

      const publicList = await request.get("/api/residency");
      expect(publicList.status).toBe(200);
      expect(publicList.body.find((offer: { id: number }) => offer.id === createResponse.body.id)).toBeUndefined();

      const adminList = await request
        .get("/api/admin/residency?includeInactive=true")
        .set("x-admin-password", "regression-admin-password");
      expect(adminList.status).toBe(200);
      expect(adminList.body.find((offer: { id: number }) => offer.id === createResponse.body.id)).toMatchObject({
        id: createResponse.body.id,
        isActive: false,
      });

      const restoreResponse = await request
        .post(`/api/admin/residency/${createResponse.body.id}/restore`)
        .set("x-admin-password", "regression-admin-password");
      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body).toMatchObject({
        id: createResponse.body.id,
        city: "Paris",
        description: "A recoverable practice exchange.",
        visibility: "public",
        isActive: true,
      });

      const restoredList = await request.get("/api/residency");
      expect(restoredList.body.find((offer: { id: number }) => offer.id === createResponse.body.id)).toMatchObject({
        id: createResponse.body.id,
        description: "A recoverable practice exchange.",
      });
    } finally {
      if (previousAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = previousAdminPassword;
    }
  });

  it("moves deferred submissions out of review and lets admins return them", async () => {
    const previousAdminPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = "regression-admin-password";

    try {
      const entry = await insertEntry({
        name: "Deferred Review Entry",
        status: "pending_review",
      });

      const deferResponse = await request
        .post(`/api/admin/entries/${entry.id}/mark-maybe-later`)
        .set("x-admin-password", "regression-admin-password");
      expect(deferResponse.status).toBe(200);
      expect(deferResponse.body.entry.status).toBe("maybe_later");

      const [deferredEntries, pendingEntries] = await Promise.all([
        request.get("/api/admin/entries/maybe-later").set("x-admin-password", "regression-admin-password"),
        request.get("/api/admin/entries/pending").set("x-admin-password", "regression-admin-password"),
      ]);
      expect(deferredEntries.body.some((item: { id: number }) => item.id === entry.id)).toBe(true);
      expect(pendingEntries.body.some((item: { id: number }) => item.id === entry.id)).toBe(false);

      const returnResponse = await request
        .post(`/api/admin/entries/${entry.id}/return-to-review`)
        .set("x-admin-password", "regression-admin-password");
      expect(returnResponse.status).toBe(200);
      expect(returnResponse.body.entry.status).toBe("pending_review");

      const [afterReturn, pendingAfterReturn] = await Promise.all([
        request.get("/api/admin/entries/maybe-later").set("x-admin-password", "regression-admin-password"),
        request.get("/api/admin/entries/pending").set("x-admin-password", "regression-admin-password"),
      ]);
      expect(afterReturn.body.some((item: { id: number }) => item.id === entry.id)).toBe(false);
      expect(pendingAfterReturn.body.some((item: { id: number }) => item.id === entry.id)).toBe(true);
    } finally {
      if (previousAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = previousAdminPassword;
    }
  });

  it("returns active Exchange offers as anonymous teasers and fuller details to approved members", async () => {
    const memberEmail = emailForTest();
    const memberEntry = await insertEntry({
      name: "Approved Offer Member",
      contactEmail: memberEmail,
    });
    await db.insert(usersTable).values({
      email: memberEmail,
      isApproved: true,
    });
    const token = await insertSession(memberEmail, memberEntry.id);
    const pendingEmail = emailForTest();
    const pendingEntry = await insertEntry({
      name: "Pending Offer Applicant",
      contactEmail: pendingEmail,
      status: "pending_review",
      isApproved: false,
    });
    await db.insert(usersTable).values({
      email: pendingEmail,
      isApproved: false,
    });
    const pendingToken = await insertSession(pendingEmail, pendingEntry.id);
    const viewerEmail = emailForTest();
    const viewerEntry = await insertEntry({
      name: "Approved Offer Viewer",
      contactEmail: viewerEmail,
    });
    await db.insert(usersTable).values({
      email: viewerEmail,
      isApproved: true,
    });
    const viewerToken = await insertSession(viewerEmail, viewerEntry.id);

    const [activeOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Test City",
      description: "Active private housing offer",
      availableFrom: "June 2027",
      availableTo: "July 2027",
      availabilityMode: "dates",
      contact: "private-contact@example.test",
      destination: "Lisbon",
      cost: "£200",
      duration: "2 weeks",
      capacity: "1 artist",
      visibility: "public",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    const [housingWorkspaceOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Dual Category City",
      description: "Housing with an attached studio workspace.",
      tags: ["cc-exchange:housing:sublet", "cc-exchange:spaces:workspace", "visual artists"],
      visibility: "public",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    const [privateOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "workshop",
      city: "Private Offer City",
      description: "Offer visible to approved Countercult members. Contact me at network-contact@example.test. Available 4–8 June 2027. Fee: €300.",
      contact: "network-contact@example.test",
      visibility: "network",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    const [privateVisibilityOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "workshop",
      city: "Owner Only City",
      description: "This listing is private to its owner.",
      visibility: "private",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    const hiddenEntry = await insertEntry({
      name: "Hidden Offer Member",
      isHidden: true,
    });
    const [hiddenProfileOffer] = await db.insert(residencyOffersTable).values({
      entryId: hiddenEntry.id,
      kind: "workshop",
      city: "Hidden Profile City",
      description: "This network offer belongs to a hidden profile.",
      visibility: "network",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    const [oldOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Old Test City",
      description: "Older private housing offer that stays live",
      contact: "old-private-contact@example.test",
      visibility: "public",
      createdAt: new Date(Date.now() - 31 * DAY_MS),
      isActive: true,
    }).returning();
    const [expiredShortTermOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Expired Sublet City",
      description: "Short-term sublet whose availability has ended",
      contact: "expired-sublet-contact@example.test",
      visibility: "public",
      duration: "shortterm",
      availableTo: "2020-01-01",
      createdAt: new Date(Date.now() - 31 * DAY_MS),
      isActive: true,
    }).returning();
    const [futureShortTermOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Future Sublet City",
      description: "Short-term sublet that is still available",
      contact: "future-sublet-contact@example.test",
      visibility: "public",
      duration: "short-term sublet",
      availableTo: "2099-01-01",
      createdAt: new Date(Date.now() - 31 * DAY_MS),
      isActive: true,
    }).returning();
    const [linkedProfileOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      kind: "workshop",
      city: "Linked Profile City",
      description: "Offer tied to the member's approved profile",
      visibility: "public",
      createdAt: new Date(),
      isActive: true,
    }).returning();
    if (
      !activeOffer ||
      !housingWorkspaceOffer ||
      !privateOffer ||
      !privateVisibilityOffer ||
      !hiddenProfileOffer ||
      !oldOffer ||
      !expiredShortTermOffer ||
      !futureShortTermOffer ||
      !linkedProfileOffer
    ) {
      throw new Error("test offers were not created");
    }
    testData.offerIds.push(
      activeOffer.id,
      housingWorkspaceOffer.id,
      privateOffer.id,
      privateVisibilityOffer.id,
      hiddenProfileOffer.id,
      oldOffer.id,
      expiredShortTermOffer.id,
      futureShortTermOffer.id,
      linkedProfileOffer.id,
    );

    const anonymousResponse = await request.get("/api/residency");
    expect(anonymousResponse.status).toBe(200);
    const anonymousNetworkOffer = anonymousResponse.body.find(
      (offer: { id: number }) => offer.id === privateOffer.id,
    );
    expect(anonymousNetworkOffer).toEqual({
      id: privateOffer.id,
      city: "Private Offer City",
      description: "Offer visible to approved Countercult members.",
      isPublicPreview: true,
      publicCategory: "spaces",
      publicCategories: ["spaces"],
      publicSubfilters: ["spaces_workspace"],
    });
    expect(Object.keys(anonymousNetworkOffer).sort()).toEqual([
      "city",
      "description",
      "id",
      "isPublicPreview",
      "publicCategories",
      "publicCategory",
      "publicSubfilters",
    ].sort());
    expect(JSON.stringify(anonymousNetworkOffer)).not.toContain("network-contact@example.test");
    expect(JSON.stringify(anonymousNetworkOffer)).not.toContain("4–8 June 2027");
    expect(JSON.stringify(anonymousNetworkOffer)).not.toContain("€300");
    expect(anonymousResponse.body.some(
      (offer: { id: number }) => offer.id === privateVisibilityOffer.id || offer.id === hiddenProfileOffer.id,
    )).toBe(false);
    const anonymousOffer = anonymousResponse.body.find(
      (offer: { id: number }) => offer.id === activeOffer.id,
    );
    expect(anonymousOffer).toMatchObject({
      id: activeOffer.id,
      city: "Test City",
      description: "Active private housing offer",
      isPublicPreview: true,
      hasPublicMapLocation: true,
      publicCategory: "housing",
    });
    expect(anonymousOffer).not.toHaveProperty("entryId");
    expect(anonymousOffer).not.toHaveProperty("contact");
    expect(anonymousOffer).not.toHaveProperty("isOwn");
    const anonymousDualCategoryOffer = anonymousResponse.body.find(
      (offer: { id: number }) => offer.id === housingWorkspaceOffer.id,
    );
    expect(anonymousDualCategoryOffer).toMatchObject({
      isPublicPreview: true,
      publicCategory: "housing",
      publicCategories: ["housing", "spaces"],
      publicSubfilters: ["housing_sublet", "spaces_workspace"],
      publicTags: ["visual artists"],
    });
    expect(anonymousDualCategoryOffer).not.toHaveProperty("tags");
    expect(anonymousResponse.body.find(
      (offer: { id: number }) => offer.id === oldOffer.id,
    )).toMatchObject({
      city: "Old Test City",
      description: "Older private housing offer that stays live",
      isPublicPreview: true,
    });

    const pendingResponse = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${pendingToken}`);
    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body).toEqual([]);

    const memberResponse = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${token}`);
    expect(memberResponse.status).toBe(200);
    const memberOfferIds = memberResponse.body.map((offer: { id: number }) => offer.id);
    expect(memberOfferIds).toContain(activeOffer.id);
    expect(memberOfferIds).toContain(privateOffer.id);
    expect(memberOfferIds).toContain(privateVisibilityOffer.id);
    expect(memberOfferIds).not.toContain(hiddenProfileOffer.id);
    expect(memberOfferIds).toContain(oldOffer.id);
    expect(memberOfferIds).not.toContain(expiredShortTermOffer.id);
    expect(memberOfferIds).toContain(futureShortTermOffer.id);
    const returnedActiveOffer = memberResponse.body.find(
      (offer: { id: number }) => offer.id === activeOffer.id,
    );
    expect(returnedActiveOffer).toMatchObject({
      isPublicPreview: false,
      visibility: "public",
      description: "Active private housing offer",
      availableFrom: "June 2027",
      availableTo: "July 2027",
      contact: "private-contact@example.test",
      destination: "Lisbon",
      cost: "£200",
      duration: "2 weeks",
      capacity: "1 artist",
      isOwn: true,
    });
    const returnedPrivateOffer = memberResponse.body.find(
      (offer: { id: number }) => offer.id === privateOffer.id,
    );
    expect(returnedPrivateOffer).toMatchObject({
      isPublicPreview: false,
      visibility: "network",
      description: "Offer visible to approved Countercult members. Contact me at network-contact@example.test. Available 4–8 June 2027. Fee: €300.",
      contact: "network-contact@example.test",
      isOwn: true,
    });
    expect(memberResponse.body.find(
      (offer: { id: number }) => offer.id === linkedProfileOffer.id,
    )).toMatchObject({
      isPublicPreview: false,
      isOwn: true,
      description: "Offer tied to the member's approved profile",
    });
    expect(JSON.stringify(memberResponse.body)).not.toContain("expired-sublet-contact@example.test");

    const viewerResponse = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(viewerResponse.status).toBe(200);
    expect(viewerResponse.body.find(
      (offer: { id: number }) => offer.id === privateOffer.id,
    )).toMatchObject({
      isPublicPreview: false,
      visibility: "network",
      description: "Offer visible to approved Countercult members. Contact me at network-contact@example.test. Available 4–8 June 2027. Fee: €300.",
      contact: "network-contact@example.test",
      isOwn: false,
    });
    expect(viewerResponse.body.some(
      (offer: { id: number }) => offer.id === privateVisibilityOffer.id || offer.id === hiddenProfileOffer.id,
    )).toBe(false);
    expect(viewerResponse.body.find(
      (offer: { id: number }) => offer.id === linkedProfileOffer.id,
    )).toMatchObject({ isOwn: false });

    const ownerEdit = await request
      .patch(`/api/residency/${linkedProfileOffer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated by the linked profile owner", cost: "free" });
    expect(ownerEdit.status).toBe(200);
    expect(ownerEdit.body.description).toBe("Updated by the linked profile owner");

    const otherMemberEdit = await request
      .patch(`/api/residency/${linkedProfileOffer.id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ description: "Should not be allowed" });
    expect(otherMemberEdit.status).toBe(403);

    const publicCreate = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "workshop",
        city: "Public City",
        description: "This public listing is visible to everyone.",
        cost: "free",
        visibility: "public",
      });
    expect(publicCreate.status).toBe(201);
    expect(publicCreate.body).toMatchObject({
      city: "Public City",
      visibility: "public",
    });
    testData.offerIds.push(publicCreate.body.id);

    const networkCreate = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "swap",
        city: "Network City",
        description: "Only approved Countercult members can read the full listing.",
        availableFrom: "June 2027",
        availableTo: "July 2027",
        availabilityMode: "dates",
        duration: "2 weeks",
        capacity: "1 artist",
        tags: ["cc-exchange:spaces:workspace"],
        visibility: "network",
      });
    expect(networkCreate.status).toBe(201);
    expect(networkCreate.body.visibility).toBe("network");
    testData.offerIds.push(networkCreate.body.id);
    const anonymousAfterNetworkCreate = await request.get("/api/residency");
    expect(anonymousAfterNetworkCreate.body.find((offer: { id: number }) => offer.id === networkCreate.body.id)).toMatchObject({
      id: networkCreate.body.id,
      city: "Network City",
      description: "Only approved Countercult members can read the full listing.",
      isPublicPreview: true,
      publicCategory: "housing",
      publicCategories: ["housing", "spaces"],
      publicSubfilters: ["housing_swap", "spaces_workspace", "spaces_swap"],
    });
    expect(anonymousAfterNetworkCreate.body.find(
      (offer: { id: number }) => offer.id === networkCreate.body.id,
    )).not.toHaveProperty("tags");
    const approvedAfterNetworkCreate = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(approvedAfterNetworkCreate.body.find((offer: { id: number }) => offer.id === networkCreate.body.id)).toMatchObject({
      visibility: "network",
      description: "Only approved Countercult members can read the full listing.",
    });

    const publicUpdate = await request
      .patch(`/api/residency/${activeOffer.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ visibility: "network" });
    expect(publicUpdate.status).toBe(200);
    expect(publicUpdate.body.visibility).toBe("network");
  });

  it("lets pending members save eligible Exchange listings privately until profile approval", async () => {
    const email = emailForTest();
    const entry = await insertEntry({
      contactEmail: email,
      status: "pending_review",
      isApproved: false,
    });
    await db.insert(usersTable).values({ email, isApproved: false });
    const token = await insertSession(email, entry.id);
    const viewerEmail = emailForTest();
    const viewerEntry = await insertEntry({ contactEmail: viewerEmail });
    await db.insert(usersTable).values({ email: viewerEmail, isApproved: true });
    const viewerToken = await insertSession(viewerEmail, viewerEntry.id);
    const ownOfferIds: number[] = [];

    for (const [kind, city] of [["workshop", "Pending Studio City"], ["concert", "Pending Venue City"]] as const) {
      const response = await request
        .post("/api/residency")
        .set("Authorization", `Bearer ${token}`)
        .send({
          kind,
          city,
          description: `A public ${kind} listing from a pending member.`,
          cost: "free",
          visibility: "public",
        });
      expect(response.status).toBe(201);
      testData.offerIds.push(response.body.id);
      ownOfferIds.push(response.body.id);
      expect(response.body.visibility).toBe("public");

      const publicList = await request.get("/api/residency");
      expect(publicList.body.some((offer: { id: number }) => offer.id === response.body.id)).toBe(false);
    }

    const approvedViewerFeed = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(approvedViewerFeed.body.some((offer: { id: number }) => ownOfferIds.includes(offer.id))).toBe(false);

    const pendingFeed = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${token}`);
    expect(pendingFeed.status).toBe(200);
    expect(pendingFeed.body.map((offer: { id: number }) => offer.id).sort()).toEqual(ownOfferIds.sort());
    expect(pendingFeed.body.every((offer: { isOwn?: boolean }) => offer.isOwn === true)).toBe(true);

    const roomSwap = await request
      .post("/api/residency")
      .set("Authorization", `Bearer ${token}`)
      .send({
        kind: "host",
        city: "Pending Room City",
        description: "A room listing stays private until profile approval.",
        availableFrom: "June 2027",
        availableTo: "July 2027",
        availabilityMode: "dates",
        cost: "free",
        duration: "2 weeks",
        capacity: "1 artist",
        visibility: "public",
      });
    expect(roomSwap.status).toBe(201);
    expect(roomSwap.body.visibility).toBe("public");
    testData.offerIds.push(roomSwap.body.id);
    ownOfferIds.push(roomSwap.body.id);

    const editedRoomSwap = await request
      .patch(`/api/residency/${roomSwap.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated while the profile is under review." });
    expect(editedRoomSwap.status).toBe(200);

    const pendingRoomFeed = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${token}`);
    expect(pendingRoomFeed.body.some((offer: { id: number }) => offer.id === roomSwap.body.id)).toBe(true);

    const publicFeedBeforeApproval = await request.get("/api/residency");
    expect(publicFeedBeforeApproval.body.some((offer: { id: number }) => offer.id === roomSwap.body.id)).toBe(false);
    const approvedViewerFeedBeforeApproval = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(approvedViewerFeedBeforeApproval.body.some((offer: { id: number }) => offer.id === roomSwap.body.id)).toBe(false);

    await db.update(entriesTable)
      .set({ status: "published", isApproved: true })
      .where(eq(entriesTable.id, entry.id));
    await db.update(usersTable)
      .set({ isApproved: true })
      .where(eq(usersTable.email, email));

    const releasedPublicFeed = await request.get("/api/residency");
    const releasedViewerFeed = await request
      .get("/api/residency")
      .set("Authorization", `Bearer ${viewerToken}`);
    for (const offerId of ownOfferIds) {
      expect(releasedPublicFeed.body.find((offer: { id: number }) => offer.id === offerId)).toMatchObject({
        isPublicPreview: true,
      });
      expect(releasedViewerFeed.body.find((offer: { id: number }) => offer.id === offerId)).toMatchObject({
        isPublicPreview: false,
      });
    }
  });

  it("only deactivates short-term sublets after their availability ends", async () => {
    const memberEmail = emailForTest();
    const memberEntry = await insertEntry({ contactEmail: memberEmail });
    const [ongoingOffer] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "swap",
      city: "Ongoing City",
      description: "An old swap that stays live",
      createdAt: new Date(Date.now() - 90 * DAY_MS),
      isActive: true,
    }).returning();
    const [endedSublet] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Ended Sublet City",
      description: "A short-term sublet that has ended",
      duration: "shortterm",
      availableTo: "2020-01-01",
      createdAt: new Date(Date.now() - 90 * DAY_MS),
      isActive: true,
    }).returning();
    const [openSublet] = await db.insert(residencyOffersTable).values({
      entryId: memberEntry.id,
      claimerEmail: memberEmail,
      kind: "host",
      city: "Open Sublet City",
      description: "A short-term sublet that is still open",
      duration: "short-term",
      availableTo: "2099-01-01",
      createdAt: new Date(Date.now() - 90 * DAY_MS),
      isActive: true,
    }).returning();
    if (!ongoingOffer || !endedSublet || !openSublet) throw new Error("test offers were not created");
    testData.offerIds.push(ongoingOffer.id, endedSublet.id, openSublet.id);

    const result = await expireStaleListings();
    expect(result.ids).toContain(endedSublet.id);
    expect(result.ids).not.toContain(ongoingOffer.id);
    expect(result.ids).not.toContain(openSublet.id);

    const statuses = await db
      .select({ id: residencyOffersTable.id, isActive: residencyOffersTable.isActive })
      .from(residencyOffersTable)
      .where(or(
        eq(residencyOffersTable.id, ongoingOffer.id),
        eq(residencyOffersTable.id, endedSublet.id),
        eq(residencyOffersTable.id, openSublet.id),
      ));
    expect(statuses.find((offer) => offer.id === ongoingOffer.id)?.isActive).toBe(true);
    expect(statuses.find((offer) => offer.id === endedSublet.id)?.isActive).toBe(false);
    expect(statuses.find((offer) => offer.id === openSublet.id)?.isActive).toBe(true);
  });
  it("lets an admin restore one inactive offer without changing its details", async () => {
    const previousAdminPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = "regression-admin-password";

    try {
      const memberEmail = emailForTest();
      const memberEntry = await insertEntry({
        name: "The Floor regression entry",
        contactEmail: memberEmail,
      });
      await db.insert(usersTable).values({
        email: memberEmail,
        isApproved: true,
      });
      const token = await insertSession(memberEmail, memberEntry.id);
      const [inactiveOffer] = await db.insert(residencyOffersTable).values({
        entryId: memberEntry.id,
        claimerEmail: memberEmail,
        kind: "swap",
        city: "Berlin",
        description: "looking to swap with an artist in NYC",
        availableFrom: "December 2026",
        availableTo: "March 2027",
        contact: "floor@example.test",
        destination: "NYC",
        cost: "free",
        duration: "Min. 1 month",
        capacity: "1 artist",
        tags: ["artist"],
        photos: ["/objects/uploads/floor-1", "/objects/uploads/floor-2", "/objects/uploads/floor-3"],
        isActive: false,
        createdAt: new Date(Date.now() - 35 * DAY_MS),
      }).returning();
      if (!inactiveOffer) throw new Error("test offer was not created");
      testData.offerIds.push(inactiveOffer.id);

      const beforeRestore = { ...inactiveOffer };
      const adminListResponse = await request
        .get("/api/admin/residency?includeInactive=true")
        .set("x-admin-password", "regression-admin-password");
      expect(adminListResponse.status).toBe(200);
      expect(adminListResponse.body.find((offer: { id: number }) => offer.id === inactiveOffer.id)).toMatchObject({
        id: inactiveOffer.id,
        isActive: false,
        availableFrom: beforeRestore.availableFrom,
        availableTo: beforeRestore.availableTo,
      });

      const adminResponse = await request
        .post(`/api/admin/residency/${inactiveOffer.id}/restore`)
        .set("x-admin-password", "regression-admin-password");
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body).toMatchObject({
        id: inactiveOffer.id,
        isActive: true,
        city: beforeRestore.city,
        availableFrom: beforeRestore.availableFrom,
        availableTo: beforeRestore.availableTo,
        description: beforeRestore.description,
        photos: beforeRestore.photos,
      });

      const activeMemberResponse = await request
        .get("/api/residency")
        .set("Authorization", `Bearer ${token}`);
      expect(activeMemberResponse.status).toBe(200);
      expect(activeMemberResponse.body.find((offer: { id: number }) => offer.id === inactiveOffer.id)).toMatchObject({
        kind: "swap",
        availableFrom: "December 2026",
        availableTo: "March 2027",
        photos: beforeRestore.photos,
      });

      const secondRestoreResponse = await request
        .post(`/api/admin/residency/${inactiveOffer.id}/restore`)
        .set("x-admin-password", "regression-admin-password");
      expect(secondRestoreResponse.status).toBe(409);
    } finally {
      if (previousAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = previousAdminPassword;
    }
  });
});

describe("profile editing regressions", () => {
  it("accepts the profile editor event shape and preserves event metadata", async () => {
    const email = emailForTest();
    const entry = await insertEntry({
      contactEmail: email,
      experiences: [{
        title: "Existing show",
        description: "Existing event details",
        date: "2026-10-10",
        location: "Berlin",
        url: "https://lu.ma/existing-show",
      }],
    });
    await db.insert(usersTable).values({ email, isApproved: true });
    const token = await insertSession(email, entry.id);

    const response = await request
      .patch(`/api/entries/${entry.id}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated profile name",
        experiences: [{
          title: "Existing show",
          description: "Existing event details",
          date: "2026-10-10",
          location: "Berlin",
          url: "https://lu.ma/existing-show",
        }],
      });

    expect(response.status).toBe(200);
    expect(response.body.entry.experiences).toEqual([{
      title: "Existing show",
      description: "Existing event details",
      date: "2026-10-10",
      location: "Berlin",
      url: "https://lu.ma/existing-show",
    }]);
  });
});