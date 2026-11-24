import { Router, type IRouter } from "express";
import { db, pledgeEmailsTable } from "@workspace/db";
import { count, desc } from "drizzle-orm";
import { sendPledgeConfirmationEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Save a support-pledge email (public — no auth required) */
router.post("/pledge", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    res.status(400).json({ error: "valid email required" }); return;
  }
  const normalized = email.trim().toLowerCase();
  const inserted = await db
    .insert(pledgeEmailsTable)
    .values({ email: normalized })
    .onConflictDoNothing()
    .returning({ id: pledgeEmailsTable.id });

  let emailSent = false;
  if (inserted.length > 0) {
    try {
      emailSent = await sendPledgeConfirmationEmail(normalized);
    } catch (error) {
      logger.error({ err: error, email: normalized }, "Pledge confirmation email failed");
    }
  }

  res.json({ ok: true, emailSent });
});

router.get("/pledge/count", async (_req, res): Promise<void> => {
  const [result] = await db.select({ count: count() }).from(pledgeEmailsTable);
  res.json({ count: Number(result?.count ?? 0) });
});

/** List all pledge emails — admin only */
router.get("/admin/pledge-emails", async (req, res): Promise<void> => {
  const pwd = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || pwd !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "unauthorized" }); return;
  }
  const rows = await db
    .select()
    .from(pledgeEmailsTable)
    .orderBy(desc(pledgeEmailsTable.createdAt));
  res.json(rows);
});

export default router;
