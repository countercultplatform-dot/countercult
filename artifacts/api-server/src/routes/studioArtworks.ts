import crypto from "node:crypto";
import { Readable } from "node:stream";
import { and, eq, lte, or, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import type { Logger } from "pino";
import { z } from "zod/v4";
import {
  db,
  pinterestPinsTable,
  studioArtworksTable,
  type PinterestPinRecord,
  type StudioArtwork,
  type StudioArtworkPhoto,
} from "@workspace/db";
import { ensurePinterestBoard, publishPinterestPinForPublisher } from "./pinterest";
import { requireStudioAdmin } from "../lib/studioAuth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const PINTEREST_ACCOUNT_KEY = "sketchy-shona";
const BOARD_NAME = "Sketchy Shona Original Art";
const BOARD_DESCRIPTION = "Original paintings, drawings and mixed media artwork by Sketchy Shona, including available works and the wider artist archive.";
const MAX_AUTOPUBLISH_ATTEMPTS = 8;
const retryingArtworkIds = new Set<string>();
const objectStorageService = new ObjectStorageService();

const ArtworkPhotoInput = z.object({
  name: z.string().trim().min(1).max(240),
  objectPath: z.string().regex(/^\/objects\/[A-Za-z0-9/_-]+$/),
});

const StudioArtworkInput = z.object({
  title: z.string().trim().min(1).max(240),
  year: z.string().trim().max(80).optional().default(""),
  dimensions: z.string().trim().max(120).optional().default(""),
  medium: z.string().trim().min(1).max(180),
  price: z.string().trim().max(80).optional().default(""),
  availability: z.enum(["Available", "Reserved", "Sold", "Not for sale"]).default("Available"),
  notes: z.string().trim().max(5000).optional().default(""),
  seoTitle: z.string().trim().max(240).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  seoKeywords: z.array(z.string().trim().min(1).max(120)).max(30).optional().default([]),
  photos: z.array(ArtworkPhotoInput).min(1).max(12),
});

type StudioLogger = Pick<Logger, "info" | "warn" | "error">;

function siteOrigin() {
  return process.env.SITE_URL ?? "https://countercult.network";
}

function publicObjectUrl(objectPath: string) {
  return new URL(`/api/storage${objectPath}`, siteOrigin()).toString();
}

function publicArtworkUrl(id: string) {
  return new URL(`/portfolio/${encodeURIComponent(id)}`, siteOrigin()).toString();
}

function publicArtworkPhotoUrl(id: string, index: number) {
  return new URL(`/api/studio/artworks/${encodeURIComponent(id)}/photos/${index}`, siteOrigin()).toString();
}

function serializeArtwork(artwork: StudioArtwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    seoTitle: artwork.seoTitle,
    seoDescription: artwork.seoDescription,
    seoKeywords: artwork.seoKeywords,
    year: artwork.year,
    dimensions: artwork.dimensions,
    medium: artwork.medium,
    price: artwork.price,
    availability: artwork.availability,
    notes: artwork.notes,
    photos: artwork.photos.map((photo) => ({
      name: photo.name,
      objectPath: photo.objectPath,
      src: publicObjectUrl(photo.objectPath),
    })),
    readiness: artwork.readiness,
    destinations: artwork.destinations,
    updatedAt: artwork.updatedAt.toISOString(),
  };
}

export function serializePublicArtwork(artwork: StudioArtwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    seoTitle: artwork.seoTitle,
    seoDescription: artwork.seoDescription,
    seoKeywords: artwork.seoKeywords,
    year: artwork.year,
    dimensions: artwork.dimensions,
    medium: artwork.medium,
    price: artwork.price,
    availability: artwork.availability,
    photos: artwork.photos.map((photo, index) => ({
      name: photo.name,
      src: publicArtworkPhotoUrl(artwork.id, index),
    })),
  };
}

