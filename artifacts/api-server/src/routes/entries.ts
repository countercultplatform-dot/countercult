import { Router, type IRouter } from "express";
import {
  ListEntryPinsResponse,
  ListEntriesResponse,
  ListPublicArtistCardsResponse,
  ListPublicVoicesResponse,
  GetEntryResponse,
  CreateEntryBody,
  CreateSpaceSuggestionBody,
} from "@workspace/api-zod";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";
import { sendWithCollectiveFundFooter } from "../lib/emailCampaignFooter";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { optionalAuth, requireAuth, requireApproved } from "../middleware/requireAuth";
import { z } from "zod/v4";
import { eq, desc, and, gt, ilike, sql, or, ne, isNull, isNotNull, count } from "drizzle-orm";
import { db, entriesTable, entryRatingsTable, entryCommentsTable, magicLinkTokensTable, entrySubscriptionsTable, spaceEnquiriesTable, usersTable } from "@workspace/db";
import { deriveSpaceClassification, effectiveSpaceClassification, isCanonicalEntryOwner } from "../lib/spaceClassification";
import { getPublicOpenTo, isOfferingChoice, normalizeOfferingChoice, parseOfferings } from "@workspace/profile-choices";
import type { WebsitePreview } from "@workspace/db";
import { scheduleWebsitePreviewFetch } from "../lib/websitePreview";


const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function isOwner(entry: { contactEmail?: string | null; claimedEmail?: string | null }, email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return [entry.contactEmail, entry.claimedEmail]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.trim().toLowerCase() === normalized);
}

const publicProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many public profile requests — try again later" },
  store: new PgRateLimitStore("public-profile:"),
});

const spaceSuggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many space suggestions — try again later" },
  store: new PgRateLimitStore("public-space-suggestion:"),
});

type SpaceSuggestionIdentity = {
  name: string;
  city: string;
  country: string;
};

type SpaceSuggestionDuplicateCandidate = Pick<
  typeof entriesTable.$inferSelect,
  "id" | "name" | "city" | "country"
>;

function normalizePlaceText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/ß/gi, "ss")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findDuplicateSpaceSuggestion(
  candidates: SpaceSuggestionDuplicateCandidate[],
  suggestion: SpaceSuggestionIdentity,
): SpaceSuggestionDuplicateCandidate | undefined {
  const name = normalizePlaceText(suggestion.name);
  const city = normalizePlaceText(suggestion.city);
  const country = normalizePlaceText(suggestion.country);

  return candidates.find((candidate) => {
    const sameName = normalizePlaceText(candidate.name) === name;
    if (!sameName) return false;

    const sameCityAndCountry = normalizePlaceText(candidate.city) === city
      && normalizePlaceText(candidate.country) === country;
    return sameCityAndCountry;
  });
}

function getSpaceSuggestionLockKeys(suggestion: SpaceSuggestionIdentity): string[] {
  const name = normalizePlaceText(suggestion.name);
  const city = normalizePlaceText(suggestion.city);
  const country = normalizePlaceText(suggestion.country);

  return [`space-name-location:${name}:${city}:${country}`].sort();
}

const PUBLIC_COORDINATE_OFFSET_DEGREES = 0.025;

