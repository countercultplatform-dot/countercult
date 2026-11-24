import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import {
  db,
  artHouseApplicationsTable,
  entriesTable,
  exchangeDigestUnsubscribeTokensTable,
  entryCommentsTable,
  entryRatingsTable,
  fundApplicationsTable,
  incomingApplicationsTable,
  magicLinkTokensTable,
  pledgeEmailsTable,
  privacyRequestsTable,
  residencyOffersTable,
  residencyShortlistsTable,
  signupDraftsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { z } from "zod";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const requestTypeSchema = z.enum([
  "delete",
  "access",
  "restrict",
  "object",
  "hide_profile",
  "unhide_profile",
  "newsletter_withdrawal",
]);

type Session = { email: string };

function sessionFor(req: Request): Session {
  return (req as any).ccSession as Session;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || req.header("x-admin-password") !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}

function ownedEntryFilter(email: string) {
  return or(eq(entriesTable.contactEmail, email), eq(entriesTable.submittedBy, email));
}

function objectPathsFromEntry(entry: { heroPhoto: string | null; portfolioPhotos: string[] | null }): string[] {
  return [entry.heroPhoto, ...(entry.portfolioPhotos ?? [])]
    .filter((value): value is string => Boolean(value))
    .filter((value) => value.startsWith("/api/storage/objects/") || value.startsWith("/objects/") || value.startsWith("https://storage.googleapis.com/"));
}

async function deleteAccountData(email: string): Promise<{
  email: string;
  entryIds: number[];
  objectPaths: string[];
  deletedOffers: number;
  deletedArtHouseApplications: number;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.transaction(async (tx) => {
    const entries = await tx
      .select({
        id: entriesTable.id,
        heroPhoto: entriesTable.heroPhoto,
        portfolioPhotos: entriesTable.portfolioPhotos,
      })
      .from(entriesTable)
      .where(ownedEntryFilter(normalizedEmail));
    const entryIds = entries.map((entry) => entry.id);
    const objectPaths = entries.flatMap(objectPathsFromEntry);

    const offers = await tx
      .select({ id: residencyOffersTable.id, photos: residencyOffersTable.photos })
      .from(residencyOffersTable)
      .where(eq(residencyOffersTable.posterEmail, normalizedEmail));
    const offerIds = offers.map((offer) => offer.id);
    objectPaths.push(...offers.flatMap((offer) => (offer.photos ?? []).filter((photo) => photo.startsWith("/api/storage/objects/") || photo.startsWith("/objects/"))));

    if (entryIds.length > 0) {
      await tx.delete(entryCommentsTable).where(or(inArray(entryCommentsTable.entryId, entryIds), inArray(entryCommentsTable.authorEntryId, entryIds)));
      await tx.delete(entryRatingsTable).where(or(inArray(entryRatingsTable.entryId, entryIds), inArray(entryRatingsTable.raterEntryId, entryIds)));
    }
    if (offerIds.length > 0) {
      await tx.delete(residencyShortlistsTable).where(or(inArray(residencyShortlistsTable.applicantOfferId, offerIds), inArray(residencyShortlistsTable.partnerOfferId, offerIds)));
      await tx.delete(residencyOffersTable).where(inArray(residencyOffersTable.id, offerIds));
    }
    await tx
      .update(residencyOffersTable)
      .set({ claimerEmail: null })
      .where(eq(residencyOffersTable.claimerEmail, normalizedEmail));

    await tx.delete(incomingApplicationsTable).where(eq(incomingApplicationsTable.email, normalizedEmail));
    const deletedArtHouseApplications = await tx.delete(artHouseApplicationsTable)
      .where(eq(artHouseApplicationsTable.email, normalizedEmail))
      .returning({ id: artHouseApplicationsTable.id });
    await tx.delete(fundApplicationsTable).where(eq(fundApplicationsTable.email, normalizedEmail));
    await tx.delete(pledgeEmailsTable).where(eq(pledgeEmailsTable.email, normalizedEmail));
    await tx.delete(signupDraftsTable).where(eq(signupDraftsTable.email, normalizedEmail));
    await tx.delete(exchangeDigestUnsubscribeTokensTable).where(eq(exchangeDigestUnsubscribeTokensTable.email, normalizedEmail));
    await tx.delete(magicLinkTokensTable).where(eq(magicLinkTokensTable.email, normalizedEmail));

    if (entryIds.length > 0) {
      await tx
        .update(entriesTable)
        .set({
          name: "deleted profile",
          city: "removed",
          country: "removed",
          blurb: null,
          url: null,
          heroPhoto: null,
          portfolioPhotos: [],
          externalLinks: [],
          experiences: [],
          shopUrl: null,
          offerings: null,
          basedIn: [],
          contactEmail: null,
          submittedBy: null,
          status: "deleted",
          isApproved: false,
          isHidden: true,
          mapEligible: false,
          visibility: "private",
          tags: [],
          openTo: [],
          joinReason: null,
          spaceOfferDetails: null,
          deletedAt: new Date(),
        })
        .where(inArray(entriesTable.id, entryIds));
    }

    await tx.delete(usersTable).where(eq(usersTable.email, normalizedEmail));
    return {
      email: normalizedEmail,
      entryIds,
      objectPaths,
      deletedOffers: offerIds.length,
      deletedArtHouseApplications: deletedArtHouseApplications.length,
    };
  });

  await Promise.all(result.objectPaths.map(async (path) => {
    try {
      await objectStorageService.deleteObjectEntity(path);
    } catch {
      // Data removal is complete even if an already-missing object cannot be removed.
    }
  }));

  return result;
}

router.get("/privacy/export", requireAuth, async (req, res): Promise<void> => {
  const email = sessionFor(req).email.toLowerCase();
  const [user] = await db
    .select({
      email: usersTable.email,
      isApproved: usersTable.isApproved,
      accountRole: usersTable.accountRole,
      displayName: usersTable.displayName,
      referralCode: usersTable.referralCode,
      referredBy: usersTable.referredBy,
      signupSource: usersTable.signupSource,
      signupMedium: usersTable.signupMedium,
      signupCampaign: usersTable.signupCampaign,
      signupReferrerDomain: usersTable.signupReferrerDomain,
      signupLandingPath: usersTable.signupLandingPath,
      signupReportedSource: usersTable.signupReportedSource,
      newsletterOptIn: usersTable.newsletterOptIn,
      newsletterOptedInAt: usersTable.newsletterOptedInAt,
      exchangeDigestOptIn: usersTable.exchangeDigestOptIn,
      exchangeDigestOptedInAt: usersTable.exchangeDigestOptedInAt,
      createdAt: usersTable.createdAt,
      lastSeen: usersTable.lastSeen,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (!user) {
    res.status(404).json({ error: "account not found" });
    return;
  }

  const entries = await db.select().from(entriesTable).where(ownedEntryFilter(email));
  const entryIds = entries.map((entry) => entry.id);
  const offers = await db.select().from(residencyOffersTable).where(eq(residencyOffersTable.posterEmail, email));
  const comments = entryIds.length > 0
    ? await db.select().from(entryCommentsTable).where(inArray(entryCommentsTable.authorEntryId, entryIds))
    : [];
  const ratings = entryIds.length > 0
    ? await db.select().from(entryRatingsTable).where(inArray(entryRatingsTable.raterEntryId, entryIds))
    : [];
  const applications = await db.select().from(incomingApplicationsTable).where(eq(incomingApplicationsTable.email, email));
  const artHouseApplications = await db.select().from(artHouseApplicationsTable)
    .where(eq(artHouseApplicationsTable.email, email));
  const fundApplications = await db.select().from(fundApplicationsTable).where(eq(fundApplicationsTable.email, email));
  const pledges = await db.select().from(pledgeEmailsTable).where(eq(pledgeEmailsTable.email, email));
  const requests = await db
    .select({
      id: privacyRequestsTable.id,
      requestType: privacyRequestsTable.requestType,
      status: privacyRequestsTable.status,
      details: privacyRequestsTable.details,
      createdAt: privacyRequestsTable.createdAt,
      updatedAt: privacyRequestsTable.updatedAt,
      completedAt: privacyRequestsTable.completedAt,
    })
    .from(privacyRequestsTable)
    .where(eq(privacyRequestsTable.email, email))
    .orderBy(desc(privacyRequestsTable.createdAt));
  const sessions = await db
    .select({
      id: magicLinkTokensTable.id,
      entryId: magicLinkTokensTable.entryId,
      purpose: magicLinkTokensTable.purpose,
      expiresAt: magicLinkTokensTable.expiresAt,
      usedAt: magicLinkTokensTable.usedAt,
      createdAt: magicLinkTokensTable.createdAt,
    })
    .from(magicLinkTokensTable)
    .where(and(eq(magicLinkTokensTable.email, email), eq(magicLinkTokensTable.purpose, "session")));

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: user,
    profiles: entries,
    exchangePosts: offers,
    comments,
    ratings,
    incomingApplications: applications,
    artHouseApplications,
    fundApplications,
    pledgeSubscriptions: pledges,
    privacyRequests: requests,
    sessionHistory: sessions,
    note: "Password hashes, session tokens, and internal moderation secrets are not included.",
  };

  await db.insert(privacyRequestsTable).values({
    email,
    requestType: "access",
    status: "completed",
    details: "Self-service data export downloaded.",
    completedAt: new Date(),
  });

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="countercult-data-export.json"`);
  res.type("application/json").send(JSON.stringify(exportData, null, 2));
});

router.get("/privacy/requests", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: privacyRequestsTable.id,
      requestType: privacyRequestsTable.requestType,
      status: privacyRequestsTable.status,
      details: privacyRequestsTable.details,
      createdAt: privacyRequestsTable.createdAt,
      updatedAt: privacyRequestsTable.updatedAt,
      completedAt: privacyRequestsTable.completedAt,
    })
    .from(privacyRequestsTable)
    .where(eq(privacyRequestsTable.email, sessionFor(req).email.toLowerCase()))
    .orderBy(desc(privacyRequestsTable.createdAt));
  res.setHeader("Cache-Control", "no-store");
  res.json(rows);
});

router.post("/privacy/requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    requestType: requestTypeSchema,
    details: z.string().trim().max(1000).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "a valid privacy request type is required" });
    return;
  }

  const email = sessionFor(req).email.toLowerCase();
  const now = new Date();
  if (parsed.data.requestType === "newsletter_withdrawal") {
    await db.update(usersTable).set({ newsletterOptIn: false, newsletterOptedInAt: null }).where(eq(usersTable.email, email));
  }
  if (parsed.data.requestType === "hide_profile" || parsed.data.requestType === "unhide_profile") {
    await db
      .update(entriesTable)
      .set({ isHidden: parsed.data.requestType === "hide_profile" })
      .where(ownedEntryFilter(email));
  }

  const completedImmediately = ["newsletter_withdrawal", "hide_profile", "unhide_profile"].includes(parsed.data.requestType);
  const [request] = await db.insert(privacyRequestsTable).values({
    email,
    requestType: parsed.data.requestType,
    status: completedImmediately ? "completed" : "pending",
    details: parsed.data.details ?? null,
    completedAt: completedImmediately ? now : null,
  }).returning({
    id: privacyRequestsTable.id,
    requestType: privacyRequestsTable.requestType,
    status: privacyRequestsTable.status,
    createdAt: privacyRequestsTable.createdAt,
    completedAt: privacyRequestsTable.completedAt,
  });

  req.log.info({ email, requestType: parsed.data.requestType }, "Privacy request created");
  res.status(201).json({ ok: true, request });
});

router.get("/admin/privacy/requests", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: privacyRequestsTable.id,
      email: privacyRequestsTable.email,
      requestType: privacyRequestsTable.requestType,
      status: privacyRequestsTable.status,
      details: privacyRequestsTable.details,
      createdAt: privacyRequestsTable.createdAt,
      updatedAt: privacyRequestsTable.updatedAt,
      completedAt: privacyRequestsTable.completedAt,
    })
    .from(privacyRequestsTable)
    .orderBy(desc(privacyRequestsTable.createdAt));
  res.json(rows);
});

router.patch("/admin/privacy/requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = z.object({
    status: z.enum(["in_progress", "completed", "rejected"]),
    details: z.string().trim().max(1000).optional(),
  }).safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "valid request id, status, and details are required" });
    return;
  }

  const [request] = await db.select().from(privacyRequestsTable).where(eq(privacyRequestsTable.id, id));
  if (!request) {
    res.status(404).json({ error: "privacy request not found" });
    return;
  }
  if (request.requestType === "delete" && parsed.data.status === "completed") {
    const deletion = await deleteAccountData(request.email);
    const [updated] = await db.update(privacyRequestsTable).set({
      status: "completed",
      details: parsed.data.details ?? `Account data removed. ${deletion.entryIds.length} profile(s), ${deletion.deletedOffers} Exchange post(s), and ${deletion.deletedArtHouseApplications} art residency application(s) processed.`,
      completedAt: new Date(),
    }).where(eq(privacyRequestsTable.id, id)).returning();
    res.json({ ok: true, request: updated });
    return;
  }

  const [updated] = await db.update(privacyRequestsTable).set({
    status: parsed.data.status,
    details: parsed.data.details ?? request.details,
    completedAt: parsed.data.status === "completed" || parsed.data.status === "rejected" ? new Date() : null,
  }).where(eq(privacyRequestsTable.id, id)).returning();
  res.json({ ok: true, request: updated });
});

export async function purgeExpiredPrivacyData(): Promise<{ sessions: number; requests: number }> {
  const now = new Date();
  const expiredSessions = await db.delete(magicLinkTokensTable)
    .where(and(eq(magicLinkTokensTable.purpose, "session"), lt(magicLinkTokensTable.expiresAt, now)))
    .returning({ id: magicLinkTokensTable.id });
  const requestCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oldRequests = await db.delete(privacyRequestsTable)
    .where(and(eq(privacyRequestsTable.status, "completed"), lt(privacyRequestsTable.createdAt, requestCutoff)))
    .returning({ id: privacyRequestsTable.id });
  return { sessions: expiredSessions.length, requests: oldRequests.length };
}

export { deleteAccountData };
export default router;