function isReadyForAutopublish(artwork: StudioArtwork) {
  return artwork.readiness === "Ready for review"
    && artwork.destinations.website === "Prepared"
    && Boolean(artwork.title.trim())
    && Boolean(artwork.medium.trim())
    && Boolean(artwork.seoDescription.trim())
    && artwork.photos.some((photo) => Boolean(photo.objectPath));
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function makePinCopy(artwork: StudioArtwork) {
  const searchTerms = [...artwork.seoKeywords, "original artwork", "contemporary art", "artist archive"]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, all) => all.findIndex((item) => item.toLowerCase() === keyword.toLowerCase()) === index);
  const primary = searchTerms.find((keyword) => /original|painting|portrait|mixed media|figurative|contemporary/i.test(keyword))
    || "original artwork";
  const secondary = searchTerms.find((keyword) => keyword.toLowerCase() !== primary.toLowerCase()) || "artist archive";
  const prefix = `${primary} | Sketchy Shona`;
  const availableForSource = 100 - prefix.length - 6 - secondary.length;
  const pinTitle = availableForSource >= 12
    ? `${prefix} | ${trimText(artwork.title, availableForSource)} | ${secondary}`
    : trimText(`${prefix} | ${artwork.title}`, 100);
  const additional = searchTerms.find((keyword) =>
    keyword.toLowerCase() !== primary.toLowerCase()
      && keyword.toLowerCase() !== secondary.toLowerCase()
      && keyword.toLowerCase() !== "sketchy shona",
  ) || "contemporary art";
  const topicPhrase = `${primary}, ${secondary}, and ${additional}`;
  const pinDescription = trimText(
    `${primary} by Sketchy Shona. ${artwork.seoDescription} Explore ${topicPhrase} in the Sketchy Shona original art archive. Save this Pin for future reference.`,
    500,
  );
  return {
    pinTitle,
    pinDescription,
    pinAltText: `${artwork.title}, ${artwork.medium} by Sketchy Shona`,
    link: publicArtworkUrl(artwork.id),
    imageUrl: publicObjectUrl(artwork.photos[0].objectPath),
  };
}

function nextRetryDate(attempts: number) {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delayMinutes * 60_000);
}

async function getArtworkWithPin(id: string) {
  const [artwork] = await db.select().from(studioArtworksTable).where(eq(studioArtworksTable.id, id)).limit(1);
  const [pin] = await db.select().from(pinterestPinsTable).where(eq(pinterestPinsTable.artworkId, id)).limit(1);
  return { artwork, pin };
}

export async function publishStudioArtwork(id: string, log: StudioLogger): Promise<PinterestPinRecord | null> {
  if (retryingArtworkIds.has(id)) return null;
  retryingArtworkIds.add(id);
  try {
    const { artwork, pin } = await getArtworkWithPin(id);
    if (!artwork || !pin || pin.status === "published" || !isReadyForAutopublish(artwork)) return pin ?? null;

    const attempts = pin.attempts + 1;
    await db.update(pinterestPinsTable).set({
      status: "publishing",
      attempts,
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(pinterestPinsTable.id, pin.id));

    try {
      const copy = makePinCopy(artwork);
      const board = await ensurePinterestBoard(BOARD_NAME, BOARD_DESCRIPTION);
      const remotePin = await publishPinterestPinForPublisher({
        boardId: board.id,
        title: copy.pinTitle,
        description: copy.pinDescription,
        altText: copy.pinAltText,
        link: copy.link,
        imageUrl: copy.imageUrl,
      });
      const [published] = await db.update(pinterestPinsTable).set({
        boardId: board.id,
        pinTitle: copy.pinTitle,
        pinDescription: copy.pinDescription,
        pinAltText: copy.pinAltText,
        status: "published",
        pinterestPinId: remotePin.id ?? null,
        lastError: null,
        nextAttemptAt: null,
        publishedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(pinterestPinsTable.id, pin.id)).returning();
      log.info({ artworkId: id, pinterestPinId: remotePin.id ?? null }, "Studio artwork published to Pinterest");
      return published ?? null;
    } catch (error) {
      const failed = attempts >= MAX_AUTOPUBLISH_ATTEMPTS;
      const message = error instanceof Error ? error.message : "Pinterest publishing failed";
      const [updated] = await db.update(pinterestPinsTable).set({
        status: failed ? "failed" : "queued",
        lastError: message.slice(0, 500),
        nextAttemptAt: failed ? null : nextRetryDate(attempts),
        updatedAt: new Date(),
      }).where(eq(pinterestPinsTable.id, pin.id)).returning();
      log.error({ err: error, artworkId: id, attempts, terminal: failed }, "Studio artwork Pinterest publishing failed");
      return updated ?? null;
    }
  } finally {
    retryingArtworkIds.delete(id);
  }
}

export async function runPinterestAutopublishSweep(log: StudioLogger) {
  const duePins = await db.select({ artworkId: pinterestPinsTable.artworkId })
    .from(pinterestPinsTable)
    .where(and(
      or(eq(pinterestPinsTable.status, "queued"), eq(pinterestPinsTable.status, "publishing")),
      or(isNull(pinterestPinsTable.nextAttemptAt), lte(pinterestPinsTable.nextAttemptAt, new Date())),
    ))
    .limit(50);
  for (const pin of duePins) {
    await publishStudioArtwork(pin.artworkId, log);
  }
}

router.get("/studio/artworks/public", async (_req, res): Promise<void> => {
  const artworks = await db.select().from(studioArtworksTable);
  res.json(artworks
    .filter((artwork) => artwork.readiness !== "Needs details" && artwork.destinations.website === "Prepared")
    .map(serializePublicArtwork));
});

router.get("/studio/artworks/:id/photos/:photoIndex", async (req, res): Promise<void> => {
  const photoIndex = Number(req.params.photoIndex);
  if (!Number.isInteger(photoIndex) || photoIndex < 0 || photoIndex > 11) {
    res.status(404).json({ error: "Artwork photo not found" });
    return;
  }

  const [artwork] = await db.select({
    photos: studioArtworksTable.photos,
    readiness: studioArtworksTable.readiness,
    destinations: studioArtworksTable.destinations,
  }).from(studioArtworksTable)
    .where(eq(studioArtworksTable.id, req.params.id))
    .limit(1);
  const isPublic = artwork
    && artwork.readiness !== "Needs details"
    && artwork.destinations.website === "Prepared";
  const photo = isPublic ? artwork.photos[photoIndex] : undefined;
  if (!photo?.objectPath) {
    res.status(404).json({ error: "Artwork photo not found" });
    return;
  }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(photo.objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!response.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    nodeStream.on("error", (error) => {
      req.log.error({ err: error, artworkId: req.params.id }, "Error streaming public artwork photo");
      if (!res.headersSent) res.status(500).end();
      else res.destroy(error);
    });
    nodeStream.pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Artwork photo not found" });
      return;
    }
    req.log.error({ err: error, artworkId: req.params.id }, "Error serving public artwork photo");
    res.status(500).json({ error: "Artwork photo could not be served" });
  }
});

router.get("/studio/artworks/pinterest", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const [pins, artworks] = await Promise.all([
    db.select().from(pinterestPinsTable).where(eq(pinterestPinsTable.accountKey, PINTEREST_ACCOUNT_KEY)),
    db.select({ id: studioArtworksTable.id, title: studioArtworksTable.title }).from(studioArtworksTable),
  ]);
  const titles = new Map(artworks.map((artwork) => [artwork.id, artwork.title]));
  res.json(pins.map((pin) => ({
    artworkId: pin.artworkId,
    title: titles.get(pin.artworkId) ?? pin.artworkId,
    status: pin.status,
    pinterestPinId: pin.pinterestPinId,
    attempts: pin.attempts,
    lastError: pin.lastError,
    publishedAt: pin.publishedAt?.toISOString() ?? null,
    updatedAt: pin.updatedAt.toISOString(),
  })));
});

