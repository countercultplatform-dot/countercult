import { afterEach, describe, expect, it, vi } from "vitest";

const { sendMock, cancelMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  cancelMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock, cancel: cancelMock };
  },
}));

import {
  cancelScheduledMemberCheckInEmail,
  sendCollectiveFundWelcomeEmail,
  scheduleMemberCheckInEmail,
  sendApprovalEmail,
  sendExchangeDigestEmail,
} from "../lib/email.js";

const originalApiKey = process.env.RESEND_API_KEY;
const originalDevTo = process.env.RESEND_DEV_TO;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  sendMock.mockReset();
  cancelMock.mockReset();
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalDevTo === undefined) delete process.env.RESEND_DEV_TO;
  else process.env.RESEND_DEV_TO = originalDevTo;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe("approval email delivery", () => {
  it("sends a transactional Collective Fund welcome with mailing and cancellation guidance", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    sendMock.mockResolvedValue({ data: { id: "welcome-email-id" }, error: null });

    await expect(sendCollectiveFundWelcomeEmail("patron@example.test")).resolves.toBe(true);

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "patron@example.test",
      from: "Countercult <hello@countercult.network>",
      subject: "Thank you for backing Countercult’s Collective Fund",
    }));
    expect(sendMock.mock.calls[0][0].text).toContain("Sign up after the 5th and your first mailing goes in the following month’s batch");
    expect(sendMock.mock.calls[0][0].text).toContain("renews monthly from your signup date");
    expect(sendMock.mock.calls[0][0].text).toContain("manage or cancel");
    expect(sendMock.mock.calls[0][0].html).toContain("Profit after costs goes to paying artists");
  });

  it("returns false when Resend rejects the email without throwing", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_DEV_TO = "delivery-test@example.test";
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "recipient rejected" },
    });

    await expect(sendApprovalEmail("artist@example.test", "Test Artist")).resolves.toBe(false);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("returns true when Resend accepts the email", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_DEV_TO = "delivery-test@example.test";
    sendMock.mockResolvedValue({
      data: { id: "email-id" },
      error: null,
    });

    await expect(sendApprovalEmail("artist@example.test", "Test Artist")).resolves.toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("sends production approval email to the applicant even when a dev recipient is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_DEV_TO = "delivery-test@example.test";
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });

    await expect(sendApprovalEmail("artist@example.test", "Test Artist")).resolves.toBe(true);

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "artist@example.test",
      from: "Countercult <hello@countercult.network>",
      subject: "Congrats, You've been CULT curated! (NEXT STEPS)",
    }));
    expect(sendMock.mock.calls[0][0].html).not.toContain("SANDBOX");
  });

  it("schedules a member check-in with the supplied send time and useful artist-context copy", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_DEV_TO = "delivery-test@example.test";
    sendMock.mockResolvedValue({ data: { id: "scheduled-email-id" }, error: null });
    const scheduledAt = new Date("2026-10-01T12:00:00.000Z");

    await expect(scheduleMemberCheckInEmail("artist@example.test", "<Artist>", scheduledAt))
      .resolves.toBe("scheduled-email-id");

    expect(sendMock).toHaveBeenCalledOnce();
    const payload = sendMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      to: "delivery-test@example.test",
      scheduledAt: "2026-10-01T12:00:00.000Z",
      subject: expect.stringContaining("Add something to the Countercult Exchange"),
    });
    expect(payload.html).toContain("Put something useful on the Exchange");
    expect(payload.html).toContain("&lt;Artist&gt;");
    expect(payload.html).toContain("put real resources into circulation");
    expect(payload.html).toContain("/residency?action=offer");
    expect(payload.html).toContain("Invite someone to apply");
  });

  it("sends production check-ins to the member instead of the development test recipient", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_DEV_TO = "delivery-test@example.test";
    sendMock.mockResolvedValue({ data: { id: "scheduled-email-id" }, error: null });

    await expect(scheduleMemberCheckInEmail(
      "artist@example.test",
      "Test Artist",
      new Date("2026-10-01T12:00:00.000Z"),
    )).resolves.toBe("scheduled-email-id");

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      to: "artist@example.test",
      from: "Countercult <hello@countercult.network>",
      subject: "Add something to the Countercult Exchange",
    });
    expect(sendMock.mock.calls[0][0].html).not.toContain("SANDBOX");
  });

  it("does not schedule when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_DEV_TO = "delivery-test@example.test";

    await expect(scheduleMemberCheckInEmail(
      "artist@example.test",
      "Test Artist",
      new Date("2026-10-01T12:00:00.000Z"),
    )).resolves.toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("cancels a scheduled follow-up through Resend", async () => {
    process.env.RESEND_API_KEY = "test-api-key";
    cancelMock.mockResolvedValue({ data: { id: "scheduled-email-id", object: "email" }, error: null });

    await expect(cancelScheduledMemberCheckInEmail("scheduled-email-id")).resolves.toBe(true);
    expect(cancelMock).toHaveBeenCalledWith("scheduled-email-id");
  });

  it("sends a weekly Exchange digest with safe listing copy, idempotency, and unsubscribe headers", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "test-api-key";
    sendMock.mockResolvedValue({ data: { id: "exchange-digest-id" }, error: null });

    await expect(sendExchangeDigestEmail(
      "approved-member@example.test",
      [{
        id: 42,
        title: "<Open call>",
        city: "Berlin",
        category: "Paid gig",
        description: "New opportunity <details>",
        cost: "€300",
      }],
      "a".repeat(64),
      "exchange-digest-2026-11-30-55",
    )).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      to: "approved-member@example.test",
      subject: "1 new Exchange listing",
      headers: {
        "List-Unsubscribe": expect.stringContaining("/api/exchange-digest/unsubscribe?token="),
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    expect(sendMock.mock.calls[0][0].html).toContain("&lt;Open call&gt;");
    expect(sendMock.mock.calls[0][0].html).toContain("€300");
    expect(sendMock.mock.calls[0][0].html).not.toContain("<details>");
    expect(sendMock.mock.calls[0][1]).toEqual({ idempotencyKey: "exchange-digest-2026-11-30-55" });
  });
});