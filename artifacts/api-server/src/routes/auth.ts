import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db, entriesTable, usersTable, residencyOffersTable, magicLinkTokensTable, curatorCodesTable } from "@workspace/db";
import { sendPasswordResetEmail } from "../lib/email.js";
import { PgRateLimitStore } from "../lib/pgRateLimitStore.js";
import { eq, or, and, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { z as zv4 } from "zod/v4";
import { normalizeCuratorCode } from "../lib/curatorCodes";
import { markSignupDraftCompleted } from "../lib/signupDrafts.js";
import { deriveSpaceClassification } from "../lib/spaceClassification";
import { isOfferingChoice, normalizeOfferingChoice } from "@workspace/profile-choices";
import {
  RegisterAccountBody,
  RegisterAccountResponse,
  ValidateSignupLocationBody,
  ValidateSignupLocationResponse,
  AcceptSpaceClaimInvitationBody,
  AcceptSpaceClaimInvitationResponse,
  InspectSpaceClaimInvitationBody,
  InspectSpaceClaimInvitationResponse,
  GetCurrentMemberSessionResponse,
  UpdateMemberPreferencesResponse,
  UpdateMemberPreferencesBody,
} from "@workspace/api-zod";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many attempts — try again in 15 minutes" },
  store: new PgRateLimitStore(),
});

function jitter(maxDeg: number) {
  return (Math.random() * 2 - 1) * maxDeg;
}

type GeocodedLocation = {
  city: string;
  country: string;
  lat: number;
  lng: number;
};

type GeocodeCacheEntry = {
  location: GeocodedLocation;
  expiresAt: number;
};

const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;
const GEOCODE_CACHE_MAX_ENTRIES = 250;
const GEOCODE_REQUEST_TIMEOUT_MS = 4_000;
const geocodeCache = new Map<string, GeocodeCacheEntry>();
const geocodeRequests = new Map<string, Promise<GeocodedLocation | null>>();

function geocodeCacheKey(city: string, country: string): string {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  return `${normalize(city)}\u0000${normalize(country)}`;
}

function normalizeGeocoderLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getCachedGeocode(city: string, country: string): GeocodedLocation | null {
  const key = geocodeCacheKey(city, country);
  const cached = geocodeCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    geocodeCache.delete(key);
    return null;
  }

  geocodeCache.delete(key);
  geocodeCache.set(key, cached);
  return cached.location;
}

function cacheGeocode(
  requestedCity: string,
  requestedCountry: string,
  location: GeocodedLocation,
): void {
  const entry = { location, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS };
  const keys = new Set([
    geocodeCacheKey(requestedCity, requestedCountry),
    geocodeCacheKey(location.city, location.country),
  ]);
  for (const key of keys) {
    geocodeCache.delete(key);
    geocodeCache.set(key, entry);
  }

  while (geocodeCache.size > GEOCODE_CACHE_MAX_ENTRIES) {
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey === undefined) break;
    geocodeCache.delete(oldestKey);
  }
}

