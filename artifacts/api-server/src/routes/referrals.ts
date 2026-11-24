import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, entriesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/requireAuth";

const router: IRouter = Router();

function makeReferralCode(): string {
  return crypto.randomBytes(6).toString("hex");
}

/**
 * Return an approved member's reusable referral code.
 * Codes identify the referrer without exposing their email in a share URL.
 */
router.get("/referrals/me", requireAuth, requireApproved, async (req, res): Promise<void> => {
  const session = (req as any).ccSession as { email: string };
  const [user] = await db
    .select({
      email: usersTable.email,
      referralCode: usersTable.referralCode,
    })
    .from(usersTable)
    .where(eq(usersTable.email, session.email))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "approved member not found" });
    return;
  }

  let referralCode = user.referralCode;
  if (!referralCode) {
    for (let attempt = 0; attempt < 3 && !referralCode; attempt += 1) {
      const candidate = makeReferralCode();
      const [updated] = await db
        .update(usersTable)
        .set({ referralCode: candidate })
        .where(eq(usersTable.email, session.email))
        .returning({ referralCode: usersTable.referralCode });
      referralCode = updated?.referralCode ?? null;
    }
  }

  if (!referralCode) {
    res.status(500).json({ error: "could not create referral link" });
    return;
  }

  const [entry] = await db
    .select({ name: entriesTable.name })
    .from(entriesTable)
    .where(eq(entriesTable.contactEmail, session.email))
    .limit(1);

  res.json({
    code: referralCode,
    entryName: entry?.name ?? null,
  });
});

export default router;