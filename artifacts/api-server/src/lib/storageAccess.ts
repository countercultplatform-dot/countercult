import { isCanonicalEntryOwner } from "./spaceClassification";
import {
  ROOM_SWAP_KINDS,
  shouldExpireByAvailability,
} from "./residencyAccessPolicy";

export type StorageIdentity = {
  email: string;
  entryId: number | null;
  accountRole: string;
  isApproved: boolean;
};

export type EntryMediaReference = {
  kind: string;
  name: string;
  heroPhoto: string | null;
  status: string;
  isApproved: boolean;
  isHidden: boolean;
  visibility: string;
  publicProfileConsentAt: Date | null;
  deletedAt: Date | null;
  contactEmail: string | null;
  claimedEmail: string | null;
};

export type ResidencyMediaReference = {
  entryId: number | null;
  claimerEmail: string | null;
  posterEmail: string | null;
  kind: string;
  duration: string | null;
  availableTo: string | null;
  visibility: string;
  isActive: boolean;
  entryApproved: boolean | null;
  entryStatus: string | null;
  entryHidden: boolean | null;
  entryDeletedAt: Date | null;
};

export type StudioArtworkMediaReference = {
  readiness: string;
  destinations: { website: string } | null;
  photos: Array<{ objectPath: string }>;
};

function isSafeObjectEntityPath(path: string): boolean {
  if (!path.startsWith("/objects/")) return false;
  const segments = path.slice("/objects/".length).split("/");
  return segments.length > 0
    && segments.every((segment) =>
      segment.length > 0
      && segment !== "."
      && segment !== ".."
      && !segment.includes("\\")
      && !segment.includes("\0"),
    );
}

/**
 * Resolves an object reference stored by the app to the private object route's
 * canonical path. The GCS normalizer is used only for GCS-hosted URLs.
 */
export function normalizeObjectEntityReference(
  reference: string,
  normalizeGcsUrl: (url: string) => string,
): string | null {
  const value = reference.trim();
  if (!value) return null;

  let path = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.hostname === "storage.googleapis.com" || url.hostname.endsWith(".storage.googleapis.com")) {
        path = normalizeGcsUrl(value);
      } else {
        path = url.pathname;
      }
    } catch {
      return null;
    }
  }

  if (path.startsWith("/api/storage/objects/")) {
    path = path.slice("/api/storage".length);
  } else if (path.startsWith("api/storage/objects/")) {
    path = `/${path.slice("api/storage".length)}`;
  } else if (path.startsWith("objects/")) {
    path = `/${path}`;
  }

  return isSafeObjectEntityPath(path) ? path : null;
}

export function objectReferenceCandidates(
  objectPath: string,
  privateObjectDir?: string,
  publicSiteOrigin = "https://countercult.network",
): string[] {
  const candidates = new Set([objectPath, `/api/storage${objectPath}`]);
  for (const siteOrigin of new Set([publicSiteOrigin, "https://countercult.network"])) {
    try {
      const origin = new URL(siteOrigin).origin;
      candidates.add(new URL(`/api/storage${objectPath}`, origin).toString());
    } catch {
      // Invalid optional public origins do not affect the canonical path forms.
    }
  }
  const privateDir = privateObjectDir?.trim()
    .replace(/^gs:\/\//, "")
    .replace(/^\/+|\/+$/g, "");
  if (privateDir) {
    candidates.add(`https://storage.googleapis.com/${privateDir}${objectPath.slice("/objects".length)}`);
  }
  return [...candidates];
}

export function isPublicProfileMedia(
  entry: EntryMediaReference,
  candidateReferences: string[] = [],
): boolean {
  const isConsentedPublicArtistHero = entry.kind === "artist"
    && entry.publicProfileConsentAt !== null
    && entry.heroPhoto !== null
    && candidateReferences.includes(entry.heroPhoto);

  return entry.status === "published"
    && entry.isApproved
    && !entry.isHidden
    && entry.visibility === "public"
    && entry.deletedAt === null
    && (entry.kind !== "artist" || isConsentedPublicArtistHero);
}

export function canReadEntryMedia(
  entry: EntryMediaReference,
  identity: StorageIdentity,
): boolean {
  if (entry.deletedAt !== null) return false;
  if (isCanonicalEntryOwner(entry, identity.email)) return true;
  return identity.isApproved
    && entry.status === "published"
    && entry.isApproved
    && !entry.isHidden
    && (entry.visibility === "public" || entry.visibility === "network");
}

export function isPublicStudioArtworkMedia(
  artwork: StudioArtworkMediaReference,
  objectPath: string,
  normalizeGcsUrl: (url: string) => string,
): boolean {
  return artwork.readiness !== "Needs details"
    && artwork.destinations?.website === "Prepared"
    && artwork.photos.some((photo) =>
      normalizeObjectEntityReference(photo.objectPath, normalizeGcsUrl) === objectPath,
    );
}

function sameEmail(left: string | null, right: string): boolean {
  return left?.trim().toLowerCase() === right.trim().toLowerCase();
}

export function canReadResidencyMedia(
  offer: ResidencyMediaReference,
  identity: StorageIdentity,
  canAccessRoomSwaps: boolean,
  now: Date,
): boolean {
  const isOwner = offer.entryId === identity.entryId
    || sameEmail(offer.claimerEmail, identity.email)
    || sameEmail(offer.posterEmail, identity.email);
  const hasApprovedPublishedProfile = offer.entryApproved === true
    && offer.entryStatus === "published"
    && (offer.entryHidden === false || offer.visibility !== "private")
    && offer.entryDeletedAt === null;
  const ownerCanReadPendingProfileMedia = isOwner
    && offer.entryApproved !== true
    && offer.entryStatus === "pending_review"
    && offer.entryHidden === false
    && offer.entryDeletedAt === null;

  if (
    offer.entryId !== null
    && !hasApprovedPublishedProfile
    && !ownerCanReadPendingProfileMedia
  ) {
    return false;
  }

  if (isOwner) return true;

  if (!identity.isApproved || identity.accountRole === "partner_poster" || !offer.isActive) {
    return false;
  }
  if (offer.visibility !== "public" && offer.visibility !== "network") return false;
  if (shouldExpireByAvailability(offer, now)) return false;
  return canAccessRoomSwaps
    || !ROOM_SWAP_KINDS.includes(offer.kind as typeof ROOM_SWAP_KINDS[number]);
}