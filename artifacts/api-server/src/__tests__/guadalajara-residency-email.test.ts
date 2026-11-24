import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

import { sendGuadalajaraResidencyApplicationEmail } from "../lib/email.js";

const application = {
  name: "Jordan Rivera",
  email: "jordan@example.test",
  applyingAs: "solo" as const,
  roomOption: "shared_room" as const,
  artistPractice: "I work with sound, print, and public space.",
  residencyProject: "I want to develop a new installation with local collaborators.",
  localCollaboration: "I would like to work with a local workshop or community space.",
  sharedLiving: "I can contribute to shared meals, critiques, and keeping common areas clean.",
  sharedLivingExperience: "I have lived with artists and worked on shared projects.",
  roomSetup: "king_bed" as const,
  privacyConsent: true,
  cityConditionsAcknowledged: true,
  programParticipationAcknowledged: true,
  networkSignupAcknowledged: true,
};

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("RESEND_DEV_TO", "alternate@example.test");
  resendSend.mockReset();
  resendSend.mockResolvedValue({ data: { id: "test-message" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Guadalajara residency application email", () => {
  it("delivers the application to the requested Countercult inbox and sets the applicant as reply-to", async () => {
    await sendGuadalajaraResidencyApplicationEmail(application);

    const [message] = resendSend.mock.calls[0];
    expect(message).toMatchObject({
      to: "countercultplatform@gmail.com",
      replyTo: application.email,
      subject: expect.stringContaining("Guadalajara residency application"),
    });
    expect(message.text).toContain(application.residencyProject);
    expect(message.text).toContain("Preferred room setup: One large king bed");
    expect(message.text).toContain("Room option and full-stay fee: Shared room, €750 per artist");
    expect(message.text).toContain("Lead artist city and house conditions acknowledged: Confirmed");
    expect(message.text).toContain("Lead artist free Network signup acknowledged: Confirmed");
  });

  it("includes both artists and the shared-room fee in a joint application email", async () => {
    const duoApplication = {
      ...application,
      applyingAs: "duo" as const,
      duoApplicant: {
        name: "Ari Santos",
        email: "ari@example.test",
        portfolioUrl: "https://ari.example.test/work",
        artistPractice: "I make ceramic and textile work with local collaborators.",
        privacyConsent: true,
        cityConditionsAcknowledged: true,
        programParticipationAcknowledged: true,
        networkSignupAcknowledged: true,
      },
    };

    await sendGuadalajaraResidencyApplicationEmail(duoApplication);

    const [message] = resendSend.mock.calls[0];
    expect(message.text).toContain("Room option and full-stay fee: Shared room, €750 per artist (€1,500 total for both artists)");
    expect(message.text).toContain("Second artist email: ari@example.test");
    expect(message.text).toContain("Second artist practice: I make ceramic and textile work with local collaborators.");
    expect(message.text).toContain("Second artist free Network signup acknowledged: Confirmed");
  });

  it("escapes applicant text before placing it in the HTML email", async () => {
    await sendGuadalajaraResidencyApplicationEmail({
      ...application,
      artistPractice: "I work with <img src=x> and public space.",
    });

    const [message] = resendSend.mock.calls[0];
    expect(message.html).toContain("&lt;img src=x&gt;");
    expect(message.html).not.toContain("<img src=x>");
  });

  it("throws when Resend reports a delivery error", async () => {
    resendSend.mockResolvedValueOnce({ data: null, error: { message: "rejected" } });

    await expect(sendGuadalajaraResidencyApplicationEmail(application))
      .rejects.toThrow("Guadalajara residency application email delivery failed");
  });
});
