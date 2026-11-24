export type SignupAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrerDomain?: string;
  landingPath?: string;
};

export type SignupAttributionFields = {
  signupSource?: string;
  signupMedium?: string;
  signupCampaign?: string;
  signupReferrerDomain?: string;
  signupLandingPath?: string;
};

export const SIGNUP_DISCOVERY_SOURCES = [
  "A friend or Countercult member",
  "Instagram",
  "Other social media",
  "Countercult publication or newsletter",
  "Search engine",
  "Event or cultural space",
  "Other",
  "Prefer not to say",
] as const;

let initialAttribution: SignupAttribution | null = null;

function safeCampaignValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9._-]{1,100}$/.test(normalized) ? normalized : undefined;
}

function safeReferrerDomain(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  return normalized.length <= 253 && /^[a-z0-9.-]+$/.test(normalized)
    ? normalized
    : undefined;
}

function safeLandingPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) return undefined;
  return path.length <= 255 ? path : undefined;
}

export function captureInitialSignupAttribution(): void {
  if (typeof window === "undefined" || initialAttribution) return;

  const params = new URLSearchParams(window.location.search);
  let referrerDomain: string | undefined;
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.hostname.toLowerCase() !== window.location.hostname.toLowerCase()) {
        referrerDomain = safeReferrerDomain(referrer.hostname);
      }
    }
  } catch {
    referrerDomain = undefined;
  }

  initialAttribution = {
    source: safeCampaignValue(params.get("utm_source")),
    medium: safeCampaignValue(params.get("utm_medium")),
    campaign: safeCampaignValue(params.get("utm_campaign")),
    referrerDomain,
    landingPath: safeLandingPath(window.location.pathname),
  };
}

export function getSignupAttributionDraft(): SignupAttribution {
  captureInitialSignupAttribution();
  return { ...(initialAttribution ?? {}) };
}

export function getSignupAttributionFields(): SignupAttributionFields {
  const attribution = getSignupAttributionDraft();
  return {
    signupSource: attribution.source,
    signupMedium: attribution.medium,
    signupCampaign: attribution.campaign,
    signupReferrerDomain: attribution.referrerDomain,
    signupLandingPath: attribution.landingPath,
  };
}

export function restoreSignupAttribution(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const attribution = value as Record<string, unknown>;
  initialAttribution = {
    source: safeCampaignValue(attribution.source),
    medium: safeCampaignValue(attribution.medium),
    campaign: safeCampaignValue(attribution.campaign),
    referrerDomain: safeReferrerDomain(attribution.referrerDomain),
    landingPath: safeLandingPath(attribution.landingPath),
  };
}