function stablePublicCoordinateOffset(id: number, axis: "lat" | "lng"): number {
  const secret = process.env.SESSION_SECRET ?? "countercult-public-map-v1";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${id}:${axis}`)
    .digest();
  const ratio = digest.readUInt32BE(0) / 0xffffffff;
  return (ratio * 2 - 1) * PUBLIC_COORDINATE_OFFSET_DEGREES;
}

function roundPublicCoordinate(value: number, original: number, offset: number, wrapLongitude = false): number {
  const normalize = (candidate: number) => wrapLongitude
    ? (((candidate + 180) % 360) + 360) % 360 - 180
    : Math.max(-90, Math.min(90, candidate));
  const rounded = Number(normalize(value).toFixed(3));
  if (rounded !== original) return rounded;

  // Keep the published, three-decimal coordinate different from the private
  // coordinate even when a small offset rounds back to the original value.
  const direction = offset >= 0 ? 0.001 : -0.001;
  const fallback = Number(normalize(original + direction).toFixed(3));
  if (fallback !== original) return fallback;
  return Number(normalize(original - direction).toFixed(3));
}

function approximatePublicCoordinates(
  id: number,
  lat: number | null,
  lng: number | null,
): { lat: number | null; lng: number | null } {
  if (lat == null || lng == null) return { lat, lng };
  const latOffset = stablePublicCoordinateOffset(id, "lat");
  const lngOffset = stablePublicCoordinateOffset(id, "lng");
  return {
    lat: roundPublicCoordinate(lat + latOffset, lat, latOffset),
    lng: roundPublicCoordinate(lng + lngOffset, lng, lngOffset, true),
  };
}

const publicEntryResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.enum(["artist", "space", "artifact"]),
  secondaryKind: z.enum(["artist", "space", "artifact"]).nullable().optional(),
  tags: z.array(z.string()),
  subcultures: z.array(z.string()),
  city: z.string(),
  country: z.string(),
  postal: z.null(),
  address: z.null(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  blurb: z.string().nullable(),
  url: z.string().nullable(),
  heroPhoto: z.string().nullable(),
  portfolioPhotos: z.array(z.string()),
  isClaimed: z.boolean(),
  isCommunitySubmitted: z.boolean(),
  claimRequestAvailable: z.boolean(),
  hasContactEmail: z.boolean(),
  websitePreview: z.object({
    sourceUrl: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    fetchedAt: z.string().datetime(),
  }).nullable(),
  externalLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
  experiences: z.array(z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  })),
  shopUrl: z.string().nullable(),
  offerings: z.string().nullable(),
  basedIn: z.array(z.string()),
  openTo: z.array(z.string()),
});

function sanitizePublicEntry(entry: {
  id: number;
  name: string;
  kind: string;
  secondaryKind: string | null;
  tags: string[];
  subcultures: string[];
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  blurb: string | null;
  url: string | null;
  heroPhoto: string | null;
  portfolioPhotos: string[];
  isClaimed: boolean;
  isCommunitySubmitted: boolean;
  submittedBy: string | null;
  contactEmail: string | null;
  externalLinks: { platform: string; url: string }[] | null;
  experiences: { title?: string; description?: string; date?: string | null; location?: string | null; url?: string | null }[] | null;
  shopUrl: string | null;
  offerings: string | null;
  basedIn: string[];
  openTo: string[];
  websitePreview: WebsitePreview | null;
}) {
  const coordinates = approximatePublicCoordinates(entry.id, entry.lat, entry.lng);
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    secondaryKind: entry.secondaryKind,
    tags: entry.tags ?? [],
    subcultures: entry.subcultures ?? [],
    city: entry.city,
    country: entry.country,
    address: null,
    postal: null,
    lat: coordinates.lat,
    lng: coordinates.lng,
    blurb: entry.blurb,
    url: entry.url,
    heroPhoto: entry.heroPhoto,
    portfolioPhotos: entry.portfolioPhotos ?? [],
    isClaimed: entry.isClaimed,
    isCommunitySubmitted: entry.isCommunitySubmitted,
    claimRequestAvailable: !entry.isClaimed && (entry.isCommunitySubmitted || (!entry.submittedBy && !entry.contactEmail?.trim())),
    hasContactEmail: Boolean(entry.contactEmail?.trim()),
    externalLinks: entry.externalLinks ?? [],
    experiences: (entry.experiences ?? []).map((experience) => ({
      title: experience.title ?? "",
      description: experience.description ?? "",
      date: experience.date ?? null,
      location: experience.location ?? null,
      url: experience.url ?? null,
    })),
    shopUrl: entry.shopUrl,
    offerings: entry.offerings,
    basedIn: entry.basedIn ?? [],
    openTo: entry.openTo ?? [],
    websitePreview: entry.websitePreview?.sourceUrl === entry.url ? entry.websitePreview : null,
  };
}

const publicEntrySelect = {
  id: entriesTable.id,
  name: entriesTable.name,
  kind: entriesTable.kind,
  secondaryKind: entriesTable.secondaryKind,
  tags: entriesTable.tags,
  subcultures: entriesTable.subcultures,
  city: entriesTable.city,
  country: entriesTable.country,
  lat: entriesTable.lat,
  lng: entriesTable.lng,
  blurb: entriesTable.blurb,
  url: entriesTable.url,
  heroPhoto: entriesTable.heroPhoto,
  portfolioPhotos: entriesTable.portfolioPhotos,
  isClaimed: entriesTable.isClaimed,
  isCommunitySubmitted: entriesTable.isCommunitySubmitted,
  externalLinks: entriesTable.externalLinks,
  experiences: entriesTable.experiences,
  shopUrl: entriesTable.shopUrl,
  offerings: entriesTable.offerings,
  basedIn: entriesTable.basedIn,
  openTo: entriesTable.openTo,
  status: entriesTable.status,
  isApproved: entriesTable.isApproved,
  isHidden: entriesTable.isHidden,
  visibility: entriesTable.visibility,
  deletedAt: entriesTable.deletedAt,
};

async function isApprovedNetworkViewer(req: { headers: { authorization?: string } }): Promise<boolean> {
  const session = (req as any).ccSession;
  if (!session || session.accountRole === "partner_poster") return false;
  const [user] = await db
    .select({ isApproved: usersTable.isApproved, accountRole: usersTable.accountRole })
    .from(usersTable)
    .where(eq(usersTable.email, session.email))
    .limit(1);
  return user?.isApproved === true && user.accountRole !== "partner_poster";
}

async function canViewEntry(
  req: { headers: { authorization?: string } },
  entry: {
    kind: string;
    status: string;
    isApproved: boolean;
    isHidden: boolean;
    visibility: string;
    deletedAt: Date | null;
  },
): Promise<boolean> {
  if (
    entry.status !== "published"
    || !entry.isApproved
    || entry.isHidden
    || entry.deletedAt !== null
    || (entry.visibility !== "public" && entry.visibility !== "network")
  ) {
    return false;
  }

  if (entry.visibility === "network" || entry.kind === "artist") {
    return isApprovedNetworkViewer(req);
  }
  return true;
}

async function canViewEntryId(
  req: { headers: { authorization?: string } },
  id: number,
): Promise<boolean> {
  const [entry] = await db
    .select({
      kind: entriesTable.kind,
      status: entriesTable.status,
      isApproved: entriesTable.isApproved,
      isHidden: entriesTable.isHidden,
      visibility: entriesTable.visibility,
      deletedAt: entriesTable.deletedAt,
    })
    .from(entriesTable)
    .where(eq(entriesTable.id, id))
    .limit(1);
  return entry ? canViewEntry(req, entry) : false;
}

/** Random offset ±maxDeg (≈ maxDeg×111 km) */
function jitter(maxDeg: number) {
  return (Math.random() * 2 - 1) * maxDeg;
}

/** Normalize tags to canonical forms so variants don't pollute the tag space */
const TAG_ALIASES: Record<string, string> = {
  // residency
  "art residency": "residency",
  "artist residency": "residency",
  "music residency": "residency",
  "residencies": "residency",
  "artist in residence": "residency",
  "residdency": "residency",
  // installation
  "installation art": "installation",
  "art installation": "installation",
  "installations": "installation",
  // performance
  "performance art": "performance",
  "live performance": "performance",
  "performances": "performance",
  // open call
  "open calls": "open call",
  "call for artists": "open call",
  "call for entries": "open call",
  "calls for submissions": "open call",
  // collective
  "art collective": "collective",
  "artist collective": "collective",
  "collectives": "collective",
  // label / studio
  "record label": "label",
  "music label": "label",
  "recording studio": "studio",
  "art studio": "studio",
  // festival
  "music festival": "festival",
  "art festival": "festival",
  "festivals": "festival",
  // electronic / club
  "electronic music": "electronic",
  "electronica": "electronic",
  "club music": "club",
  "clubbing": "club",
  // experimental
  "experimental music": "experimental",
  "experimental art": "experimental",
  // community
  "community art": "community",
  "community space": "community",
  // contemporary
  "contemporary art": "contemporary",
  "contemporary music": "contemporary",
  // hip hop
  "hiphop": "hip hop",
  "hip-hop": "hip hop",
  "rap": "hip hop",
  // jazz
  "jazz music": "jazz",
  // photography
  "photography": "photography",
  "photo": "photography",
};

function normalizeTags(tags: string[]): string[] {
  return tags.map((t) => {
    const lower = t.toLowerCase().trim();
    return TAG_ALIASES[lower] ?? lower;
  });
}

/** Send curator selection email when a new pin is created for someone */
async function sendCuratorEmail(to: string, entryName: string, entryId: number): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info({ to, entryName }, "RESEND_API_KEY not set — curator email skipped (dev mode)");
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const entryUrl = `https://countercultcreatives.com/entries/${entryId}`;
  await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from: "CounterCult <hello@countercult.network>",
    to,
    subject: `You've been selected for CounterCult's Culture Explorer`,
    html: `
      <div style="font-family:monospace;background:#000;color:#f3efe7;padding:32px;max-width:520px">
        <div style="color:#c6ff3d;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px">countercult creatives</div>
        <h1 style="font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;line-height:1.2">
          you've been selected.
        </h1>
        <p style="font-size:14px;line-height:1.7;color:#f3efe7;margin:0 0 12px">
          one of our curators has added <strong style="color:#c6ff3d">${entryName}</strong> to the CounterCult Culture Explorer — our underground and local culture network mapping artists, spaces, and artifacts across the globe.
        </p>
        <p style="font-size:13px;color:#888;line-height:1.6;margin:0 0 24px">
          your profile is live on the map. sign in to add your bio, photos, and links — or contact us if you'd rather not be listed.
        </p>
        <a href="${entryUrl}" style="display:inline-block;background:#c6ff3d;color:#000;font-weight:bold;text-transform:uppercase;letter-spacing:2px;font-size:12px;padding:12px 24px;text-decoration:none;border:2px solid #c6ff3d;">
          view your profile →
        </a>
        <hr style="border:1px solid #222;margin:28px 0"/>
        <p style="font-size:10px;color:#555;margin:0">
          CounterCult Creatives · <a href="https://countercultcreatives.com" style="color:#c6ff3d">countercultcreatives.com</a><br/>
          <a href="mailto:hello@countercult.network" style="color:#666">hello@countercult.network</a>
        </p>
      </div>
    `,
  });
}

