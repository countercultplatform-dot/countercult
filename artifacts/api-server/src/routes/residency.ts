import { Router, type IRouter } from "express";
import { eq, and, gt, desc, asc, sql, or, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  db,
  residencyOffersTable,
  residencyShortlistsTable,
  magicLinkTokensTable,
  entriesTable,
  usersTable,
} from "@workspace/db";
import {
  CreateResidencyOfferBody,
  ListHomepageExchangePicksResponse,
  UpdateHomepageExchangePicksResponse,
  UpdateHomepageExchangePicksBody,
} from "@workspace/api-zod";
import {
  isShortTermSublet,
  parseAvailabilityEnd,
  ROOM_SWAP_KINDS,
  shouldExpireByAvailability,
} from "../lib/residencyAccessPolicy";
import { canExposeResidencyOfferForProfile } from "../lib/residencyOfferVisibility";
export { isShortTermSublet, parseAvailabilityEnd } from "../lib/residencyAccessPolicy";

const router: IRouter = Router();
const PARTNER_SPACE_KINDS = ["workshop", "concert", "free_space", "venue_offer"] as const;
const PARTNER_FUNDED_OPPORTUNITY_KINDS = ["open_call", "collab", "gig"] as const;
const PARTNER_RESOURCE_OFFER_KINDS = ["partner_offer"] as const;
const PARTNER_ALLOWED_POST_KINDS = [...PARTNER_SPACE_KINDS, ...PARTNER_FUNDED_OPPORTUNITY_KINDS, ...PARTNER_RESOURCE_OFFER_KINDS] as const;
const EXCHANGE_RESIDENCY_TAG = "exchange residency";
const SELF_LED_EXCHANGE_TAG = "self-led exchange";
const EXCHANGE_RESIDENCY_COHORT = {
  from: "1 February 2027",
  to: "28 February 2027",
};
const EXCHANGE_RESIDENCY_RESIDENT_TAG = "exchange residency resident";
const RESIDENCY_SHORTLIST_LIMIT = 4;
const RESIDENCY_SHORTLIST_STATUSES = ["shortlisted", "matched"] as const;
const RESIDENCY_CONTACT_TARGETS = ["applicant", "partner"] as const;
const ONE_OFF_PAID_GIG_ADVERT_ID = 31;
const PAID_GIG_ADVERT_EXCHANGE_TAG = "advert:paid-gig-exchange";

export function isLikelyServiceAdvertisement(description: string | null | undefined): boolean {
  return /\b(?:i can offer (?:my )?services?|i offer (?:my )?services?|i provide (?:my )?services?|offering my services|my services|available for hire|hire me)\b/i
    .test(description ?? "");
}

function hasSpecificPaidRate(rate: string | null | undefined): boolean {
  return /[1-9]/.test(rate ?? "");
}

export function isOneOffPaidGigAdvert(offer: {
  id?: number;
  kind: string;
  city?: string | null;
  destination?: string | null;
  tags: string[] | null;
}): boolean {
  return offer.id === ONE_OFF_PAID_GIG_ADVERT_ID &&
    offer.kind === "advert" &&
    offer.city?.trim().toLowerCase() === "norwich, uk" &&
    offer.destination?.trim().toLowerCase() === "open call" &&
    (offer.tags ?? []).some((tag) => tag.trim().toLowerCase() === "advert:hiring");
}

export function isExchangePaidAdvert(offer: {
  id?: number;
  kind: string;
  city?: string | null;
  destination?: string | null;
  tags: string[] | null;
  cost: string | null;
}): boolean {
  return offer.kind === "advert" &&
    (offer.tags ?? []).some((tag) => tag.trim().toLowerCase() === "advert:hiring") &&
    (hasSpecificPaidRate(offer.cost) || isOneOffPaidGigAdvert(offer));
}

export function validateAdvertOnlyOpportunityPost(input: { kind: string }): string | null {
  if (!["gig", "open_call", "collab"].includes(input.kind)) return null;
  return "post gigs, open calls, and collaborations on the Adverts board; hiring posts with a stated rate also appear in Exchange";
}

export function validateExchangeResidencyPost(input: {
  kind: string;
  tags?: string[] | null;
  photos?: string[] | null;
  availableFrom?: string | null;
  availableTo?: string | null;
}): string | null {
  const hasCampaignTag = Boolean(input.tags?.some((tag) => tag.trim().toLowerCase() === EXCHANGE_RESIDENCY_TAG));
  const hasSelfLedTag = Boolean(input.tags?.some((tag) => tag.trim().toLowerCase() === SELF_LED_EXCHANGE_TAG));
  if (hasSelfLedTag) return "Self-led exchanges are no longer a separate Exchange listing type; post this as a standard swap";
  if (!hasCampaignTag) return null;
  if (input.kind !== "swap") return "Exchange Residency posts must be room exchanges";
  if (!input.photos?.length) return "Exchange Residency posts require at least one room photo";
  if (input.availableFrom?.trim() !== EXCHANGE_RESIDENCY_COHORT.from || input.availableTo?.trim() !== EXCHANGE_RESIDENCY_COHORT.to) {
    return `Exchange Residency posts must use the fixed cohort dates: ${EXCHANGE_RESIDENCY_COHORT.from} to ${EXCHANGE_RESIDENCY_COHORT.to}`;
  }
  return null;
}

function hasTag(tags: string[] | null | undefined, target: string) {
  return Boolean(tags?.some((tag) => tag.trim().toLowerCase() === target));
}

function withoutResidentTag(tags: string[] | null | undefined) {
  return (tags ?? []).filter((tag) => tag.trim().toLowerCase() !== EXCHANGE_RESIDENCY_RESIDENT_TAG);
}

const PUBLIC_OFFER_DESCRIPTION_LIMIT = 320;

function truncateAtPublicBoundary(text: string): string {
  const characters = Array.from(text);
  if (characters.length <= PUBLIC_OFFER_DESCRIPTION_LIMIT) return text;

  const preview = characters.slice(0, PUBLIC_OFFER_DESCRIPTION_LIMIT);
  let sentenceBoundary = -1;
  for (let index = 0; index < preview.length; index += 1) {
    const character = preview[index];
    const nextCharacter = preview[index + 1];
    if (
      character &&
      ".!?".includes(character) &&
      (nextCharacter === undefined || /\s/.test(nextCharacter))
    ) {
      sentenceBoundary = index;
    }
  }

  if (sentenceBoundary >= Math.floor(PUBLIC_OFFER_DESCRIPTION_LIMIT * 0.6)) {
    return `${preview.slice(0, sentenceBoundary + 1).join("").trimEnd()} …`;
  }

  const wordBoundary = preview.lastIndexOf(" ");
  const readableEnd = wordBoundary > 0 ? wordBoundary : preview.length;
  return `${preview.slice(0, readableEnd).join("").trimEnd()}…`;
}

