import { readFile } from "node:fs/promises";
import { and, eq, isNull, like } from "drizzle-orm";
import { PublishCuratedPinsBody } from "@workspace/api-zod";
import { db, entriesTable } from "@workspace/db";
import { logger } from "./logger";

const CRAB_IMPORT_KEY = "crab-curated-pins-2026-10-14";
const CRAB_TAG = "CRAB (Creative Rural Hubs Community)";
const CRAB_DESCRIPTION =
  "CRAB (Creative Rural Hubs Community) is a European project that connects rural creative spaces, maker labs, and coliving communities to help revitalize small and abandoned villages through art, technology, and shared living.";

function expandedCrabTags(tags: string[]): string[] {
  return tags.map((tag) => tag === "CRAB" ? CRAB_TAG : tag);
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Publishes the reviewed CRAB pin batch once per database. Only entries are
 * imported; the source file's separate retirement list is intentionally ignored.
 */
export async function seedCrabPins(sourceFile: URL): Promise<{
  status: "imported" | "already-imported";
  created: number;
  updated: number;
}> {
  const source = JSON.parse(await readFile(sourceFile, "utf8")) as { entries?: unknown };
  const parsed = PublishCuratedPinsBody.safeParse({ entries: source.entries });
  if (!parsed.success) {
    throw new Error(`CRAB pin batch failed validation: ${parsed.error.issues[0]?.message ?? "invalid batch"}`);
  }

  return db.transaction(async (tx) => {
    const importedEntries = await tx
      .select({ id: entriesTable.id, tags: entriesTable.tags, blurb: entriesTable.blurb })
      .from(entriesTable)
      .where(like(entriesTable.discoverySource, `${CRAB_IMPORT_KEY}:%`))
      ;
    if (importedEntries.length) {
      let updated = 0;
      for (const entry of importedEntries) {
        const tags = expandedCrabTags(entry.tags ?? []);
        if (entry.blurb === CRAB_DESCRIPTION && JSON.stringify(entry.tags ?? []) === JSON.stringify(tags)) continue;
        await tx.update(entriesTable).set({ blurb: CRAB_DESCRIPTION, tags }).where(eq(entriesTable.id, entry.id));
        updated += 1;
      }
      return { status: "already-imported", created: 0, updated };
    }

    const existingEntries = await tx
      .select({
        id: entriesTable.id,
        name: entriesTable.name,
        city: entriesTable.city,
        country: entriesTable.country,
        isClaimed: entriesTable.isClaimed,
        claimedEmail: entriesTable.claimedEmail,
        deletedAt: entriesTable.deletedAt,
      })
      .from(entriesTable)
      .where(isNull(entriesTable.deletedAt));
    let created = 0;
    let updated = 0;

    for (const pin of parsed.data.entries) {
      const sameIdentity = (entry: typeof existingEntries[number]) =>
        normalize(entry.name) === normalize(pin.name) &&
        normalize(entry.city) === normalize(pin.city) &&
        normalize(entry.country) === normalize(pin.country);
      const replacement = pin.replaceEntryId
        ? existingEntries.find((entry) => entry.id === pin.replaceEntryId && sameIdentity(entry))
        : undefined;
      const existing = replacement ?? existingEntries.find(sameIdentity);
      if (existing?.isClaimed || existing?.claimedEmail) {
        throw new Error(`Cannot replace claimed CRAB pin: ${pin.sourceKey}`);
      }

      const values = {
        name: pin.name.trim(),
        kind: pin.kind,
        city: pin.city.trim(),
        country: pin.country.trim(),
        lat: pin.lat,
        lng: pin.lng,
        url: pin.url,
        tags: expandedCrabTags(pin.tags),
        contactEmail: pin.contactEmail?.trim().toLowerCase() ?? null,
        address: null,
        heroPhoto: null,
        portfolioPhotos: [],
        blurb: CRAB_DESCRIPTION,
        status: "published",
        isApproved: true,
        visibility: "public",
        mapEligible: true,
        isClaimed: false,
        claimedEmail: null,
        isHidden: false,
        subcultures: [],
        discoverySource: `${CRAB_IMPORT_KEY}:${pin.sourceKey}`,
        curatedBy: "CRAB",
      };

      if (existing) {
        await tx.update(entriesTable).set(values).where(eq(entriesTable.id, existing.id));
        updated += 1;
      } else {
        const [inserted] = await tx.insert(entriesTable).values(values).returning({ id: entriesTable.id });
        if (!inserted) throw new Error(`Could not create CRAB pin: ${pin.sourceKey}`);
        created += 1;
        existingEntries.push({
          id: inserted.id,
          name: pin.name,
          city: pin.city,
          country: pin.country,
          isClaimed: false,
          claimedEmail: null,
          deletedAt: null,
        });
      }
    }

    const result = { status: "imported" as const, created, updated };
    logger.info(result, "CRAB public pins imported");
    return result;
  });
}