router.get("/entries/pins", optionalAuth, publicProfileLimiter, async (req, res): Promise<void> => {
  req.log.info("Listing entry pins");
  const isApprovedMember = await isApprovedNetworkViewer(req);
  res.vary("Authorization");
  res.setHeader(
    "Cache-Control",
    isApprovedMember ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120",
  );
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      lat: entriesTable.lat,
      lng: entriesTable.lng,
      kind: entriesTable.kind,
      secondaryKind: entriesTable.secondaryKind,
      city: entriesTable.city,
      country: entriesTable.country,
      tags: entriesTable.tags,
      heroPhoto: entriesTable.heroPhoto,
      publicProfileConsentAt: entriesTable.publicProfileConsentAt,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      isApprovedMember
        ? or(eq(entriesTable.visibility, "public"), eq(entriesTable.visibility, "network"))
        : or(
          and(eq(entriesTable.visibility, "public"), ne(entriesTable.kind, "artist")),
          and(
            eq(entriesTable.kind, "artist"),
            eq(entriesTable.visibility, "public"),
          ),
        ),
      eq(entriesTable.mapEligible, true),
      isNull(entriesTable.deletedAt),
    ));
  const pins = rows
    .filter((r) => r.lat != null && r.lng != null)
      .map((row) => {
        const coordinates = approximatePublicCoordinates(row.id, row.lat, row.lng);
        if (row.kind !== "artist") {
          return {
            id: row.id,
            ...coordinates,
            kind: row.kind,
            secondaryKind: row.secondaryKind,
          };
        }

        return {
          id: row.id,
          ...coordinates,
          kind: row.kind,
          secondaryKind: row.secondaryKind,
          name: row.name,
          city: row.city,
          country: row.country,
          tags: row.tags ?? [],
          ...(
            isApprovedMember || row.publicProfileConsentAt
              ? { heroPhoto: row.heroPhoto }
              : {}
          ),
          isProfilePreview: !isApprovedMember,
        };
      });
  res.json(ListEntryPinsResponse.parse(pins));
});

