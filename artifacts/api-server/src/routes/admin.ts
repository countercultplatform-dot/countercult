import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { eq, desc, and, inArray, gt, or, isNull, isNotNull, lt, sql, ilike } from "drizzle-orm";
import {
  db,
  artistsTable,
  entriesTable,
  entrySubscriptionsTable,
  magicLinkTokensTable,
  usersTable,
  incomingApplicationsTable,
  fundApplicationsTable,
  curatorCodesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sendApprovalEmail, sendSpaceClaimInvitationEmail } from "../lib/email";
import { cancelApprovalMemberCheckIn, scheduleApprovalMemberCheckIn } from "../lib/memberCheckIn";
import {
  CreateAdminArtistBody,
  UpdateAdminArtistBody,
  ListAdminArtistsQueryParams,
  GetEntryResponse,
  SendSpaceClaimInvitationBody,
  SendSpaceClaimInvitationParams,
  SendSpaceClaimInvitationResponse,
  PublishCuratedPinsBody,
  PublishCuratedPinsResponse,
} from "@workspace/api-zod";
import { MAX_ACTIVE_CURATOR_CODES, normalizeCuratorCode } from "../lib/curatorCodes";

/** Random offset in range [-maxDeg, +maxDeg] */
function jitter(maxDeg: number): number {
  return (Math.random() * 2 - 1) * maxDeg;
}

/** Obfuscate a coordinate pair by ~500 m (≈ 0.0045°) */
function obfuscate(lat: number, lng: number): { lat: number; lng: number } {
  const MAX = 0.0045;
  return {
    lat: Math.round((lat + jitter(MAX)) * 1e6) / 1e6,
    lng: Math.round((lng + jitter(MAX)) * 1e6) / 1e6,
  };
}

const router: IRouter = Router();

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many admin login attempts — try again in 15 minutes" },
});

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    req.log.error("ADMIN_PASSWORD env var is not set");
    res.status(500).json({ error: "Admin password not configured on server" });
    return;
  }
  const provided = req.header("x-admin-password");
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}

router.use("/admin/auth/check", adminAuthLimiter);
router.use("/admin", requireAdmin);

router.get("/admin/auth/check", (_req, res): void => {
  res.json({ ok: true });
});

/** List recent account signup sources for internal acquisition review. */
router.get("/admin/signup-attribution", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      accountRole: usersTable.accountRole,
      isApproved: usersTable.isApproved,
      createdAt: usersTable.createdAt,
      source: usersTable.signupSource,
      medium: usersTable.signupMedium,
      campaign: usersTable.signupCampaign,
      referrerDomain: usersTable.signupReferrerDomain,
      landingPath: usersTable.signupLandingPath,
      reportedSource: usersTable.signupReportedSource,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(500);
  res.json(rows);
});

/** List curator invitation codes and their current status. */
router.get("/admin/curator-codes", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(curatorCodesTable)
    .orderBy(desc(curatorCodesTable.createdAt));
  res.json(rows);
});

/** Create a curator invitation code. Codes are case-insensitive and ignore spaces. */
router.post("/admin/curator-codes", async (req, res): Promise<void> => {
  const body = req.body as { code?: unknown; displayName?: unknown } | undefined;
  const code = normalizeCuratorCode(typeof body?.code === "string" ? body.code : undefined);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!code || code.length > 100) {
    res.status(400).json({ error: "code is required and must be 100 characters or fewer" });
    return;
  }
  if (!displayName || displayName.length > 100) {
    res.status(400).json({ error: "display name is required and must be 100 characters or fewer" });
    return;
  }

  const [{ activeCount }] = await db
    .select({ activeCount: sql<number>`count(*)` })
    .from(curatorCodesTable)
    .where(eq(curatorCodesTable.isActive, true));
  if (Number(activeCount) >= MAX_ACTIVE_CURATOR_CODES) {
    res.status(409).json({ error: `the ${MAX_ACTIVE_CURATOR_CODES}-person curator limit has been reached` });
    return;
  }

  const [created] = await db
    .insert(curatorCodesTable)
    .values({ code, displayName, isActive: true })
    .onConflictDoNothing({ target: curatorCodesTable.code })
    .returning();

  if (!created) {
    res.status(409).json({ error: "that curator code already exists" });
    return;
  }

  req.log.info({ curatorCodeId: created.id }, "Curator code created");
  res.status(201).json(created);
});

