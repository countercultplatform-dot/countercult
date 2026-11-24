import { Readable } from 'stream';
import { z } from 'zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import { and, arrayContains, eq, gt, or, sql } from 'drizzle-orm';
import {
  db,
  entriesTable,
  magicLinkTokensTable,
  residencyOffersTable,
  studioArtworksTable,
  usersTable,
} from '@workspace/db';
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
  type StudioArtworkMediaReference,
} from '../lib/storageAccess';
import { canExposeResidencyOfferForProfile } from '../lib/residencyOfferVisibility';
import { shouldExpireByAvailability } from '../lib/residencyAccessPolicy';
import { hasStudioAdminAccess } from '../lib/studioAuth';

const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number().optional(),
  contentType: z.string().optional(),
});

const RequestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  metadata: z.object({
    name: z.string(),
    size: z.number().optional(),
    contentType: z.string().optional(),
  }).optional(),
});

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function resolveStorageIdentity(authorization: string | undefined): Promise<StorageIdentity | null> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const [identity] = await db
    .select({
      email: magicLinkTokensTable.email,
      entryId: magicLinkTokensTable.entryId,
      accountRole: usersTable.accountRole,
      isApproved: usersTable.isApproved,
    })
    .from(magicLinkTokensTable)
    .innerJoin(usersTable, eq(usersTable.email, magicLinkTokensTable.email))
    .where(and(
      eq(magicLinkTokensTable.token, token),
      eq(magicLinkTokensTable.purpose, 'session'),
      gt(magicLinkTokensTable.expiresAt, new Date()),
    ))
    .limit(1);

  return identity ?? null;
}

function objectPathCandidates(objectPath: string): string[] {
  return objectReferenceCandidates(
    objectPath,
    objectStorageService.getPrivateObjectDir(),
    process.env.SITE_URL ?? 'https://countercult.network',
  );
}

async function findEntryMediaReferences(candidates: string[]): Promise<EntryMediaReference[]> {
  const clauses = candidates.flatMap((path) => [
    eq(entriesTable.heroPhoto, path),
    arrayContains(entriesTable.portfolioPhotos, [path]),
  ]);
  const matches = await db
    .select({
      kind: entriesTable.kind,
      name: entriesTable.name,
      heroPhoto: entriesTable.heroPhoto,
      status: entriesTable.status,
      isApproved: entriesTable.isApproved,
      isHidden: entriesTable.isHidden,
      visibility: entriesTable.visibility,
      publicProfileConsentAt: entriesTable.publicProfileConsentAt,
      deletedAt: entriesTable.deletedAt,
      contactEmail: entriesTable.contactEmail,
      claimedEmail: entriesTable.claimedEmail,
    })
    .from(entriesTable)
    .where(or(...clauses));
  return matches;
}

async function isPublicStudioArtworkObject(
  candidates: string[],
  objectPath: string,
): Promise<boolean> {
  const photoConditions = candidates.map((path) =>
    sql`${studioArtworksTable.photos} @> ${JSON.stringify([{ objectPath: path }])}::jsonb`,
  );
  const [match] = await db
    .select({
      readiness: studioArtworksTable.readiness,
      destinations: studioArtworksTable.destinations,
      photos: studioArtworksTable.photos,
    })
    .from(studioArtworksTable)
    .where(and(
      sql`${studioArtworksTable.readiness} <> 'Needs details'`,
      sql`${studioArtworksTable.destinations}->>'website' = 'Prepared'`,
      or(...photoConditions),
    ))
    .limit(1);
  return Boolean(match && isPublicStudioArtworkMedia(
    match as StudioArtworkMediaReference,
    objectPath,
    (url) => objectStorageService.normalizeObjectEntityPath(url),
  ));
}

async function findResidencyMediaReferences(candidates: string[]): Promise<ResidencyMediaReference[]> {
  const photoConditions = candidates.map((path) =>
    arrayContains(residencyOffersTable.photos, [path]),
  );
  return db
    .select({
      entryId: residencyOffersTable.entryId,
      claimerEmail: residencyOffersTable.claimerEmail,
      posterEmail: residencyOffersTable.posterEmail,
      kind: residencyOffersTable.kind,
      duration: residencyOffersTable.duration,
      availableTo: residencyOffersTable.availableTo,
      visibility: residencyOffersTable.visibility,
      isActive: residencyOffersTable.isActive,
      entryApproved: entriesTable.isApproved,
      entryStatus: entriesTable.status,
      entryHidden: entriesTable.isHidden,
      entryDeletedAt: entriesTable.deletedAt,
    })
    .from(residencyOffersTable)
    .leftJoin(entriesTable, eq(residencyOffersTable.entryId, entriesTable.id))
    .where(or(...photoConditions));
}

async function canAccessRoomSwapPhotos(identity: StorageIdentity): Promise<boolean> {
  if (!identity.entryId) return false;

  const [access] = await db
    .select({
      userApproved: usersTable.isApproved,
      entryApproved: entriesTable.isApproved,
      status: entriesTable.status,
      deletedAt: entriesTable.deletedAt,
    })
    .from(entriesTable)
    .innerJoin(usersTable, eq(usersTable.email, identity.email))
    .where(and(
      eq(entriesTable.id, identity.entryId),
      or(
        eq(entriesTable.contactEmail, identity.email),
        eq(entriesTable.claimedEmail, identity.email),
      ),
    ))
    .limit(1);

  return Boolean(
    access?.userApproved
    && access.entryApproved
    && access.status === 'published'
    && access.deletedAt === null,
  );
}

