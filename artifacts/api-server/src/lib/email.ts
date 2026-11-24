import { logger } from "./logger";
import { z } from "zod";
import { SubmitGuadalajaraResidencyApplicationBody } from "@workspace/api-zod";
import { sendWithCollectiveFundFooter } from "./emailCampaignFooter";

const SITE_URL = "https://countercult.network";
type GuadalajaraResidencyApplication = Omit<
  z.infer<typeof SubmitGuadalajaraResidencyApplicationBody>,
  "honeypot"
>;

type FundApplication = {
  name: string;
  email: string;
  business: string;
  location: string;
  website: string;
  fundingRoute: string;
  products: string;
  amountPerSale: string;
  desiredCreativeWork: string;
  notes: string;
};

export type FundPartnerBrief = {
  name: string;
  email: string;
  business: string;
  product: string;
  locations: string;
  contributionAmount: string;
  desiredCreativeWork: string;
  startDate: string;
  endDate: string;
  artistBooking: boolean;
  production: boolean;
  notes: string;
};

type StudiosBrief = {
  name: string;
  organisation: string;
  email: string;
  location: string;
  need: string;
  budget: string;
  timeline: string;
  scope: string;
  profile?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendStudiosBriefEmail(brief: StudiosBrief): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || "countercultplatform@gmail.com";
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const subject = `Countercult Studios brief: ${brief.organisation}`;
  const fields: Array<[string, string]> = [
    ["Name", brief.name],
    ["Organisation", brief.organisation],
    ["Email", brief.email],
    ["Location", brief.location],
    ["What they need", brief.need],
    ["Working budget", brief.budget],
    ["Timeline", brief.timeline],
    ...(brief.profile ? [["Profile from Countercult map", `${SITE_URL}/entries/${brief.profile}`] as [string, string]] : []),
    ["Scope", brief.scope],
  ];
  const htmlFields = fields
    .map(([label, value]) => `<tr><td style="width:150px;padding:10px 12px;border-bottom:1px solid #ddd;font-weight:bold;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n\n");

  if (!apiKey) {
    logger.error({ recipient, organisation: brief.organisation }, "RESEND_API_KEY not set — Studios brief cannot be delivered");
    throw new Error("Studios brief email delivery is not configured");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    replyTo: brief.email,
    subject: isSandbox ? `[SANDBOX] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#f9f9f6;padding:32px;max-width:720px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / studios</p>
      <h1 style="font-size:34px;line-height:1;margin:20px 0;">New Studios brief</h1>
      <p style="font-size:15px;line-height:1.6;">A potential client has sent a brief through the website.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:24px;background:#fff;border:2px solid #000;">${htmlFields}</table>
      <p style="font-family:monospace;font-size:11px;color:#555;margin-top:24px;">Reply directly to this email to contact the lead.</p>
    </div>`,
  });
}

export async function sendPatronPostPortalLinkEmail(email: string, portalUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || email;
  const from = devTo ? "Sketchy Shona <onboarding@resend.dev>" : "Sketchy Shona <hello@countercult.network>";
  const safeUrl = escapeHtml(portalUrl);
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const result = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: devTo ? "[SANDBOX] Your Patron Post membership link" : "Your Patron Post membership link",
    text: `Use this secure Stripe link to manage your Patron Post membership. The link expires shortly: ${portalUrl}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#f9f9f6;padding:32px;max-width:620px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">Sketchy Shona / Patron Post</p>
      <h1 style="font-size:28px;line-height:1.1;margin:20px 0;">Manage your membership</h1>
      <p style="font-size:14px;line-height:1.6;">Use this secure Stripe link to update your payment details or cancel your Patron Post membership. It expires shortly.</p>
      <p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 18px;text-decoration:none;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Open Stripe membership portal</a></p>
      <p style="font-size:12px;line-height:1.6;color:#555;">If you did not request this link, you can ignore this email.</p>
    </div>`,
  });
  if (result.error) throw new Error(`Portal link email could not be sent: ${result.error.message}`);
}

const patronPostCheckoutAlertCooldownMs = 15 * 60 * 1000;
const patronPostCheckoutAlertLastSentAt = new Map<"countercult" | "sketchy_shona", number>();

export async function sendPatronPostCheckoutFailureAlert(
  source: "countercult" | "sketchy_shona",
  details: string,
): Promise<void> {
  const now = Date.now();
  const lastSentAt = patronPostCheckoutAlertLastSentAt.get(source);
  if (lastSentAt && now - lastSentAt < patronPostCheckoutAlertCooldownMs) {
    logger.info({ source }, "Patron Post checkout failure alert suppressed during cooldown");
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  if (!apiKey) {
    logger.warn({ source }, "Patron Post checkout failure alert skipped because email is not configured");
    return;
  }
  if (process.env.NODE_ENV !== "production" && !devTo) {
    logger.info({ source }, "Patron Post checkout failure alert skipped outside production");
    return;
  }

  patronPostCheckoutAlertLastSentAt.set(source, now);
  const recipient = devTo || "countercultplatform@gmail.com";
  const from = devTo ? "Countercult <onboarding@resend.dev>" : "Countercult <hello@countercult.network>";
  const brand = source === "countercult" ? "Countercult" : "Sketchy Shona";
  const observedAt = new Date(now).toISOString();
  const safeDetails = details.slice(0, 500);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: recipient,
      subject: `${devTo ? "[SANDBOX] " : ""}Patron Post checkout failed: ${brand}`,
      text: `A Patron Post checkout could not be opened.\n\nSource: ${brand}\nTime: ${observedAt}\nError: ${safeDetails}\n\nNo customer name, email, address, or payment details were included.`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;padding:32px;max-width:620px;">
        <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">Countercult / Checkout alert</p>
        <h1 style="font-size:24px;line-height:1.2;margin:20px 0;">A Patron Post checkout could not be opened</h1>
        <p><strong>Source:</strong> ${brand}</p>
        <p><strong>Time:</strong> ${observedAt}</p>
        <p><strong>Error:</strong> ${escapeHtml(safeDetails)}</p>
        <p style="font-size:12px;color:#555;">No customer name, email, address, or payment details were included.</p>
      </div>`,
    });
    if (result.error) {
      logger.error({ err: result.error, source }, "Patron Post checkout failure alert could not be delivered");
      return;
    }
    logger.info({ source }, "Patron Post checkout failure alert sent");
  } catch (error) {
    logger.error({ err: error, source }, "Patron Post checkout failure alert could not be delivered");
  }
}