export function publicOfferDescription(description: string | null): string {
  if (!description?.trim()) return "";

  const privateDetailPattern = /(contact|email|phone|whatsapp|instagram|price|cost|£|\$|€|available\s+(?:from|to|between|on)\b|available\s+(?:\d|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|terms?|destination|travel|visa|insurance|https?:\/\/|www\.|@\w+)/i;
  const publicText = description
    .trim()
    .split(/\n+|(?<=[.!?])\s+/)
    .filter((part) => !privateDetailPattern.test(part))
    .join(" ")
    .trim()
  return truncateAtPublicBoundary(publicText);
}

type PublicExchangeCategory =
  | "housing"
  | "spaces"
  | "skills"
  | "opportunities"
  | "tools"
  | "swaps";

type PublicExchangeSubfilter =
  | "housing_residency"
  | "housing_sublet"
  | "housing_long_term"
  | "housing_hosted"
  | "housing_swap"
  | "spaces_workspace"
  | "spaces_event"
  | "spaces_flexible"
  | "spaces_shared"
  | "spaces_swap";

const EXCHANGE_TAXONOMY_TAGS = {
  housingResidency: "cc-exchange:housing:residency",
  housingSublet: "cc-exchange:housing:sublet",
  housingLongTerm: "cc-exchange:housing:long-term",
  housingHosted: "cc-exchange:housing:hosted",
  skillStayRequest: "cc-exchange:housing:skill-stay-request",
  includesWorkspace: "cc-exchange:spaces:workspace",
  spacesEvent: "cc-exchange:spaces:event",
  spacesFlexible: "cc-exchange:spaces:flexible",
  spacesShared: "cc-exchange:spaces:shared",
  arrangementSwap: "cc-exchange:arrangement:swap",
} as const;

export function normalizeExchangeOfferCost(
  kind: string,
  rawTags: string[] | null | undefined,
  cost: string | null | undefined,
): string | null {
  return isNoCostExchangeArrangement(kind, rawTags) ? "free" : cost ?? null;
}

export function validateSkillShareTerms(
  kind: string,
  mode: string | null | undefined,
  requestedReturn: string | null | undefined,
  offeredSkill?: string | null,
): string | null {
  if (kind !== "skill_share") return null;
  if (mode !== "swap") {
    return "skill-share listings must be non-cash swaps";
  }
  if (!requestedReturn?.trim()) {
    return "skill swaps must say what they want in exchange";
  }
  const normalize = (value: string) => value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  const normalizedReturn = normalize(requestedReturn);
  const promotionalOrVagueReturn = [
    /^(?:(?:i want|i need|i am looking for|looking for) )?(?:more )?(?:exposure|visibility)(?: for (?:my|the) (?:work|services|business))?$/u,
    /^(?:followers|more followers|likes|more likes|support my work|promotion|a shout out|a shoutout)$/u,
    /^(?:contact|dm|message|follow|hire|book) me(?: (?:on|for|to) .*)?$/u,
    /^(?:check|look at) (?:out )?my (?:work|portfolio|website)$/u,
    /^(?:more work|more clients|anything|whatever|whatever you can|no preference|no return|nothing)$/u,
  ];
  if (promotionalOrVagueReturn.some((pattern) => pattern.test(normalizedReturn))) {
    return "name a specific non-cash thing you want in exchange; promotion is not a return";
  }
  if (offeredSkill?.trim() && normalizedReturn === normalize(offeredSkill)) {
    return "the skill offered and the return requested must be different";
  }
  return null;
}

export function validateSpaceListingTerms(kind: string, cost: string | null | undefined): string | null {
  if (!PARTNER_SPACE_KINDS.includes(kind as typeof PARTNER_SPACE_KINDS[number])) return null;
  if (!cost?.trim()) {
    return "space listings must say whether they are free or paid";
  }
  return null;
}

export function validateRoomSwapAvailability(
  kind: string,
  mode: string | null | undefined,
  availableFrom: string | null | undefined,
  availableTo: string | null | undefined,
): string | null {
  if (!ROOM_SWAP_KINDS.includes(kind as typeof ROOM_SWAP_KINDS[number])) return null;
  if (mode !== "dates" && mode !== "flexible") {
    return "choose a specific date window or flexible timing";
  }
  if (mode === "dates" && (!availableFrom?.trim() || !availableTo?.trim())) {
    return "specific availability requires both a start and end date";
  }
  return null;
}

export function isNoCostExchangeArrangement(kind: string, rawTags: string[] | null | undefined): boolean {
  return kind.trim().toLowerCase() === "swap"
    || kind.trim().toLowerCase() === "skill_share"
    || (rawTags ?? []).some((tag) => tag.trim().toLowerCase() === EXCHANGE_TAXONOMY_TAGS.arrangementSwap);
}

export function getPublicExchangeFacets(
  kind: string,
  rawTags: string[] | null,
  description: string,
  duration: string | null,
): { categories: PublicExchangeCategory[]; subfilters: PublicExchangeSubfilter[] } {
  const normalizedKind = kind.trim().toLowerCase();
  const tags = new Set((rawTags ?? []).map((tag) => tag.trim().toLowerCase()));
  const text = `${description} ${duration ?? ""}`.toLowerCase();
  const isResidentialSpaceSwap =
    ["workshop", "concert", "free_space", "venue_offer"].includes(normalizedKind) &&
    tags.has(EXCHANGE_TAXONOMY_TAGS.arrangementSwap) &&
    /^space type:\s*(?:room in a shared space|entire apartment\s*\/\s*home)(?:\s|$)/i.test(description);
  const hasHousingSubtype = [...tags].some((tag) => tag.startsWith("cc-exchange:housing:"));
  const includesWorkspace =
    tags.has(EXCHANGE_TAXONOMY_TAGS.includesWorkspace) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesEvent) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesFlexible) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesShared);
  const hasHousing = ["host", "looking", "swap"].includes(normalizedKind) || hasHousingSubtype || isResidentialSpaceSwap;
  const hasSpaces = ["workshop", "concert", "free_space", "venue_offer"].includes(normalizedKind) || includesWorkspace;
  const categories: PublicExchangeCategory[] = [];
  const subfilters: PublicExchangeSubfilter[] = [];
  const hasExplicitSpacesSubtype = [
    EXCHANGE_TAXONOMY_TAGS.includesWorkspace,
    EXCHANGE_TAXONOMY_TAGS.spacesEvent,
    EXCHANGE_TAXONOMY_TAGS.spacesFlexible,
    EXCHANGE_TAXONOMY_TAGS.spacesShared,
  ].some((tag) => tags.has(tag));

  if (hasHousing) categories.push("housing");
  if (hasSpaces) categories.push("spaces");

  if (normalizedKind === "skill_share" && !categories.includes("skills")) {
    categories.push("skills");
  }

  if (!categories.length) {
    switch (normalizedKind) {
      case "skill_share":
        categories.push("skills");
        break;
      case "open_call":
      case "collab":
        if (!tags.has(EXCHANGE_TAXONOMY_TAGS.housingResidency)) categories.push("opportunities");
        break;
      case "partner_offer":
        categories.push("tools");
        break;
    }
  }

  if (categories.includes("housing")) {
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingResidency) || tags.has(EXCHANGE_RESIDENCY_TAG)) {
      subfilters.push("housing_residency");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingSublet) || (normalizedKind === "host" && /\bsublet\b/i.test(text))) {
      subfilters.push("housing_sublet");
    }
    if (
      tags.has(EXCHANGE_TAXONOMY_TAGS.housingLongTerm) ||
      (normalizedKind === "host" && /\blong[ -]?term\b/i.test(text))
    ) {
      subfilters.push("housing_long_term");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingHosted)) subfilters.push("housing_hosted");
    if (
      normalizedKind === "swap" ||
      tags.has(EXCHANGE_RESIDENCY_TAG) ||
      tags.has(EXCHANGE_TAXONOMY_TAGS.skillStayRequest) ||
      isResidentialSpaceSwap
    ) {
      subfilters.push("housing_swap");
    }
  }

  if (categories.includes("spaces")) {
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.includesWorkspace) || (!hasExplicitSpacesSubtype && normalizedKind === "workshop")) {
      subfilters.push("spaces_workspace");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesEvent) || (!hasExplicitSpacesSubtype && normalizedKind === "concert")) {
      subfilters.push("spaces_event");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesFlexible) || (!hasExplicitSpacesSubtype && normalizedKind === "free_space")) {
      subfilters.push("spaces_flexible");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesShared) || (!hasExplicitSpacesSubtype && normalizedKind === "venue_offer")) {
      subfilters.push("spaces_shared");
    }
    if (normalizedKind === "swap" || tags.has(EXCHANGE_TAXONOMY_TAGS.arrangementSwap)) {
      subfilters.push("spaces_swap");
    }
  }

  return {
    categories: [...new Set(categories)],
    subfilters: [...new Set(subfilters)],
  };
}

type ClaimSession = {
  token: string;
  email: string;
  entryId: number | null;
  expiresAt: Date;
  accountRole: string;
  displayName: string | null;
  isApproved: boolean;
  canPostPartnerOffers: boolean;
};

function hasPartnerOfferPostingAccess(session: ClaimSession | null): boolean {
  return Boolean(session?.canPostPartnerOffers || session?.accountRole === "partner_poster");
}