function isValidObjectEntityPath(objectPath: string): boolean {
  return normalizeObjectEntityReference(
    objectPath,
    (url) => objectStorageService.normalizeObjectEntityPath(url),
  ) === objectPath;
}

async function serveObject(
  req: Request,
  res: Response,
  objectPath: string,
  access: 'public' | 'private',
): Promise<void> {
  const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
  const response = await objectStorageService.downloadObject(objectFile);

  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.setHeader(
    'Cache-Control',
    access === 'public' ? 'public, max-age=30, must-revalidate' : 'private, no-store',
  );

  if (response.body) {
    const nodeStream = Readable.fromWeb(
      response.body as ReadableStream<Uint8Array>,
    );
    nodeStream.on('error', (error) => {
      req.log.error({ err: error }, 'Error streaming object');
      if (!res.headersSent) res.status(500).end();
      else res.destroy(error);
    });
    nodeStream.pipe(res);
  } else {
    res.end();
  }
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    // No session check — presigned URLs are safe to mint without auth because
    // the GCS signed URL already restricts the operation (PUT only, TTL-bound,
    // bucket-scoped). This endpoint is intentionally open so it can be called
    // during registration before a session exists.

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

router.get('/storage/exchange-public/:offerId/:photoIndex', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.offerId) ? req.params.offerId[0] : req.params.offerId;
    const rawIndex = Array.isArray(req.params.photoIndex) ? req.params.photoIndex[0] : req.params.photoIndex;
    const offerId = Number(rawId);
    const photoIndex = Number(rawIndex);
    if (!Number.isInteger(offerId) || offerId < 1 || !Number.isInteger(photoIndex) || photoIndex < 0 || photoIndex > 2) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const [offer] = await db
      .select({
        kind: residencyOffersTable.kind,
        duration: residencyOffersTable.duration,
        availableTo: residencyOffersTable.availableTo,
        photos: residencyOffersTable.photos,
        publicPhotos: residencyOffersTable.publicPhotos,
        visibility: residencyOffersTable.visibility,
        isActive: residencyOffersTable.isActive,
        entryId: residencyOffersTable.entryId,
        entryApproved: entriesTable.isApproved,
        entryStatus: entriesTable.status,
        entryHidden: entriesTable.isHidden,
        entryDeletedAt: entriesTable.deletedAt,
      })
      .from(residencyOffersTable)
      .leftJoin(entriesTable, eq(residencyOffersTable.entryId, entriesTable.id))
      .where(eq(residencyOffersTable.id, offerId))
      .limit(1);
    if (
      !offer ||
      !offer.isActive ||
      offer.visibility !== 'public' ||
      shouldExpireByAvailability(offer, new Date()) ||
      !canExposeResidencyOfferForProfile(offer, false)
    ) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const rawPhoto = offer.photos?.[photoIndex];
    if (!rawPhoto || !(offer.publicPhotos ?? []).includes(rawPhoto)) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    const objectPath = normalizeObjectEntityReference(
      rawPhoto,
      (url) => objectStorageService.normalizeObjectEntityPath(url),
    );
    if (!objectPath) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile, 300);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving public Exchange photo');
    res.status(500).json({ error: 'Failed to serve photo' });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    if (!isValidObjectEntityPath(objectPath)) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const candidates = objectPathCandidates(objectPath);
    const entries = await findEntryMediaReferences(candidates);
    const publicProfileMedia = entries.some((entry) => isPublicProfileMedia(entry, candidates));
    const publicArtworkMedia = publicProfileMedia
      ? false
      : await isPublicStudioArtworkObject(candidates, objectPath);

    if (publicProfileMedia || publicArtworkMedia) {
      await serveObject(req, res, objectPath, 'public');
      return;
    }

    const isAdmin = hasStudioAdminAccess(req);
    const identity = isAdmin ? null : await resolveStorageIdentity(req.headers.authorization);
    if (!isAdmin && !identity) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    let allowed = isAdmin;
    if (identity) {
      allowed = entries.some((entry) => canReadEntryMedia(entry, identity));
      if (!allowed) {
        const offers = await findResidencyMediaReferences(candidates);
        const canAccessRoomSwaps = await canAccessRoomSwapPhotos(identity);
        allowed = offers.some((offer) =>
          canReadResidencyMedia(offer, identity, canAccessRoomSwaps, new Date()),
        );
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    if (!allowed && identity) {
      allowed = await objectStorageService.canAccessObjectEntity({
        userId: identity.email,
        objectFile,
      });
    }
    if (!allowed) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader('Cache-Control', 'private, no-store');
    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.on('error', (error) => {
        req.log.error({ err: error }, 'Error streaming object');
        if (!res.headersSent) res.status(500).end();
        else res.destroy(error);
      });
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

/**
 * Admin-only image preview for moderation. The password is sent in a header,
 * never in the image URL, query string, or referrer.
 */
router.get('/admin/storage/preview', async (req: Request, res: Response) => {
  try {
    if (!hasStudioAdminAccess(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rawPath = typeof req.query.path === 'string' ? req.query.path : '';
    const objectPath = normalizeObjectEntityReference(
      rawPath,
      (url) => objectStorageService.normalizeObjectEntityPath(url),
    );
    if (!objectPath || !isValidObjectEntityPath(objectPath)) {
      res.status(400).json({ error: 'Invalid object path' });
      return;
    }

    await serveObject(req, res, objectPath, 'private');
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving admin object preview');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
