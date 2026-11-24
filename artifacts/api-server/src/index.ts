import app from "./app";
import { logger } from "./lib/logger";
import { expireStaleListings } from "./routes/residency";
import { expireStaleAdverts } from "./routes/adverts";
import { startRateLimitCleanup } from "./lib/pgRateLimitStore";
import { ensureDefaultCuratorCode } from "./lib/curatorCodes";
import {
  claimDueSignupDraftReminders,
  createSignupDraftToken,
  releaseSignupDraftReminderClaim,
  markSignupDraftReminderSent,
  purgeExpiredSignupDrafts,
} from "./lib/signupDrafts";
import { sendSignupDraftEmail } from "./lib/email";
import { purgeExpiredPrivacyData } from "./routes/privacy";
import { runPinterestAutopublishSweep } from "./routes/studioArtworks";
import { refreshPatronPostStatuses } from "./routes/patronPost";
import { runWeeklyExchangeDigest } from "./lib/exchangeDigest.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Periodic background sweep: remove expired rate-limit rows once per minute
startRateLimitCleanup();

// Close ended short-term sublets on startup and then every hour
async function runExpiryJob() {
  try {
    const result = await expireStaleListings();
    if (result.deactivated > 0) {
      logger.info({ deactivated: result.deactivated, ids: result.ids }, "Closed ended short-term sublets");
    }
  } catch (err) {
    logger.error({ err }, "Residency expiry job failed");
  }
  try {
    const result = await expireStaleAdverts();
    if (result.deactivated > 0) {
      logger.info({ deactivated: result.deactivated, ids: result.ids }, "Expired two-week adverts");
    }
  } catch (err) {
    logger.error({ err }, "Advert expiry job failed");
  }
}
runExpiryJob();
const EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(runExpiryJob, EXPIRY_INTERVAL_MS);

async function runSignupDraftJob() {
  try {
    await purgeExpiredSignupDrafts();
    const drafts = await claimDueSignupDraftReminders();
    for (const draft of drafts) {
      const token = createSignupDraftToken();
      const resumeUrl = `https://countercult.network/explore?action=join&resume=${encodeURIComponent(token)}`;
      try {
        await sendSignupDraftEmail(draft.email, resumeUrl, draft.expiresAt, true);
        await markSignupDraftReminderSent(draft.id, token);
      } catch (err) {
        await releaseSignupDraftReminderClaim(draft.id);
        logger.error({ err, draftId: draft.id }, "Signup draft reminder failed");
      }
    }
  } catch (err) {
    logger.error({ err }, "Signup draft expiry/reminder job failed");
  }
}
void runSignupDraftJob();
setInterval(runSignupDraftJob, EXPIRY_INTERVAL_MS);

async function runPrivacyRetentionJob() {
  try {
    const result = await purgeExpiredPrivacyData();
    if (result.sessions > 0 || result.requests > 0) {
      logger.info(result, "Privacy retention cleanup completed");
    }
  } catch (err) {
    logger.error({ err }, "Privacy retention cleanup failed");
  }
}
void runPrivacyRetentionJob();
setInterval(runPrivacyRetentionJob, 24 * 60 * 60 * 1000);

async function runPinterestAutopublishJob() {
  try {
    await runPinterestAutopublishSweep(logger);
  } catch (err) {
    logger.error({ err }, "Pinterest autopublish sweep failed");
  }
}
void runPinterestAutopublishJob();
setInterval(runPinterestAutopublishJob, 7 * 24 * 60 * 60 * 1000);

async function startServer(): Promise<void> {
  try {
    await ensureDefaultCuratorCode();
  } catch (err) {
    logger.error({ err }, "API startup initialization failed");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    void runWeeklyExchangeDigest().catch((err) => {
      logger.error({ err }, "Initial weekly Exchange digest sweep failed");
    });
    setInterval(() => {
      void runWeeklyExchangeDigest().catch((err) => {
        logger.error({ err }, "Weekly Exchange digest sweep failed");
      });
    }, 15 * 60 * 1000);
    void refreshPatronPostStatuses().catch((err) => {
      logger.warn({ err }, "Initial Patron Post status refresh failed");
    });
  });
}

setInterval(() => {
  void refreshPatronPostStatuses().catch((err) => {
    logger.warn({ err }, "Patron Post status refresh failed");
  });
}, 15 * 60 * 1000);

void startServer();
