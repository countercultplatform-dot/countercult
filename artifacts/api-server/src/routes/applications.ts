import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db, incomingApplicationsTable } from "@workspace/db";
import { SubmitGuadalajaraResidencyApplicationBody } from "@workspace/api-zod";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";
import { sendGuadalajaraResidencyApplicationEmail } from "../lib/email";

const router: IRouter = Router();

const guadalajaraResidencyApplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many applications. Please try again later." },
  store: new PgRateLimitStore("guadalajara-residency-application:"),
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = z.object({ email: z.email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "valid email required" });
    return;
  }
  await db.insert(incomingApplicationsTable).values({ email: parsed.data.email.toLowerCase().trim() });
  res.json({ ok: true });
});

router.post(
  "/applications/guadalajara-residency",
  guadalajaraResidencyApplicationLimiter,
  async (req, res): Promise<void> => {
    const parsed = SubmitGuadalajaraResidencyApplicationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please complete the required application fields." });
      return;
    }

    if (parsed.data.privacyConsent !== true) {
      res.status(400).json({ error: "Please confirm privacy consent." });
      return;
    }

    if (parsed.data.cityConditionsAcknowledged !== true) {
      res.status(400).json({ error: "Please confirm that you have read the residency conditions." });
      return;
    }

    if (parsed.data.programParticipationAcknowledged !== true) {
      res.status(400).json({ error: "Please confirm that you can take part in the residency programme." });
      return;
    }

    if (parsed.data.networkSignupAcknowledged !== true) {
      res.status(400).json({ error: "Please confirm your free Countercult Network signup." });
      return;
    }

    if (parsed.data.applyingAs === "duo" && !parsed.data.duoApplicant) {
      res.status(400).json({ error: "Please complete the second artist's details and acknowledgements." });
      return;
    }

    if (parsed.data.applyingAs === "duo" && parsed.data.duoApplicant) {
      const secondArtist = parsed.data.duoApplicant;
      if (!secondArtist.name.trim() || !secondArtist.artistPractice.trim()) {
        res.status(400).json({ error: "Please complete the second artist's details." });
        return;
      }
      if (parsed.data.roomOption !== "shared_room") {
        res.status(400).json({ error: "An artist duo applies for one shared room at €750 per artist." });
        return;
      }
      if (
        secondArtist.privacyConsent !== true
        || secondArtist.cityConditionsAcknowledged !== true
        || secondArtist.programParticipationAcknowledged !== true
        || secondArtist.networkSignupAcknowledged !== true
      ) {
        res.status(400).json({ error: "Please confirm the second artist's privacy, residency, programme, and signup acknowledgements." });
        return;
      }
    }

    if (parsed.data.applyingAs === "solo" && parsed.data.duoApplicant) {
      res.status(400).json({ error: "Remove the second artist details or select a joint application." });
      return;
    }

    if (parsed.data.honeypot) {
      res.status(400).json({ error: "Unable to send this application." });
      return;
    }

    const { honeypot: _honeypot, ...application } = parsed.data;
    try {
      await sendGuadalajaraResidencyApplicationEmail(application);
    } catch (error) {
      req.log.error({ err: error }, "Failed to email Guadalajara residency application");
      res.status(500).json({
        error: "We could not send your application. Please try again or email countercultplatform@gmail.com.",
      });
      return;
    }

    res.status(201).json({ ok: true });
  },
);

export default router;
