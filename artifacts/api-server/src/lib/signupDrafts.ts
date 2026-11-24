import crypto from "node:crypto";
import {
  and,
  eq,
  gt,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import { db, signupDraftsTable } from "@workspace/db";

export const SIGNUP_DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const SIGNUP_DRAFT_REMINDER_DELAY_MS = 48 * 60 * 60 * 1000;
export const SIGNUP_DRAFT_REMINDER_RETRY_MS = 60 * 60 * 1000;

export function createSignupDraftToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSignupDraftToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function markSignupDraftCompleted(token: string): Promise<void> {
  await db
    .update(signupDraftsTable)
    .set({ completedAt: new Date() })
    .where(
      and(
        eq(signupDraftsTable.tokenHash, hashSignupDraftToken(token)),
        isNull(signupDraftsTable.completedAt),
      ),
    );
}

export async function purgeExpiredSignupDrafts(): Promise<void> {
  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db
    .delete(signupDraftsTable)
    .where(lt(signupDraftsTable.createdAt, retentionCutoff));
}

export async function claimDueSignupDraftReminders(): Promise<
  Array<typeof signupDraftsTable.$inferSelect>
> {
  const now = new Date();
  const createdBefore = new Date(Date.now() - SIGNUP_DRAFT_REMINDER_DELAY_MS);
  const retryAfter = new Date(Date.now() - SIGNUP_DRAFT_REMINDER_RETRY_MS);

  const dueDrafts = await db
    .select()
    .from(signupDraftsTable)
    .where(
      and(
        isNull(signupDraftsTable.completedAt),
        isNull(signupDraftsTable.reminderSentAt),
        gt(signupDraftsTable.expiresAt, now),
        lt(signupDraftsTable.createdAt, createdBefore),
        or(
          isNull(signupDraftsTable.reminderClaimedAt),
          lt(signupDraftsTable.reminderClaimedAt, retryAfter),
        ),
      ),
    )
    .limit(50);

  const claimed: Array<typeof signupDraftsTable.$inferSelect> = [];
  for (const draft of dueDrafts) {
    const [updated] = await db
      .update(signupDraftsTable)
      .set({ reminderClaimedAt: now })
      .where(
        and(
          eq(signupDraftsTable.id, draft.id),
          isNull(signupDraftsTable.completedAt),
          isNull(signupDraftsTable.reminderSentAt),
          or(
            isNull(signupDraftsTable.reminderClaimedAt),
            lt(signupDraftsTable.reminderClaimedAt, retryAfter),
          ),
        ),
      )
      .returning();
    if (updated) claimed.push(updated);
  }
  return claimed;
}

export async function markSignupDraftReminderSent(
  id: number,
  token: string,
): Promise<void> {
  await db
    .update(signupDraftsTable)
    .set({
      tokenHash: hashSignupDraftToken(token),
      reminderSentAt: new Date(),
      reminderClaimedAt: null,
    })
    .where(eq(signupDraftsTable.id, id));
}

export async function releaseSignupDraftReminderClaim(id: number): Promise<void> {
  await db
    .update(signupDraftsTable)
    .set({ reminderClaimedAt: null })
    .where(eq(signupDraftsTable.id, id));
}