import { beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { randomInt } from "node:crypto";

vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  sendGuadalajaraResidencyApplicationEmail: vi.fn(),
}));

import app from "../app.js";
import { sendGuadalajaraResidencyApplicationEmail } from "../lib/email.js";

const request = supertest(app);
const uniqueClientIp = () => `10.${randomInt(1, 255)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;

const validApplication = {
  name: "Jordan Rivera",
  email: "jordan@example.test",
  applyingAs: "duo",
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
  portfolioUrl: "https://jordan.example.test/work",
  roomOption: "shared_room",
  artistPractice: "I make installation and sound work with local collaborators.",
  residencyProject: "I want to develop a new installation responding to shared domestic spaces.",
  localCollaboration: "I would like to meet a local workshop or community space and develop an exchange.",
  sharedLiving: "I can contribute to coworking, shared meals, critiques, and keeping common areas clean.",
  sharedLivingExperience: "I have lived in artist houses and worked on shared projects.",
  availabilityCommitments: "I will work remotely two mornings each week.",
  heardAbout: "A former resident told me about it.",
  roomSetup: "two_double_beds",
  spanish: "Beginner",
  privacyConsent: true,
  cityConditionsAcknowledged: true,
  programParticipationAcknowledged: true,
  networkSignupAcknowledged: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

function postApplication(body: Record<string, unknown> = validApplication) {
  return request
    .post("/api/applications/guadalajara-residency")
    .set("x-forwarded-for", uniqueClientIp())
    .send(body);
}

describe("Guadalajara residency application endpoint", () => {
  it("emails a valid application and does not pass the honeypot field through", async () => {
    vi.mocked(sendGuadalajaraResidencyApplicationEmail).mockResolvedValueOnce();

    const response = await postApplication().expect(201);

    expect(response.body).toEqual({ ok: true });
    expect(sendGuadalajaraResidencyApplicationEmail).toHaveBeenCalledWith(validApplication);
  });

  it("rejects joint applications without the second artist details", async () => {
    const { duoApplicant: _duoApplicant, ...applicationWithoutPartner } = validApplication;
    const response = await postApplication(applicationWithoutPartner).expect(400);

    expect(response.body.error).toContain("second artist");
    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("requires the second artist acknowledgements", async () => {
    const response = await postApplication({
      ...validApplication,
      duoApplicant: {
        ...validApplication.duoApplicant,
        networkSignupAcknowledged: false,
      },
    }).expect(400);

    expect(response.body.error).toContain("second artist");
    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("requires a duo to select the shared-room rate", async () => {
    const response = await postApplication({ ...validApplication, roomOption: "private_room" }).expect(400);

    expect(response.body.error).toContain("shared room");
    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("requires privacy consent", async () => {
    const response = await postApplication({ ...validApplication, privacyConsent: false }).expect(400);

    expect(response.body.error).toContain("privacy consent");
    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("requires programme participation and a free Network signup acknowledgement", async () => {
    await postApplication({ ...validApplication, programParticipationAcknowledged: false }).expect(400);
    await postApplication({ ...validApplication, networkSignupAcknowledged: false }).expect(400);

    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("requires the applicant to acknowledge the city-based residency conditions", async () => {
    const response = await postApplication({ ...validApplication, cityConditionsAcknowledged: false }).expect(400);

    expect(response.body.error).toContain("residency conditions");
    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("rejects a filled honeypot without emailing the application", async () => {
    await postApplication({ ...validApplication, honeypot: "spam" }).expect(400);

    expect(sendGuadalajaraResidencyApplicationEmail).not.toHaveBeenCalled();
  });

  it("does not report success if the application email cannot be delivered", async () => {
    vi.mocked(sendGuadalajaraResidencyApplicationEmail).mockRejectedValueOnce(new Error("provider rejected email"));

    const response = await postApplication().expect(500);

    expect(response.body.error).toContain("countercultplatform@gmail.com");
  });
});