async function resolveClaimSession(authHeader: string, now: Date): Promise<ClaimSession | null> {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const [session] = await db
    .select({
      token: magicLinkTokensTable.token,
      email: magicLinkTokensTable.email,
      entryId: magicLinkTokensTable.entryId,
      expiresAt: magicLinkTokensTable.expiresAt,
      accountRole: usersTable.accountRole,
      displayName: usersTable.displayName,
      isApproved: usersTable.isApproved,
      canPostPartnerOffers: usersTable.canPostPartnerOffers,
    })
    .from(magicLinkTokensTable)
    .leftJoin(usersTable, eq(usersTable.email, magicLinkTokensTable.email))
    .where(and(
      eq(magicLinkTokensTable.token, token),
      eq(magicLinkTokensTable.purpose, "session"),
      gt(magicLinkTokensTable.expiresAt, now),
    ));
  if (!session) return null;
  return {
    token: session.token,
    email: session.email,
    entryId: session.entryId,
    expiresAt: session.expiresAt,
    accountRole: session.accountRole ?? "member",
    displayName: session.displayName,
    isApproved: session.isApproved ?? false,
    canPostPartnerOffers: session.canPostPartnerOffers ?? false,
  };
}

async function hasApprovedRoomSwapAccess(session: ClaimSession | null): Promise<boolean> {
  if (!session?.entryId) return false;

  const [access] = await db
    .select({
      userApproved: usersTable.isApproved,
      entryApproved: entriesTable.isApproved,
      status: entriesTable.status,
      deletedAt: entriesTable.deletedAt,
    })
    .from(entriesTable)
    .innerJoin(usersTable, eq(usersTable.email, session.email))
    .where(and(
      eq(entriesTable.id, session.entryId),
      or(eq(entriesTable.contactEmail, session.email), eq(entriesTable.claimedEmail, session.email)),
    ))
    .limit(1);

  return Boolean(
    access?.userApproved &&
    access.entryApproved &&
    access.status === "published" &&
    access.deletedAt == null,
  );
}

function isOfferOwner(
  offer: { entryId: number | null; claimerEmail: string | null; posterEmail: string | null },
  session: ClaimSession | null,
): boolean {
  return Boolean(session && (
    offer.claimerEmail === session.email ||
    offer.posterEmail === session.email ||
    (session.entryId !== null && offer.entryId === session.entryId)
  ));
}

async function listOffers(
  now: Date,
  session: ClaimSession | null,
  canAccessRoomSwaps: boolean,
  includeLegacyDemand = false,
  includeInactive = false,
  isAdmin = false,
  partnerOnly = false,
  publicOnly = false,
) {
  const rows = await db
    .select({
      id: residencyOffersTable.id,
      entryId: residencyOffersTable.entryId,
      claimerEmail: residencyOffersTable.claimerEmail,
      posterEmail: residencyOffersTable.posterEmail,
      entryName: sql<string>`COALESCE(${entriesTable.name}, ${residencyOffersTable.posterName}, 'anonymous')`,
      entryKind: entriesTable.kind,
       entryApproved: entriesTable.isApproved,
       entryStatus: entriesTable.status,
       entryHidden: entriesTable.isHidden,
       entryDeletedAt: entriesTable.deletedAt,
      city: residencyOffersTable.city,
      kind: residencyOffersTable.kind,
      description: residencyOffersTable.description,
      availableFrom: residencyOffersTable.availableFrom,
      availableTo: residencyOffersTable.availableTo,
      availabilityMode: residencyOffersTable.availabilityMode,
      contact: residencyOffersTable.contact,
      destination: residencyOffersTable.destination,
      cost: residencyOffersTable.cost,
      duration: residencyOffersTable.duration,
      skillShareMode: residencyOffersTable.skillShareMode,
      requestedReturn: residencyOffersTable.requestedReturn,
      virtualAvailable: residencyOffersTable.virtualAvailable,
      capacity: residencyOffersTable.capacity,
      tags: residencyOffersTable.tags,
      photos: residencyOffersTable.photos,
      publicPhotos: residencyOffersTable.publicPhotos,
      visibility: residencyOffersTable.visibility,
      homepageFeaturedOrder: residencyOffersTable.homepageFeaturedOrder,
      posterAccountRole: usersTable.accountRole,
      posterCanPostPartnerOffers: usersTable.canPostPartnerOffers,
      isActive: residencyOffersTable.isActive,
      createdAt: residencyOffersTable.createdAt,
      renewedAt: residencyOffersTable.renewedAt,
    })
    .from(residencyOffersTable)
    .leftJoin(entriesTable, eq(residencyOffersTable.entryId, entriesTable.id))
    .leftJoin(usersTable, eq(usersTable.email, residencyOffersTable.posterEmail))
    .where(includeInactive ? sql`true` : eq(residencyOffersTable.isActive, true))
    .orderBy(desc(residencyOffersTable.createdAt));

  const result = rows
    .filter((row) => {
      if (isAdmin) return true;
      const isOwner = Boolean(session && (
        row.entryId === session.entryId ||
        row.claimerEmail === session.email ||
        row.posterEmail === session.email
      ));
      if (isOwner) return true;
      if (session?.accountRole === "partner_poster") return false;
      if (row.visibility === "public") return true;
      // Network offers are discoverable to everyone as teaser cards. The
      // response serializer below still withholds all protected fields unless
      // the viewer is an approved member, the owner, or an admin.
      if (row.visibility === "network") return true;
      // Keep legacy private rows visible only to their owner or admin.
      return false;
    })
    .filter((row) => !partnerOnly || row.posterCanPostPartnerOffers || row.posterAccountRole === "partner_poster")
    // Pending members can save and manage their own listings. Keep them hidden
    // from others until the linked profile is approved and published; approval
    // is still required to browse other housing posts.
    .filter((row) => isAdmin || canExposeResidencyOfferForProfile(row, isOfferOwner(row, session)))
    // Keep old demand-style rows in storage for admin review, but never expose
    // them through the member/public browsing API.
    .filter((row) => includeLegacyDemand || row.kind !== "looking")
    // Cross-list rate-listed hiring adverts, plus the one-off Norwich Open Call
    // explicitly requested for Exchange; services and other unpriced adverts
    // remain on the Adverts board.
    .filter((row) => {
      if (isAdmin || isOfferOwner(row, session)) return true;
      if (row.kind === "advert") return isExchangePaidAdvert(row);
      if (row.kind === "gig") return hasSpecificPaidRate(row.cost);
      return true;
    })
    .filter((row) =>
      isExchangePaidAdvert(row) ||
      isAdmin ||
      isOfferOwner(row, session) ||
      !isLikelyServiceAdvertisement(row.description)
    )
    .filter((row) =>
      row.visibility !== "private" ||
      isOfferOwner(row, session) ||
      canAccessRoomSwaps ||
      Boolean(session?.isApproved && !ROOM_SWAP_KINDS.includes(row.kind as typeof ROOM_SWAP_KINDS[number])),
    )
    .filter((row) => !publicOnly || row.visibility === "public")
    .filter((row) => !row.isActive || !shouldExpireByAvailability(row, now))
    .map((row) => {
      const effectiveVisibility = row.visibility;
     const expiresAt = isShortTermSublet(row.kind, row.duration)
      ? parseAvailabilityEnd(row.availableTo)
      : null;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
      const isOwner = isOfferOwner(row, session);
        const isPublicPaidGig = effectiveVisibility === "public" &&
          (isExchangePaidAdvert(row) || (row.kind === "gig" && hasSpecificPaidRate(row.cost)));
        const isOneOffPaidGig = isOneOffPaidGigAdvert(row);
        const canViewFullOffer = isAdmin || isOwner || isPublicPaidGig || Boolean(
         session?.isApproved &&
         effectiveVisibility !== "private" &&
         (canAccessRoomSwaps || !ROOM_SWAP_KINDS.includes(row.kind as typeof ROOM_SWAP_KINDS[number])),
       );
      if (isAdmin) {
        return {
          ...row,
          hasLiveProfile: Boolean(
            row.entryApproved &&
            row.entryStatus === "published" &&
            !row.entryHidden &&
            row.entryDeletedAt == null
          ),
            tags: [
              ...(row.tags ?? []).filter((tag) => tag.trim().toLowerCase() !== SELF_LED_EXCHANGE_TAG),
              ...(isOneOffPaidGig ? [PAID_GIG_ADVERT_EXCHANGE_TAG] : []),
            ],
            visibility: effectiveVisibility,
          description: row.description,
            cost: normalizeExchangeOfferCost(row.kind, row.tags, row.cost),
          isPublicPreview: false,
          expiresAt: expiresAt?.toISOString() ?? null,
          daysUntilExpiry,
        };
      }

      if (!canViewFullOffer) {
        // Keep the anonymous contract as a real allowlist. Do not return
        // protected property names with null values: clients, caches, and
        // scrapers should not receive the private response shape at all.
        const publicFacets = effectiveVisibility === "public" || effectiveVisibility === "network"
          ? getPublicExchangeFacets(row.kind, row.tags, row.description, row.duration)
          : null;
        const publicTags = effectiveVisibility === "public"
          ? (row.tags ?? []).filter((tag) =>
              !tag.trim().toLowerCase().startsWith("cc-exchange:") &&
              ![EXCHANGE_RESIDENCY_TAG, EXCHANGE_RESIDENCY_RESIDENT_TAG, SELF_LED_EXCHANGE_TAG].includes(tag.trim().toLowerCase())
            )
          : [];
        return {
          id: row.id,
          city: row.city,
          description: publicOfferDescription(row.description),
          isPublicPreview: true,
          ...(row.kind === "skill_share"
            ? {
                skillShareMode: row.skillShareMode,
                requestedReturn: row.requestedReturn ? publicOfferDescription(row.requestedReturn) : null,
                virtualAvailable: row.virtualAvailable === true,
              }
            : {}),
          ...(isNoCostExchangeArrangement(row.kind, row.tags) ? { publicFreeArrangement: true } : {}),
          ...(effectiveVisibility === "public" && row.publicPhotos?.length
            ? {
                publicPhotoUrls: row.photos.flatMap((photo, index) =>
                  row.publicPhotos.includes(photo) ? [`/api/storage/exchange-public/${row.id}/${index}`] : [],
                ),
              }
            : {}),
          ...(effectiveVisibility === "public"
            ? {
                hasPublicMapLocation: true,
              }
            : {}),
          ...(publicFacets?.categories[0]
            ? { publicCategory: publicFacets.categories[0] }
            : {}),
          ...(publicFacets?.categories.length
            ? { publicCategories: publicFacets.categories }
            : {}),
          ...(publicFacets?.subfilters.length
            ? { publicSubfilters: publicFacets.subfilters }
            : {}),
          ...(publicTags.length ? { publicTags } : {}),
        };
      }

      return {
        id: row.id,
        entryId: row.entryId,
        entryName: row.entryName,
        entryKind: row.entryKind,
        city: row.city,
        kind: isExchangePaidAdvert(row) ? "gig" : row.kind,
        description: row.description,
        availableFrom: row.availableFrom,
        availableTo: row.availableTo,
        availabilityMode: row.availabilityMode,
        contact: row.contact,
        destination: row.destination,
        cost: normalizeExchangeOfferCost(row.kind, row.tags, row.cost),
        duration: row.duration,
        skillShareMode: row.skillShareMode,
        requestedReturn: row.requestedReturn,
        virtualAvailable: row.virtualAvailable,
        capacity: row.capacity,
        tags: [
          ...(row.tags ?? []).filter((tag) => tag.trim().toLowerCase() !== SELF_LED_EXCHANGE_TAG),
          ...(isOneOffPaidGig ? [PAID_GIG_ADVERT_EXCHANGE_TAG] : []),
        ],
        photos: row.photos,
        publicPhotos: row.publicPhotos ?? [],
        visibility: effectiveVisibility,
        isActive: row.isActive,
        createdAt: row.createdAt,
        renewedAt: row.renewedAt,
        isPublicPreview: false,
        isOwn: isOwner,
        expiresAt: expiresAt?.toISOString() ?? null,
        daysUntilExpiry,
      };
    });

  return result;
}

