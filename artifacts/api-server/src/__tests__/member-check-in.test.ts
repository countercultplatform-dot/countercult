import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const { scheduleMock, cancelMock } = vi.hoisted(() => ({
  scheduleMock: vi.fn(),
  cancelMock: vi.fn(),
}));

vi.mock("../lib/email", () => ({
  scheduleMemberCheckInEmail: scheduleMock,
  cancelScheduledMemberCheckInEmail: cancelMock,
}));

import { db, entriesTable } from "@workspace/db";
import { cancelApprovalMemberCheckIn, scheduleApprovalMemberCheckIn } from "../lib/memberCheckIn";

const entryIds: number[] = [];

async function createEntry(overrides: Partial<typeof entriesTable.$inferInsert> = {}) {
  const [entry] = await db.insert(entriesTable).values({
    name: `Check-in test member ${randomUUID()}`,
    kind: "artist",
    city: "Test City",
    country: "France",
    isApproved: true,
    contactEmail: "check-in-test@example.test",
    ...overrides,
  }).returning({ id: entriesTable.id });

  if (!entry) throw new Error("Check-in test entry was not created");
  entryIds.push(entry.id);
  return entry.id;
}

afterEach(async () => {
  await Promise.all(entryIds.splice(0).map((id) =>
    db.delete(entriesTable).where(eq(entriesTable.id, id)),
  ));
  scheduleMock.mockReset();
  cancelMock.mockReset();
});

describe("member check-in scheduling", () => {
  it("schedules once per approval, seven days later", async () => {
    const entryId = await createEntry();
    const startedAt = Date.now();
    scheduleMock.mockResolvedValue("resend-check-in-1");

    await Promise.all([
      scheduleApprovalMemberCheckIn(entryId, "member@example.test", "Test Member"),
      scheduleApprovalMemberCheckIn(entryId, "member@example.test", "Test Member"),
    ]);

    expect(scheduleMock).toHaveBeenCalledOnce();
    const scheduledAt = scheduleMock.mock.calls[0]?.[2] as Date;
    expect(scheduledAt.getTime() - startedAt).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000);
    expect(scheduledAt.getTime() - startedAt).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 5_000);

    const [entry] = await db
      .select({
        status: entriesTable.approvalFollowupEmailStatus,
        emailId: entriesTable.approvalFollowupEmailId,
      })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryId));
    expect(entry).toEqual({ status: "scheduled", emailId: "resend-check-in-1" });
  });

  it("makes a failed schedule retryable", async () => {
    const entryId = await createEntry();
    scheduleMock
      .mockRejectedValueOnce(new Error("temporary Resend failure"))
      .mockResolvedValueOnce("resend-check-in-retry");

    await scheduleApprovalMemberCheckIn(entryId, "member@example.test", "Test Member");
    let [entry] = await db
      .select({ status: entriesTable.approvalFollowupEmailStatus })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryId));
    expect(entry?.status).toBe("schedule_failed");

    await scheduleApprovalMemberCheckIn(entryId, "member@example.test", "Test Member");
    [entry] = await db
      .select({ status: entriesTable.approvalFollowupEmailStatus })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryId));
    expect(entry?.status).toBe("scheduled");
    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });

  it("cancels the scheduled check-in after approval is revoked", async () => {
    const entryId = await createEntry({
      isApproved: false,
      approvalFollowupEmailStatus: "scheduled",
      approvalFollowupEmailId: "resend-check-in-to-cancel",
      approvalFollowupScheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    cancelMock.mockResolvedValue(true);

    await cancelApprovalMemberCheckIn(entryId);
    await cancelApprovalMemberCheckIn(entryId);

    expect(cancelMock).toHaveBeenCalledOnce();
    expect(cancelMock).toHaveBeenCalledWith("resend-check-in-to-cancel");
    const [entry] = await db
      .select({ status: entriesTable.approvalFollowupEmailStatus })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryId));
    expect(entry?.status).toBe("cancelled");
  });
});