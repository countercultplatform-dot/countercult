type AnalyticsData = Record<string, string | number | boolean>;
const ANALYTICS_CONSENT_KEY = "cc_analytics_consent_v1";
const PATRON_POST_ATTRIBUTION_KEY = "cc_patron_post_funnel_attribution_v1";
const PATRON_POST_RETURNED_KEY = "cc_patron_post_return_tracked_v1";
const PATRON_POST_CONFIRMED_KEY = "cc_patron_post_confirmation_tracked_v1";

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted") return;
    window.umami?.track(name, data);
  } catch {
    // Analytics must never break the app.
  }
}

export function getAnalyticsConsent(): "granted" | "denied" | "unset" {
  if (typeof window === "undefined") return "unset";
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unset";
  } catch {
    return "unset";
  }
}

export function setAnalyticsConsent(value: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    if (value === "denied") {
      window.sessionStorage.removeItem(PATRON_POST_ATTRIBUTION_KEY);
      window.sessionStorage.removeItem(PATRON_POST_RETURNED_KEY);
      window.sessionStorage.removeItem(PATRON_POST_CONFIRMED_KEY);
    }
    window.dispatchEvent(new Event("cc:analytics-consent-change"));
  } catch {
    // Preference storage is best effort; analytics remains disabled by default.
  }
}

function safeCampaignValue(value: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z0-9_-]{1,50}$/.test(normalized) ? normalized : undefined;
}

export function getPatronPostPageContext(route: string): AnalyticsData {
  if (typeof window === "undefined") return { route, source: "direct" };

  const params = new URLSearchParams(window.location.search);
  const campaignSource = safeCampaignValue(params.get("utm_source"));
  const campaignMedium = safeCampaignValue(params.get("utm_medium"));
  const campaignName = safeCampaignValue(params.get("utm_campaign"));
  let referrerDomain: string | undefined;

  try {
    referrerDomain = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : undefined;
  } catch {
    referrerDomain = undefined;
  }

  return {
    route,
    source: campaignSource ?? referrerDomain ?? "direct",
    ...(campaignSource ? { utm_source: campaignSource } : {}),
    ...(campaignMedium ? { utm_medium: campaignMedium } : {}),
    ...(campaignName ? { utm_campaign: campaignName } : {}),
    ...(referrerDomain ? { referrer_domain: referrerDomain } : {}),
  };
}

export function rememberPatronPostAttribution(
  route: string,
  placement: string,
  gift: boolean,
  membershipType: "physical" | "digital" = "physical",
): AnalyticsData {
  const context = { ...getPatronPostPageContext(route), placement, gift, membership_type: membershipType };
  if (getAnalyticsConsent() !== "granted" || typeof window === "undefined") return context;

  try {
    window.sessionStorage.setItem(PATRON_POST_ATTRIBUTION_KEY, JSON.stringify(context));
    window.sessionStorage.removeItem(PATRON_POST_RETURNED_KEY);
    window.sessionStorage.removeItem(PATRON_POST_CONFIRMED_KEY);
  } catch {
    // Attribution storage is optional and must never interrupt checkout.
  }
  return context;
}

export function getPatronPostAttribution(fallbackRoute: string): AnalyticsData {
  const fallback = getPatronPostPageContext(fallbackRoute);
  if (getAnalyticsConsent() !== "granted" || typeof window === "undefined") return fallback;

  try {
    const raw = window.sessionStorage.getItem(PATRON_POST_ATTRIBUTION_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const route = typeof stored.route === "string" ? stored.route : fallback.route;
    const source = typeof stored.source === "string" ? stored.source : fallback.source;
    return {
      route,
      source,
      ...(typeof stored.utm_source === "string" ? { utm_source: stored.utm_source } : {}),
      ...(typeof stored.utm_medium === "string" ? { utm_medium: stored.utm_medium } : {}),
      ...(typeof stored.utm_campaign === "string" ? { utm_campaign: stored.utm_campaign } : {}),
      ...(typeof stored.referrer_domain === "string" ? { referrer_domain: stored.referrer_domain } : {}),
      ...(typeof stored.placement === "string" ? { placement: stored.placement } : {}),
      ...(typeof stored.gift === "boolean" ? { gift: stored.gift } : {}),
      ...(stored.membership_type === "physical" || stored.membership_type === "digital"
        ? { membership_type: stored.membership_type }
        : {}),
    };
  } catch {
    return fallback;
  }
}

export function clearPatronPostAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PATRON_POST_ATTRIBUTION_KEY);
  } catch {
    // Clearing optional attribution storage is best effort.
  }
}

export function trackPatronPostReturn(data: AnalyticsData): void {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") return;
  try {
    if (window.sessionStorage.getItem(PATRON_POST_RETURNED_KEY) === "1") return;
    window.sessionStorage.setItem(PATRON_POST_RETURNED_KEY, "1");
  } catch {
    // Event deduplication is best effort.
  }
  trackEvent("patron_post_checkout_returned", data);
}

export function trackPatronPostMembershipConfirmation(data: AnalyticsData): void {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") return;
  try {
    if (window.sessionStorage.getItem(PATRON_POST_CONFIRMED_KEY) === "1") return;
    window.sessionStorage.setItem(PATRON_POST_CONFIRMED_KEY, "1");
  } catch {
    // Event deduplication is best effort.
  }
  trackEvent("patron_post_membership_confirmed", data);
}