/** Enable or disable a curator invitation code without deleting its history. */
router.patch("/admin/curator-codes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const body = req.body as { isActive?: unknown } | undefined;
  if (typeof body?.isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean" });
    return;
  }

  if (body.isActive) {
    const [existing] = await db
      .select({ isActive: curatorCodesTable.isActive })
      .from(curatorCodesTable)
      .where(eq(curatorCodesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "curator code not found" });
      return;
    }
    const [{ activeCount }] = await db
      .select({ activeCount: sql<number>`count(*)` })
      .from(curatorCodesTable)
      .where(eq(curatorCodesTable.isActive, true));
    if (!existing.isActive && Number(activeCount) >= MAX_ACTIVE_CURATOR_CODES) {
      res.status(409).json({ error: `the ${MAX_ACTIVE_CURATOR_CODES}-person curator limit has been reached` });
      return;
    }
  }

  const [updated] = await db
    .update(curatorCodesTable)
    .set({ isActive: body.isActive })
    .where(eq(curatorCodesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "curator code not found" });
    return;
  }

  req.log.info({ curatorCodeId: id, isActive: body.isActive }, "Curator code status changed");
  res.json(updated);
});

/** List profiles created with an accepted curator code, including their current visibility state. */
router.get("/admin/curator-live", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(entriesTable)
    .where(isNotNull(entriesTable.curatedBy))
    .orderBy(desc(entriesTable.createdAt));

  res.json(rows);
});

router.get("/admin/artists", async (req, res): Promise<void> => {
  const parsedQuery = ListAdminArtistsQueryParams.safeParse(req.query);
  const status = parsedQuery.success ? parsedQuery.data.status : "all";

  const baseQuery = db
    .select()
    .from(artistsTable)
    .orderBy(desc(artistsTable.createdAt));

  const rows =
    status && status !== "all"
      ? await db
          .select()
          .from(artistsTable)
          .where(eq(artistsTable.status, status))
          .orderBy(desc(artistsTable.createdAt))
      : await baseQuery;

  res.json(rows);
});

router.post("/admin/artists", async (req, res): Promise<void> => {
  const parsed = CreateAdminArtistBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid artist body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [artist] = await db
    .insert(artistsTable)
    .values({
      name: parsed.data.name,
      instagramUrl: parsed.data.instagramUrl,
      location: parsed.data.location,
      status: "pending",
      isClaimed: false,
    })
    .returning();

  res.status(201).json(artist);
});

router.patch("/admin/artists/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateAdminArtistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(artistsTable)
    .set(parsed.data)
    .where(eq(artistsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Artist not found" });
    return;
  }

  res.json(updated);
});

router.post("/admin/artists/:id/publish", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [artist] = await db
    .select()
    .from(artistsTable)
    .where(eq(artistsTable.id, id));

  if (!artist) {
    res.status(404).json({ error: "Artist not found" });
    return;
  }

  if (artist.lat == null || artist.lng == null) {
    res.status(400).json({ error: "Artist has no pin location — drop a pin first" });
    return;
  }

  const { lat, lng } = obfuscate(artist.lat, artist.lng);

  // Parse city / country out of artist.location (format "City, Country")
  const parts = artist.location.split(",").map((s) => s.trim());
  const city = parts[0] ?? artist.location;
  const country = parts[1] ?? "";

  const [entry] = await db
    .insert(entriesTable)
    .values({
      name: artist.name,
      kind: "artist",
      tags: [],
      city,
      country,
      lat,
      lng,
      url: artist.instagramUrl,
      blurb: artist.bio ?? null,
    })
    .returning();

  req.log.info({ artistId: id, entryId: entry.id }, "Artist published to map");
  res.status(201).json(GetEntryResponse.parse(entry));
});

router.delete("/admin/artists/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(artistsTable)
    .where(eq(artistsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Artist not found" });
    return;
  }

  res.status(204).send();
});

/** List all approved (live) entries on the map */
router.get("/admin/entries", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.isApproved, true), isNull(entriesTable.deletedAt)))
    .orderBy(desc(entriesTable.createdAt));
  res.json(rows);
});