router.get("/entries", optionalAuth, publicProfileLimiter, async (req, res): Promise<void> => {
  req.log.info("Listing entry summaries");
  const isApprovedMember = await isApprovedNetworkViewer(req);
  res.vary("Authorization");
  res.setHeader(
    "Cache-Control",
    isApprovedMember ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120",
  );
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      kind: entriesTable.kind,
      secondaryKind: entriesTable.secondaryKind,
      tags: entriesTable.tags,
      openTo: entriesTable.openTo,
      basedIn: entriesTable.basedIn,
      city: entriesTable.city,
      country: entriesTable.country,
      isClaimed: entriesTable.isClaimed,
      isCommunitySubmitted: entriesTable.isCommunitySubmitted,
      contactEmail: entriesTable.contactEmail,
      heroPhoto: entriesTable.heroPhoto,
      lat: entriesTable.lat,
      lng: entriesTable.lng,
      shopUrl: entriesTable.shopUrl,
      url: entriesTable.url,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      isApprovedMember
        ? or(eq(entriesTable.visibility, "public"), eq(entriesTable.visibility, "network"))
        : and(eq(entriesTable.visibility, "public"), ne(entriesTable.kind, "artist")),
      isNull(entriesTable.deletedAt),
    ))
    .orderBy(desc(entriesTable.createdAt));
  res.json(ListEntriesResponse.parse(rows.map(({ contactEmail, ...row }) => ({
    ...row,
    basedIn: row.basedIn ?? [],
    hasContactEmail: Boolean(contactEmail?.trim()),
    ...approximatePublicCoordinates(row.id, row.lat, row.lng),
  }))));
});

router.get("/entries/network", requireAuth, requireApproved, async (req, res): Promise<void> => {
  if (!(await isApprovedNetworkViewer(req))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(403).json({ error: "approved network access required" });
    return;
  }
  req.log.info("Listing approved member directory");
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      kind: entriesTable.kind,
      tags: entriesTable.tags,
      openTo: entriesTable.openTo,
      city: entriesTable.city,
      country: entriesTable.country,
      heroPhoto: entriesTable.heroPhoto,
      isClaimed: entriesTable.isClaimed,
      lat: entriesTable.lat,
      lng: entriesTable.lng,
      shopUrl: entriesTable.shopUrl,
      url: entriesTable.url,
      visibility: entriesTable.visibility,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      or(eq(entriesTable.visibility, "public"), eq(entriesTable.visibility, "network")),
      isNull(entriesTable.deletedAt),
    ))
    .orderBy(desc(entriesTable.createdAt));
  res.setHeader("Cache-Control", "private, no-store");
  res.json(rows.map((row) => ({
    ...row,
    ...approximatePublicCoordinates(row.id, row.lat, row.lng),
    tags: row.tags ?? [],
    openTo: row.openTo ?? [],
  })));
});

router.get("/entries/voices", publicProfileLimiter, async (req, res): Promise<void> => {
  req.log.info("Listing approved public voices");
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      kind: entriesTable.kind,
      city: entriesTable.city,
      country: entriesTable.country,
      isFeatured: entriesTable.isFeatured,
      isVoiceFeatured: entriesTable.isVoiceFeatured,
      isClaimed: entriesTable.isClaimed,
      heroPhoto: entriesTable.heroPhoto,
      url: entriesTable.url,
      tags: entriesTable.tags,
      joinReason: entriesTable.joinReason,
      createdAt: entriesTable.createdAt,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      eq(entriesTable.visibility, "public"),
      isNull(entriesTable.deletedAt),
      isNotNull(entriesTable.joinReason),
    ))
  const rankedRows = rows
    .filter((row) => Boolean(row.joinReason?.trim()) && (row.kind !== "artist" || row.isVoiceFeatured))
    .sort((a, b) => {
      const score = (row: typeof a) => {
        const reasonLength = row.joinReason?.trim().length ?? 0;
        return (
          (row.isVoiceFeatured ? 1000 : 0) +
          (row.isClaimed ? 20 : 0) +
          (row.heroPhoto ? 10 : 0) +
          (row.url ? 5 : 0) +
          (row.tags.length > 0 ? 2 : 0) +
          Math.min(reasonLength, 240) / 24
        );
      };
      return score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 12)
    .map(({ id, name, kind, city, country, joinReason }) => ({
      id,
      name,
      kind,
      city,
      country,
      joinReason: joinReason!.trim(),
    }));

  res.json(ListPublicVoicesResponse.parse(rankedRows));
});

router.get("/entries/site-cards", publicProfileLimiter, async (req, res): Promise<void> => {
  req.log.info("Listing consented public artist cards");
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      kind: entriesTable.kind,
      city: entriesTable.city,
      country: entriesTable.country,
      tags: entriesTable.tags,
      heroPhoto: entriesTable.heroPhoto,
      openTo: entriesTable.openTo,
      offerings: entriesTable.offerings,
    })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.kind, "artist"),
      eq(entriesTable.status, "published"),
      eq(entriesTable.isApproved, true),
      eq(entriesTable.isHidden, false),
      eq(entriesTable.visibility, "public"),
      isNull(entriesTable.deletedAt),
      isNotNull(entriesTable.publicProfileConsentAt),
    ));

  res.json(ListPublicArtistCardsResponse.parse(rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    city: row.city,
    country: row.country,
    tags: row.tags ?? [],
    heroPhoto: row.heroPhoto,
    openTo: getPublicOpenTo(row.openTo ?? []),
    offeringChoices: parseOfferings(row.offerings).choices,
  }))));
});