export function orderHomepageExchangePicks<T extends { id: number }>(
  selectedIds: readonly number[],
  safeOffers: readonly T[],
): T[] {
  const offersById = new Map(safeOffers.map((offer) => [offer.id, offer]));
  return selectedIds.flatMap((id) => {
    const offer = offersById.get(id);
    return offer ? [offer] : [];
  });
}

export function selectHomepageExchangePicks<T extends { id: number }>(
  selectedIds: readonly number[],
  safeOffers: readonly T[],
): T[] {
  // listOffers returns newest first. Keep the two newest public-safe posts visible
  // even when older curator picks are saved, then use one saved pick for slot three.
  const latest = safeOffers.slice(0, 2);
  const latestIds = new Set(latest.map((offer) => offer.id));
  const featured = orderHomepageExchangePicks(selectedIds, safeOffers)
    .filter((offer) => !latestIds.has(offer.id))
    .slice(0, 1);
  const includedIds = new Set([...latest, ...featured].map((offer) => offer.id));
  return [
    ...latest,
    ...featured,
    ...safeOffers.filter((offer) => !includedIds.has(offer.id)),
  ].slice(0, 3);
}

function isDevelopmentFixtureOffer(offer: { city: string; description: string }): boolean {
  const fixtureText = `${offer.city} ${offer.description}`;
  return process.env.NODE_ENV !== "production" && (
    /\b(?:test(?:ing)?|example|demo|dummy|fixture|placeholder)\b/i.test(fixtureText)
    || /\brule city\b/i.test(fixtureText)
    || /verified partner offer for artists/i.test(fixtureText)
  );
}

export function validateHomepageExchangePickIds(
  selectedIds: readonly number[],
  availableIds: ReadonlySet<number>,
): string | null {
  if (new Set(selectedIds).size !== selectedIds.length) {
    return "Homepage pick offer IDs must be unique";
  }
  if (selectedIds.some((id) => !availableIds.has(id))) {
    return "Only active public-safe Exchange offers can be featured";
  }
  return null;
}

export async function listPublicExchangeWeeklyCandidates(now = new Date()) {
  const offers = await listOffers(now, null, false, false, false, false, false, true);
  const offerIds = offers.map((offer) => offer.id);
  const profileRows = offerIds.length
    ? await db
        .select({
          offerId: residencyOffersTable.id,
          id: entriesTable.id,
          name: entriesTable.name,
          city: entriesTable.city,
          country: entriesTable.country,
          heroPhoto: entriesTable.heroPhoto,
        })
        .from(residencyOffersTable)
        .innerJoin(entriesTable, eq(residencyOffersTable.entryId, entriesTable.id))
        .where(and(
          inArray(residencyOffersTable.id, offerIds),
          eq(entriesTable.kind, "artist"),
          eq(entriesTable.visibility, "public"),
          eq(entriesTable.status, "published"),
          eq(entriesTable.isApproved, true),
          eq(entriesTable.isHidden, false),
          isNull(entriesTable.deletedAt),
          isNotNull(entriesTable.publicProfileConsentAt),
        ))
    : [];
  const profilesByOfferId = new Map(profileRows.map((profile) => [profile.offerId, {
    id: profile.id,
    name: profile.name,
    city: profile.city,
    country: profile.country,
    heroPhoto: profile.heroPhoto,
  }]));

  return offers.map((offer) => ({
    id: offer.id,
    city: offer.city,
    description: offer.description,
    publicCategories: "publicCategories" in offer ? offer.publicCategories : undefined,
    publicCategory: "publicCategory" in offer ? offer.publicCategory : undefined,
    publicPhotoUrls: "publicPhotoUrls" in offer ? offer.publicPhotoUrls : undefined,
    publicProfile: profilesByOfferId.get(offer.id),
  }));
}

export async function listConsentedPublicArtistProfilesForWeekly() {
  return db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      city: entriesTable.city,
      country: entriesTable.country,
      heroPhoto: entriesTable.heroPhoto,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.kind, "artist"),
      eq(entriesTable.visibility, "public"),
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      isNull(entriesTable.deletedAt),
      isNotNull(entriesTable.publicProfileConsentAt),
    ))
    .orderBy(desc(entriesTable.createdAt))
    .limit(6);
}

type MatchingOffer = {
  id: number;
  entryId: number | null;
  name: string;
  email: string | null;
  contact: string | null;
  city: string;
  destination: string | null;
  description: string;
  availableFrom: string | null;
  availableTo: string | null;
  photos: string[];
  isActive: boolean;
  isResident: boolean;
};