router.post("/admin/entries/curation-import", async (req, res): Promise<void> => {
  const parsed = PublishCuratedPinsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid pin batch" });
    return;
  }

  const results: Array<{ sourceKey: string; id: number; action: "created" | "existing" }> = [];
  for (const pin of parsed.data.entries) {
    if (pin.replaceEntryId) {
      const [target] = await db
        .select({ id: entriesTable.id, isClaimed: entriesTable.isClaimed, claimedEmail: entriesTable.claimedEmail, deletedAt: entriesTable.deletedAt })
        .from(entriesTable)
        .where(eq(entriesTable.id, pin.replaceEntryId))
        .limit(1);
      if (!target || target.deletedAt || target.isClaimed || target.claimedEmail) {
        res.status(409).json({ error: `entry ${pin.replaceEntryId} is missing, retired, or already claimed` });
        return;
      }
      const [updated] = await db.update(entriesTable).set({
        name: pin.name.trim(),
        kind: pin.kind,
        city: pin.city.trim(),
        country: pin.country.trim(),
        lat: pin.lat,
        lng: pin.lng,
        url: pin.url,
        tags: pin.tags,
        contactEmail: pin.contactEmail?.trim().toLowerCase() ?? null,
        status: "published",
        isApproved: true,
        visibility: "public",
        mapEligible: true,
        isHidden: false,
        subcultures: [],
      }).where(eq(entriesTable.id, pin.replaceEntryId)).returning({ id: entriesTable.id });
      if (!updated) {
        res.status(500).json({ error: `could not replace entry ${pin.replaceEntryId}` });
        return;
      }
      results.push({ sourceKey: pin.sourceKey, id: updated.id, action: "existing" });
      continue;
    }

    const [existing] = await db
      .select({ id: entriesTable.id })
      .from(entriesTable)
      .where(and(
        ilike(entriesTable.name, pin.name.trim()),
        ilike(entriesTable.city, pin.city.trim()),
        ilike(entriesTable.country, pin.country.trim()),
        isNull(entriesTable.deletedAt),
      ))
      .limit(1);
    if (existing) {
      results.push({ sourceKey: pin.sourceKey, id: existing.id, action: "existing" });
      continue;
    }

    const [created] = await db.insert(entriesTable).values({
      name: pin.name.trim(),
      kind: pin.kind,
      city: pin.city.trim(),
      country: pin.country.trim(),
      lat: pin.lat,
      lng: pin.lng,
      url: pin.url,
      tags: pin.tags,
      contactEmail: pin.contactEmail?.trim().toLowerCase() ?? null,
      status: "published",
      isApproved: true,
      visibility: "public",
      mapEligible: true,
      isClaimed: false,
      claimedEmail: null,
      isHidden: false,
      subcultures: [],
    }).returning({ id: entriesTable.id });
    if (!created) {
      res.status(500).json({ error: `could not publish ${pin.name}` });
      return;
    }
    results.push({ sourceKey: pin.sourceKey, id: created.id, action: "created" });
  }

  for (const id of parsed.data.retireEntryIds ?? []) {
    await db.update(entriesTable)
      .set({ isHidden: true, mapEligible: false })
      .where(and(
        eq(entriesTable.id, id),
        eq(entriesTable.isClaimed, false),
        isNull(entriesTable.claimedEmail),
        isNull(entriesTable.deletedAt),
      ));
  }

  req.log.info({ count: results.length, created: results.filter((item) => item.action === "created").length, retired: parsed.data.retireEntryIds?.length ?? 0 }, "Curated pins imported");
  res.status(201).json(PublishCuratedPinsResponse.parse({ results }));
});