router.get("/entries/:id", optionalAuth, publicProfileLimiter, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));

  const [aggregate] = await db.select({ enquiries: count() }).from(spaceEnquiriesTable).where(eq(spaceEnquiriesTable.entryId, id));
  res.vary("Authorization");
  if (!entry) {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  const canView = await canViewEntry(req, entry);
  const websitePreviewPending = Boolean(entry.url) && entry.websitePreview?.sourceUrl !== entry.url;
  res.setHeader(
    "Cache-Control",
    canView && entry.kind !== "artist" && !req.headers.authorization && !websitePreviewPending
      ? "public, max-age=30, stale-while-revalidate=120"
      : "private, no-store",
  );
  if (!canView) {
    res.status(404).json({ error: "Entry not found" }); return;
  }

  if (entry.url && entry.websitePreview?.sourceUrl !== entry.url) {
    scheduleWebsitePreviewFetch(entry.id, entry.url);
  }
  res.json(publicEntryResponseSchema.parse(sanitizePublicEntry(entry)));
});

/** Authenticated owner view for the profile editor, including paused/network profiles. */
router.get("/entries/:id/profile", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));

  const [aggregate] = await db.select({ enquiries: count() }).from(spaceEnquiriesTable).where(eq(spaceEnquiriesTable.entryId, id));
  const session = (req as any).ccSession;
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  const owns = isCanonicalEntryOwner(entry, session.email);
  if (!owns) { res.status(403).json({ error: "not authorized to view this profile" }); return; }
  res.json(entry);
});

// POST /entries/:id/view — increment view count (fire-and-forget from client)
router.post("/entries/:id/view", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(entriesTable)
    .set({ viewCount: sql`(COALESCE(view_count::bigint, 0) + 1)::text` })
    .where(eq(entriesTable.id, id));
  res.status(204).end();
});

router.post("/entries/space-suggestions", spaceSuggestionLimiter, async (req, res): Promise<void> => {
  const parsed = CreateSpaceSuggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid space suggestion" });
    return;
  }
  const data = parsed.data;
  const profileVisibility = "public";
  const offeringChoices = (data.offeringChoices ?? []).map(normalizeOfferingChoice);
  if (offeringChoices.some((choice) => !isOfferingChoice(choice))) {
    res.status(400).json({ error: "choose only from the available things this space can share" });
    return;
  }
  if (data.adultConfirmed === false) {
    res.status(400).json({ error: "Countercult submissions are for people aged 18 and over" });
    return;
  }
  if (
    data.profileVisibilityConsent === false
    || (profileVisibility === "public" && data.publicProfileConsent === false)
  ) {
    res.status(400).json({ error: "confirm the profile visibility choice before submitting" });
    return;
  }
  const suggestion: SpaceSuggestionIdentity = {
    name: data.name.trim(),
    city: data.city.trim(),
    country: data.country.trim(),
  };
  const existingSpaces = await db.select({
    id: entriesTable.id,
    name: entriesTable.name,
    city: entriesTable.city,
    country: entriesTable.country,
  })
    .from(entriesTable)
    .where(and(
      eq(entriesTable.kind, "space"),
      isNull(entriesTable.deletedAt),
    ));
  const duplicate = findDuplicateSpaceSuggestion(existingSpaces, suggestion);
  if (duplicate) {
    res.status(409).json({ error: "a likely duplicate already exists", existingId: duplicate.id, existingName: duplicate.name });
    return;
  }

  let coordinates: { lat: number; lng: number } | null = null;
  try {
    for (const placeQuery of [`${suggestion.name}, ${suggestion.city}, ${suggestion.country}`, `${suggestion.city}, ${suggestion.country}`]) {
      const query = new URLSearchParams({ q: placeQuery, format: "jsonv2", limit: "1" });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
        headers: { "User-Agent": "countercult/1.0 (contact@countercult.network)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`geocoder returned ${response.status}`);
      const results = await response.json() as Array<{ lat?: string; lon?: string }>;
      const lat = Number(results[0]?.lat);
      const lng = Number(results[0]?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        coordinates = { lat, lng };
        break;
      }
    }
  } catch (error) {
    req.log.warn({ err: error }, "Space suggestion geocoding failed");
    res.status(503).json({ error: "we could not check this address right now; try again later" });
    return;
  }
  if (!coordinates) {
    res.status(400).json({ error: "we could not find this space or city on the map; check the city and country and try again" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    for (const lockKey of getSpaceSuggestionLockKeys(suggestion)) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
    }

    const candidates = await tx.select({
      id: entriesTable.id,
      name: entriesTable.name,
      city: entriesTable.city,
      country: entriesTable.country,
    })
      .from(entriesTable)
      .where(and(
        eq(entriesTable.kind, "space"),
        isNull(entriesTable.deletedAt),
      ));
    const duplicateAfterLock = findDuplicateSpaceSuggestion(candidates, suggestion);
    if (duplicateAfterLock) return { kind: "duplicate" as const, duplicate: duplicateAfterLock };

    const [createdEntry] = await tx.insert(entriesTable).values({
      name: suggestion.name,
      kind: "space",
      city: suggestion.city,
      country: suggestion.country,
      address: null,
      lat: coordinates.lat,
      lng: coordinates.lng,
      url: data.url?.trim() || null,
      blurb: data.blurb?.trim() || null,
      tags: data.tags ?? [],
      heroPhoto: data.heroPhoto?.trim() || null,
      offerings: [
        offeringChoices.join(", "),
        data.offerings?.trim(),
      ].filter(Boolean).join("\n\n") || null,
      basedIn: data.basedIn ?? [],
      networkNextSteps: data.networkNextSteps?.trim() || null,
      discoverySource: data.discoverySource?.trim() || null,
      openTo: [],
      spaceOfferAvailable: data.spaceOfferAvailable ?? false,
      spaceOfferTypes: data.spaceOfferTypes ?? [],
      spaceOfferCategory: data.spaceOfferCategory ?? null,
      spaceOfferPricing: data.spaceOfferPricing ?? null,
      spaceOfferDetails: data.spaceOfferDetails?.trim() || null,
      visibility: profileVisibility,
      profileVisibilityConsentVersion: data.profileVisibilityConsent ? "profile-visibility-v1" : null,
      profileVisibilityConsentAt: data.profileVisibilityConsent ? new Date() : null,
      publicProfileConsentVersion: data.publicProfileConsent ? "public-profile-v1" : null,
      publicProfileConsentAt: data.publicProfileConsent ? new Date() : null,
      submittedBy: null,
      submissionRelationship: "recommends",
      isCommunitySubmitted: true,
      isClaimed: false,
      contactEmail: null,
      mapEligible: true,
      status: "pending_review",
      isApproved: false,
    }).returning({ id: entriesTable.id, name: entriesTable.name });
    return { kind: "created" as const, created: createdEntry };
  });

  if (result.kind === "duplicate") {
    res.status(409).json({
      error: "a likely duplicate already exists",
      existingId: result.duplicate.id,
      existingName: result.duplicate.name,
    });
    return;
  }

  const created = result.created;
  if (!created) {
    res.status(500).json({ error: "space suggestion could not be queued for review" });
    return;
  }

  res.status(201).json({
    id: created.id,
    name: created.name,
    isCommunitySubmitted: true,
    isClaimed: false,
    reviewRequired: true,
  });
});