async function loadMatchingOffers(): Promise<MatchingOffer[]> {
  const rows = await db
    .select({
      offer: residencyOffersTable,
      entryName: entriesTable.name,
      displayName: usersTable.displayName,
    })
    .from(residencyOffersTable)
    .leftJoin(entriesTable, eq(residencyOffersTable.entryId, entriesTable.id))
    .leftJoin(usersTable, eq(usersTable.email, residencyOffersTable.posterEmail));

  return rows
    .filter(({ offer }) => hasTag(offer.tags, EXCHANGE_RESIDENCY_TAG))
    .map(({ offer, entryName, displayName }) => ({
      id: offer.id,
      entryId: offer.entryId,
      name: entryName ?? displayName ?? offer.posterName ?? offer.claimerEmail ?? "anonymous",
      email: offer.claimerEmail ?? offer.posterEmail,
      contact: offer.contact,
      city: offer.city,
      destination: offer.destination,
      description: offer.description,
      availableFrom: offer.availableFrom,
      availableTo: offer.availableTo,
      photos: offer.photos ?? [],
      isActive: offer.isActive,
      isResident: hasTag(offer.tags, EXCHANGE_RESIDENCY_RESIDENT_TAG),
    }));
}

function getMatchingOffer(
  offers: MatchingOffer[],
  id: number,
): MatchingOffer | undefined {
  return offers.find((offer) => offer.id === id);
}

function getContactValue(offer: MatchingOffer): string | null {
  return offer.email ?? offer.contact;
}

function isShortlistStatus(value: unknown): value is typeof RESIDENCY_SHORTLIST_STATUSES[number] {
  return typeof value === "string" && RESIDENCY_SHORTLIST_STATUSES.includes(value as typeof RESIDENCY_SHORTLIST_STATUSES[number]);
}

function isContactTarget(value: unknown): value is typeof RESIDENCY_CONTACT_TARGETS[number] {
  return typeof value === "string" && RESIDENCY_CONTACT_TARGETS.includes(value as typeof RESIDENCY_CONTACT_TARGETS[number]);
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const adminPwd = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /api/admin/residency/matching — private applicant shortlist workspace
router.get("/admin/residency/matching", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;

  const offers = await loadMatchingOffers();
  const shortlistRows = await db
    .select()
    .from(residencyShortlistsTable)
    .orderBy(desc(residencyShortlistsTable.createdAt));
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));

  res.json({
    applicants: offers,
    shortlists: shortlistRows
      .map((shortlist) => ({
        ...shortlist,
        applicant: offerById.get(shortlist.applicantOfferId) ?? null,
        partner: offerById.get(shortlist.partnerOfferId) ?? null,
      }))
      .filter((shortlist) => shortlist.applicant && shortlist.partner),
  });
});

// POST /api/admin/residency/:applicantId/shortlist — add a private candidate
router.post("/admin/residency/:applicantId/shortlist", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;

  const applicantOfferId = parseInt(req.params.applicantId ?? "", 10);
  const partnerOfferId = Number(req.body?.partnerOfferId);
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : null;
  if (!Number.isInteger(applicantOfferId) || !Number.isInteger(partnerOfferId)) {
    res.status(400).json({ error: "valid applicant and partner offer ids are required" });
    return;
  }
  if (applicantOfferId === partnerOfferId) {
    res.status(400).json({ error: "an applicant cannot be shortlisted with themself" });
    return;
  }

  const offers = await loadMatchingOffers();
  const applicant = getMatchingOffer(offers, applicantOfferId);
  const partner = getMatchingOffer(offers, partnerOfferId);
  if (!applicant || !partner) {
    res.status(404).json({ error: "both offers must be Exchange Residency applicants" });
    return;
  }

  const existing = await db
    .select()
    .from(residencyShortlistsTable)
    .where(eq(residencyShortlistsTable.applicantOfferId, applicantOfferId));
  if (existing.length >= RESIDENCY_SHORTLIST_LIMIT) {
    res.status(409).json({ error: `an applicant can have at most ${RESIDENCY_SHORTLIST_LIMIT} shortlisted partners` });
    return;
  }
  const [duplicatePair] = await db
    .select({ id: residencyShortlistsTable.id })
    .from(residencyShortlistsTable)
    .where(or(
      and(
        eq(residencyShortlistsTable.applicantOfferId, applicantOfferId),
        eq(residencyShortlistsTable.partnerOfferId, partnerOfferId),
      ),
      and(
        eq(residencyShortlistsTable.applicantOfferId, partnerOfferId),
        eq(residencyShortlistsTable.partnerOfferId, applicantOfferId),
      ),
    ))
    .limit(1);
  if (duplicatePair) {
    res.status(409).json({ error: "that pair is already shortlisted" });
    return;
  }

  const [shortlist] = await db
    .insert(residencyShortlistsTable)
    .values({ applicantOfferId, partnerOfferId, notes: notes || null })
    .returning();
  res.status(201).json({ ...shortlist, applicant, partner });
});

// PATCH /api/admin/residency/shortlist/:id — update private notes or match state
router.patch("/admin/residency/shortlist/:id", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;

  const id = parseInt(req.params.id ?? "", 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid shortlist id" });
    return;
  }
  const [shortlist] = await db.select().from(residencyShortlistsTable).where(eq(residencyShortlistsTable.id, id));
  if (!shortlist) {
    res.status(404).json({ error: "Shortlist entry not found" });
    return;
  }

  const updates: { notes?: string | null; status?: string } = {};
  if (req.body?.notes !== undefined) {
    if (req.body.notes !== null && typeof req.body.notes !== "string") {
      res.status(400).json({ error: "notes must be text or null" });
      return;
    }
    updates.notes = typeof req.body.notes === "string" ? req.body.notes.trim() || null : null;
  }
  if (req.body?.status !== undefined) {
    if (!isShortlistStatus(req.body.status)) {
      res.status(400).json({ error: "status must be shortlisted or matched" });
      return;
    }
    if (req.body.status === "matched") {
      const [conflict] = await db
        .select({ id: residencyShortlistsTable.id })
        .from(residencyShortlistsTable)
        .where(and(
          eq(residencyShortlistsTable.status, "matched"),
          or(
            eq(residencyShortlistsTable.applicantOfferId, shortlist.applicantOfferId),
            eq(residencyShortlistsTable.applicantOfferId, shortlist.partnerOfferId),
            eq(residencyShortlistsTable.partnerOfferId, shortlist.applicantOfferId),
            eq(residencyShortlistsTable.partnerOfferId, shortlist.partnerOfferId),
          ),
        ))
        .limit(1);
      if (conflict && conflict.id !== id) {
        res.status(409).json({ error: "one of these applicants is already marked as matched" });
        return;
      }
    }
    updates.status = req.body.status;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "no shortlist fields to update" });
    return;
  }

  const [updated] = await db
    .update(residencyShortlistsTable)
    .set(updates)
    .where(eq(residencyShortlistsTable.id, id))
    .returning();
  const offers = await loadMatchingOffers();
  res.json({
    ...updated,
    applicant: getMatchingOffer(offers, updated.applicantOfferId) ?? null,
    partner: getMatchingOffer(offers, updated.partnerOfferId) ?? null,
  });
});

// POST /api/admin/residency/shortlist/:id/contact — explicitly record an outreach decision
router.post("/admin/residency/shortlist/:id/contact", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id ?? "", 10);
  const target = req.body?.target;
  if (!Number.isInteger(id) || !isContactTarget(target) || req.body?.confirm !== true) {
    res.status(400).json({ error: "confirm contact and choose an applicant or partner target" });
    return;
  }
  const [shortlist] = await db.select().from(residencyShortlistsTable).where(eq(residencyShortlistsTable.id, id));
  if (!shortlist) {
    res.status(404).json({ error: "Shortlist entry not found" });
    return;
  }
  const offers = await loadMatchingOffers();
  const targetOffer = getMatchingOffer(offers, target === "applicant" ? shortlist.applicantOfferId : shortlist.partnerOfferId);
  const contact = targetOffer ? getContactValue(targetOffer) : null;
  if (!targetOffer || !contact) {
    res.status(409).json({ error: "this applicant does not have a contact method recorded" });
    return;
  }

  const contactedAt = new Date();
  const [updated] = await db
    .update(residencyShortlistsTable)
    .set(target === "applicant" ? { applicantContactedAt: contactedAt } : { partnerContactedAt: contactedAt })
    .where(eq(residencyShortlistsTable.id, id))
    .returning();
  res.json({ ...updated, target, contact });
});