router.post("/admin/entries/:id/claim-invitations", async (req, res): Promise<void> => {
  const parsedParams = SendSpaceClaimInvitationParams.safeParse({ id: req.params.id });
  const parsedBody = SendSpaceClaimInvitationBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "a valid entry id, email, and verification confirmation are required" });
    return;
  }

  const { id } = parsedParams.data;
  const email = parsedBody.data.email.trim().toLowerCase();
  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.id, id))
    .limit(1);

  const isCollective = entry?.kind === "artist" && entry.tags?.includes("collective");
  if (!entry || (entry.kind !== "space" && !isCollective) || entry.deletedAt) {
    res.status(404).json({ error: "public space or collective listing not found" });
    return;
  }
  if (
    !entry.isApproved
    || entry.status !== "published"
    || entry.visibility !== "public"
    || entry.isHidden
    || !entry.mapEligible
    || entry.isClaimed
    || entry.claimedEmail
  ) {
    res.status(409).json({ error: "listing is not an eligible unclaimed public space" });
    return;
  }

  const rawToken = crypto.randomBytes(6).toString("hex").toUpperCase();
  const token = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const scheduledAt = parsedBody.data.scheduledAt ? new Date(parsedBody.data.scheduledAt) : undefined;
  if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt < now || scheduledAt.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
    res.status(400).json({ error: "scheduledAt must be within the next 30 days" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(magicLinkTokensTable)
      .set({ usedAt: now })
      .where(and(
        eq(magicLinkTokensTable.entryId, id),
        eq(magicLinkTokensTable.purpose, "space_claim"),
        isNull(magicLinkTokensTable.usedAt),
      ));
    await tx.insert(magicLinkTokensTable).values({
      token,
      email,
      entryId: id,
      purpose: "space_claim",
      expiresAt,
    });
  });

  const siteUrl = process.env.SITE_URL ?? "https://countercult.network";
  const claimUrl = `${siteUrl}/claim-space?entryId=${id}`;
  try {
    await sendSpaceClaimInvitationEmail(
      email,
      entry.id,
      entry.name,
      claimUrl,
      expiresAt,
      rawToken,
      scheduledAt,
    );
  } catch (error) {
    await db
      .update(magicLinkTokensTable)
      .set({ usedAt: new Date() })
      .where(and(
        eq(magicLinkTokensTable.token, token),
        isNull(magicLinkTokensTable.usedAt),
      ));
    req.log.error({ err: error, entryId: id }, "Space claim invitation email failed");
    res.status(503).json({ error: "invitation email could not be delivered; no active invitation was left behind" });
    return;
  }

  req.log.info({ entryId: id, email }, "Space claim invitation sent");
  res.status(201).json(SendSpaceClaimInvitationResponse.parse({
    ok: true,
    entryId: id,
    entryName: entry.name,
    email,
    expiresAt,
  }));
});

/** Commercial classification queue. This is deliberately separate from cultural approval. */
router.get("/admin/spaces", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: entriesTable.id,
      name: entriesTable.name,
      city: entriesTable.city,
      status: entriesTable.status,
      organizationModel: entriesTable.organizationModel,
      intendedCommercialUse: entriesTable.intendedCommercialUse,
      commercialUseDescription: entriesTable.commercialUseDescription,
      declaredClassification: entriesTable.declaredClassification,
      derivedClassification: entriesTable.derivedClassification,
      reviewedClassification: entriesTable.reviewedClassification,
      paymentStatus: entriesTable.paymentStatus,
    })
    .from(entriesTable)
    .where(and(eq(entriesTable.kind, "space"), isNull(entriesTable.deletedAt)))
    .orderBy(desc(entriesTable.createdAt));
  res.json(rows);
});

router.patch("/admin/spaces/:id/classification", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  const classification = (req.body as { classification?: unknown } | undefined)?.classification;
  if (Number.isNaN(id) || (classification !== "independent" && classification !== "commercial")) {
    res.status(400).json({ error: "id and classification (independent or commercial) are required" });
    return;
  }
  if (classification === "independent") {
    const [subscription] = await db
      .select({ status: entrySubscriptionsTable.status })
      .from(entrySubscriptionsTable)
      .where(eq(entrySubscriptionsTable.entryId, id));
    if (subscription && ["active", "trialing"].includes(subscription.status)) {
      res.status(409).json({ error: "cancel the active commercial plan before moving this space to the free classification" });
      return;
    }
  }
  const [updated] = await db.update(entriesTable).set({
    reviewedClassification: classification,
    classificationReviewedAt: new Date(),
  }).where(and(eq(entriesTable.id, id), eq(entriesTable.kind, "space"))).returning();
  if (!updated) {
    res.status(404).json({ error: "space not found" });
    return;
  }
  req.log.info({ entryId: id, classification }, "Space classification reviewed");
  res.json(updated);
});

/** Edit any entry field */
router.patch("/admin/entries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const allowed = ["name", "blurb", "url", "heroPhoto", "tags", "kind", "secondaryKind", "city", "country", "lat", "lng", "isApproved", "isHidden", "isVoiceFeatured"];
  const body = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in body) updateData[field] = body[field];
  }
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "no valid fields to update" }); return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(entriesTable).set(updateData as any).where(eq(entriesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "entry not found" }); return; }
  res.json(updated);
});

