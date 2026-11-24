import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { sendStudiosBriefEmail } from "../lib/email";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";

const router: IRouter = Router();

const studiosBriefLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many brief submissions — try again later" },
  store: new PgRateLimitStore("studios-brief:"),
});

const StudiosBriefBody = z.object({
  name: z.string().trim().min(1).max(120),
  organisation: z.string().trim().min(1).max(180),
  email: z.email(),
  location: z.string().trim().min(1).max(180),
  need: z.string().trim().min(1).max(180),
  budget: z.string().trim().min(1).max(180),
  timeline: z.string().trim().min(1).max(180),
  scope: z.string().trim().min(1).max(5000),
  profile: z.string().trim().max(120).optional().default(""),
  company: z.string().max(0).optional().default(""),
});

router.post("/studios/brief", studiosBriefLimiter, async (req, res): Promise<void> => {
  const parsed = StudiosBriefBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "please complete the required Studios brief fields" });
    return;
  }

  if (parsed.data.company) {
    res.status(400).json({ error: "unable to send this brief" });
    return;
  }

  const { company: _company, ...brief } = parsed.data;
  try {
    await sendStudiosBriefEmail(brief);
    res.status(201).json({ ok: true });
  } catch {
    res.status(503).json({ error: "the website email service is unavailable; please use the direct email link instead" });
  }
});

export default router;