// DELETE /api/admin/residency/shortlist/:id — remove a private candidate
router.delete("/admin/residency/shortlist/:id", async (req, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id ?? "", 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid shortlist id" });
    return;
  }
  const deleted = await db.delete(residencyShortlistsTable).where(eq(residencyShortlistsTable.id, id)).returning({ id: residencyShortlistsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Shortlist entry not found" });
    return;
  }
  res.status(204).send();
});

// GET /api/residency — list active offers for authenticated members/partners
router.get("/residency", async (req, res): Promise<void> => {
  const now = new Date();
  const session = await resolveClaimSession(req.headers.authorization ?? "", now);
  const canAccessRoomSwaps = session ? await hasApprovedRoomSwapAccess(session) : false;
  // The board must return a fresh list after a member posts. A 304 has no
  // response body, and the shared client cannot reconstruct the current feed.
  delete req.headers["if-none-match"];
  delete req.headers["if-modified-since"];
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const offers = await listOffers(now, session, canAccessRoomSwaps);
  if (session && !canAccessRoomSwaps) {
    // Pending profiles can manage what they posted, but cannot read the live
    // Exchange board until their linked profile is approved.
    res.json(offers.filter((offer) => "isOwn" in offer && offer.isOwn));
    return;
  }
  res.json(offers);
});

// GET /api/residency/homepage-picks — up to three live public-safe offers, preferring saved picks
router.get("/residency/homepage-picks", async (_req, res): Promise<void> => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const selectedRows = await db
    .select({
      id: residencyOffersTable.id,
      order: residencyOffersTable.homepageFeaturedOrder,
    })
    .from(residencyOffersTable)
    .where(isNotNull(residencyOffersTable.homepageFeaturedOrder))
    .orderBy(asc(residencyOffersTable.homepageFeaturedOrder))
    .limit(3);
  const safeOffers = await listOffers(new Date(), null, false);
  const displayOffers = safeOffers.filter((offer) => !isDevelopmentFixtureOffer(offer));
  const picks = selectHomepageExchangePicks(selectedRows.map((row) => row.id), displayOffers);
  res.json(ListHomepageExchangePicksResponse.parse(picks));
});

// GET /api/admin/residency — list all active offers for the admin board
router.get("/admin/residency", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const includeInactive = req.query.includeInactive === "true";
  const partnerOnly = req.query.partnerOnly === "true";
  res.json(await listOffers(new Date(), null, true, true, includeInactive, true, partnerOnly));
});

// PATCH /api/admin/residency/homepage-picks — save the curator-selected order
router.patch("/admin/residency/homepage-picks", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateHomepageExchangePicksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const availableOffers = await listOffers(new Date(), null, false);
  const availableIds = new Set(availableOffers.map((offer) => offer.id));
  const validationError = validateHomepageExchangePickIds(parsed.data.offerIds, availableIds);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(residencyOffersTable)
      .set({ homepageFeaturedOrder: null })
      .where(isNotNull(residencyOffersTable.homepageFeaturedOrder));

    for (const [index, id] of parsed.data.offerIds.entries()) {
      await tx
        .update(residencyOffersTable)
        .set({ homepageFeaturedOrder: index + 1 })
        .where(eq(residencyOffersTable.id, id));
    }
  });

  res.json(UpdateHomepageExchangePicksResponse.parse({ offerIds: parsed.data.offerIds }));
});

// POST /api/residency — free post for claimed artists (room swap, collab)
router.post("/residency", async (req, res): Promise<void> => {
  const now = new Date();
  const session = await resolveClaimSession(req.headers.authorization ?? "", now);
  if (!session) {
    res.status(401).json({ error: "Valid claim session required" });
    return;
  }
  if (session.accountRole === "partner_poster" && !session.isApproved && !session.canPostPartnerOffers) {
    res.status(403).json({ error: "partner account approval is required before publishing" });
    return;
  }
  const parsed = CreateResidencyOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.kind === "looking") {
    res.status(400).json({ error: "new looking-for listings are not available right now" });
    return;
  }
  const skillShareError = validateSkillShareTerms(
    parsed.data.kind,
    parsed.data.skillShareMode,
    parsed.data.requestedReturn,
    parsed.data.description,
  );
  if (skillShareError) { res.status(400).json({ error: skillShareError }); return; }
  const spaceTermsError = validateSpaceListingTerms(parsed.data.kind, parsed.data.cost);
  if (spaceTermsError) { res.status(400).json({ error: spaceTermsError }); return; }
  const availabilityError = validateRoomSwapAvailability(
    parsed.data.kind,
    parsed.data.availabilityMode,
    parsed.data.availableFrom,
    parsed.data.availableTo,
  );
  if (availabilityError) { res.status(400).json({ error: availabilityError }); return; }
  const createPhotos = parsed.data.photos ?? [];
  if ((parsed.data.publicPhotos ?? []).some((photo: string) => !createPhotos.includes(photo))) {
    res.status(400).json({ error: "public photos must be selected from this listing's uploaded photos" });
    return;
  }

  if (
    !hasPartnerOfferPostingAccess(session) &&
    PARTNER_RESOURCE_OFFER_KINDS.includes(parsed.data.kind as typeof PARTNER_RESOURCE_OFFER_KINDS[number])
  ) {
    res.status(403).json({ error: "partner resource offers are reserved for partner organisations" });
    return;
  }

  const normalizedCost = normalizeExchangeOfferCost(parsed.data.kind, parsed.data.tags, parsed.data.cost);
  const advertOnlyError = validateAdvertOnlyOpportunityPost({ kind: parsed.data.kind });
  if (advertOnlyError) {
    res.status(400).json({ error: advertOnlyError });
    return;
  }
  if (ROOM_SWAP_KINDS.includes(parsed.data.kind as typeof ROOM_SWAP_KINDS[number])) {
    const requiredFields = [
      ["availabilityMode", parsed.data.availabilityMode],
      ...(parsed.data.availabilityMode === "dates"
        ? [["availableFrom", parsed.data.availableFrom] as const, ["availableTo", parsed.data.availableTo] as const]
        : []),
      ["cost", normalizedCost],
      ["duration", parsed.data.duration],
      ...(parsed.data.kind === "host" || parsed.data.kind === "swap" ? [["capacity", parsed.data.capacity] as const] : []),
    ] as const;
    const missing = requiredFields.filter(([, value]) => !value?.trim()).map(([name]) => name);
    if (missing.length > 0) {
      res.status(400).json({ error: `room swap posts require: ${missing.join(", ")}` });
      return;
    }
  }

  const campaignError = validateExchangeResidencyPost(parsed.data);
  if (campaignError) {
    res.status(400).json({ error: campaignError });
    return;
  }

  if (hasPartnerOfferPostingAccess(session)) {
    if (!PARTNER_ALLOWED_POST_KINDS.includes(parsed.data.kind as typeof PARTNER_ALLOWED_POST_KINDS[number])) {
      res.status(403).json({ error: "partner posts are limited to space offers and paid or funded opportunities" });
      return;
    }
    if (
      PARTNER_FUNDED_OPPORTUNITY_KINDS.includes(parsed.data.kind as typeof PARTNER_FUNDED_OPPORTUNITY_KINDS[number]) &&
      !parsed.data.cost?.trim()
    ) {
      res.status(400).json({ error: "partner opportunities must include a fee, budget, grant, or funding statement" });
      return;
    }
    if (
      PARTNER_RESOURCE_OFFER_KINDS.includes(parsed.data.kind as typeof PARTNER_RESOURCE_OFFER_KINDS[number]) &&
      !parsed.data.cost?.trim()
    ) {
      res.status(400).json({ error: "partner resource offers must include the discount or access terms" });
      return;
    }

    const [offer] = await db
      .insert(residencyOffersTable)
      .values({
        entryId: null,
        claimerEmail: session.email,
        posterName: session.displayName ?? session.email,
        posterEmail: session.email,
        kind: parsed.data.kind,
        city: parsed.data.city,
        description: parsed.data.description,
        availableFrom: parsed.data.availableFrom ?? null,
        availableTo: parsed.data.availableTo ?? null,
        availabilityMode: parsed.data.availabilityMode ?? null,
        contact: parsed.data.contact ?? session.email,
        destination: parsed.data.destination ?? null,
        cost: normalizedCost ?? null,
        duration: parsed.data.duration ?? null,
        skillShareMode: parsed.data.kind === "skill_share" ? parsed.data.skillShareMode ?? null : null,
        requestedReturn: parsed.data.kind === "skill_share" && parsed.data.skillShareMode === "swap"
          ? parsed.data.requestedReturn?.trim() || null
          : null,
        virtualAvailable: parsed.data.kind === "skill_share" && parsed.data.virtualAvailable === true,
        capacity: parsed.data.capacity ?? null,
        tags: withoutResidentTag(parsed.data.tags),
        photos: parsed.data.photos ?? [],
        publicPhotos: (parsed.data.publicPhotos ?? []).filter((photo: string) => (parsed.data.photos ?? []).includes(photo)),
         visibility: parsed.data.visibility ?? "public",
         isActive: true,
      })
      .returning();

    res.status(201).json({
      ...offer,
      entryName: session.displayName ?? session.email,
      entryKind: null,
    });
    return;
  }

  if (!session.entryId) {
    res.status(400).json({ error: "session not linked to an entry" });
    return;
  }

  const [entry] = await db
    .select({ name: entriesTable.name, kind: entriesTable.kind })
    .from(entriesTable)
    .where(eq(entriesTable.id, session.entryId));

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const [offer] = await db
    .insert(residencyOffersTable)
    .values({
      entryId: session.entryId,
      claimerEmail: session.email,
      kind: parsed.data.kind,
      city: parsed.data.city,
      description: parsed.data.description,
      availableFrom: parsed.data.availableFrom ?? null,
      availableTo: parsed.data.availableTo ?? null,
      availabilityMode: parsed.data.availabilityMode ?? null,
      contact: parsed.data.contact ?? null,
      destination: parsed.data.destination ?? null,
       cost: normalizedCost ?? null,
      duration: parsed.data.duration ?? null,
      skillShareMode: parsed.data.kind === "skill_share" ? parsed.data.skillShareMode ?? null : null,
      requestedReturn: parsed.data.kind === "skill_share" && parsed.data.skillShareMode === "swap"
        ? parsed.data.requestedReturn?.trim() || null
        : null,
      virtualAvailable: parsed.data.kind === "skill_share" && parsed.data.virtualAvailable === true,
      capacity: parsed.data.capacity ?? null,
      tags: withoutResidentTag(parsed.data.tags),
      photos: parsed.data.photos ?? [],
      publicPhotos: parsed.data.publicPhotos ?? [],
        visibility: parsed.data.visibility ?? "public",
       isActive: true,
    })
    .returning();

  res.status(201).json({ ...offer, entryName: entry.name, entryKind: entry.kind });
});