/** List pending_review entries (artifacts and unclaimed submissions) */
router.get("/admin/entries/pending", async (req, res): Promise<void> => {
  req.log.info("Listing pending_review entries");
  const rows = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.status, "pending_review"), isNull(entriesTable.deletedAt)))
    .orderBy(desc(entriesTable.createdAt));
  res.json(rows);
});

/** List submissions deliberately deferred for later review */
router.get("/admin/entries/maybe-later", async (req, res): Promise<void> => {
  req.log.info("Listing maybe-later entries");
  const rows = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.status, "maybe_later"), isNull(entriesTable.deletedAt)))
    .orderBy(desc(entriesTable.createdAt));
  res.json(rows);
});

/** List pending_email entries — entries the admin has emailed and is awaiting a reply from */
router.get("/admin/entries/emailed", async (req, res): Promise<void> => {
  req.log.info("Listing pending_email entries");
  const rows = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.status, "pending_email"), isNull(entriesTable.deletedAt)))
    .orderBy(desc(entriesTable.createdAt));
  res.json(rows);
});

/** Mark an entry as pending_email (admin has sent the curation email, awaiting reply) */
router.post("/admin/entries/:id/mark-emailed", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }
  const [updated] = await db
    .update(entriesTable)
    .set({ status: "pending_email" })
    .where(eq(entriesTable.id, id))
    .returning();
  req.log.info({ entryId: id }, "Entry marked as pending_email");
  res.json({ ok: true, entry: updated });
});

/** Move a pending submission to the Maybe Later folder */
router.post("/admin/entries/:id/mark-maybe-later", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }
  if (entry.status !== "pending_review") {
    res.status(409).json({ error: "only submissions in review can be deferred" });
    return;
  }
  const [updated] = await db
    .update(entriesTable)
    .set({ status: "maybe_later" })
    .where(eq(entriesTable.id, id))
    .returning();
  req.log.info({ entryId: id }, "Entry deferred to maybe_later");
  res.json({ ok: true, entry: updated });
});

/** Return a deferred submission to the active review queue */
router.post("/admin/entries/:id/return-to-review", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }
  if (entry.status !== "maybe_later") {
    res.status(409).json({ error: "only Maybe Later submissions can return to review" });
    return;
  }
  const [updated] = await db
    .update(entriesTable)
    .set({ status: "pending_review" })
    .where(eq(entriesTable.id, id))
    .returning();
  req.log.info({ entryId: id }, "Deferred entry returned to pending_review");
  res.json({ ok: true, entry: updated });
});


/** Approve & publish an entry — makes it strictly visible on the public map */
router.post("/admin/entries/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }

  const body = req.body as { lat?: number; lng?: number } | undefined;
  const jitterFn = (max: number) => (Math.random() * 2 - 1) * max;
  const updates: { isApproved: boolean; status: string; lat?: number; lng?: number } = { isApproved: true, status: "published" };

  if (body?.lat != null && body?.lng != null) {
    // Admin explicitly dropped a pin — use it (with jitter for artists)
    if (entry.kind === "artist") {
      updates.lat = body.lat + jitterFn(0.0045);
      updates.lng = body.lng + jitterFn(0.0045);
    } else {
      updates.lat = body.lat;
      updates.lng = body.lng;
    }
  }

  const [updated] = await db
    .update(entriesTable)
    .set(updates)
    .where(eq(entriesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "entry not found" }); return; }

  // Upsert the canonical owner user row with is_approved = true.
  // contactEmail is the submitted artist email (submittedBy is excluded — it may be a nominator).
  const ownerEmail = entry.contactEmail;
  if (ownerEmail) {
    await db
      .insert(usersTable)
      .values({ email: ownerEmail, isApproved: true, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: { isApproved: true },
      });
  }

  // Claim the approval email slot atomically so duplicate approval requests cannot
  // send the same notification twice. The flag is reset if Resend rejects the send.
  const recipientEmail = entry.contactEmail ?? null;
  let approvalEmailStatus: "sent" | "failed" | "already_sent" | "no_recipient" = "no_recipient";
  if (recipientEmail) {
    const [emailClaim] = await db
      .update(entriesTable)
      .set({ approvalEmailSent: true })
      .where(and(eq(entriesTable.id, id), eq(entriesTable.approvalEmailSent, false)))
      .returning({ id: entriesTable.id });

    if (emailClaim) {
      try {
        const sent = await sendApprovalEmail(recipientEmail, entry.name);
        if (!sent) {
          approvalEmailStatus = "failed";
          await db.update(entriesTable).set({ approvalEmailSent: false }).where(eq(entriesTable.id, id));
          req.log.warn({ entryId: id }, "Approval email not sent because Resend is not configured");
        } else {
          approvalEmailStatus = "sent";
          req.log.info({ entryId: id, email: recipientEmail }, "Approval email sent");
        }
      } catch (emailErr) {
        approvalEmailStatus = "failed";
        await db.update(entriesTable).set({ approvalEmailSent: false }).where(eq(entriesTable.id, id));
        req.log.error({ err: emailErr, entryId: id }, "Approval email failed (non-fatal)");
      }
    } else {
      approvalEmailStatus = "already_sent";
      req.log.info({ entryId: id }, "Approval email already sent");
    }

    await scheduleApprovalMemberCheckIn(id, recipientEmail, entry.name);
  }

  res.json({ ok: true, id, approvalEmailStatus });
});

