import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod/v4";
import { db, signupDraftsTable } from "@workspace/db";
import { sendSignupDraftEmail } from "../lib/email.js";
import { PgRateLimitStore } from "../lib/pgRateLimitStore.js";
import {
  createSignupDraftToken,
  hashSignupDraftToken,
  SIGNUP_DRAFT_TTL_MS,
} from "../lib/signupDrafts.js";

const router: IRouter = Router();

const draftLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many save attempts — try again in 15 minutes" },
  store: new PgRateLimitStore(),
});

export const signupDraftPayloadSchema = z.object({
  screen: z.enum(["identity", "profile", "details"]).default("details"),
  detailsStep: z.enum(["practice", "looking", "disclaimer", "submit"]).default("looking"),
  kind: z.enum(["artist", "space"]),
  physicalSpaceConfirmed: z.boolean().default(false),
  name: z.string().trim().max(120).default(""),
  socialHandle: z.string().trim().max(300).default(""),
  curatedBy: z.string().max(200).default(""),
  locationText: z.string().trim().max(120).default(""),
  countryText: z.string().trim().max(120).default(""),
  basedInInput: z.string().trim().max(800).default(""),
  artistTypeInput: z.string().trim().max(500).default(""),
  customProfileTagInput: z.string().trim().max(120).default(""),
  blurb: z.string().trim().max(1000).default(""),
  profileVisibility: z.enum(["public", "network"]).default("public"),
  ruralSelected: z.boolean().default(false),
  shareChoices: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  lookingFor: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  openTo: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  offerings: z.string().trim().max(1200).default(""),
  offeringDetails: z.string().trim().max(1200).default(""),
  shopUrl: z.string().trim().max(300).default(""),
  shareOffer: z.string().trim().max(1200).default(""),
  hopeToFind: z.string().trim().max(1200).default(""),
  discoverySource: z.string().default(""),
  signupAttribution: z.object({
    source: z.string().max(100).regex(/^[a-zA-Z0-9._-]*$/).optional(),
    medium: z.string().max(100).regex(/^[a-zA-Z0-9._-]*$/).optional(),
    campaign: z.string().max(100).regex(/^[a-zA-Z0-9._-]*$/).optional(),
    referrerDomain: z.string().max(253).regex(/^[a-zA-Z0-9.-]*$/).optional(),
    landingPath: z.string().max(255).refine(
      (path) => path.startsWith("/") && !path.startsWith("//") && !/[?#]/.test(path),
    ).optional(),
  }).optional(),
  networkNextSteps: z.string().default(""),
  spaceOfferAvailable: z.boolean().nullable().default(null),
  spaceOfferTypes: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  spaceOfferCategory: z.string().max(80).default(""),
  spaceOfferPricing: z.string().max(80).default(""),
  spaceOfferDetails: z.string().trim().max(600).default(""),
  organizationModel: z.string().max(80).default(""),
  intendedCommercialUse: z.boolean().nullable().default(null),
  commercialUseDescription: z.string().trim().max(600).default(""),
  newsletterOptIn: z.boolean().default(false),
  exchangeDigestOptIn: z.boolean().default(false),
});

const createDraftSchema = z.object({
  email: z.email({ error: "please enter a valid email address" }),
  payload: signupDraftPayloadSchema,
});

router.post("/signup-drafts", draftLimiter, async (req, res): Promise<void> => {
  const parsed = createDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid draft" });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const token = createSignupDraftToken();
  const expiresAt = new Date(Date.now() + SIGNUP_DRAFT_TTL_MS);
  const [draft] = await db
    .insert(signupDraftsTable)
    .values({
      email,
      tokenHash: hashSignupDraftToken(token),
      payload: parsed.data.payload,
      expiresAt,
    })
    .returning({ id: signupDraftsTable.id });

  if (!draft) {
    res.status(500).json({ error: "could not save your application" });
    return;
  }

  const resumeUrl = `https://countercult.network/explore?action=join&resume=${encodeURIComponent(token)}`;
  try {
    await sendSignupDraftEmail(email, resumeUrl, expiresAt);
  } catch (error) {
    await db.delete(signupDraftsTable).where(eq(signupDraftsTable.id, draft.id));
    req.log.error({ err: error }, "Signup draft email failed");
    res.status(502).json({ error: "we could not send the resume email — please try again" });
    return;
  }

  res.status(201).json({ ok: true, expiresAt: expiresAt.toISOString() });
});

router.get("/signup-drafts/resume", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    res.status(404).json({ error: "saved application not found" });
    return;
  }

  const [draft] = await db
    .select({
      email: signupDraftsTable.email,
      payload: signupDraftsTable.payload,
      expiresAt: signupDraftsTable.expiresAt,
    })
    .from(signupDraftsTable)
    .where(
      and(
        eq(signupDraftsTable.tokenHash, hashSignupDraftToken(token)),
        isNull(signupDraftsTable.completedAt),
      ),
    )
    .limit(1);

  if (!draft) {
    res.status(404).json({ error: "saved application not found" });
    return;
  }
  if (draft.expiresAt <= new Date()) {
    res.status(410).json({ error: "this saved application has expired" });
    return;
  }

  res.json({
    ok: true,
    email: draft.email,
    payload: draft.payload,
    expiresAt: draft.expiresAt.toISOString(),
  });
});

export default router;