// Only short-term sublets expire automatically. Other offers stay live until
// their owner removes them, even if they are old or have a past creation date.
export async function expireStaleListings(): Promise<{ deactivated: number; ids: number[] }> {
  const activeOffers = await db
    .select({
      id: residencyOffersTable.id,
      kind: residencyOffersTable.kind,
      duration: residencyOffersTable.duration,
      availableTo: residencyOffersTable.availableTo,
    })
    .from(residencyOffersTable)
    .where(eq(residencyOffersTable.isActive, true));

  const expiredIds = activeOffers
    .filter((offer) => shouldExpireByAvailability(offer, new Date()))
    .map((offer) => offer.id);
  if (expiredIds.length === 0) return { deactivated: 0, ids: [] };

  const expired = await db
    .update(residencyOffersTable)
    .set({ isActive: false })
    .where(
      and(
        eq(residencyOffersTable.isActive, true),
        inArray(residencyOffersTable.id, expiredIds),
      ),
    )
    .returning({ id: residencyOffersTable.id });

  return { deactivated: expired.length, ids: expired.map((r) => r.id) };
}

// POST /api/admin/residency/expire — deactivate short-term sublets after their availability ends
router.post("/admin/residency/expire", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await expireStaleListings();
  res.json(result);
});

// POST /api/admin/residency/:id/restore — reactivate one intentionally selected listing
router.post("/admin/residency/:id/restore", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [offer] = await db
    .select({ id: residencyOffersTable.id, isActive: residencyOffersTable.isActive })
    .from(residencyOffersTable)
    .where(eq(residencyOffersTable.id, id));
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }
  if (offer.isActive) {
    res.status(409).json({ error: "Offer is already active" });
    return;
  }

  const [restored] = await db
    .update(residencyOffersTable)
    .set({ isActive: true })
    .where(and(eq(residencyOffersTable.id, id), eq(residencyOffersTable.isActive, false)))
    .returning();

  if (!restored) {
    res.status(409).json({ error: "Offer could not be restored" });
    return;
  }

  req.log.info({ offerId: id }, "Residency listing restored by admin");
  res.json(restored);
});