router.post("/studio/artworks", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const parsed = StudioArtworkInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A title, medium, and at least one uploaded photo are required" });
    return;
  }

  const id = `artwork-${crypto.randomUUID()}`;
  const data = parsed.data;
  const readiness = data.title && data.medium && data.photos.length ? "Ready for review" : "Needs details";
  const seoDescription = data.seoDescription || `${data.title} by Berlin contemporary multidisciplinary artist Sketchy Shona.`;
  const artwork = {
    id,
    title: data.title,
    seoTitle: data.seoTitle || `${data.title} | Sketchy Shona`,
    seoDescription,
    seoKeywords: data.seoKeywords.length ? data.seoKeywords : ["Sketchy Shona original art", "Berlin contemporary artist"],
    year: data.year,
    dimensions: data.dimensions,
    medium: data.medium,
    price: data.price,
    availability: data.availability,
    notes: data.notes,
    photos: data.photos as StudioArtworkPhoto[],
    readiness,
    destinations: {
      website: "Prepared" as const,
      store: "Not prepared" as const,
      social: "Not prepared" as const,
      newsletter: "Not prepared" as const,
      marketplaces: "Not prepared" as const,
    },
  };

  const [created] = await db.insert(studioArtworksTable).values(artwork).returning();
  const copy = makePinCopy(created);
  const [pin] = await db.insert(pinterestPinsTable).values({
    accountKey: PINTEREST_ACCOUNT_KEY,
    artworkId: created.id,
    boardId: "originals",
    pinTitle: copy.pinTitle,
    pinDescription: copy.pinDescription,
    pinAltText: copy.pinAltText,
    status: "queued",
  }).returning();

  void publishStudioArtwork(created.id, req.log);
  res.status(201).json({
    artwork: serializeArtwork(created),
    pinterest: {
      status: pin.status,
      message: "The record is saved and Pinterest publishing has started automatically.",
    },
  });
});

router.post("/studio/artworks/:id/retry-pinterest", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const result = await publishStudioArtwork(req.params.id, req.log);
  if (!result) {
    res.status(404).json({ error: "Artwork or Pinterest record not found" });
    return;
  }
  res.json({ status: result.status, pinterestPinId: result.pinterestPinId });
});

export default router;