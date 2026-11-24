import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { desc, eq } from "drizzle-orm";
import { db, artHouseApplicationsTable } from "@workspace/db";
import {
  GetStudioArtHouseApplicationsResponse,
  SubmitArtHouseApplicationBody,
  SubmitArtHouseApplicationResponse,
  UpdateStudioArtHouseApplicationStatusBody,
  UpdateStudioArtHouseApplicationStatusParams,
  UpdateStudioArtHouseApplicationStatusResponse,
} from "@workspace/api-zod";
import { requireStudioAdmin } from "../lib/studioAuth";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";

const router: IRouter = Router();
const RESIDENCY_START_DATE = "2026-12-16";
const RESIDENCY_END_DATE = "2026-12-26";

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const artHouseApplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many applications. Please try again later." },
  store: new PgRateLimitStore("art-house-applications:"),
});

router.post("/applications/art-houses", artHouseApplicationLimiter, async (req, res): Promise<void> => {
  const parsed = SubmitArtHouseApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required application fields." });
    return;
  }
  const application = parsed.data;
  if (application.honeypot) {
    res.status(400).json({ error: "Unable to submit this application." });
    return;
  }
  if (application.privacyConsent !== true) {
    res.status(400).json({ error: "Please confirm how your application details will be used." });
    return;
  }
  if (
    !isCalendarDate(application.availableFrom) ||
    !isCalendarDate(application.availableTo) ||
    application.availableFrom < RESIDENCY_START_DATE ||
    application.availableFrom > RESIDENCY_END_DATE ||
    application.availableTo < RESIDENCY_START_DATE ||
    application.availableTo > RESIDENCY_END_DATE
  ) {
    res.status(400).json({ error: "Choose dates within the residency period, 16–26 December 2026." });
    return;
  }
  if (application.availableFrom > application.availableTo) {
    res.status(400).json({ error: "The end date must be the same as or later than the start date." });
    return;
  }
  if (application.applyingAs === "duo" && !application.secondArtistName?.trim()) {
    res.status(400).json({ error: "Please include the second artist’s name for a duo application." });
    return;
  }
  if (application.applyingAs === "solo" && application.secondArtistName?.trim()) {
    res.status(400).json({ error: "Remove the second artist’s name or apply as a duo." });
    return;
  }

  let workUrl: URL;
  try {
    workUrl = new URL(application.portfolioUrl);
  } catch {
    res.status(400).json({ error: "Please provide a valid link to your work." });
    return;
  }
  if (workUrl.protocol !== "https:" && workUrl.protocol !== "http:") {
    res.status(400).json({ error: "Your work link must start with https:// or http://." });
    return;
  }

  try {
    const [saved] = await db.insert(artHouseApplicationsTable).values({
      name: application.name.trim(),
      email: application.email.trim().toLowerCase(),
      applyingAs: application.applyingAs,
      secondArtistName: application.secondArtistName?.trim() || null,
      portfolioUrl: workUrl.toString(),
      availableForAllDates:
        application.availableFrom === RESIDENCY_START_DATE &&
        application.availableTo === RESIDENCY_END_DATE,
      availableFrom: application.availableFrom,
      availableTo: application.availableTo,
      residencyPlan: application.residencyPlan.trim(),
      sharedLiving: application.sharedLiving.trim(),
      friendsDescription: application.friendsDescription.trim(),
      networkMember: application.networkMember,
      networkConnection: application.networkConnection?.trim() ?? "",
      considerPatronPost: application.considerPatronPost,
      privacyConsentAt: new Date(),
    }).returning({ id: artHouseApplicationsTable.id });

    req.log.info({ applicationId: saved.id, applyingAs: application.applyingAs }, "Art House application saved");
    res.status(201).json(SubmitArtHouseApplicationResponse.parse({ submitted: true }));
  } catch (error) {
    req.log.error({ err: error }, "Art House application could not be saved");
    res.status(503).json({ error: "We could not save your application. Please try again." });
  }
});

router.get("/studio/art-house-applications", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    const applications = await db.select().from(artHouseApplicationsTable)
      .orderBy(desc(artHouseApplicationsTable.createdAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(GetStudioArtHouseApplicationsResponse.parse(applications));
  } catch (error) {
    req.log.error({ err: error }, "Art House applications could not be loaded");
    res.status(503).json({ error: "Applications could not be loaded right now." });
  }
});

router.patch("/studio/art-house-applications/:id", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const params = UpdateStudioArtHouseApplicationStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "A valid application ID is required." });
    return;
  }
  const parsed = UpdateStudioArtHouseApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid application review status." });
    return;
  }
  try {
    const [application] = await db.update(artHouseApplicationsTable).set({
      status: parsed.data.status,
      reviewedAt: parsed.data.status === "reviewed" ? new Date() : null,
    }).where(eq(artHouseApplicationsTable.id, params.data.id)).returning();
    if (!application) {
      res.status(404).json({ error: "Application not found." });
      return;
    }
    res.json(UpdateStudioArtHouseApplicationStatusResponse.parse(application));
  } catch (error) {
    req.log.error({ err: error }, "Art House application status could not be updated");
    res.status(503).json({ error: "Application status could not be updated right now." });
  }
});

export default router;