// PATCH /api/residency/:id — artist edits their own listing
router.patch("/residency/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const now = new Date();
  const session = await resolveClaimSession(req.headers.authorization ?? "", now);
  if (!session) { res.status(401).json({ error: "Valid claim session required" }); return; }

  const [offer] = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.id, id));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (!isOfferOwner(offer, session)) { res.status(403).json({ error: "Not your offer" }); return; }
  if (session.accountRole === "partner_poster" && !session.isApproved && !session.canPostPartnerOffers) {
    res.status(403).json({ error: "partner account approval is required before publishing" });
    return;
  }
  const { city, description, availableFrom, availableTo, availabilityMode, contact, destination, cost, duration, skillShareMode, requestedReturn, virtualAvailable, capacity, tags, photos, publicPhotos, visibility } = req.body as {
    city?: string;
    description?: string;
    availableFrom?: string | null;
    availableTo?: string | null;
    availabilityMode?: "dates" | "flexible" | null;
    contact?: string | null;
    destination?: string | null;
    cost?: string | null;
    duration?: string | null;
    skillShareMode?: "swap" | null;
    requestedReturn?: string | null;
    virtualAvailable?: boolean;
    capacity?: string | null;
    tags?: string[];
    photos?: string[];
    publicPhotos?: string[];
    visibility?: "public" | "network" | "private";
  };

  const existingResident = hasTag(offer.tags, EXCHANGE_RESIDENCY_RESIDENT_TAG);
  const nextTags = tags === undefined
    ? offer.tags ?? []
    : [...withoutResidentTag(tags), ...(existingResident ? [EXCHANGE_RESIDENCY_RESIDENT_TAG] : [])];
  const normalizedNextCost = normalizeExchangeOfferCost(
    offer.kind,
    nextTags,
    cost === undefined ? offer.cost : cost?.trim() || null,
  );
  const isNoCostExchange = isNoCostExchangeArrangement(offer.kind, nextTags);
  const nextCost = normalizedNextCost;
  const nextDescription = description === undefined ? offer.description : description.trim();
  const nextHiringParty = destination === undefined ? offer.destination : destination?.trim() || null;
  const nextAvailabilityMode = availabilityMode === undefined ? offer.availabilityMode : availabilityMode;
  const nextAvailableFrom = availableFrom === undefined ? offer.availableFrom : availableFrom;
  const nextAvailableTo = availableTo === undefined ? offer.availableTo : availableTo;
  const availabilityError = validateRoomSwapAvailability(
    offer.kind,
    nextAvailabilityMode,
    nextAvailableFrom,
    nextAvailableTo,
  );
  if (availabilityError) { res.status(400).json({ error: availabilityError }); return; }
  const nextSkillShareMode = skillShareMode === undefined ? offer.skillShareMode : skillShareMode;
  const nextRequestedReturn = requestedReturn === undefined ? offer.requestedReturn : requestedReturn;
  const nextVirtualAvailable = virtualAvailable === undefined ? offer.virtualAvailable : virtualAvailable;
  const skillShareError = validateSkillShareTerms(offer.kind, nextSkillShareMode, nextRequestedReturn, nextDescription);
  if (skillShareError) { res.status(400).json({ error: skillShareError }); return; }
  const spaceTermsError = validateSpaceListingTerms(offer.kind, nextCost);
  if (spaceTermsError) { res.status(400).json({ error: spaceTermsError }); return; }
  if (
    hasPartnerOfferPostingAccess(session) &&
    PARTNER_FUNDED_OPPORTUNITY_KINDS.includes(offer.kind as typeof PARTNER_FUNDED_OPPORTUNITY_KINDS[number]) &&
    !nextCost
  ) {
    res.status(400).json({ error: "partner opportunities must include a fee, budget, grant, or funding statement" });
    return;
  }
  const advertOnlyError = validateAdvertOnlyOpportunityPost({ kind: offer.kind });
  if (advertOnlyError) {
    res.status(400).json({ error: advertOnlyError });
    return;
  }
  if (
    hasPartnerOfferPostingAccess(session) &&
    PARTNER_RESOURCE_OFFER_KINDS.includes(offer.kind as typeof PARTNER_RESOURCE_OFFER_KINDS[number]) &&
    !nextCost
  ) {
    res.status(400).json({ error: "partner resource offers must include the discount or access terms" });
    return;
  }

  if (ROOM_SWAP_KINDS.includes(offer.kind as typeof ROOM_SWAP_KINDS[number])) {
    const nextValue = (incoming: string | null | undefined, existing: string | null) =>
      incoming === undefined ? (existing ?? "") : (incoming?.trim() ?? "");
    const requiredValues = [
      ["availabilityMode", nextAvailabilityMode ?? ""],
      ["cost", offer.kind === "swap" || offer.kind === "skill_share" ? "free" : nextValue(cost, offer.cost)],
      ["duration", nextValue(duration, offer.duration)],
      ["capacity", nextValue(capacity, offer.capacity)],
    ] as const;
    const missing = requiredValues.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
      res.status(400).json({ error: `room swap listings require: ${missing.join(", ")}` });
      return;
    }
  }

  const nextPhotos = photos ?? offer.photos ?? [];
  const nextPublicPhotos = publicPhotos ?? (offer.publicPhotos ?? []).filter((photo) => nextPhotos.includes(photo));
  if (nextPublicPhotos.some((photo) => !nextPhotos.includes(photo))) {
    res.status(400).json({ error: "public photos must be selected from this listing's uploaded photos" });
    return;
  }
  const campaignError = validateExchangeResidencyPost({
    kind: offer.kind,
    tags: nextTags,
    photos: nextPhotos,
    availableFrom: availableFrom === undefined ? offer.availableFrom : availableFrom,
    availableTo: availableTo === undefined ? offer.availableTo : availableTo,
  });
  if (campaignError) {
    res.status(400).json({ error: campaignError });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (city !== undefined) updates.city = city.trim();
  if (description !== undefined) updates.description = description.trim();
  if (availableFrom !== undefined) updates.availableFrom = availableFrom?.trim() || null;
  if (availableTo !== undefined) updates.availableTo = availableTo?.trim() || null;
  if (availabilityMode !== undefined) updates.availabilityMode = availabilityMode || null;
  if (contact !== undefined) updates.contact = contact?.trim() || null;
  if (destination !== undefined) updates.destination = destination?.trim() || null;
  if (cost !== undefined || isNoCostExchange) updates.cost = nextCost;
  if (duration !== undefined) updates.duration = duration?.trim() || null;
  if (offer.kind === "skill_share") {
    updates.skillShareMode = nextSkillShareMode;
    updates.requestedReturn = nextSkillShareMode === "swap" ? nextRequestedReturn?.trim() || null : null;
    updates.virtualAvailable = nextVirtualAvailable === true;
  }
  if (capacity !== undefined) updates.capacity = capacity?.trim() || null;
  if (tags !== undefined) updates.tags = nextTags;
  if (photos !== undefined) updates.photos = photos;
  if (photos !== undefined || publicPhotos !== undefined) updates.publicPhotos = nextPublicPhotos;
  if (visibility !== undefined) {
    if (!["public", "network", "private"].includes(visibility)) {
      res.status(400).json({ error: "visibility must be public, network, or private" });
      return;
    }
      updates.visibility = visibility;
  }
   if (isNoCostExchange) updates.cost = "free";

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [entry] = await db
    .select({ name: entriesTable.name, kind: entriesTable.kind })
    .from(entriesTable)
    .where(eq(entriesTable.id, offer.entryId!));

  const [updated] = await db
    .update(residencyOffersTable)
    .set(updates)
    .where(eq(residencyOffersTable.id, id))
    .returning();

  res.json({ ...updated, entryName: entry?.name ?? null, entryKind: entry?.kind ?? null });
});

// PATCH /api/admin/residency/:id/status — admin promotes or returns an applicant
router.patch("/admin/residency/:id/status", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [offer] = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.id, id));
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }
  const resident = req.body?.resident === true;
  const currentTags = withoutResidentTag(offer.tags);
  if (resident && !hasTag(currentTags, EXCHANGE_RESIDENCY_TAG)) {
    res.status(400).json({ error: "only Exchange Residency applicants can become residents" });
    return;
  }
  const tags = resident ? [...currentTags, EXCHANGE_RESIDENCY_RESIDENT_TAG] : currentTags;
  const [updated] = await db.update(residencyOffersTable).set({ tags }).where(eq(residencyOffersTable.id, id)).returning();
  res.json(updated);
});

// POST /api/residency/:id/renew — artist refreshes their listing for another 30 days
router.post("/residency/:id/renew", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const now = new Date();
  const session = await resolveClaimSession(req.headers.authorization ?? "", now);
  if (!session) { res.status(401).json({ error: "Valid claim session required" }); return; }

  const [offer] = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.id, id));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (offer.claimerEmail !== session.email) { res.status(403).json({ error: "Not your offer" }); return; }

  const [updated] = await db
    .update(residencyOffersTable)
    .set({ renewedAt: now, isActive: true })
    .where(eq(residencyOffersTable.id, id))
    .returning();

  res.json(updated);
});

// DELETE /api/admin/residency/:id — admin delete any listing
router.delete("/admin/residency/:id", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [offer] = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.id, id));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  await db
    .update(residencyOffersTable)
    .set({ isActive: false })
    .where(and(eq(residencyOffersTable.id, id), eq(residencyOffersTable.isActive, true)));
  res.status(204).end();
});

router.delete("/residency/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const now = new Date();
  const session = await resolveClaimSession(req.headers.authorization ?? "", now);
  if (!session) { res.status(401).json({ error: "Valid claim session required" }); return; }

  const [offer] = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.id, id));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (!isOfferOwner(offer, session)) { res.status(401).json({ error: "Not your offer" }); return; }

  await db
    .update(residencyOffersTable)
    .set({ isActive: false })
    .where(and(eq(residencyOffersTable.id, id), eq(residencyOffersTable.isActive, true)));
  res.status(204).end();
});

// POST /api/admin/residency/fix-photo-urls — one-time migration to correct broken photo URL paths
// Broken format: /api/storage/<bucket-id>/private/uploads/<UUID>  (stored before the normalizeObjectEntityPath fix)
// Correct format: /objects/uploads/<UUID>
router.post("/admin/residency/fix-photo-urls", async (req, res): Promise<void> => {
  const adminPwd = req.headers["x-admin-password"];
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fetch all rows that have at least one photo (photos is a text[] column)
  const rows = await db
    .select({ id: residencyOffersTable.id, photos: residencyOffersTable.photos })
    .from(residencyOffersTable)
    .where(sql`cardinality(${residencyOffersTable.photos}) > 0`);

  let rowsUpdated = 0;
  let urlsFixed = 0;

  for (const row of rows) {
    const photos = (row.photos ?? []) as string[];
    let changed = false;

    const fixed = photos.map((url) => {
      // Only fix paths that start with /api/storage/ but don't already have /objects/
      if (url.startsWith("/api/storage/") && !url.includes("/objects/")) {
        // Extract the uploads/<UUID> portion — everything from /uploads/ onward
        const uploadsIdx = url.indexOf("/uploads/");
        if (uploadsIdx !== -1) {
          const entityId = url.slice(uploadsIdx + 1); // "uploads/<UUID>"
          changed = true;
          urlsFixed++;
          return `/objects/${entityId}`;
        }
      }
      return url;
    });

    if (changed) {
      await db
        .update(residencyOffersTable)
        .set({ photos: fixed })
        .where(eq(residencyOffersTable.id, row.id));
      rowsUpdated++;
    }
  }

  res.json({ rowsScanned: rows.length, rowsUpdated, urlsFixed });
});

export default router;