router.post("/entries", async (req, res): Promise<void> => {
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "invalid input";
    res.status(400).json({ error: msg });
    return;
  }
  const data = parsed.data;
  const needsEmail = data.kind === "artist" || data.kind === "space";
  if (needsEmail && !data.contactEmail?.trim()) {
    res.status(400).json({ error: "An email address is required for artist and space submissions." });
    return;
  }
  const isForce = Boolean((req.body as Record<string, unknown>)._force);
  if (!isForce) {
    const [existing] = await db
      .select({ id: entriesTable.id, name: entriesTable.name })
      .from(entriesTable)
      .where(ilike(entriesTable.name, data.name.trim()))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "duplicate", existingId: existing.id, existingName: existing.name });
      return;
    }
  }
  let lat = data.lat ?? null;
  let lng = data.lng ?? null;
  let resolvedCity = data.city;
  let resolvedCountry = data.country ?? "";
  if ((lat == null || lng == null) && data.city) {
    try {
      const geoQuery = encodeURIComponent(`${resolvedCity}, ${resolvedCountry}`);
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=1`,
        { headers: { "User-Agent": "countercult/1.0 (contact@countercultcreatives.com)" } },
      );
      const geoData = await geoResp.json() as Array<{ lat: string; lon: string }>;
      if (geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch (geoErr) {
      req.log.warn({ err: geoErr }, "Nominatim geocoding failed");
    }
  }
  if (data.kind === "artist" && lat != null && lng != null) {
    lat += jitter(0.0045);
    lng += jitter(0.0045);
  }
  const [entry] = await db.insert(entriesTable).values({
    name: data.name,
    kind: data.kind,
    secondaryKind: data.secondaryKind ?? null,
    city: resolvedCity,
    country: resolvedCountry,
    postal: data.postal ?? null,
    address: data.kind === "space" ? (data.address ?? null) : null,
    lat,
    lng,
    blurb: data.blurb ?? null,
    url: data.url ?? null,
    tags: data.tags ?? [],
    contactEmail: data.contactEmail?.trim().toLowerCase() ?? null,
    status: "pending_review",
    isApproved: false,
  }).returning();
  if (!entry) { res.status(500).json({ error: "entry could not be created" }); return; }
  res.status(201).json(GetEntryResponse.parse({ ...entry, discoveredLinks: entry.discoveredLinks ?? [] }));
});

/**
 * PATCH /api/entries/:id/profile
 * Session-authenticated update of editable profile fields.
 */
router.patch("/entries/:id/profile", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "not authenticated" }); return; }

  const { db: _db, entriesTable: _et, magicLinkTokensTable } = await import("@workspace/db");
  const { and: _and, eq: _eq, gt: _gt } = await import("drizzle-orm");
  const now = new Date();
  const [session] = await _db
    .select()
    .from(magicLinkTokensTable)
    .where(_and(
      _eq(magicLinkTokensTable.token, token),
      _eq(magicLinkTokensTable.purpose, "session"),
      _gt(magicLinkTokensTable.expiresAt, now),
    ));
  if (!session) { res.status(401).json({ error: "invalid or expired session" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entryId = parseInt(String(req.params.id ?? ""), 10);

  const body = req.body as Record<string, unknown>;
  if (Number.isNaN(entryId)) { res.status(400).json({ error: "invalid id" }); return; }

  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, entryId));

  const [aggregate] = await db.select({ enquiries: count() }).from(spaceEnquiriesTable).where(eq(spaceEnquiriesTable.entryId, entryId));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }

  const owns = isCanonicalEntryOwner(entry, session.email);
  if (!owns) { res.status(403).json({ error: "not authorized to edit this entry" }); return; }

  const { z } = await import("zod");
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    blurb: z.string().max(600).optional(),
    heroPhoto: z.string().optional(),
    portfolioPhotos: z.array(z.string()).max(12).optional(),
    externalLinks: z.array(z.object({ platform: z.string(), url: z.string() })).max(10).optional(),
    experiences: z.array(z.object({
      title: z.string().default(""),
      description: z.string().default(""),
      date: z.string().optional(),
      location: z.string().optional(),
      url: z.string().optional(),
    })).max(20).optional(),
    url: z.string().optional(),
    shopUrl: z.string().max(300).optional(),
    offerings: z.string().max(1500).optional(),
    basedIn: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
    // Room swap & space configuration fields — all optional
    swapType: z.string().max(50).optional(),
    spacePrivacy: z.string().max(50).optional(),
    financialStructure: z.string().max(50).optional(),
    costDetails: z.string().max(200).optional(),
    durationTerms: z.string().max(200).optional(),
    vibeTags: z.string().max(500).optional(),
    dealbreakers: z.string().max(1000).optional(),
    noiseAndGuests: z.string().max(500).optional(),
    contactMethod: z.string().max(50).optional(),
    contactHandle: z.string().max(200).optional(),
    openTo: z.array(z.string().max(100)).max(20).optional(),
    spaceOfferAvailable: z.boolean().optional(),
    spaceOfferTypes: z.array(z.string().max(100)).max(6).optional(),
    spaceOfferCategory: z.enum(["work", "housing", "residency"]).optional(),
    spaceOfferPricing: z.enum(["free", "paid", "case_by_case"]).optional(),
    spaceOfferDetails: z.string().max(600).optional(),
    organizationModel: z.enum(["artist_run", "nonprofit", "community", "independent", "commercial_operator", "hospitality", "agency", "institution", "other"]).optional(),
    intendedCommercialUse: z.boolean().optional(),
    commercialUseDescription: z.string().max(600).optional(),
    hidden: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid input" }); return; }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;

  const fieldMap: Record<string, string> = {
    name: "name",
    blurb: "blurb",
    heroPhoto: "heroPhoto",
    portfolioPhotos: "portfolioPhotos",
    externalLinks: "externalLinks",
    experiences: "experiences",
    url: "url",
    shopUrl: "shopUrl",
    offerings: "offerings",
    basedIn: "basedIn",
    swapType: "swapType",
    spacePrivacy: "spacePrivacy",
    financialStructure: "financialStructure",
    costDetails: "costDetails",
    durationTerms: "durationTerms",
    vibeTags: "vibeTags",
    dealbreakers: "dealbreakers",
    noiseAndGuests: "noiseAndGuests",
    contactMethod: "contactMethod",
    contactHandle: "contactHandle",
    openTo: "openTo",
    spaceOfferAvailable: "spaceOfferAvailable",
    spaceOfferTypes: "spaceOfferTypes",
    spaceOfferCategory: "spaceOfferCategory",
    spaceOfferPricing: "spaceOfferPricing",
    spaceOfferDetails: "spaceOfferDetails",
    organizationModel: "organizationModel",
    intendedCommercialUse: "intendedCommercialUse",
    commercialUseDescription: "commercialUseDescription",
  };
  for (const [inputKey, columnKey] of Object.entries(fieldMap)) {
    const value = d[inputKey as keyof typeof d];
    if (value !== undefined) updates[columnKey] = value;
  }
  if (d.hidden !== undefined) updates.isHidden = d.hidden;

  const [updated] = await db.update(entriesTable).set(updates).where(eq(entriesTable.id, entryId)).returning();
  const nextHeroPhoto = d.heroPhoto !== undefined ? (d.heroPhoto || null) : entry.heroPhoto;
  if (
    entry.heroPhoto &&
    entry.heroPhoto !== nextHeroPhoto &&
    (entry.heroPhoto.startsWith("/api/storage/objects/") || entry.heroPhoto.startsWith("/objects/") || entry.heroPhoto.startsWith("https://storage.googleapis.com/"))
  ) {
    try {
      await objectStorageService.deleteObjectEntity(entry.heroPhoto);
    } catch (storageError) {
      req.log.warn({ err: storageError, entryId }, "Could not remove replaced profile photo from object storage");
    }
  }
  req.log.info({ entryId, email: session.email }, "Profile updated");
  res.json({ ok: true, entry: updated });
});


// ---------------------------------------------------------------------------
// POST /api/entries/public-artifact — anonymous artifact submission (no auth)
// Creates a pending entry of kind "artifact" without requiring an account.
// isApproved defaults to false — admin must approve before the pin appears.
// ---------------------------------------------------------------------------
router.post("/entries/public-artifact", async (req, res): Promise<void> => {
  const { name, city, url, blurb } = req.body as {
    name?: string; city?: string; url?: string; blurb?: string;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "artifact name is required" });
    return;
  }

  await db.insert(entriesTable).values({
    name: name.trim(),
    kind: "artifact",
    city: typeof city === "string" ? city.trim() : "",
    country: "",
    url: typeof url === "string" && url.trim() ? url.trim() : null,
    blurb: typeof blurb === "string" && blurb.trim() ? blurb.trim() : null,
    status: "pending_review",
    isApproved: false,
  });

  req.log.info({ name: name.trim() }, "Anonymous artifact submitted");
  res.status(201).json({ ok: true });
});

// GET /entries/:id/rating — public only when the profile itself is public.
router.get("/entries/:id/rating", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (!(await canViewEntryId(req, id))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const [agg] = await db
    .select({
      avg: sql<number | null>`ROUND(AVG(${entryRatingsTable.stars})::numeric, 1)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(entryRatingsTable)
    .where(eq(entryRatingsTable.entryId, id));

  let myStars: number | null = null;
  const rawToken = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (rawToken) {
    const [sess] = await db
      .select({ entryId: magicLinkTokensTable.entryId })
      .from(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.token, rawToken),
        eq(magicLinkTokensTable.purpose, "session"),
        gt(magicLinkTokensTable.expiresAt, new Date()),
      ));
    if (sess?.entryId) {
      const [own] = await db
        .select({ stars: entryRatingsTable.stars })
        .from(entryRatingsTable)
        .where(and(eq(entryRatingsTable.entryId, id), eq(entryRatingsTable.raterEntryId, sess.entryId)));
      myStars = own?.stars ?? null;
    }
  }

  res.setHeader("Cache-Control", "private, no-store");
  res.json({ avg: agg?.avg ?? null, count: agg?.count ?? 0, myStars });
});