export async function sendFundApplicationEmail(application: FundApplication): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || "countercultplatform@gmail.com";
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const subject = `Countercult Fund application: ${application.business}`;
  const fundingRoute = application.fundingRoute === "client_programme_budget"
    ? "Client or brand programme budget"
    : "Culture Euro from selected sales";
  const fields: Array<[string, string]> = [
    ["Name", application.name],
    ["Email", application.email],
    ["Business", application.business],
    ["Location", application.location],
    ["Website or social", application.website || "Not provided"],
    ["Funding route", fundingRoute],
    [application.fundingRoute === "client_programme_budget" ? "Programme to support" : "Sales to include", application.products],
    [application.fundingRoute === "client_programme_budget" ? "Proposed programme budget" : "Proposed amount per sale", application.amountPerSale],
    ["What the Fund should make possible", application.desiredCreativeWork || "Not specified"],
    ["Notes", application.notes || "None"],
  ];
  const htmlFields = fields
    .map(([label, value]) => `<tr><td style="width:150px;padding:10px 12px;border-bottom:1px solid #ddd;font-weight:bold;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n\n");

  if (!apiKey) {
    logger.info({ recipient, business: application.business, email: application.email }, "RESEND_API_KEY not set — Fund application logged (dev mode)");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    replyTo: application.email,
    subject: isSandbox ? `[SANDBOX] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#f9f9f6;padding:32px;max-width:720px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / the Fund</p>
      <h1 style="font-size:34px;line-height:1;margin:20px 0;">New Fund application</h1>
      <p style="font-size:15px;line-height:1.6;">Someone has applied to become Countercult Fund approved.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:24px;background:#fff;border:2px solid #000;">${htmlFields}</table>
      <p style="font-family:monospace;font-size:11px;color:#555;margin-top:24px;">Reply directly to this email to contact the applicant.</p>
    </div>`,
  });
}

export async function sendGuadalajaraResidencyApplicationEmail(
  application: GuadalajaraResidencyApplication,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = "countercultplatform@gmail.com";
  const from = "Countercult <hello@countercult.network>";
  const subjectName = application.name.replace(/[\r\n]/g, " ").trim().slice(0, 120);
  const subject = `Countercult Guadalajara residency application: ${subjectName}`;
  const roomFee = application.applyingAs === "duo"
    ? "Shared room, €750 per artist (€1,500 total for both artists)"
    : application.roomOption === "private_room"
      ? "Private room, €1,500 per artist"
      : "Shared room, €750 per artist";
  const secondArtistFields: Array<[string, string]> =
    application.applyingAs === "duo" && application.duoApplicant
      ? [
          ["Second artist name", application.duoApplicant.name],
          ["Second artist email", application.duoApplicant.email],
          ["Second artist portfolio", application.duoApplicant.portfolioUrl || "Not provided"],
          ["Second artist practice", application.duoApplicant.artistPractice],
          ["Second artist privacy consent", "Confirmed"],
          ["Second artist city and house conditions acknowledged", "Confirmed"],
          ["Second artist programme participation acknowledged", "Confirmed"],
          ["Second artist free Network signup acknowledged", "Confirmed"],
        ]
      : [];
  const fields: Array<[string, string]> = [
    ["Applicant", application.name],
    ["Email", application.email],
    ["Application type", application.applyingAs === "duo" ? "One joint application for two artists" : "One artist"],
    ["Room option and full-stay fee", roomFee],
    ["Portfolio", application.portfolioUrl || "Not provided"],
    ["Preferred room setup", application.roomSetup === "king_bed" ? "One large king bed" : "Two double beds"],
    ["Spanish", application.spanish || "Not specified"],
    ["Artist practice", application.artistPractice],
    ["Residency project", application.residencyProject],
    ["Local collaboration idea", application.localCollaboration],
    ["Shared-living contribution", application.sharedLiving],
    ["Shared-living and collaboration experience", application.sharedLivingExperience],
    ["Other commitments", application.availabilityCommitments || "Not provided"],
    ["How they heard about Countercult", application.heardAbout || "Not provided"],
    ["Lead artist privacy consent", "Confirmed"],
    ["Lead artist city and house conditions acknowledged", "Confirmed"],
    ["Lead artist programme participation acknowledged", "Confirmed"],
    ["Lead artist free Network signup acknowledged", "Confirmed"],
    ...secondArtistFields,
  ];
  const htmlFields = fields
    .map(([label, value]) => `<tr><td style="width:190px;padding:10px 12px;border-bottom:1px solid #ddd;font-weight:bold;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n\n");

  if (!apiKey) {
    throw new Error("Guadalajara residency application email is not configured");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    replyTo: application.email,
    subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#f9f9f6;padding:32px;max-width:720px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / guadalajara residency</p>
      <h1 style="font-size:34px;line-height:1;margin:20px 0;">New residency application</h1>
      <p style="font-size:15px;line-height:1.6;">An artist has applied for the Guadalajara coliving residency, January 5 to February 5, 2027.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:24px;background:#fff;border:2px solid #000;">${htmlFields}</table>
      <p style="font-family:monospace;font-size:11px;color:#555;margin-top:24px;">Reply directly to this email to contact the applicant.</p>
    </div>`,
  });

  if (error) {
    throw new Error("Guadalajara residency application email delivery failed");
  }
}

export async function sendFundPartnerBriefEmail(brief: FundPartnerBrief): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || "countercultplatform@gmail.com";
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const subject = `Countercult Fund partner brief: ${brief.business}`;
  const fields: Array<[string, string]> = [
    ["Name", brief.name],
    ["Email", brief.email],
    ["Business", brief.business],
    ["Product or service", brief.product],
    ["Locations", brief.locations],
    ["Contribution amount", brief.contributionAmount],
    ["Desired local creative work", brief.desiredCreativeWork],
    ["Fund start date", brief.startDate],
    ["Fund end date", brief.endDate],
    ["Artist booking help", brief.artistBooking ? "Yes" : "No"],
    ["Production help", brief.production ? "Yes" : "No"],
    ["Notes", brief.notes || "None"],
  ];
  const htmlFields = fields
    .map(([label, value]) => `<tr><td style="width:190px;padding:10px 12px;border-bottom:1px solid #ddd;font-weight:bold;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n\n");

  if (!apiKey) {
    logger.info({ recipient, business: brief.business, email: brief.email }, "RESEND_API_KEY not set — Fund partner brief logged (dev mode)");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    replyTo: brief.email,
    subject: isSandbox ? `[SANDBOX] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#000;background:#f9f9f6;padding:32px;max-width:720px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / the Fund</p>
      <h1 style="font-size:34px;line-height:1;margin:20px 0;">New Fund partner brief</h1>
      <p style="font-size:15px;line-height:1.6;">A business wants to discuss a business-managed Fund contribution. Review the details below before scheduling a call. This is separate from paid Studios work.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:24px;background:#fff;border:2px solid #000;">${htmlFields}</table>
      <p style="font-family:monospace;font-size:11px;color:#555;margin-top:24px;">Reply directly to this email to contact the partner.</p>
    </div>`,
  });

  if (error) {
    logger.error(
      { err: error, business: brief.business, email: brief.email },
      "Fund partner brief email was rejected by provider",
    );
    throw new Error("Fund partner brief email delivery failed");
  }
}