/** Revoke approval — hides from map, sets is_approved=false, kills active sessions */
router.post("/admin/entries/:id/revoke", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [entry] = await db.select().from(entriesTable).where(eq(entriesTable.id, id));
  if (!entry) { res.status(404).json({ error: "entry not found" }); return; }

  // Set entry back to pending_review and revoke approval
  await db
    .update(entriesTable)
    .set({ isApproved: false, status: "pending_review" })
    .where(eq(entriesTable.id, id));

  // Target only the canonical owner email for revoke.
  // contactEmail is the submitted artist email (submittedBy is excluded — it is the nominator).
  const ownerEmail = entry.contactEmail;

  if (ownerEmail) {
    const email = ownerEmail.toLowerCase();
    // Revoke is_approved on the owner's user row
    await db.update(usersTable).set({ isApproved: false }).where(eq(usersTable.email, email));

    // Kill all active sessions for this email (kill switch)
    const now = new Date();
    await db
      .delete(magicLinkTokensTable)
      .where(and(
        eq(magicLinkTokensTable.email, email),
        eq(magicLinkTokensTable.purpose, "session"),
        gt(magicLinkTokensTable.expiresAt, now),
      ));
  }

  try {
    await cancelApprovalMemberCheckIn(id);
  } catch (emailErr) {
    req.log.error({ err: emailErr, entryId: id }, "Could not cancel scheduled member check-in after revocation");
  }
  req.log.info({ entryId: id, ownerEmail }, "Approval revoked, sessions killed");
  res.json({ ok: true, id });
});

/** Reset a user's password (admin utility — set a new plaintext password that gets hashed) */
/**
 * Generate a password-reset link for an artist without sending any email.
 * Admin copies the URL and delivers it via any channel they choose.
 */
router.post("/admin/users/generate-reset-link", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) { res.status(400).json({ error: "email required" }); return; }
  const normalized = email.trim().toLowerCase();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalized));
  if (!user) { res.status(404).json({ error: `no user found for ${normalized}` }); return; }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(magicLinkTokensTable).values({
    token,
    email: normalized,
    entryId: null,
    purpose: "password_reset",
    expiresAt,
  });

    const siteUrl = process.env.SITE_URL ?? "https://countercult.network";
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;

  req.log.info({ email: normalized }, "Admin generated password reset link");
  res.json({ ok: true, resetUrl });
});

router.post("/admin/users/reset-password", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  const normalized = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password.trim(), 12);
  const [updated] = await db
    .update(usersTable)
    .set({ passwordHash: hash })
    .where(eq(usersTable.email, normalized))
    .returning({ email: usersTable.email });
  if (!updated) {
    res.status(404).json({ error: `no user found for ${normalized}` });
    return;
  }
  req.log.info({ email: normalized }, "Admin reset user password");
  res.json({ ok: true, email: updated.email });
});