async function fetchGeocodedCity(city: string, country: string): Promise<GeocodedLocation | null> {
  try {
    const q = encodeURIComponent(`${city.trim()}, ${country.trim()}`);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1&accept-language=en`,
      {
        headers: { "User-Agent": "countercult/1.0 (contact@countercultcreatives.com)" },
        signal: AbortSignal.timeout(GEOCODE_REQUEST_TIMEOUT_MS),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json() as Array<{
      lat: string;
      lon: string;
      name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        locality?: string;
        hamlet?: string;
        county?: string;
        region?: string;
        state?: string;
        province?: string;
        state_district?: string;
        district?: string;
        city_district?: string;
        borough?: string;
        suburb?: string;
        quarter?: string;
        neighbourhood?: string;
        country?: string;
      };
    }>;
    if (Array.isArray(data) && data.length > 0) {
      const match = data[0]!;
      const lat = parseFloat(match.lat);
      const lng = parseFloat(match.lon);
      const requestedCityLabel = normalizeGeocoderLabel(city);
      const exactRequestedCityLabel = [
        match.name,
        match.address?.city_district,
        match.address?.borough,
        match.address?.suburb,
        match.address?.quarter,
        match.address?.neighbourhood,
        match.address?.region,
        match.address?.state,
        match.address?.province,
        match.address?.state_district,
        match.address?.district,
        match.address?.county,
      ].find((label) =>
        Boolean(label?.trim()) && normalizeGeocoderLabel(label!) === requestedCityLabel,
      )?.trim();
      const resolvedCity =
        match.address?.city ??
        match.address?.town ??
        match.address?.village ??
        match.address?.municipality ??
        match.address?.locality ??
        match.address?.hamlet ??
        exactRequestedCityLabel;
      const resolvedCountry = match.address?.country;
      if (
        resolvedCity?.trim() &&
        resolvedCountry?.trim() &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        return {
          city: resolvedCity.trim(),
          country: resolvedCountry.trim(),
          lat,
          lng,
        };
      }
    }
  } catch {
    // Registration will fail safely below instead of creating an unplaceable pin.
  }
  return null;
}

async function geocodeCity(city: string, country: string): Promise<GeocodedLocation | null> {
  const cached = getCachedGeocode(city, country);
  if (cached) return cached;

  const key = geocodeCacheKey(city, country);
  const existingRequest = geocodeRequests.get(key);
  if (existingRequest) return existingRequest;

  // Signup checks the location before continuing and again when it creates the account.
  // Reuse successful results so a transient geocoder failure cannot reject that same location.
  const request = fetchGeocodedCity(city, country)
    .then((location) => {
      if (location) cacheGeocode(city, country, location);
      return location;
    })
    .finally(() => {
      if (geocodeRequests.get(key) === request) geocodeRequests.delete(key);
    });
  geocodeRequests.set(key, request);
  return request;
}

const router: IRouter = Router();

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
export const PUBLIC_PROFILE_CONSENT_VERSION = "public-profile-v1";
export const PROFILE_VISIBILITY_CONSENT_VERSION = "profile-visibility-v1";
export const DATA_PROCESSING_CONSENT_VERSION = "application-data-v2";

function isPostgresUniqueViolation(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && (current as { code?: unknown }).code === "23505") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function issueSession(email: string, entryId: number | null) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  return { token, expiresAt, email, entryId };
}

function digestSpaceClaimToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isClaimableSpaceListing(
  entry: typeof entriesTable.$inferSelect | undefined,
): entry is typeof entriesTable.$inferSelect {
  const isCollective = entry?.kind === "artist" && entry.tags?.includes("collective");
  return Boolean(
    entry
    && (entry.kind === "space" || isCollective)
    && entry.isApproved
    && entry.status === "published"
    && entry.visibility === "public"
    && !entry.isHidden
    && entry.mapEligible
    && !entry.isClaimed
    && !entry.claimedEmail
    && !entry.deletedAt,
  );
}

class SpaceClaimFailure extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "SpaceClaimFailure";
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Self-registration: creates a user + pending entry from the two-step JOIN CULT form.
// Account starts pending unless a valid curator code is supplied.
// ---------------------------------------------------------------------------
router.post("/auth/validate-location", authLimiter, async (req, res): Promise<void> => {
  const parsed = ValidateSignupLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      field: "location",
      error: "Enter a city and country with at least two characters each.",
    });
    return;
  }

  const city = parsed.data.city.trim();
  const country = parsed.data.country.trim();
  if (city.length < 2 || country.length < 2) {
    res.status(400).json({
      field: "location",
      error: "Enter a city and country with at least two characters each.",
    });
    return;
  }

  const location = await geocodeCity(city, country);
  if (!location) {
    res.status(400).json({
      field: "location",
      error: "We couldn't verify this city and country right now. Check the spelling and try again in a moment.",
    });
    return;
  }

  res.json(ValidateSignupLocationResponse.parse({
    ok: true,
    city: location.city,
    country: location.country,
  }));
});

function isSingleHttpWorkLink(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate) || (candidate.match(/https?:\/\//gi)?.length ?? 0) !== 1) {
    return false;
  }
  try {
    const parsed = new URL(candidate);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const schema = zv4.object({
    email: zv4.email({ error: "please enter a valid email address" }),
    officialEmailConfirmed: zv4.boolean().default(false).refine(
      (confirmed) => confirmed,
      "please confirm that you are authorized to represent this account",
    ),
    adultConfirmed: zv4.boolean().default(false),
    dataProcessingConsent: zv4.boolean().default(false),
    password: zv4.string().min(8, "password must be at least 8 characters"),
    accountRole: zv4.enum(["member", "partner_poster"]).default("member"),
    kind: zv4.enum(["artist", "space"]).default("artist"),
    physicalSpaceConfirmed: zv4.boolean().default(false),
    name: zv4.string().trim().min(2, "artist name or space title is required").max(120),
    socialHandle: zv4.string().trim().min(2).max(300).optional(),
    city: zv4.string().trim().min(2).max(120).optional(),
    country: zv4.string().trim().min(2).max(120).optional(),
    blurb: zv4.string().trim().max(1000).optional(),
    tags: zv4.string().trim().max(500).optional(),
    heroPhoto: zv4.string().optional(),
    openTo: zv4.array(zv4.string().trim().min(1)).max(10).default([]),
    offeringChoices: zv4.array(zv4.string().trim().min(1)).max(12).default([]),
    joinReason: zv4.string().trim().max(800).optional(),
    discoverySource: zv4.string().trim().optional(),
    signupSource: zv4.string().trim().regex(/^[a-zA-Z0-9._-]{1,100}$/).optional(),
    signupMedium: zv4.string().trim().regex(/^[a-zA-Z0-9._-]{1,100}$/).optional(),
    signupCampaign: zv4.string().trim().regex(/^[a-zA-Z0-9._-]{1,100}$/).optional(),
    signupReferrerDomain: zv4.string().trim().max(253).regex(/^[a-zA-Z0-9.-]+$/).optional(),
    signupLandingPath: zv4.string().trim().max(255).refine(
      (path) => path.startsWith("/") && !path.startsWith("//") && !/[?#]/.test(path),
      "landing path must be a local path without query parameters",
    ).optional(),
    networkNextSteps: zv4.string().trim().optional(),
    shopUrl: zv4.string().trim().max(300).optional(),
    offerings: zv4.string().trim().max(1200).optional(),
    basedIn: zv4.array(zv4.string().trim().min(1).max(120)).max(8).default([]),
    newsletterOptIn: zv4.boolean().default(false),
    exchangeDigestOptIn: zv4.boolean().default(false),
    profileVisibility: zv4.enum(["public", "network"]).default("public"),
    profileVisibilityConsent: zv4.boolean().default(false),
    publicProfileConsent: zv4.boolean().default(false),
    curatedBy: zv4.string().max(200).optional(),
    referralCode: zv4.string().max(100).optional(),
    draftToken: zv4.string().regex(/^[a-f0-9]{64}$/).optional(),
    spaceAccess: zv4.enum(["public", "appointment_only", "community_protected"]).optional(),
    spaceOfferAvailable: zv4.boolean().default(false),
    spaceOfferTypes: zv4.array(zv4.string().trim().min(1)).max(6).default([]),
    spaceOfferCategory: zv4.enum(["work", "housing", "residency"]).optional(),
    spaceOfferPricing: zv4.enum(["free", "paid", "case_by_case"]).optional(),
    spaceOfferDetails: zv4.string().trim().max(600).optional(),
    organizationModel: zv4.enum(["artist_run", "nonprofit", "community", "independent", "commercial_operator", "hospitality", "agency", "institution", "other"]).optional(),
    intendedCommercialUse: zv4.boolean().optional(),
    commercialUseDescription: zv4.string().trim().max(600).optional(),
    url: zv4.string().optional(),
    discipline: zv4.string().optional(),
    socials: zv4.string().optional(),
    swapType: zv4.string().optional(),
    spacePrivacy: zv4.string().optional(),
    financialStructure: zv4.string().optional(),
    costDetails: zv4.string().optional(),
    durationTerms: zv4.string().optional(),
    vibeTags: zv4.string().optional(),
    dealbreakers: zv4.string().optional(),
    noiseAndGuests: zv4.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ error: firstIssue?.message ?? "invalid input" });
    return;
  }

  if (!parsed.data.dataProcessingConsent) {
    res.status(400).json({
      field: "dataProcessingConsent",
      error: "please consent to Countercult collecting, storing, and using your submitted information as explained in the Privacy Notice",
    });
    return;
  }

  if (parsed.data.socialHandle && !isSingleHttpWorkLink(parsed.data.socialHandle)) {
    res.status(400).json({
      field: "socialHandle",
      error: "enter one valid website, portfolio, or social link beginning with https:// or http://",
    });
    return;
  }

  const contractParsed = RegisterAccountBody.safeParse(req.body);
  if (!contractParsed.success) {
    res.status(400).json({ error: contractParsed.error.issues[0]?.message ?? "invalid input" });
    return;
  }

  const d = parsed.data;
  const isPartnerPoster = d.accountRole === "partner_poster";
  if (!isPartnerPoster && d.kind === "space" && !d.physicalSpaceConfirmed) {
    res.status(400).json({
      field: "physicalSpaceConfirmed",
      error: "Space applications require a physical place where people meet. If you do not have one, apply as an artist.",
    });
    return;
  }
  const normalizedSubmittedOfferingChoices = d.offeringChoices.map(normalizeOfferingChoice);
  if (normalizedSubmittedOfferingChoices.some((choice) => choice && !isOfferingChoice(choice))) {
    res.status(400).json({
      field: "offerings",
      error: "choose only from the available things you can offer",
    });
    return;
  }
  const selectedOfferingChoices = [...new Set(normalizedSubmittedOfferingChoices.filter(isOfferingChoice))];
  const submittedOfferingLabels = new Set(d.offeringChoices.map((choice) => choice.trim().toLowerCase()));
  const freeformOfferings = (d.offerings ?? "")
    .trim()
    .split(/\n\n+/)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const remaining = section
        .split(",")
        .map((item) => item.trim())
        .filter((item) =>
          item &&
          !selectedOfferingChoices.includes(normalizeOfferingChoice(item)) &&
          !submittedOfferingLabels.has(item.toLowerCase()),
        );
      return remaining.join(", ");
    })
    .filter(Boolean)
    .join("\n\n");
  const persistedOfferings = [selectedOfferingChoices.join(", "), freeformOfferings]
    .filter(Boolean)
    .join("\n\n") || null;
  if (!d.adultConfirmed) {
    res.status(400).json({
      field: "adultConfirmed",
      error: "Countercult accounts are for people aged 18 and over",
    });
    return;
  }
  if (!isPartnerPoster) {
    if (d.profileVisibility === "network" && !d.profileVisibilityConsent) {
      res.status(400).json({
        field: "profileVisibilityConsent",
        error: "please confirm that you understand your profile will be visible to approved Countercult members before submitting",
      });
      return;
    }
    if (d.profileVisibility === "public" && !d.publicProfileConsent) {
      res.status(400).json({
        field: "publicProfileConsent",
        error: "please confirm that you understand your profile will be visible on the public internet before submitting",
      });
      return;
    }
    if (!d.socialHandle) {
      res.status(400).json({ field: "socialHandle", error: "instagram or portfolio link is required" });
      return;
    }
    if (!d.city || !d.country) {
      res.status(400).json({ field: "location", error: "city and country are required to position your map pin" });
      return;
    }
    if (d.kind === "artist" && d.openTo.length === 0) {
      res.status(400).json({ field: "openTo", error: "choose at least one thing you are open to" });
      return;
    }
    if (selectedOfferingChoices.length === 0) {
      res.status(400).json({ field: "offerings", error: "choose at least one thing you can offer" });
      return;
    }
  }
  // A cultural-space profile is not an Exchange offer. Space offers are posted
  // separately so a partner opportunity cannot silently become a map pin.
  const hasSpaceOffer = false;
  const email = parsed.data.email.toLowerCase().trim();
  const normalizedCuratorCode = normalizeCuratorCode(d.curatedBy);
  const referralCode = d.referralCode?.trim().toLowerCase() || null;
  const [matchingCuratorCode] = normalizedCuratorCode
    ? await db
        .select({ displayName: curatorCodesTable.displayName })
        .from(curatorCodesTable)
        .where(and(
          eq(curatorCodesTable.code, normalizedCuratorCode),
          eq(curatorCodesTable.isActive, true),
        ))
        .limit(1)
    : [];
  const curatorCodeAccepted = Boolean(matchingCuratorCode);
  const autoApproved = curatorCodeAccepted;
  const curatedBy = matchingCuratorCode?.displayName ?? null;
  const [referrer] = referralCode
    ? await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(and(
          eq(usersTable.referralCode, referralCode),
          eq(usersTable.isApproved, true),
        ))
        .limit(1)
    : [];
  const referredBy = referrer?.email ?? null;

  // Parse comma-separated tags string into an array
  const tagsArray = d.tags
    ? d.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  // A signup is not accepted until the city/country resolves to a real place.
  // This prevents misspelled locations and entries that can never appear on the map.
  const location = isPartnerPoster ? null : await geocodeCity(d.city!, d.country!);
  if (!isPartnerPoster && !location) {
    res.status(400).json({
      field: "location",
      error: "we couldn't verify that location right now. check the spelling and try again in a moment",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let lat = location?.lat ?? null;
  let lng = location?.lng ?? null;
  // Jitter artists slightly to avoid exact pin stacking
  if (!isPartnerPoster && d.kind === "artist" && lat != null && lng != null) {
    lat = lat + jitter(0.0045);
    lng = lng + jitter(0.0045);
  }

  const registration = await db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select({
        id: usersTable.id,
        isApproved: usersTable.isApproved,
        passwordHash: usersTable.passwordHash,
        referredBy: usersTable.referredBy,
        signupSource: usersTable.signupSource,
        signupMedium: usersTable.signupMedium,
        signupCampaign: usersTable.signupCampaign,
        signupReferrerDomain: usersTable.signupReferrerDomain,
        signupLandingPath: usersTable.signupLandingPath,
        signupReportedSource: usersTable.signupReportedSource,
        exchangeDigestOptedInAt: usersTable.exchangeDigestOptedInAt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser) {
      const [existingEntry] = await tx
        .select({ id: entriesTable.id })
        .from(entriesTable)
        .where(eq(entriesTable.contactEmail, email))
        .limit(1);

      // A prior interrupted signup can leave an unapproved account without
      // a pending entry. Let the account holder safely complete that signup.
      const passwordMatches = existingUser.passwordHash
        ? await bcrypt.compare(d.password, existingUser.passwordHash)
        : false;
      if (existingEntry || existingUser.isApproved || !passwordMatches) {
        return { ok: false as const };
      }
    } else {
      await tx.insert(usersTable).values({
        email,
        passwordHash,
        isApproved: autoApproved,
        accountRole: d.accountRole,
        displayName: d.name.trim(),
        referredBy,
        signupSource: d.signupSource ?? null,
        signupMedium: d.signupMedium ?? null,
        signupCampaign: d.signupCampaign ?? null,
        signupReferrerDomain: d.signupReferrerDomain ?? null,
        signupLandingPath: d.signupLandingPath ?? null,
        signupReportedSource: d.discoverySource ?? null,
        newsletterOptIn: d.newsletterOptIn,
        newsletterOptedInAt: d.newsletterOptIn ? new Date() : null,
        exchangeDigestOptIn: d.exchangeDigestOptIn,
        exchangeDigestOptedInAt: d.exchangeDigestOptIn ? new Date() : null,
        dataProcessingConsentVersion: DATA_PROCESSING_CONSENT_VERSION,
        dataProcessingConsentAt: new Date(),
      });
    }

    if (existingUser && autoApproved) {
      await tx
        .update(usersTable)
        .set({ isApproved: true, lastSeen: new Date() })
        .where(eq(usersTable.email, email));
    }
    if (existingUser && referredBy && !existingUser.referredBy) {
      await tx
        .update(usersTable)
        .set({ referredBy })
        .where(eq(usersTable.email, email));
    }
    if (existingUser) {
      await tx
        .update(usersTable)
        .set({
          signupSource: existingUser.signupSource ?? d.signupSource ?? null,
          signupMedium: existingUser.signupMedium ?? d.signupMedium ?? null,
          signupCampaign: existingUser.signupCampaign ?? d.signupCampaign ?? null,
          signupReferrerDomain: existingUser.signupReferrerDomain ?? d.signupReferrerDomain ?? null,
          signupLandingPath: existingUser.signupLandingPath ?? d.signupLandingPath ?? null,
          signupReportedSource: existingUser.signupReportedSource ?? d.discoverySource ?? null,
        })
        .where(eq(usersTable.email, email));
    }
    if (existingUser && d.newsletterOptIn) {
      await tx
        .update(usersTable)
        .set({ newsletterOptIn: true, newsletterOptedInAt: new Date() })
        .where(eq(usersTable.email, email));
    }
    if (existingUser) {
      await tx
        .update(usersTable)
        .set({
          exchangeDigestOptIn: d.exchangeDigestOptIn,
          exchangeDigestOptedInAt: d.exchangeDigestOptIn
            ? existingUser.exchangeDigestOptedInAt ?? new Date()
            : null,
        })
        .where(eq(usersTable.email, email));
    }
    if (existingUser) {
      await tx
        .update(usersTable)
        .set({ accountRole: d.accountRole, displayName: d.name.trim(), lastSeen: new Date() })
        .where(eq(usersTable.email, email));
    }
    if (existingUser) {
      await tx
        .update(usersTable)
        .set({
          dataProcessingConsentVersion: DATA_PROCESSING_CONSENT_VERSION,
          dataProcessingConsentAt: new Date(),
        })
        .where(eq(usersTable.email, email));
    }

    const entry = isPartnerPoster
      ? null
      : (await tx
        .insert(entriesTable)
        .values({
        name: d.name.trim(),
        kind: d.kind,
        secondaryKind: d.discipline || null,
        blurb: d.blurb || null,
        tags: tagsArray,
        url: d.socialHandle || d.url || d.socials || null,
        heroPhoto: d.heroPhoto || null,
        city: location!.city,
        country: location!.country,
         basedIn: d.basedIn,
         shopUrl: d.shopUrl || null,
          offerings: persistedOfferings,
        lat,
        lng,
        contactEmail: email,
        submittedBy: email,
        status: autoApproved ? "published" : "pending_review",
        isApproved: autoApproved,
         visibility: d.profileVisibility,
        profileVisibilityConsentVersion: PROFILE_VISIBILITY_CONSENT_VERSION,
        profileVisibilityConsentAt: new Date(),
          publicProfileConsentVersion: d.profileVisibility === "public" ? PUBLIC_PROFILE_CONSENT_VERSION : null,
          publicProfileConsentAt: d.profileVisibility === "public" ? new Date() : null,
        mapEligible: true,
         isHidden: false,
         deletedAt: null,
        swapType: d.swapType || null,
         // Keep the existing column for compatibility with older space metadata.
         // New public profiles use it for the visitor access distinction.
         spacePrivacy: d.spaceAccess || d.spacePrivacy || null,
        financialStructure: d.financialStructure || null,
        costDetails: d.costDetails || null,
        durationTerms: d.durationTerms || null,
        vibeTags: d.vibeTags || null,
        dealbreakers: d.dealbreakers || null,
        noiseAndGuests: d.noiseAndGuests || null,
        openTo: d.openTo ?? [],
        joinReason: d.joinReason || null,
        discoverySource: d.discoverySource || null,
        networkNextSteps: d.networkNextSteps || null,
         spaceOfferAvailable: hasSpaceOffer,
         spaceOfferTypes: hasSpaceOffer ? d.spaceOfferTypes : [],
         spaceOfferCategory: hasSpaceOffer ? d.spaceOfferCategory ?? null : null,
         spaceOfferPricing: hasSpaceOffer ? d.spaceOfferPricing ?? null : null,
         spaceOfferDetails: hasSpaceOffer ? d.spaceOfferDetails || null : null,
         organizationModel: d.kind === "space" ? d.organizationModel ?? null : null,
         intendedCommercialUse: d.kind === "space" ? d.intendedCommercialUse ?? null : null,
         commercialUseDescription: d.kind === "space" ? d.commercialUseDescription || null : null,
         declaredClassification: d.kind === "space" && d.intendedCommercialUse != null ? (d.intendedCommercialUse ? "commercial" : "independent") : null,
         derivedClassification: d.kind === "space" ? deriveSpaceClassification(d) : "needs_review",
        curatedBy,
        referredBy,
        })
        .returning({ id: entriesTable.id }))[0] ?? null;

    if (!isPartnerPoster && !entry) {
      throw new Error("registration entry was not created");
    }

      const sess = issueSession(email, entry?.id ?? null);
    await tx.insert(magicLinkTokensTable).values({
      token: sess.token,
      email,
      entryId: sess.entryId,
      purpose: "session",
      expiresAt: sess.expiresAt,
    });

    return { ok: true as const, entryId: entry?.id ?? null, session: sess, isApproved: autoApproved };
  }).catch((error: unknown) => {
    // Two simultaneous registrations can both pass the existence check. Let
    // the unique email constraint choose the winner, then return the same
    // conflict response as an ordinary duplicate instead of leaking a 500.
    if (isPostgresUniqueViolation(error)) return { ok: false as const };
    throw error;
  });

  if (!registration.ok) {
    res.status(409).json({ error: "an account with this email already exists — sign in instead" });
    return;
  }

  const { entryId, session: sess } = registration;

  req.log.info({ email, entryId, accountRole: d.accountRole, newsletterOptIn: d.newsletterOptIn }, "New user registered via JOIN CULT form");
  if (d.draftToken) {
    await markSignupDraftCompleted(d.draftToken);
  }
  res.status(201).json(RegisterAccountResponse.parse({
    ok: true,
    token: sess.token,
    email,
    isApproved: registration.isApproved,
    entryId,
    accountRole: d.accountRole,
    displayName: d.name.trim(),
    expiresAt: sess.expiresAt.toISOString(),
    newsletterOptIn: d.newsletterOptIn,
    curatorCodeAccepted,
    referralAccepted: Boolean(referrer),
    ...(d.curatedBy?.trim() && !curatorCodeAccepted
      ? { curatorCodeMessage: "We didn't recognize that curator code, so your profile was sent for normal review." }
      : {}),
  }));
  if (entryId && d.socialHandle) {
    void import("../lib/websitePreview")
      .then(({ scheduleWebsitePreviewFetch }) => scheduleWebsitePreviewFetch(entryId, d.socialHandle!))
      .catch((error: unknown) => req.log.warn({ entryId, error }, "Could not queue website preview"));
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Verifies email + password and issues a 30-day session token.
// ---------------------------------------------------------------------------
router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "email and password required" }); return; }

  const email = parsed.data.email.toLowerCase().trim();

  // Lookup without revealing whether the user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Always run bcrypt to prevent user-enumeration via timing
  const hashToCheck = user?.passwordHash ?? "$2b$12$invalidhashusedfortimingnonces.";
  const valid = await bcrypt.compare(parsed.data.password, hashToCheck);

  if (!user || !user.passwordHash || !valid) {
    res.status(401).json({ error: "invalid email or password" });
    return;
  }

  await db.update(usersTable).set({ lastSeen: new Date() }).where(eq(usersTable.email, email));

  // Find the member's linked entry by contactEmail.
  const [entry] = await db
    .select({ id: entriesTable.id, name: entriesTable.name })
    .from(entriesTable)
    .where(eq(entriesTable.contactEmail, email))
    .limit(1);

  const sess = issueSession(email, entry?.id ?? null);
  await db.insert(magicLinkTokensTable).values({
    token: sess.token,
    email,
    entryId: sess.entryId,
    purpose: "session",
    expiresAt: sess.expiresAt,
  });

  req.log.info({ email }, "User logged in");
  res.json({
    ok: true,
    token: sess.token,
    email,
    isApproved: user.isApproved,
    canPostPartnerOffers: user.canPostPartnerOffers,
    accountRole: user.accountRole,
    displayName: user.displayName,
    entryId: sess.entryId,
    expiresAt: sess.expiresAt.toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/set-password
// Lets an authenticated user set (or update) their password.
// Requires a valid Bearer session token — proves identity before writing.
// ---------------------------------------------------------------------------
router.post("/auth/set-password", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "not authenticated" }); return; }

  const now = new Date();
  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(eq(magicLinkTokensTable.token, token), eq(magicLinkTokensTable.purpose, "session"), gt(magicLinkTokensTable.expiresAt, now)));
  if (!session) { res.status(401).json({ error: "invalid or expired session" }); return; }

  const schema = z.object({ password: z.string().min(8, "password must be at least 8 characters") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid input" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db
    .update(usersTable)
    .set({ passwordHash, lastSeen: new Date() })
    .where(eq(usersTable.email, session.email));

  req.log.info({ email: session.email }, "Password set");
  res.json({ ok: true });
});

router.post("/auth/space-claims/inspect", authLimiter, async (req, res): Promise<void> => {
  const parsed = InspectSpaceClaimInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid invitation token" });
    return;
  }

  const now = new Date();
  const [invitation] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.token, digestSpaceClaimToken(parsed.data.token)),
      eq(magicLinkTokensTable.purpose, "space_claim"),
      isNull(magicLinkTokensTable.usedAt),
      gt(magicLinkTokensTable.expiresAt, now),
    ))
    .limit(1);

  if (!invitation?.entryId) {
    res.status(400).json({ error: "invitation is invalid, expired, or already used" });
    return;
  }

  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.id, invitation.entryId))
    .limit(1);
  if (!isClaimableSpaceListing(entry)) {
    res.status(400).json({ error: "this listing is no longer available to claim" });
    return;
  }

  const email = invitation.email.toLowerCase().trim();
  const [user] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  res.setHeader("Cache-Control", "no-store");
  res.json(InspectSpaceClaimInvitationResponse.parse({
    entryId: entry.id,
    entryName: entry.name,
    city: entry.city,
    country: entry.country,
    email,
    hasAccount: Boolean(user),
    hasPassword: Boolean(user?.passwordHash),
    expiresAt: invitation.expiresAt,
  }));
});

router.post("/auth/space-claims/accept", authLimiter, async (req, res): Promise<void> => {
  const parsed = AcceptSpaceClaimInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid account details" });
    return;
  }

  const now = new Date();
  const digest = digestSpaceClaimToken(parsed.data.token);
  try {
    const result = await db.transaction(async (tx) => {
      const [invitation] = await tx
        .update(magicLinkTokensTable)
        .set({ usedAt: now })
        .where(and(
          eq(magicLinkTokensTable.token, digest),
          eq(magicLinkTokensTable.purpose, "space_claim"),
          isNull(magicLinkTokensTable.usedAt),
          gt(magicLinkTokensTable.expiresAt, now),
        ))
        .returning();

      if (!invitation?.entryId) {
        throw new SpaceClaimFailure(400, "invitation is invalid, expired, or already used");
      }

      const [entry] = await tx
        .select()
        .from(entriesTable)
        .where(eq(entriesTable.id, invitation.entryId))
        .limit(1);
      if (!isClaimableSpaceListing(entry)) {
        throw new SpaceClaimFailure(409, "this listing is no longer available to claim");
      }

      const email = invitation.email.toLowerCase().trim();
      let [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (user?.passwordHash) {
        const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!validPassword) {
          throw new SpaceClaimFailure(401, "invalid email or password");
        }
        [user] = await tx
          .update(usersTable)
          .set({ lastSeen: now, canPostPartnerOffers: true })
          .where(eq(usersTable.email, email))
          .returning();
      } else {
        const passwordHash = await bcrypt.hash(parsed.data.password, 12);
        if (user) {
          [user] = await tx
            .update(usersTable)
            .set({
              passwordHash,
              displayName: user.displayName ?? parsed.data.displayName?.trim() ?? entry.name,
              canPostPartnerOffers: true,
              lastSeen: now,
            })
            .where(eq(usersTable.email, email))
            .returning();
        } else {
          const displayName = parsed.data.displayName?.trim();
          if (!displayName) {
            throw new SpaceClaimFailure(400, "your name is required to create an account");
          }
          [user] = await tx
            .insert(usersTable)
            .values({
              email,
              passwordHash,
              displayName,
              isApproved: false,
              accountRole: "member",
              canPostPartnerOffers: true,
              lastSeen: now,
            })
            .returning();
        }
      }

      if (!user) {
        throw new SpaceClaimFailure(500, "account could not be created");
      }

      const [claimedEntry] = await tx
        .update(entriesTable)
        .set({
          isClaimed: true,
          claimedEmail: email,
          claimedAt: now,
        })
        .where(and(
          eq(entriesTable.id, invitation.entryId),
          eq(entriesTable.isClaimed, false),
          isNull(entriesTable.claimedEmail),
          eq(entriesTable.isApproved, true),
          eq(entriesTable.status, "published"),
          eq(entriesTable.visibility, "public"),
          eq(entriesTable.isHidden, false),
          eq(entriesTable.mapEligible, true),
          isNull(entriesTable.deletedAt),
        ))
        .returning({ id: entriesTable.id, name: entriesTable.name });

      if (!claimedEntry) {
        throw new SpaceClaimFailure(409, "this listing has already been claimed");
      }

      const session = issueSession(email, claimedEntry.id);
      await tx.insert(magicLinkTokensTable).values({
        token: session.token,
        email,
        entryId: claimedEntry.id,
        purpose: "session",
        expiresAt: session.expiresAt,
      });

      return {
        token: session.token,
        email,
        isApproved: user.isApproved,
        canPostPartnerOffers: true,
        accountRole: user.accountRole,
        displayName: user.displayName,
        entryId: claimedEntry.id,
        entryName: claimedEntry.name,
        expiresAt: session.expiresAt,
      };
    });

    req.log.info({ entryId: result.entryId, email: result.email }, "Space claim invitation accepted");
    res.setHeader("Cache-Control", "no-store");
    res.json(AcceptSpaceClaimInvitationResponse.parse({
      ok: true,
      ...result,
      expiresAt: result.expiresAt.toISOString(),
    }));
  } catch (error) {
    if (error instanceof SpaceClaimFailure) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Space claim acceptance failed");
    res.status(500).json({ error: "claim could not be completed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify?token=...
// Validates a magic-link token (admin invite flow). Issues a 30-day session.
// Creates the user row if it doesn't exist yet; preserves is_approved if set.
// ---------------------------------------------------------------------------
router.get("/auth/verify", async (req, res): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }

  const now = new Date();
  const [mlt] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(eq(magicLinkTokensTable.token, token));

  if (!mlt) { res.status(401).json({ error: "invalid token" }); return; }
  if (mlt.usedAt) { res.status(401).json({ error: "token already used" }); return; }
  if (mlt.expiresAt < new Date()) { res.status(401).json({ error: "token expired" }); return; }

  await db
    .update(magicLinkTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokensTable.token, token));

  // Create user row if it doesn't exist yet.
  // Use onConflictDoUpdate only for lastSeen — never overwrite is_approved or passwordHash.
  await db
    .insert(usersTable)
    .values({ email: mlt.email, lastSeen: new Date() })
    .onConflictDoUpdate({ target: usersTable.email, set: { lastSeen: new Date() } });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, mlt.email));

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + SESSION_EXPIRY_MS);
  await db.insert(magicLinkTokensTable).values({
    token: sessionToken,
    email: mlt.email,
    entryId: mlt.entryId,
    purpose: "session",
    expiresAt: sessionExpiry,
  });

  let entryName: string | null = null;
  if (mlt.entryId) {
    const [entry] = await db
      .select({ name: entriesTable.name })
      .from(entriesTable)
      .where(eq(entriesTable.id, mlt.entryId));
    entryName = entry?.name ?? null;
  }

  res.json({
    ok: true,
    token: sessionToken,
    entryId: mlt.entryId ?? null,
    entryName,
    email: mlt.email,
    isApproved: user?.isApproved ?? false,
    hasPassword: !!(user?.passwordHash),
    expiresAt: sessionExpiry.toISOString(),
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns the current session's email, approval status, and linked entries.
// ---------------------------------------------------------------------------
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "not authenticated" }); return; }

  const now = new Date();
  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(eq(magicLinkTokensTable.token, token), eq(magicLinkTokensTable.purpose, "session"), gt(magicLinkTokensTable.expiresAt, now)));
  if (!session) { res.status(401).json({ error: "invalid or expired session" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, session.email));

  const linkedEntries = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      kind: entriesTable.kind,
      city: entriesTable.city,
      country: entriesTable.country,
      status: entriesTable.status,
    })
    .from(entriesTable)
    .where(
      or(
        eq(entriesTable.contactEmail, session.email),
        eq(entriesTable.submittedBy, session.email),
        eq(entriesTable.claimedEmail, session.email),
      )
    );

  const ownedProfileWhere = session.entryId !== null
    ? and(
        eq(entriesTable.id, session.entryId),
        or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email)),
      )
    : or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email));
  const [ownedProfile] = await db
    .select({ tags: entriesTable.tags })
    .from(entriesTable)
    .where(ownedProfileWhere)
    .limit(1);

  res.json(GetCurrentMemberSessionResponse.parse({
    email: session.email,
    isApproved: user?.isApproved ?? false,
    accountRole: user?.accountRole ?? "member",
    canPostPartnerOffers: user?.canPostPartnerOffers ?? false,
    displayName: user?.displayName ?? null,
    entryId: session.entryId ?? null,
    entries: linkedEntries,
    newsletterOptIn: user?.newsletterOptIn ?? false,
    exchangeDigestOptIn: user?.exchangeDigestOptIn ?? false,
    ruralDiscoveryOptIn: ownedProfile?.tags.some((tag) => tag.trim().toLowerCase() === "rural") ?? false,
  }));
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/preferences
// Stores optional preferences on the signed-in account and its owned profile.
// ---------------------------------------------------------------------------
router.patch("/auth/preferences", async (req, res): Promise<void> => {
  const parsed = UpdateMemberPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid preferences" });
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.token, token),
      eq(magicLinkTokensTable.purpose, "session"),
      gt(magicLinkTokensTable.expiresAt, new Date()),
    ))
    .limit(1);
  if (!session) {
    res.status(401).json({ error: "invalid or expired session" });
    return;
  }

  const saved = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, session.email))
      .limit(1);
    if (!user) return { error: "account" as const };

    const ownedProfileWhere = session.entryId !== null
      ? and(
          eq(entriesTable.id, session.entryId),
          or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email)),
        )
      : or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email));
    const [ownedProfile] = await tx
      .select({ id: entriesTable.id, tags: entriesTable.tags })
      .from(entriesTable)
      .where(ownedProfileWhere)
      .limit(1);
    if (parsed.data.ruralDiscoveryOptIn && !ownedProfile) {
      return { error: "profile" as const };
    }

    const now = new Date();
    await tx
      .update(usersTable)
      .set({
        newsletterOptIn: parsed.data.newsletterOptIn,
        newsletterOptedInAt: parsed.data.newsletterOptIn
          ? user.newsletterOptedInAt ?? now
          : null,
        ...(parsed.data.exchangeDigestOptIn !== undefined
          ? {
              exchangeDigestOptIn: parsed.data.exchangeDigestOptIn,
              exchangeDigestOptedInAt: parsed.data.exchangeDigestOptIn
                ? user.exchangeDigestOptedInAt ?? now
                : null,
            }
          : {}),
      })
      .where(eq(usersTable.email, session.email));

    if (ownedProfile) {
      const hasRuralTag = ownedProfile.tags.some((tag) => tag.trim().toLowerCase() === "rural");
      const tags = parsed.data.ruralDiscoveryOptIn
        ? hasRuralTag ? ownedProfile.tags : [...ownedProfile.tags, "rural"]
        : ownedProfile.tags.filter((tag) => tag.trim().toLowerCase() !== "rural");
      if (hasRuralTag !== parsed.data.ruralDiscoveryOptIn) {
        await tx
          .update(entriesTable)
          .set({ tags })
          .where(and(
            eq(entriesTable.id, ownedProfile.id),
            or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email)),
          ));
      }
    }

    return {
      preferences: {
        newsletterOptIn: parsed.data.newsletterOptIn,
        ruralDiscoveryOptIn: parsed.data.ruralDiscoveryOptIn,
        exchangeDigestOptIn: parsed.data.exchangeDigestOptIn ?? user.exchangeDigestOptIn,
      },
    };
  });

  if ("error" in saved) {
    if (saved.error === "profile") {
      res.status(404).json({ error: "member profile not found" });
      return;
    }
    res.status(404).json({ error: "account not found" });
    return;
  }

  res.json(UpdateMemberPreferencesResponse.parse(saved.preferences));
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/password
// Lets a signed-in member change their own password.
// ---------------------------------------------------------------------------
router.patch("/auth/password", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "not authenticated" }); return; }

  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "new password must be at least 8 characters"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid input" });
    return;
  }

  const now = new Date();
  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(eq(magicLinkTokensTable.token, token), eq(magicLinkTokensTable.purpose, "session"), gt(magicLinkTokensTable.expiresAt, now)));
  if (!session) { res.status(401).json({ error: "invalid or expired session" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, session.email));
  if (!user || !user.passwordHash) { res.status(400).json({ error: "no password set on this account" }); return; }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "current password is incorrect" }); return; }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.email, session.email));

  req.log.info({ email: session.email }, "Member changed their password");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// Sends a 1-hour password-reset link to the given email address.
// Always returns { ok: true } to prevent email enumeration.
// ---------------------------------------------------------------------------
router.post("/auth/forgot-password", authLimiter, async (req, res): Promise<void> => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "valid email required" }); return; }

  const email = parsed.data.email.toLowerCase().trim();

  // Lookup without revealing whether the user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(magicLinkTokensTable).values({
      token: resetToken,
      email,
      entryId: null,
      purpose: "password_reset",
      expiresAt,
    });

    const siteUrl = process.env.SITE_URL ?? "https://countercult.network";
    const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      req.log.error({ err, email }, "Failed to send password reset email");
    }

    req.log.info({ email }, "Password reset requested");
  }

  // Always return ok to prevent enumeration
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// Validates a password-reset token and sets the new password.
// ---------------------------------------------------------------------------
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const schema = z.object({
    token: z.string().min(1),
    password: z.string().min(8, "password must be at least 8 characters"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid input" });
    return;
  }

  const now = new Date();
  const [mlt] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.token, parsed.data.token),
      eq(magicLinkTokensTable.purpose, "password_reset"),
      gt(magicLinkTokensTable.expiresAt, now),
    ));

  if (!mlt) { res.status(400).json({ error: "reset link is invalid or has expired — please request a new one" }); return; }
  if (mlt.usedAt) { res.status(400).json({ error: "this reset link has already been used — please request a new one" }); return; }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.update(usersTable)
    .set({ passwordHash, lastSeen: now })
    .where(eq(usersTable.email, mlt.email));

  await db.update(magicLinkTokensTable)
    .set({ usedAt: now })
    .where(eq(magicLinkTokensTable.token, parsed.data.token));

  req.log.info({ email: mlt.email }, "Password reset completed");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Deletes the current session token.
// ---------------------------------------------------------------------------
router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    await db
      .delete(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.token, token),
        eq(magicLinkTokensTable.purpose, "session"),
      ));
  }
  res.json({ ok: true });
});

export default router;
