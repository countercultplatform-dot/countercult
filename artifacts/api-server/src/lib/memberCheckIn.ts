import { and, eq, inArray } from "drizzle-orm";
import { db, entriesTable } from "@workspace/db";
import { logger } from "./logger";
import { cancelScheduledMemberCheckInEmail, scheduleMemberCheckInEmail } from "./email";

const CHECK_IN_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const RETRYABLE_STATUSES = ["not_scheduled", "schedule_failed", "cancelled"];

export async function scheduleApprovalMemberCheckIn(
  entryId: number,
  recipientEmail: string,
  memberName: string,
): Promise<void> {
  const scheduledAt = new Date(Date.now() + CHECK_IN_DELAY_MS);
  let resendEmailId: string | null = null;

  try {
    const [claim] = await db
      .update(entriesTable)
      .set({
        approvalFollowupEmailStatus: "scheduling",
        approvalFollowupEmailId: null,
        approvalFollowupScheduledAt: scheduledAt,
      })
      .where(and(
        eq(entriesTable.id, entryId),
        eq(entriesTable.isApproved, true),
        inArray(entriesTable.approvalFollowupEmailStatus, RETRYABLE_STATUSES),
      ))
      .returning({ id: entriesTable.id });

    if (!claim) return;

    resendEmailId = await scheduleMemberCheckInEmail(recipientEmail, memberName, scheduledAt);
    if (!resendEmailId) {
      await db
        .update(entriesTable)
        .set({ approvalFollowupEmailStatus: "schedule_failed" })
        .where(and(
          eq(entriesTable.id, entryId),
          eq(entriesTable.approvalFollowupEmailStatus, "scheduling"),
        ));
      return;
    }

    const [saved] = await db
      .update(entriesTable)
      .set({
        approvalFollowupEmailStatus: "scheduled",
        approvalFollowupEmailId: resendEmailId,
        approvalFollowupScheduledAt: scheduledAt,
      })
      .where(and(
        eq(entriesTable.id, entryId),
        eq(entriesTable.isApproved, true),
        eq(entriesTable.approvalFollowupEmailStatus, "scheduling"),
      ))
      .returning({ id: entriesTable.id });

    if (saved) {
      logger.info({ entryId, scheduledAt }, "Member check-in email scheduled");
      return;
    }

    const cancelled = await cancelScheduledMemberCheckInEmail(resendEmailId);
    await db
      .update(entriesTable)
      .set({
        approvalFollowupEmailStatus: cancelled ? "cancelled" : "cancel_failed",
        approvalFollowupEmailId: resendEmailId,
      })
      .where(and(
        eq(entriesTable.id, entryId),
        eq(entriesTable.approvalFollowupEmailStatus, "scheduling"),
      ));
    logger.warn({ entryId, resendEmailId, cancelled }, "Approval changed while the member check-in was being scheduled");
  } catch (error) {
    let finalStatus = "schedule_failed";
    if (resendEmailId) {
      const cancelled = await cancelScheduledMemberCheckInEmail(resendEmailId).catch((cancelError) => {
        logger.error({ err: cancelError, entryId, resendEmailId }, "Could not cancel check-in after a scheduling failure");
        return false;
      });
      finalStatus = cancelled ? "cancelled" : "cancel_failed";
    }

    await db
      .update(entriesTable)
      .set({
        approvalFollowupEmailStatus: finalStatus,
        approvalFollowupEmailId: resendEmailId,
      })
      .where(and(
        eq(entriesTable.id, entryId),
        eq(entriesTable.approvalFollowupEmailStatus, "scheduling"),
      ))
      .catch((databaseError) => {
        logger.error({ err: databaseError, entryId }, "Could not persist member check-in scheduling failure");
      });
    logger.error({ err: error, entryId }, "Member check-in email scheduling failed");
  }
}

export async function cancelApprovalMemberCheckIn(entryId: number): Promise<void> {
  const [entry] = await db
    .select({
      status: entriesTable.approvalFollowupEmailStatus,
      resendEmailId: entriesTable.approvalFollowupEmailId,
    })
    .from(entriesTable)
    .where(eq(entriesTable.id, entryId));

  if (!entry || entry.status !== "scheduled" || !entry.resendEmailId) return;

  const cancelled = await cancelScheduledMemberCheckInEmail(entry.resendEmailId);
  await db
    .update(entriesTable)
    .set({ approvalFollowupEmailStatus: cancelled ? "cancelled" : "cancel_failed" })
    .where(and(
      eq(entriesTable.id, entryId),
      eq(entriesTable.approvalFollowupEmailId, entry.resendEmailId),
      eq(entriesTable.approvalFollowupEmailStatus, "scheduled"),
    ));

  if (!cancelled) {
    logger.warn({ entryId, resendEmailId: entry.resendEmailId }, "Scheduled member check-in may still send after approval revocation");
  }
}