// POST /entries/:id/rate — verified cult members only; upserts a 1–5 star rating
router.post("/entries/:id/rate", requireAuth, requireApproved, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (!(await canViewEntryId(req, id))) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const stars = parseInt(req.body?.stars, 10);
  if (!stars || stars < 1 || stars > 5) {
    res.status(400).json({ error: "stars must be 1–5" }); return;
  }

  const session = (req as any).ccSession;
  let raterEntryId: number | null = session.entryId ?? null;
  if (!raterEntryId) {
    // Old session tokens may not have entry_id cached — look it up live
    const [linked] = await db
      .select({ id: entriesTable.id })
      .from(entriesTable)
      .where(eq(entriesTable.claimedEmail, session.email));
    raterEntryId = linked?.id ?? null;
  }
  if (!raterEntryId) {
    res.status(403).json({ error: "only verified artists with an approved profile can rate" }); return;
  }
  if (raterEntryId === id) {
    res.status(400).json({ error: "you cannot rate your own listing" }); return;
  }

  await db
    .insert(entryRatingsTable)
    .values({ entryId: id, raterEntryId, stars })
    .onConflictDoUpdate({
      target: [entryRatingsTable.entryId, entryRatingsTable.raterEntryId],
      set: { stars },
    });

  res.json({ ok: true });
});