/** Permanently remove an account's login/application data and hide linked pins. */
router.post("/admin/users/delete-account", async (req, res): Promise<void> => {
  const { email, confirmation } = req.body as { email?: string; confirmation?: string };
  if (!email?.trim() || confirmation !== "DELETE") {
    res.status(400).json({ error: "email and DELETE confirmation required" });
    return;
  }

  const normalized = email.trim().toLowerCase();
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, normalized));

    const deletedSessions = await tx
      .delete(magicLinkTokensTable)
      .where(eq(magicLinkTokensTable.email, normalized))
      .returning({ id: magicLinkTokensTable.id });

    const deletedApplications = await tx
      .delete(incomingApplicationsTable)
      .where(eq(incomingApplicationsTable.email, normalized))
      .returning({ id: incomingApplicationsTable.id });

    const hiddenEntries = await tx
      .update(entriesTable)
      .set({ deletedAt: new Date() })
      .where(and(
        or(eq(entriesTable.contactEmail, normalized), eq(entriesTable.claimedEmail, normalized)),
        isNull(entriesTable.deletedAt),
      ))
      .returning({ id: entriesTable.id });

    const deletedUsers = await tx
      .delete(usersTable)
      .where(eq(usersTable.email, normalized))
      .returning({ email: usersTable.email });

    return {
      found: Boolean(user),
      deletedUsers: deletedUsers.length,
      deletedSessions: deletedSessions.length,
      deletedApplications: deletedApplications.length,
      hiddenEntries: hiddenEntries.length,
    };
  });

  if (!result.found && result.deletedUsers === 0 && result.deletedSessions === 0 && result.deletedApplications === 0 && result.hiddenEntries === 0) {
    res.status(404).json({ error: `no account data found for ${normalized}` });
    return;
  }

  req.log.warn({ email: normalized, ...result }, "Admin permanently removed account data");
  res.json({ ok: true, email: normalized, ...result });
});

/** List all incoming application emails */
router.get("/admin/applications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(incomingApplicationsTable).orderBy(desc(incomingApplicationsTable.createdAt));
  res.json(rows);
});

/** List Fund applications for business follow-up. */
router.get("/admin/fund-applications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(fundApplicationsTable).orderBy(desc(fundApplicationsTable.createdAt));
  res.json(rows);
});

/** Mark a Fund application as contacted without deleting the business brief. */
router.patch("/admin/fund-applications/:id", async (req, res): Promise<void> => {
  const id = Number.parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [updated] = await db
    .update(fundApplicationsTable)
    .set({ status: "contacted", contactedAt: new Date() })
    .where(eq(fundApplicationsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Fund application not found" });
    return;
  }
  res.json(updated);
});

/** Mark a single application as contacted (delete it from the queue) */
router.delete("/admin/applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [deleted] = await db
    .delete(incomingApplicationsTable)
    .where(eq(incomingApplicationsTable.id, id))
    .returning();
  if (!deleted) { res.status(404).json({ error: "application not found" }); return; }
  res.status(204).send();
});

/** Soft-delete an entry (moves to trash, recoverable within 30 days) */
router.delete("/admin/entries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [updated] = await db
    .update(entriesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(entriesTable.id, id), isNull(entriesTable.deletedAt)))
    .returning({ id: entriesTable.id });

  if (!updated) { res.status(404).json({ error: "entry not found or already deleted" }); return; }

  req.log.info({ entryId: id }, "Entry soft-deleted (moved to trash)");
  res.status(204).send();
});

/** List soft-deleted entries from the last 30 days (also purges entries older than 30 days) */
router.get("/admin/entries/deleted", async (req, res): Promise<void> => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Purge entries that have been in the trash for >30 days
  const purged = await db
    .delete(entriesTable)
    .where(and(isNotNull(entriesTable.deletedAt), lt(entriesTable.deletedAt, cutoff)))
    .returning({ id: entriesTable.id });

  if (purged.length > 0) {
    req.log.info({ count: purged.length }, "Purged entries older than 30 days from trash");
  }

  const rows = await db
    .select()
    .from(entriesTable)
    .where(isNotNull(entriesTable.deletedAt))
    .orderBy(desc(entriesTable.deletedAt));

  res.json(rows);
});

/** Restore a soft-deleted entry to its previous status */
router.post("/admin/entries/:id/restore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(and(eq(entriesTable.id, id), isNotNull(entriesTable.deletedAt)));

  if (!entry) { res.status(404).json({ error: "entry not found in trash" }); return; }

  const [restored] = await db
    .update(entriesTable)
    .set({ deletedAt: null })
    .where(eq(entriesTable.id, id))
    .returning();

  req.log.info({ entryId: id }, "Entry restored from trash");
  res.json({ ok: true, entry: restored });
});

export default router;