/**
 * Send the approval / "your pin is live" notification to an approved artist.
 * Only called once per entry — guarded by the `approval_email_sent` column.
 */
/**
 * Send a password-reset link to the user.
 * The link is valid for 1 hour and can only be used once.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";

  if (!apiKey) {
    logger.info({ recipient, originalTo: to, resetUrl }, "RESEND_API_KEY not set — reset email logged (dev mode)");
    return;
  }

  if (isSandbox) {
    logger.info({ recipient, originalTo: to }, "Sandbox mode: redirecting reset email to dev address");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox
      ? `[SANDBOX → ${to}] Reset your Countercult password`
      : `Reset your Countercult password`,
    html: `<div style="font-family:monospace;background:#000;color:#f3efe7;padding:32px;max-width:520px;border:1px solid #333;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font-size:10px;margin-bottom:16px;">⚠ SANDBOX — originally addressed to: ${to}</div>` : ""}
      <div style="color:#c6ff3d;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px">countercult creatives</div>
      <p style="font-size:14px;line-height:1.8;color:#f3efe7;margin:0 0 24px;">We received a request to reset your password. Click the link below — it expires in 1 hour and can only be used once.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#c6ff3d;color:#000;padding:12px 24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;">Reset password →</a>
      <p style="font-size:11px;color:#555;margin:24px 0 0;">If you didn't request this, you can safely ignore this email — your password hasn't changed.</p>
      <hr style="border:1px solid #222;margin:24px 0"/>
      <p style="font-size:10px;color:#444;margin:0;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#555;">hello@countercult.network</a></p>
    </div>`,
  });
}

export async function sendSpaceClaimInvitationEmail(
  to: string,
  entryId: number,
  entryName: string,
  claimUrl: string,
  expiresAt: Date,
  claimCode: string,
  scheduledAt?: Date,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = Boolean(devTo);
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const safeName = escapeHtml(entryName);
  const safeUrl = escapeHtml(claimUrl);
  const pinUrl = `${SITE_URL}/entries/${entryId}`;
  const safePinUrl = escapeHtml(pinUrl);
  const exchangeUrl = `${SITE_URL}/residency`;
  const safeExchangeUrl = escapeHtml(exchangeUrl);
  const expiryText = expiresAt.toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const subject = `We’ve added ${entryName} to Countercult’s map`;
  const text = [
    "Hi, I’m Shona, the artist known as Sketchy Shona. I work with artists and cultural communities to build a map of our favorite cultural spaces and artists. We’ve added " + entryName + " to the map.",
    "We added the information we could find publicly, so some details may be incomplete. If you’d like to add more or change your pin, claim it. You can also list available spaces, jobs, open calls, and tools on our artist-to-artist sharing board, Countercult Exchange. Claiming your pin and sharing there are free.",
    `View your pin: ${pinUrl}`,
    `Claim your pin and update its details, images, and links: ${claimUrl}`,
    `Enter this one-time claim code on the claim page: ${claimCode}`,
    `This code is for ${to}, expires ${expiryText} UTC, and can only be used once.`,
    `Explore Countercult Exchange: ${exchangeUrl}`,
    "Best,\nShona and the Countercult team",
  ].join("\n\n");
  const html = `<div style="font-family:monospace;background:#000;color:#f3efe7;padding:32px;max-width:560px;border:1px solid #333;">
    ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font-size:10px;margin-bottom:16px;">SANDBOX. Originally addressed to: ${escapeHtml(to)}</div>` : ""}
    <div style="color:#c6ff3d;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px">countercult creatives</div>
    <p style="font-size:14px;line-height:1.8;color:#f3efe7;margin:0 0 16px;">Hi, I’m Shona, the artist known as Sketchy Shona. I work with artists and cultural communities to build a map of our favorite cultural spaces and artists. We’ve added ${safeName} to the map.</p>
    <p style="font-size:13px;line-height:1.8;color:#ccc;margin:0 0 16px;">We added the information we could find publicly, so some details may be incomplete. If you’d like to add more or change your pin, claim it. You can also list available spaces, jobs, open calls, and tools on our artist-to-artist sharing board, Countercult Exchange. Claiming your pin and sharing there are free.</p>
    <p style="margin:0 0 16px;"><a href="${safePinUrl}" style="color:#c6ff3d;">View your pin</a></p>
    <a href="${safeUrl}" style="display:inline-block;background:#c6ff3d;color:#000;padding:12px 24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;border:2px solid #c6ff3d;">claim your pin and manage it →</a>
     <p style="font-size:18px;letter-spacing:4px;font-weight:bold;color:#c6ff3d;margin:16px 0 4px;">${escapeHtml(claimCode)}</p>
     <p style="font-size:11px;line-height:1.7;color:#777;margin:4px 0 24px;">Enter this one-time code on the claim page. It is for ${escapeHtml(to)}, expires ${escapeHtml(expiryText)} UTC, and can only be used once.</p>
    <p style="font-size:13px;line-height:1.8;color:#ccc;margin:0 0 24px;"><a href="${safeExchangeUrl}" style="color:#c6ff3d;">Explore Countercult Exchange</a></p>
    <p style="font-size:12px;color:#777;">Best,<br/>Shona and the Countercult team</p>
    <hr style="border:1px solid #222;margin:24px 0"/>
    <p style="font-size:10px;color:#777;"><a href="${SITE_URL}/" style="color:#c6ff3d;">Countercult</a> · <a href="mailto:hello@countercult.network" style="color:#777;">hello@countercult.network</a></p>
  </div>`;
  const result = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox ? `[SANDBOX → ${to}] ${subject}` : subject,
    text,
    html,
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });

  if (result.error) {
    throw new Error(`Resend could not deliver the space claim invitation: ${result.error.message}`);
  }
}

export async function sendSpaceSuggestionOwnerNotice(
  to: string,
  entryName: string,
  entryId: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = Boolean(devTo);
  const safeName = escapeHtml(entryName);
  const pinUrl = `${SITE_URL}/entries/${entryId}`;
  const safePinUrl = escapeHtml(pinUrl);
  const claimUrl = `${SITE_URL}/claim-space?entryId=${entryId}`;
  const safeClaimUrl = escapeHtml(claimUrl);
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const result = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from: isSandbox ? "Countercult <onboarding@resend.dev>" : "Countercult <hello@countercult.network>",
    to: recipient,
    subject: `${isSandbox ? `[SANDBOX → ${to}] ` : ""}A space was suggested for Countercult’s map`,
    text: `${entryName} was suggested for Countercult’s public map. The listing is community-submitted and unclaimed; this suggestion does not grant anyone control. View it: ${pinUrl}. If you represent the space, request a claim here: ${claimUrl}. Countercult verifies every claim request before granting access.`,
    html: `<div style="font-family:monospace;background:#000;color:#f3efe7;padding:32px;max-width:560px;border:1px solid #333;">${isSandbox ? `<p style="background:#ff0;color:#000;padding:8px">SANDBOX. Originally addressed to: ${escapeHtml(to)}</p>` : ""}<p style="color:#c6ff3d;text-transform:uppercase">countercult</p><h1>A space was suggested for the map</h1><p>${safeName} was suggested by a community member. This listing is unclaimed and does not represent an owner endorsement. A suggestion does not grant anyone control or access.</p><p><a href="${safePinUrl}">View the public pin</a></p><p>If you represent this space, <a href="${safeClaimUrl}">request a claim</a>. Countercult verifies each request before granting access.</p></div>`,
  });
  if (result.error) throw new Error(`Owner notification failed: ${result.error.message}`);
}

export async function sendSignupDraftEmail(
  to: string,
  resumeUrl: string,
  expiresAt: Date,
  reminder = false,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const subject = reminder
    ? "Finish your Countercult application when you have time"
    : "Your Countercult application is saved";
  const expiryText = expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  if (!apiKey) {
    logger.info(
      { recipient, originalTo: to, reminder },
      "RESEND_API_KEY not set — signup draft email skipped (dev mode)",
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const sendPromise = sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox ? `[SANDBOX → ${to}] ${subject}` : subject,
    text: [
      reminder
        ? "You started a Countercult application and still have time to finish it."
        : "Your unfinished Countercult application has been saved.",
      `Continue here: ${resumeUrl}`,
      `This private link expires on ${expiryText}.`,
      "If you did not ask to save an application, you can safely ignore this email.",
    ].join("\n\n"),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#f9f9f6;color:#000;padding:32px;max-width:560px;border:2px solid #000;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / join</p>
      <h1 style="font-size:32px;line-height:1.05;margin:24px 0 16px;">${reminder ? "Still want to join?" : "Your application is saved."}</h1>
      <p style="font-size:15px;line-height:1.65;margin:0 0 24px;">${reminder ? "You started a Countercult application but did not finish it. Come back when you have the time." : "You can come back and finish your Countercult application whenever you are ready."}</p>
      <a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#c6ff3d;color:#000;padding:14px 20px;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;border:2px solid #000;">continue your application →</a>
      <p style="font-size:12px;line-height:1.6;color:#555;margin:24px 0 0;">This private link expires on ${escapeHtml(expiryText)}. If you did not ask to save an application, you can safely ignore this email.</p>
      <hr style="border:1px solid #ddd;margin:24px 0"/>
      <p style="font-size:10px;color:#777;margin:0;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#555;">hello@countercult.network</a></p>
    </div>`,
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const { error } = await Promise.race([
    sendPromise,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("signup draft email timed out")), 15_000);
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
  if (error) {
    logger.error({ err: error, originalTo: to, reminder }, "Signup draft email was rejected by provider");
    throw new Error("signup draft email delivery failed");
  }
}

export async function sendPledgeConfirmationEmail(to: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";
  const subject = "Thank you for helping keep Countercult alive";
  const text = [
    "We’re grateful that you’re willing to help sustain culture with Countercult.",
    "We are not accepting payments for the wider pledge campaign yet, and no payment has been taken. In the meantime, Patron Post is one current way to support Countercult’s community fundraiser.",
    "When funding opens, we plan to use a sliding donation model to help pay the people behind Countercult and our server costs.",
    "We work hard every day to make this network as useful as possible. We’ll email you when funding is ready.",
    "If you did not submit this pledge, you can safely ignore this email.",
  ].join("\n\n");

  if (!apiKey) {
    logger.info({ recipient, originalTo: to }, "RESEND_API_KEY not set — pledge confirmation email skipped (dev mode)");
    return false;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox ? `[SANDBOX → ${to}] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#f9f9f6;color:#000;padding:32px;max-width:560px;border:2px solid #000;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font:10px monospace;margin-bottom:16px;">SANDBOX. Originally addressed to: ${escapeHtml(to)}</div>` : ""}
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">countercult / pledge</p>
      <h1 style="font-size:32px;line-height:1.05;margin:24px 0 16px;">Thank you for helping keep Countercult alive.</h1>
      <p style="font-size:15px;line-height:1.65;margin:0 0 16px;">We’re grateful that you’re willing to help sustain culture with Countercult.</p>
       <p style="font-size:15px;line-height:1.65;margin:0 0 16px;">We are not accepting payments for the wider pledge campaign yet, and no payment has been taken. In the meantime, Patron Post is one current way to support Countercult’s community fundraiser. When the wider pledge campaign opens, we plan to use a sliding donation model to help pay the people behind Countercult and our server costs.</p>
      <p style="font-size:15px;line-height:1.65;margin:0 0 24px;">We work hard every day to make this network as useful as possible. We’ll email you when funding is ready.</p>
      <hr style="border:1px solid #ddd;margin:24px 0"/>
      <p style="font-size:10px;color:#777;margin:0;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#555;">hello@countercult.network</a></p>
    </div>`,
  });

  if (error) {
    logger.error({ err: error, originalTo: to }, "Pledge confirmation email was rejected by provider");
    return false;
  }

  return true;
}

export async function sendApprovalEmail(to: string, artistName: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.NODE_ENV === "production"
    ? undefined
    : process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";

  const siteUrl = SITE_URL;

  if (!apiKey) {
    logger.info({ recipient, originalTo: to, artistName }, "RESEND_API_KEY not set — approval email logged (dev mode)");
    return false;
  }

  if (isSandbox) {
    logger.info({ recipient, originalTo: to }, "Sandbox mode: redirecting approval email to dev address");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox
      ? `[SANDBOX → ${to}] Congrats, You've been CULT curated! (NEXT STEPS)`
      : `Congrats, You've been CULT curated! (NEXT STEPS)`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#000;color:#f3efe7;padding:24px;max-width:560px;border:1px solid #333;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font-size:10px;margin-bottom:14px;">⚠ SANDBOX — originally addressed to: ${to}</div>` : ""}
      <h1 style="font-size:24px;line-height:1.25;color:#c6ff3d;margin:0 0 16px;font-weight:bold;">After our real human artists (yes, we are not AI and workin' real hard) looked at your submission, you've been curated to join Countercult!</h1>
      <p style="font-size:15px;line-height:1.6;color:#c6ff3d;margin:0 0 10px;">We can't accept everyone. Countercult is intentionally hard to find.</p>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 16px;">We really appreciate you taking the time to sign up.</p>
      <a href="${siteUrl}/explore?action=signin" title="Sign in to Countercult" style="display:block;width:100%;text-align:center;margin:0 auto 18px;">
        <img src="https://countercult.network/images/cult-soap.png" alt="Sign in to Countercult" width="220" style="display:inline-block;width:60%;max-width:220px;height:auto;" />
      </a>
      <div style="border-top:1px solid #333;border-bottom:1px solid #333;padding:18px 0;margin-bottom:20px;">
        <h2 style="font-family:monospace;font-size:12px;line-height:1.3;color:#c6ff3d;margin:0 0 12px;text-transform:uppercase;letter-spacing:3px;">Next step</h2>
        <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 12px;">Log into your profile to add or change things, swap your room or studio, and access more networking opps.</p>
        <a href="${siteUrl}/explore?action=signin" style="display:inline-block;background:#c6ff3d;color:#000;padding:13px 20px;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;border:2px solid #c6ff3d;margin:0 0 14px;">sign in to your profile →</a>
        <p style="font-size:14px;line-height:1.6;color:#c6ff3d;margin:0 0 8px;"><strong>NOTE:</strong> This is a new feature, so don't be shy. Post spaces you would like to swap or offer to our curated network.</p>
        <p style="font-size:14px;line-height:1.6;color:#aaa;margin:0;">We're growing this so more of us can share resources and spaces. <a href="${siteUrl}/residency" style="color:#c6ff3d;">Visit the space exchange ↗</a></p>
      </div>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 12px;">Want network updates and event drops? <a href="https://countercultplatform.substack.com" style="color:#c6ff3d;">Subscribe to our newsletter here ↗</a>.</p>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 18px;">Know someone who should be here? <a href="${siteUrl}/explore?action=join" style="color:#c6ff3d;">Send them our way ↗</a></p>
      <p style="font-size:20px;line-height:1.3;color:#c6ff3d;margin:0 0 8px;font-weight:bold;">Welcome to our cult!</p>
      <hr style="border:1px solid #222;margin:20px 0"/>
      <p style="font-size:12px;line-height:1.7;color:#f3efe7;margin:0 0 8px;">
        <a href="${siteUrl}" style="color:#c6ff3d;">countercult.network</a> ·
        <a href="https://countercultplatform.substack.com" style="color:#c6ff3d;">Countercult newsletter</a>
      </p>
      <p style="font-size:12px;line-height:1.7;color:#f3efe7;margin:0 0 4px;"><a href="https://sketchyshona.substack.com" style="color:#c6ff3d;">Sketchy Shona</a> from Countercult and THE FLOOR</p>
      <p style="font-size:12px;line-height:1.7;color:#f3efe7;margin:0 0 12px;"><a href="https://www.instagram.com/thefloorberlin/" style="color:#c6ff3d;">The Floor on Instagram ↗</a></p>
      <p style="font-size:10px;color:#555;margin:0;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#777;">hello@countercult.network</a></p>
    </div>`,
  });
  if (error) {
    logger.error(
      { err: error, originalTo: to, artistName },
      "Approval email was rejected by provider",
    );
    return false;
  }
  return true;
}

export async function scheduleMemberCheckInEmail(
  to: string,
  memberName: string,
  scheduledAt: Date,
): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.NODE_ENV === "production"
    ? undefined
    : process.env.RESEND_DEV_TO?.trim();
  const recipient = devTo || to;
  const isSandbox = !!devTo;
  const from = isSandbox
    ? "Countercult <onboarding@resend.dev>"
    : "Countercult <hello@countercult.network>";

  if (!apiKey) {
    logger.info(
      { scheduledAt: scheduledAt.toISOString() },
      "RESEND_API_KEY not set — member check-in email not scheduled",
    );
    return null;
  }

  if (isSandbox) {
    logger.info({ scheduledAt: scheduledAt.toISOString() }, "Sandbox mode: redirecting member check-in email");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const escapedName = escapeHtml(memberName);
  const { data, error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from,
    to: recipient,
    subject: isSandbox
      ? "[SANDBOX] Add something to the Countercult Exchange"
      : "Add something to the Countercult Exchange",
    scheduledAt: scheduledAt.toISOString(),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#000;color:#f3efe7;padding:24px;max-width:560px;border:1px solid #333;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font-size:10px;margin-bottom:14px;">SANDBOX | originally addressed to: ${escapeHtml(to)}</div>` : ""}
      <h1 style="font-size:24px;line-height:1.25;color:#c6ff3d;margin:0 0 16px;font-weight:bold;">Put something useful on the Exchange</h1>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 14px;">Hi ${escapedName},</p>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 14px;">Countercult's Exchange works when members put real resources into circulation. A spare room, studio or venue; a skill share; an open call or paid gig; software, tickets, access or a useful discount can help someone else get a project moving.</p>
      <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 18px;">Post one concrete thing you can offer, or update a post you have already shared so its availability and terms are current. The more specific the post, the easier it is for another member to act on it.</p>
      <a href="${SITE_URL}/residency?action=offer" style="display:inline-block;background:#c6ff3d;color:#000;padding:13px 20px;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;border:2px solid #c6ff3d;margin:0 0 22px;">share something on the Exchange →</a>
      <p style="font-size:13px;line-height:1.6;color:#aaa;margin:0 0 22px;">Want to see what is already moving? <a href="${SITE_URL}/residency" style="color:#c6ff3d;">Browse the public Exchange board ↗</a></p>
      <div style="border-top:1px solid #333;border-bottom:1px solid #333;padding:18px 0;margin-bottom:20px;">
        <h2 style="font-family:monospace;font-size:12px;line-height:1.3;color:#c6ff3d;margin:0 0 12px;text-transform:uppercase;letter-spacing:3px;">Bring someone in</h2>
        <p style="font-size:15px;line-height:1.6;color:#f3efe7;margin:0 0 14px;">Know an artist, organiser or partner with something useful to share? Send them the Exchange board and invite them to apply. If there is someone Countercult should consider, a personal recommendation helps us understand the connection.</p>
        <a href="${SITE_URL}/residency" style="color:#c6ff3d;margin-right:18px;">Share the Exchange board ↗</a>
        <a href="${SITE_URL}/explore?action=join" style="color:#c6ff3d;">Invite someone to apply ↗</a>
      </div>
      <p style="font-size:12px;line-height:1.7;color:#aaa;margin:0 0 8px;"><a href="${SITE_URL}" style="color:#c6ff3d;">countercult.network</a> · <a href="https://countercultplatform.substack.com" style="color:#c6ff3d;">Countercult newsletter</a></p>
      <p style="font-size:10px;color:#777;margin:0;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#777;">hello@countercult.network</a></p>
    </div>`,
  });

  if (error) {
    logger.error({ err: error, scheduledAt: scheduledAt.toISOString() }, "Resend rejected the scheduled member check-in email");
    throw new Error(error.message || "Resend rejected the scheduled member check-in email");
  }
  if (!data?.id) {
    throw new Error("Resend accepted the scheduled member check-in email without returning an ID");
  }
  return data.id;
}

export async function cancelScheduledMemberCheckInEmail(emailId: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ emailId }, "RESEND_API_KEY not set — cannot cancel scheduled member check-in email");
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.cancel(emailId);
    if (error) {
      logger.error({ err: error, emailId }, "Resend could not cancel scheduled member check-in email");
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ err: error, emailId }, "Resend could not cancel scheduled member check-in email");
    return false;
  }
}

export async function sendCollectiveFundWelcomeEmail(
  to: string,
  deliveryType: "physical" | "digital" = "physical",
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = process.env.NODE_ENV === "production" ? to : devTo || to;
  const isSandbox = process.env.NODE_ENV !== "production" && Boolean(devTo);
  const isDigital = deliveryType === "digital";
  if (!apiKey) {
    logger.warn({ recipient }, "RESEND_API_KEY not set — Collective Fund welcome email skipped");
    return false;
  }

  const subject = isDigital
    ? "Thank you for joining Countercult’s digital Patron Post"
    : "Thank you for backing Countercult’s Collective Fund";
  const welcome = "Thank you for joining Patron Post and supporting Countercult’s Collective Fund.";
  const deliveryDetails = isDigital
    ? "Your digital edition is a high-resolution PDF of the physical mailing and Countercult insert. We send it by email around mid-month, when that month’s physical mailing is ready to go out. This is a digital-only membership and does not include physical mail or shipping. Your membership renews monthly until canceled."
    : "Sign up by the 5th to join that month’s mailing batch. Sign up after the 5th and your first mailing goes in the following month’s batch. If you join just after the cutoff, allow around 6–8 weeks for your first mailing; joining later in the month usually means a shorter wait. We post around the middle of each month. International mail may take longer. Each paid monthly cycle includes one mailing. Your membership renews monthly from your signup date, not the mailing date.";
  const supportDetails = "Memberships help cover Network operating costs. Profit after costs goes to paying artists or buying cultural spaces.";
  const text = [
    welcome,
    deliveryDetails,
    isDigital
      ? "If your digital edition does not arrive, email countercultplatform@gmail.com so we can look into it."
      : "If your mail doesn’t arrive, email countercultplatform@gmail.com so we can look into it.",
    "You can manage or cancel your membership through the secure Stripe portal from the checkout confirmation page.",
    supportDetails,
  ].join("\n\n");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await sendWithCollectiveFundFooter(resend.emails.send.bind(resend.emails), {
    from: isSandbox ? "Countercult <onboarding@resend.dev>" : "Countercult <hello@countercult.network>",
    to: recipient,
    subject: isSandbox ? `[SANDBOX → ${to}] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#f9f9f6;color:#000;padding:32px;max-width:560px;border:2px solid #000;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font:10px monospace;margin-bottom:16px;">SANDBOX. Originally addressed to: ${escapeHtml(to)}</div>` : ""}
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;">Countercult · Patron Post</p>
        <h1 style="font-size:32px;line-height:1.05;margin:24px 0 16px;">${isDigital ? "Thank you for joining the digital edition." : "Thank you for backing the work."}</h1>
        <p style="font-size:15px;line-height:1.65;">${escapeHtml(welcome)}</p>
        <p style="font-size:15px;line-height:1.65;"><strong>${isDigital ? "Digital delivery:" : "Mailing schedule:"}</strong> ${escapeHtml(deliveryDetails)}</p>
        <p style="font-size:15px;line-height:1.65;">If your ${isDigital ? "digital edition" : "mail"} doesn’t arrive, <a href="mailto:countercultplatform@gmail.com">email us</a> so we can look into it.</p>
      <p style="font-size:15px;line-height:1.65;">You can manage or cancel your membership through the secure Stripe portal from the checkout confirmation page.</p>
        <p style="font-size:15px;line-height:1.65;">${escapeHtml(supportDetails)}</p>
      <p style="font-size:11px;color:#777;margin-top:24px;">Countercult · <a href="https://countercult.network/collective-fund">countercult.network/collective-fund</a></p>
    </div>`,
  });
  if (error) {
    logger.error({ err: error, recipient }, "Resend rejected the Collective Fund welcome email");
    return false;
  }
  return true;
}

export async function sendSketchyShonaDigitalWelcomeEmail(to: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const devTo = process.env.RESEND_DEV_TO?.trim();
  const recipient = process.env.NODE_ENV === "production" ? to : devTo || to;
  const isSandbox = process.env.NODE_ENV !== "production" && Boolean(devTo);
  if (!apiKey) {
    logger.warn({ recipient }, "RESEND_API_KEY not set — Sketchy Shona digital welcome email skipped");
    return false;
  }

  const subject = "Your Sketchy Shona digital Mail Club membership";
  const deliveryDetails = "Your membership includes a high-resolution PDF of that month’s mailing and Sketchy Sheet. I’ll email it around mid-month, when that month’s physical mailing is ready to go out. This digital-only membership does not include an envelope or shipping, and renews monthly until canceled. It isn’t the same as receiving real mail, but it’s better than missing out.";
  const text = [
    "Thank you for joining my Mail Club and supporting my work.",
    deliveryDetails,
    "If your PDF does not arrive, email shona.designs.studios@gmail.com so I can look into it.",
    "You can manage or cancel your membership through Stripe’s secure customer portal.",
  ].join("\n\n");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: isSandbox ? "Countercult <onboarding@resend.dev>" : "Countercult <hello@countercult.network>",
    to: recipient,
    replyTo: "shona.designs.studios@gmail.com",
    subject: isSandbox ? `[SANDBOX → ${to}] ${subject}` : subject,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:32px;max-width:560px;border:1px solid #ddd;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:4px 8px;font:10px monospace;margin-bottom:16px;">SANDBOX. Originally addressed to: ${escapeHtml(to)}</div>` : ""}
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555;">Sketchy Shona · Mail Club</p>
      <h1 style="font-size:30px;line-height:1.05;margin:24px 0 16px;">Thank you for joining my Mail Club.</h1>
      <p style="font-size:15px;line-height:1.65;">Your digital membership supports my work and gives you a way to follow along when physical mail does not fit your budget or is not practical where you live.</p>
      <p style="font-size:15px;line-height:1.65;"><strong>Digital delivery:</strong> ${escapeHtml(deliveryDetails)}</p>
      <p style="font-size:15px;line-height:1.65;">If your PDF does not arrive, <a href="mailto:shona.designs.studios@gmail.com">email me</a> so I can look into it.</p>
      <p style="font-size:15px;line-height:1.65;">You can manage or cancel your membership through Stripe’s secure customer portal.</p>
    </div>`,
  });
  if (error) {
    logger.error({ err: error, recipient }, "Resend rejected the Sketchy Shona digital welcome email");
    return false;
  }
  return true;
}

export type ExchangeDigestEmailListing = {
  id: number;
  title: string;
  city: string;
  category: string;
  description: string;
  cost: string | null;
};

export async function sendExchangeDigestEmail(
  to: string,
  listings: ExchangeDigestEmailListing[],
  unsubscribeToken: string,
  idempotencyKey: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const devTo = process.env.NODE_ENV === "production"
    ? undefined
    : process.env.RESEND_DEV_TO?.trim();
  if (process.env.NODE_ENV !== "production" && !devTo) {
    throw new Error("Exchange digest email is disabled outside production without RESEND_DEV_TO");
  }

  const recipient = devTo || to;
  const isSandbox = Boolean(devTo);
  const unsubscribeUrl = `${SITE_URL}/api/exchange-digest/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const boardUrl = `${SITE_URL}/residency?utm_source=exchange_digest&utm_medium=email&utm_campaign=weekly_exchange_digest`;
  const digestListings = listings.slice(0, 20);
  const textListings = digestListings.map((listing) => [
    `${listing.category}: ${listing.title}`,
    listing.city,
    listing.cost ? `Listed rate: ${listing.cost}` : "",
    listing.description,
    `${boardUrl}#listing-${listing.id}`,
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
  const htmlListings = digestListings.map((listing) => `
    <article style="border:1px solid #333;padding:16px;margin:0 0 12px;background:#111;">
      <p style="font:10px monospace;letter-spacing:1px;text-transform:uppercase;color:#c6ff3d;margin:0 0 8px;">${escapeHtml(listing.category)} · ${escapeHtml(listing.city)}</p>
      <h2 style="font-size:18px;line-height:1.25;margin:0 0 9px;color:#fff;">${escapeHtml(listing.title)}</h2>
      ${listing.cost ? `<p style="font-size:12px;color:#c6ff3d;margin:0 0 8px;">Listed rate: ${escapeHtml(listing.cost)}</p>` : ""}
      <p style="font-size:13px;line-height:1.6;color:#eee;margin:0 0 12px;white-space:pre-wrap;">${escapeHtml(listing.description.slice(0, 500))}</p>
      <a href="${boardUrl}#listing-${listing.id}" style="color:#c6ff3d;font-size:11px;font-weight:bold;text-transform:uppercase;">open the Exchange →</a>
    </article>`).join("");
  const omittedCount = Math.max(0, listings.length - digestListings.length);
  const text = [
    "New Exchange posts from Countercult",
    "You asked for this weekly update. These are new, active Exchange listings from the past week.",
    textListings,
    omittedCount > 0 ? `${omittedCount} more listings are on the board: ${boardUrl}` : "",
    `Browse all listings: ${boardUrl}`,
    `Unsubscribe from the weekly Exchange digest: ${unsubscribeUrl}`,
    "Countercult Creatives · hello@countercult.network",
  ].filter(Boolean).join("\n\n");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "Countercult <hello@countercult.network>",
    to: recipient,
    subject: `${isSandbox ? "[SANDBOX] " : ""}${listings.length} new Exchange ${listings.length === 1 ? "listing" : "listings"}`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#08090b;color:#f3efe7;padding:28px;max-width:620px;">
      ${isSandbox ? `<div style="background:#ff0;color:#000;padding:5px 8px;font-size:10px;margin-bottom:16px;">SANDBOX · originally addressed to: ${escapeHtml(to)}</div>` : ""}
      <p style="font:10px monospace;letter-spacing:2px;text-transform:uppercase;color:#c6ff3d;">Countercult · Exchange</p>
      <h1 style="font-size:28px;line-height:1.1;color:#fff;margin:12px 0;">New listings from the network</h1>
      <p style="font-size:14px;line-height:1.6;color:#ddd;margin:0 0 18px;">You asked for this weekly update. These active Exchange posts were added in the past week.</p>
      ${htmlListings}
      ${omittedCount > 0 ? `<p style="font-size:12px;color:#ddd;">${omittedCount} more listings are on the board.</p>` : ""}
      <p style="margin:22px 0;"><a href="${boardUrl}" style="display:inline-block;background:#c6ff3d;color:#000;padding:12px 16px;font-size:11px;font-weight:bold;letter-spacing:1px;text-decoration:none;text-transform:uppercase;">browse the Exchange →</a></p>
      <hr style="border:0;border-top:1px solid #333;margin:24px 0 16px;" />
      <p style="font-size:11px;line-height:1.6;color:#aaa;">You received this because you opted in to the weekly Exchange digest. <a href="${unsubscribeUrl}" style="color:#c6ff3d;">Unsubscribe</a> at any time.</p>
      <p style="font-size:10px;color:#777;">Countercult Creatives · <a href="mailto:hello@countercult.network" style="color:#777;">hello@countercult.network</a></p>
    </div>`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }, { idempotencyKey });

  if (error) throw new Error(error.message || "Resend rejected the Exchange digest");
  if (!data?.id) throw new Error("Resend accepted the Exchange digest without returning an ID");
}