// GET /entries/:id/comments — only visible alongside the profile itself.
router.get("/entries/:id/comments", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (!(await canViewEntryId(req, id))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const comments = await db
    .select({
      id: entryCommentsTable.id,
      content: entryCommentsTable.content,
      createdAt: entryCommentsTable.createdAt,
      authorEntryId: entryCommentsTable.authorEntryId,
      authorName: entriesTable.name,
    })
    .from(entryCommentsTable)
    .innerJoin(entriesTable, eq(entryCommentsTable.authorEntryId, entriesTable.id))
    .where(eq(entryCommentsTable.entryId, id))
    .orderBy(entryCommentsTable.createdAt);

  res.setHeader("Cache-Control", "private, no-store");
  res.json(comments);
});

// POST /entries/:id/comments — verified cult members only
router.post("/entries/:id/comments", requireAuth, requireApproved, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (!(await canViewEntryId(req, id))) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const content = (req.body?.content ?? "").trim() as string;
  if (!content || content.length > 1000) {
    res.status(400).json({ error: "comment must be 1–1000 characters" }); return;
  }

  const session = (req as any).ccSession;
  let authorEntryId: number | null = session.entryId ?? null;
  if (!authorEntryId) {
    const [linked] = await db
      .select({ id: entriesTable.id })
      .from(entriesTable)
      .where(eq(entriesTable.claimedEmail, session.email));
    authorEntryId = linked?.id ?? null;
  }
  if (!authorEntryId) {
    res.status(403).json({ error: "only verified artists with an approved profile can comment" }); return;
  }

  const [comment] = await db
    .insert(entryCommentsTable)
    .values({ entryId: id, authorEntryId, content })
    .returning();

  res.json({ ok: true, id: comment?.id });
});

// DELETE /entries/:id/comments/:commentId — comment author only
router.delete("/entries/:id/comments/:commentId", requireAuth, requireApproved, async (req, res): Promise<void> => {
  const entryId = parseInt(String(req.params.id ?? ""), 10);

  const body = req.body as Record<string, unknown>;
  const commentId = parseInt(String(req.params.commentId ?? ""), 10);
  if (Number.isNaN(entryId) || Number.isNaN(commentId)) { res.status(400).json({ error: "invalid id" }); return; }
  if (!(await canViewEntryId(req, entryId))) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const session = (req as any).ccSession;
  let authorEntryId: number | null = session.entryId ?? null;
  if (!authorEntryId) {
    const [linked] = await db
      .select({ id: entriesTable.id })
      .from(entriesTable)
      .where(eq(entriesTable.claimedEmail, session.email));
    authorEntryId = linked?.id ?? null;
  }

  const [deleted] = await db
    .delete(entryCommentsTable)
    .where(and(
      eq(entryCommentsTable.id, commentId),
      eq(entryCommentsTable.authorEntryId, authorEntryId ?? -1),
    ))
    .returning({ id: entryCommentsTable.id });

  if (!deleted) { res.status(404).json({ error: "comment not found or not yours" }); return; }
  res.json({ ok: true });
});

export default router;
