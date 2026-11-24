import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db, fundApplicationsTable } from "@workspace/db";
import { sendFundApplicationEmail, sendFundPartnerBriefEmail } from "../lib/email";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";

const router: IRouter = Router();

const fundApplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many applications — try again later" },
  store: new PgRateLimitStore("fund-application:"),
});

const fundPartnerBriefLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many partner briefs — try again later" },
  store: new PgRateLimitStore("fund-partner-brief:"),
});

const FundApplicationBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  business: z.string().trim().min(1).max(180),
  location: z.string().trim().min(1).max(180),
  website: z.string().trim().max(300).optional().default(""),
  fundingRoute: z.enum(["sales_linked", "client_programme_budget"]).optional().default("sales_linked"),
  products: z.string().trim().min(1).max(2500),
  amountPerSale: z.string().trim().min(1).max(180),
  desiredCreativeWork: z.string().trim().max(2500).optional().default(""),
  notes: z.string().trim().max(2500).optional().default(""),
});

const FundPartnerBriefBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  business: z.string().trim().min(1).max(180),
  product: z.string().trim().min(1).max(1000),
  locations: z.string().trim().min(1).max(500),
  contributionAmount: z.string().trim().min(1).max(180),
  desiredCreativeWork: z.string().trim().min(1).max(2500),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  artistBooking: z.boolean(),
  production: z.boolean(),
  notes: z.string().trim().max(2500).optional().default(""),
  company: z.string().max(0).optional().default(""),
}).refine((brief) => brief.endDate >= brief.startDate, {
  message: "end date must be on or after the start date",
  path: ["endDate"],
});

router.post("/fund/applications", fundApplicationLimiter, async (req, res): Promise<void> => {
  const parsed = FundApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "please complete the required Fund application fields" });
    return;
  }

  await db.insert(fundApplicationsTable).values(parsed.data);
  try {
    await sendFundApplicationEmail(parsed.data);
  } catch (error) {
    req.log.error({ error, business: parsed.data.business }, "Fund application saved but notification email failed");
  }
  res.status(201).json({ ok: true });
});

router.post("/fund/partner-brief", fundPartnerBriefLimiter, async (req, res): Promise<void> => {
  const parsed = FundPartnerBriefBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "please complete the required Fund partner brief fields" });
    return;
  }

  if (parsed.data.company) {
    res.status(400).json({ error: "unable to send this brief" });
    return;
  }

  const { company: _company, ...brief } = parsed.data;
  await sendFundPartnerBriefEmail(brief);
  res.status(201).json({ ok: true });
});

export default router;