import { getAnalyticsConsent, trackEvent } from "./analytics.ts";

export type PatronPostStickerVariant = "snail" | "envelope";

const ATTRIBUTION_STORAGE_KEY = "cc_patron_post_sticker_attribution_v1";
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type StickerAttribution = {
  variant: PatronPostStickerVariant;
  clickedAt: number;
};

function isStickerVariant(value: unknown): value is PatronPostStickerVariant {
  return value === "envelope";
}

export function parsePatronPostStickerAttribution(
  serialized: string | null,
  now: number,
): StickerAttribution | null {
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as Partial<StickerAttribution>;
    if (
      !isStickerVariant(parsed.variant)
      || typeof parsed.clickedAt !== "number"
      || !Number.isFinite(parsed.clickedAt)
      || parsed.clickedAt > now
      || now - parsed.clickedAt > ATTRIBUTION_WINDOW_MS
    ) {
      return null;
    }
    return { variant: parsed.variant, clickedAt: parsed.clickedAt };
  } catch {
    return null;
  }
}

export function trackPatronPostStickerExposure(variant: PatronPostStickerVariant): void {
  trackEvent("patron_post_sticker_exposure", {
    variant,
    placement: "global_sticker",
  });
}

export function recordPatronPostStickerClick(variant: PatronPostStickerVariant): void {
  trackEvent("patron_post_sticker_click", {
    variant,
    placement: "global_sticker",
  });

  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") return;
  try {
    const attribution: StickerAttribution = { variant, clickedAt: Date.now() };
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution is best effort and must never block the Patron Post link.
  }
}

export function trackPatronPostStickerConversion(gift: boolean): void {
  if (
    typeof window === "undefined"
    || getAnalyticsConsent() !== "granted"
  ) return;

  try {
    const serialized = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const attribution = parsePatronPostStickerAttribution(serialized, Date.now());
    if (!attribution) {
      if (serialized) window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
      return;
    }

    // Keep the attribution available if the published analytics tracker is not loaded yet.
    if (!window.umami) return;

    trackEvent("patron_post_sticker_conversion", {
      variant: attribution.variant,
      placement: "global_sticker",
      gift,
    });
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // Analytics and attribution storage must never interrupt a confirmed membership.
  }
}
