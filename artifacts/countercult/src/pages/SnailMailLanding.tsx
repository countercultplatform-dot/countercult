import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, FileText, Mail, Pause, Play } from "lucide-react";
import editionOne from "@/assets/repo-placeholder.svg";
import editionTwo from "@/assets/repo-placeholder.svg";
import editionThree from "@/assets/repo-placeholder.svg";
import snailSticker from "@/assets/repo-placeholder.svg";
import envelopeSticker from "@/assets/repo-placeholder.svg";
import coffeeMugs from "@/assets/repo-placeholder.svg";
import natGeoCollage from "@/assets/repo-placeholder.svg";
import shonaMuralPhoto from "@/assets/repo-placeholder.svg";
import pinkBalaclavaFace from "@/assets/repo-placeholder.svg";
import { PatronPostMailingTimeline } from "@/components/PatronPostMailingTimeline";
import { PatronPostAnonymousQuestionForm, PatronPostMemberHelp } from "@/components/PatronPostMemberHelp";
import { PatronPostCutoffCountdown } from "@/components/PatronPostCutoffCountdown";
import { showPledgePopup } from "@/components/PledgePopup";
import {
  clearPatronPostAttribution,
  getAnalyticsConsent,
  getPatronPostPageContext,
  rememberPatronPostAttribution,
  trackEvent,
} from "@/lib/analytics";
import streetTable from "@/assets/repo-placeholder.svg";
import laptopScene from "@/assets/repo-placeholder.svg";
import psEnvelope from "@/assets/repo-placeholder.svg";
import honestWork from "@/assets/repo-placeholder.svg";
import leopardSlug from "@/assets/repo-placeholder.svg";
import travelerNotTourist from "@/assets/repo-placeholder.svg";
import studioSession from "@/assets/repo-placeholder.svg";
import killTheFear from "@/assets/repo-placeholder.svg";
import mural from "@/assets/repo-placeholder.svg";
import letters from "@/assets/repo-placeholder.svg";
import thinkWhiteBoy from "@/assets/repo-placeholder.svg";

const JOIN_URL = "#snail-checkout";
const editions = [editionOne, editionTwo, editionThree];
const editionCaptions = ["Studio work + a letter", "Field notes + artwork", "A page from the journal"];
const vibeImages = [
  { src: streetTable, alt: "A late meal shared around a low street table." },
  { src: laptopScene, alt: "A writer at a computer in a dim room." },
  { src: psEnvelope, alt: "A handwritten postscript on the back of an envelope." },
  { src: honestWork, alt: "A farmer in a field with the words: It ain't much, but it's honest work." },
  { src: leopardSlug, alt: "A leopard slug photographed against a pale background." },
  { src: travelerNotTourist, alt: "A traveler with a handwritten note that says, Be a traveler, not a tourist." },
  { src: studioSession, alt: "Sketchy Shona painting in the studio." },
  { src: killTheFear, alt: "A handwritten note: Kill the fear and let the artist be born." },
  { src: mural, alt: "Artists painting a large outdoor mural." },
  { src: letters, alt: "A hand holding a stack of letters in a studio." },
  { src: "/sketchyshona/media/sketchy-moving-drawing.gif", alt: "Animated DA SWAMP Sketchy Sheet with a bird, frog, seated figure, chair and rat." },
  { src: thinkWhiteBoy, alt: "A dog on a beach beneath the phrase, Think, white boy, think." },
];

type PatronPostPricing = {
  earlySupporter: boolean;
  membershipCents: number;
  totalCents: number;
};

type PatronPostProgress = {
  activeMembers: number;
  goal: 1000;
};

type PatronPostDeliveryType = "physical" | "digital";

type PatronPostDigitalPricing = {
  available: boolean;
  amountCents: number;
};

function euros(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function PatronPostOptionButtons({
  location,
  physicalTotalCents,
  digitalPricing,
  physicalDisabled,
  digitalDisabled,
  onSelect,
}: {
  location: "hero" | "checkout";
  physicalTotalCents: number | null;
  digitalPricing: PatronPostDigitalPricing | null;
  physicalDisabled: boolean;
  digitalDisabled: boolean;
  onSelect: (deliveryType: PatronPostDeliveryType, location: "hero" | "checkout") => void;
}) {
  return (
    <div className="snail-checkout-option-buttons" role="group" aria-label="Choose a Patron Post edition">
      <button
        type="button"
        className="snail-checkout-option snail-checkout-option--physical"
        onClick={() => onSelect("physical", location)}
        disabled={physicalDisabled}
        data-testid={location === "hero" ? "button-snail-join-hero" : "button-snail-checkout"}
      >
        <Mail className="snail-delivery-choice-icon" aria-hidden="true" />
        <span>
          <strong>Join Patron Post</strong>
          <small>Physical mail · {physicalTotalCents === null ? "€11" : euros(physicalTotalCents)} / month</small>
        </span>
        <ArrowRight aria-hidden="true" />
      </button>
      <button
        type="button"
        className="snail-checkout-option snail-checkout-option--digital"
        onClick={() => onSelect("digital", location)}
        disabled={digitalDisabled}
        aria-describedby={`snail-digital-option-explanation-${location}`}
        data-testid={`button-snail-digital-${location}`}
      >
        <FileText className="snail-delivery-choice-icon" aria-hidden="true" />
        <span>
          <strong>Digital only</strong>
          <small>{digitalPricing?.available ? `PDF by email · ${euros(digitalPricing.amountCents)} / month` : "Digital edition unavailable"}</small>
        </span>
        <ArrowRight aria-hidden="true" />
      </button>
      {digitalPricing?.available && (
        <p className="snail-checkout-option-description" id={`snail-digital-option-explanation-${location}`}>
          If physical mail is out of reach or impractical where you live, a high-resolution PDF of the mailing is emailed around mid-month, when that month’s physical mailing is ready to go out. It isn’t the same as real mail, but it’s better than missing out.
        </p>
      )}
    </div>
  );
}

export default function SnailMailLanding() {
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [deliveryType, setDeliveryType] = useState<PatronPostDeliveryType>("physical");
  const [giftMode, setGiftMode] = useState(false);
  const [mailingFirstName, setMailingFirstName] = useState("");
  const [mailingLastName, setMailingLastName] = useState("");
  const [editionIndex, setEditionIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pricing, setPricing] = useState<PatronPostPricing | null>(null);
  const [pricingUnavailable, setPricingUnavailable] = useState(false);
  const [digitalPricing, setDigitalPricing] = useState<PatronPostDigitalPricing | null>(null);
  const [progress, setProgress] = useState<PatronPostProgress | null>(null);
  const [progressUnavailable, setProgressUnavailable] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [contributionAmount, setContributionAmount] = useState("10");
  const [contributionLoading, setContributionLoading] = useState(false);
  const [contributionComplete, setContributionComplete] = useState(false);
  const [contributionHasArtReward, setContributionHasArtReward] = useState(false);
  const [contributionError, setContributionError] = useState("");
  const stickyExposureTracked = useRef(false);

  async function refreshPricing(signal?: AbortSignal) {
    setPricingUnavailable(false);
    try {
      const response = await fetch("/api/countercult-patron-post/availability", {
        cache: "no-store",
        signal,
      });
      const result = await response.json().catch(() => null) as PatronPostPricing | null;
      if (
        !response.ok
        || !result
        || typeof result.earlySupporter !== "boolean"
        || !Number.isFinite(result.membershipCents)
        || !Number.isFinite(result.totalCents)
      ) {
        throw new Error("Patron Post pricing is unavailable.");
      }
      setPricing(result);
    } catch {
      if (!signal?.aborted) {
        setPricingUnavailable(true);
        trackEvent("patron_post_checkout_error", {
          ...getPatronPostPageContext("/snail"),
          placement: "price_check",
          stage: "price_check",
          reason: "price_unavailable",
        });
      }
    }
  }

  async function refreshDigitalPricing(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/countercult-patron-post/digital-availability", {
        cache: "no-store",
        signal,
      });
      const result = await response.json().catch(() => null) as { available?: boolean; amountCents?: number | null } | null;
      if (!response.ok || !result || typeof result.available !== "boolean") {
        throw new Error("Digital Patron Post pricing is unavailable.");
      }
      if (result.available && result.amountCents !== 700) {
        throw new Error("Digital Patron Post pricing could not be verified.");
      }
      setDigitalPricing(result.available ? { available: true, amountCents: result.amountCents as number } : null);
    } catch {
      if (!signal?.aborted) {
        setDigitalPricing(null);
        trackEvent("patron_post_checkout_error", {
          ...getPatronPostPageContext("/snail"),
          membership_type: "digital",
          placement: "digital_price_check",
          stage: "price_check",
          reason: "price_unavailable",
        });
      }
    }
  }

  async function refreshProgress(signal?: AbortSignal) {
    setProgressUnavailable(false);
    try {
      const response = await fetch("/api/patron-post/progress", {
        cache: "no-store",
        signal,
      });
      const result = await response.json().catch(() => null) as PatronPostProgress | null;
      if (
        !response.ok
        || !result
        || !Number.isInteger(result.activeMembers)
        || result.activeMembers < 0
        || result.goal !== 1000
      ) {
        throw new Error("Patron Post membership progress is unavailable.");
      }
      setProgress(result);
    } catch {
      if (!signal?.aborted) setProgressUnavailable(true);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refreshPricing(controller.signal);
    void refreshDigitalPricing(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshProgress(controller.signal);
    const interval = window.setInterval(() => void refreshProgress(), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const trackLandingView = () => {
      trackEvent("patron_post_landing_viewed", getPatronPostPageContext("/snail"));
    };
    trackLandingView();
    window.addEventListener("cc:analytics-consent-change", trackLandingView);
    return () => window.removeEventListener("cc:analytics-consent-change", trackLandingView);
  }, []);

  useEffect(() => {
    const trackStickyExposure = () => {
      if (stickyExposureTracked.current || getAnalyticsConsent() !== "granted") return;
      const strip = document.querySelector<HTMLElement>('[data-testid="snail-sticky-offer"]');
      if (!strip) return;
      stickyExposureTracked.current = true;
      trackEvent("patron_post_sticky_offer_exposed", {
        ...getPatronPostPageContext("/snail"),
        height_variant: window.matchMedia("(max-width: 760px)").matches ? "compact_mobile" : "current_desktop",
        timing_variant: "immediate",
        strip_height_px: Math.round(strip.getBoundingClientRect().height),
        viewport: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
      });
    };
    trackStickyExposure();
    window.addEventListener("cc:analytics-consent-change", trackStickyExposure);
    return () => window.removeEventListener("cc:analytics-consent-change", trackStickyExposure);
  }, []);

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (
      targetId !== "ask-anonymously"
      && targetId !== "patron-post-anonymous-question-title"
      && targetId !== "snail-checkout"
    ) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: targetId === "patron-post-anonymous-question-title" ? "center" : "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "1") {
      if (params.get("membership_type") === "digital") {
        setCheckoutError("Digital checkout wasn’t completed. You can try again or choose physical mail.");
        window.history.replaceState({}, "", `${window.location.pathname}#snail-checkout`);
      } else {
        setContributionError("Checkout was not completed. You can try again below.");
        window.history.replaceState({}, "", `${window.location.pathname}#snail-support`);
      }
      return;
    }
    const sessionId = params.get("session_id");
    if (!sessionId || params.get("support") !== "1") return;
    setContributionLoading(true);
    void fetch("/api/patron-post/contribution/complete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { completed?: boolean; beneficiary?: string; artReward?: boolean; error?: string };
        if (!response.ok || !result.completed || result.beneficiary !== "Countercult") {
          throw new Error(result.error || "Your contribution is still being confirmed.");
        }
        setContributionComplete(true);
        setContributionHasArtReward(Boolean(result.artReward));
        setContributionError("");
        window.history.replaceState({}, "", `${window.location.pathname}#snail-support`);
      })
      .catch((error) => setContributionError(error instanceof Error ? error.message : "Your contribution is still being confirmed."))
      .finally(() => setContributionLoading(false));
  }, []);

  useEffect(() => {
    if (carouselPaused || prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      setEditionIndex((current) => (current + 1) % editions.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [carouselPaused, prefersReducedMotion]);

  function chooseDeliveryType(nextType: PatronPostDeliveryType) {
    setDeliveryType(nextType);
    if (nextType === "digital") setGiftMode(false);
  }

  async function startCheckout(
    placement: "hero" | "sticky_offer" | "checkout_card",
    selectedDeliveryType: PatronPostDeliveryType = deliveryType,
  ) {
    const firstName = mailingFirstName.trim();
    const lastName = mailingLastName.trim();
    if (selectedDeliveryType === "physical" && (!firstName || !lastName)) {
      setCheckoutError("Enter the first and last name for the mailing.");
      document.getElementById(placement === "checkout_card" ? "snail-mailing-first-name" : "snail-hero-mailing-first-name")?.focus();
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError("");
    const isPhysical = selectedDeliveryType === "physical";
    const isGift = isPhysical && giftMode;
    const attribution = rememberPatronPostAttribution("/snail", placement, isGift, selectedDeliveryType);
    trackEvent("patron_post_join_clicked", attribution);
    let failureReason = "request_failed";
    try {
      const response = await fetch(isPhysical
        ? "/api/countercult-patron-post/checkout"
        : "/api/countercult-patron-post/digital-checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPhysical
          ? { gift: isGift, mailingFirstName: firstName, mailingLastName: lastName }
          : {}),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        failureReason = "session_unavailable";
        throw new Error(result.error || "Secure checkout could not be opened.");
      }
      trackEvent("patron_post_checkout_session_created", attribution);
      window.location.assign(result.url);
    } catch {
      trackEvent("patron_post_checkout_error", {
        ...attribution,
        stage: "create_session",
        reason: failureReason,
      });
      clearPatronPostAttribution();
      setCheckoutError("Checkout didn’t open. Please try again, or report the problem below.");
      setCheckoutLoading(false);
    }
  }

  function startCheckoutForDelivery(selectedDeliveryType: PatronPostDeliveryType, placement: "hero" | "sticky_offer" | "checkout_card") {
    chooseDeliveryType(selectedDeliveryType);
    if (selectedDeliveryType === "physical") {
      if (pricing) void startCheckout(placement, selectedDeliveryType);
      else void refreshPricing();
      return;
    }
    if (digitalPricing?.available) void startCheckout(placement, selectedDeliveryType);
    else void refreshDigitalPricing();
  }

  async function startContribution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContributionLoading(true);
    setContributionError("");
    try {
      const response = await fetch("/api/countercult-patron-post/snail-contribution/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(Number(contributionAmount) * 100) }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "One-time checkout could not be opened.");
      window.location.assign(result.url);
    } catch (error) {
      setContributionError(error instanceof Error ? error.message : "One-time checkout could not be opened.");
      setContributionLoading(false);
    }
  }

  async function sharePage() {
    const shareData = {
      title: "Countercult Patron Post",
      text: "Monthly art mail for independent culture, Countercult Network updates, and its community fundraiser.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2200);
    } catch {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 2200);
      } catch {
        setShareState("idle");
      }
    }
  }

  return (
    <main className="snail-campaign">
      <style>{`
        .snail-campaign {
          --snail-paper: #f3eedf;
          --snail-ink: #171714;
          --snail-lime: #c6ff3d;
          --snail-red: #e94c38;
          --snail-muted: #6f6b60;
          min-height: 100dvh;
          overflow: visible;
          background: var(--snail-paper);
          color: var(--snail-ink);
          font-family: Arial, Helvetica, sans-serif;
          text-transform: none;
          letter-spacing: 0;
          isolation: isolate;
        }
        .snail-campaign *, .snail-campaign *::before, .snail-campaign *::after { box-sizing: border-box; }
        .snail-campaign a { color: inherit; }
        .snail-campaign [data-testid="patron-post-cutoff-countdown"] a { color: var(--snail-lime); }
        .snail-campaign [data-testid="patron-post-cutoff-countdown"] a:hover { color: var(--snail-ink); }
        .snail-copy-link { font-weight: 800; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .snail-campaign a:focus-visible, .snail-campaign button:focus-visible, .snail-campaign summary:focus-visible {
          outline: 3px solid var(--snail-red);
          outline-offset: 4px;
        }
        .snail-grain {
          position: fixed;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          opacity: .12;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");
          mix-blend-mode: multiply;
        }
        .snail-schedule-strip {
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 10px clamp(18px, 4vw, 56px);
          border-bottom: 2px solid var(--snail-ink);
          background: var(--snail-ink);
          color: var(--snail-paper);
          box-shadow: 0 3px 8px rgba(23,23,20,.2);
        }
        .snail-schedule-strip-inner { display: flex; width: min(100%, 1540px); margin: 0 auto; align-items: center; justify-content: space-between; gap: 14px; }
        .snail-schedule-strip-title { margin: 0; font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .snail-schedule-strip-copy { margin: 3px 0 0; color: rgba(243,238,223,.76); font-size: 10px; line-height: 1.35; }
        .snail-schedule-strip a { display: inline-flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 10px; padding: 0 13px; border: 2px solid var(--snail-paper); background: var(--snail-red); color: white; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-decoration: none; text-transform: uppercase; }
        .snail-schedule-strip a:hover { background: #c93227; }
        .snail-timeline-section { background: #fffaf0; }
        .snail-timeline-heading { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: end; margin-bottom: 20px; }
        .snail-timeline-heading h2 { max-width: 760px; margin: 14px 0 0; font-size: clamp(36px, 5.5vw, 68px); font-weight: 900; line-height: .92; letter-spacing: -.075em; text-wrap: balance; }
        .snail-timeline-heading > p { max-width: 480px; margin: 0; font-size: 15px; line-height: 1.5; }
        .snail-hero {
          position: relative;
          display: grid;
          width: min(100%, 1540px);
          margin: 0 auto;
          padding: clamp(38px, 6vw, 84px) clamp(20px, 6vw, 92px) 62px;
          grid-template-columns: minmax(0, 1.08fr) minmax(270px, .92fr);
          align-items: center;
          gap: clamp(12px, 3vw, 56px);
        }
        .snail-hero-copy { position: relative; z-index: 2; }
        .snail-eyebrow, .snail-label {
          margin: 0;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .16em;
          line-height: 1.4;
          text-transform: uppercase;
        }
        .snail-eyebrow { display: inline-flex; align-items: center; gap: 9px; }
        .snail-eyebrow::before { width: 26px; height: 2px; background: var(--snail-red); content: ""; }
        .snail-hero h1 {
          max-width: 900px;
          margin: 26px 0 0;
          font-size: clamp(48px, 8vw, 116px);
          font-weight: 900;
          line-height: .88;
          letter-spacing: -.085em;
          text-wrap: balance;
        }
        .snail-hero h1 em {
          position: relative;
          display: inline-block;
          color: var(--snail-red);
          font-style: normal;
        }
        .snail-hero h1 em::after {
          position: absolute;
          right: .01em;
          bottom: -.08em;
          left: 0;
          height: .09em;
          background: var(--snail-lime);
          color: #fff;
          content: "";
          transform: rotate(-1deg);
          z-index: -1;
        }
        .snail-hero-tagline { margin: 14px 0 0; color: var(--snail-ink); font-size: clamp(15px, 1.7vw, 20px); font-weight: 900; letter-spacing: -.025em; }
        .snail-hero-intro {
          display: grid;
          gap: 12px;
          max-width: 570px;
          margin: 27px 0 0;
          font-size: clamp(16px, 1.6vw, 20px);
          line-height: 1.48;
        }
        .snail-hero-intro p { margin: 0; }
        .snail-hero-intro strong { font-weight: 800; }
        .snail-mobile-mail-proof { display: none; }
        .snail-hero-progress { font-weight: 900; }
        .snail-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 27px; }
        .snail-actions#snail-hero-form { scroll-margin-top: 92px; }
        .snail-hero-recipient-fields { display: grid; flex: 0 0 100%; width: min(100%, 490px); gap: 8px; }
        .snail-hero-recipient-fields > p { margin: 0; font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .snail-hero-recipient-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .snail-hero-recipient-grid label { display: grid; min-width: 0; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
        .snail-hero-recipient-grid input { width: 100%; min-width: 0; min-height: 42px; border: 1px solid rgba(23,23,20,.55); padding: 0 10px; background: #fffaf0; color: var(--snail-ink); font-size: 13px; font-weight: 500; letter-spacing: normal; text-transform: none; }
        .snail-hero-recipient-fields > small { color: var(--snail-muted); font-size: 10px; line-height: 1.4; }
        .snail-hero-checkout-error { flex: 0 0 100%; margin: 0; border-left: 3px solid #8f1d12; padding: 8px 10px; color: #8f1d12; font-size: 11px; line-height: 1.45; }
        .snail-hero-checkout-error p { margin: 0; font-weight: 700; }
        .snail-hero-checkout-error a { display: inline-block; margin-top: 4px; color: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
        .snail-cta {
          display: inline-flex;
          min-height: 66px;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 0 24px;
          border: 2px solid var(--snail-ink);
          background: var(--snail-red);
          color: #fff !important;
          box-shadow: 5px 5px 0 var(--snail-ink);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .1em;
          text-decoration: none;
          text-transform: uppercase;
          transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease;
        }
        .snail-cta:hover { background: #c93227; box-shadow: 2px 2px 0 var(--snail-ink); transform: translate(3px, 3px); }
        .snail-cta svg { width: 17px; height: 17px; }
        .snail-cta-note { max-width: 205px; color: var(--snail-muted); font-size: 11px; line-height: 1.4; }
        .snail-checkout { background: #fffaf0; }
        .snail-fund-goal { border-block: 2px solid var(--snail-ink); background: var(--snail-red); color: #fff; }
        .snail-fund-goal-inner { display: grid; width: min(100%, 1540px); margin: 0 auto; padding: clamp(24px, 4vw, 42px) clamp(20px, 6vw, 92px); grid-template-columns: minmax(0, 1fr) minmax(230px, .42fr); align-items: center; gap: clamp(24px, 5vw, 72px); }
        .snail-fund-goal-copy > p { margin: 0; color: rgba(255,255,255,.78); font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
        .snail-fund-goal h2 { max-width: 940px; margin: 11px 0 0; font-size: clamp(26px, 3.6vw, 48px); font-weight: 400; line-height: .98; letter-spacing: -.055em; }
        .snail-fund-goal h2 strong { font-weight: 900; }
        .snail-fund-goal-progress { min-width: 0; border-left: 2px solid rgba(255,255,255,.55); padding-left: clamp(18px, 3vw, 34px); }
        .snail-fund-goal-progress-label { margin: 0; color: rgba(255,255,255,.82); font-size: 10px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
        .snail-fund-goal-progress-value { display: block; margin-top: 8px; font-size: clamp(30px, 4.1vw, 52px); font-weight: 900; line-height: .98; letter-spacing: -.06em; }
        .snail-fund-goal-remaining { display: block; margin-top: 5px; color: rgba(255,255,255,.82); font-size: 12px; font-weight: 700; }
        .snail-fund-goal-progress-track { height: 8px; margin-top: 14px; overflow: hidden; border: 1px solid #fff; background: rgba(255,255,255,.2); }
        .snail-fund-goal-progress-track > span { display: block; height: 100%; background: #fff; }
        .snail-vibes { border-block: 2px solid var(--snail-ink); background: var(--snail-ink); color: var(--snail-paper); }
        .snail-vibes-inner { width: min(100%, 1040px); margin: 0 auto; padding: clamp(24px, 3vw, 38px) clamp(18px, 3vw, 36px); }
        .snail-vibes-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
        .snail-vibes-heading h2 { margin: 0; color: var(--snail-lime); font-size: clamp(42px, 6vw, 76px); font-weight: 900; letter-spacing: -.09em; line-height: .88; text-transform: uppercase; }
        .snail-vibes-heading p { max-width: 330px; margin: 0; color: rgba(243,238,223,.78); font-size: 12px; line-height: 1.6; }
        .snail-vibes-wall { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: clamp(34px, 4vw, 62px); gap: clamp(10px, 1.7vw, 22px); margin-top: clamp(26px, 4vw, 50px); }
        .snail-vibe-card { min-width: 0; min-height: 0; border: 2px solid var(--snail-paper); background: #333; box-shadow: 5px 6px 0 rgba(0,0,0,.34); overflow: hidden; }
        .snail-vibe-card img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .snail-vibe-card { background: #171714; }
        .snail-support-section { border-top: 2px solid var(--snail-ink); background: var(--snail-paper); }
        .snail-support-inner { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .8fr); align-items: center; gap: clamp(24px, 6vw, 80px); }
        .snail-support-inner h2 { max-width: 680px; margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); font-weight: 900; line-height: .92; letter-spacing: -.07em; }
        .snail-support-inner > div:first-child > p:last-child { max-width: 660px; margin-top: 16px; font-size: 14px; line-height: 1.6; }
        .snail-support-card { display: grid; gap: 12px; border: 2px solid var(--snail-ink); padding: clamp(18px, 3vw, 30px); background: white; }
        .snail-support-card label { font-size: 12px; font-weight: 700; }
        .snail-support-card input { min-height: 48px; width: 112px; border: 2px solid var(--snail-ink); padding: 0 12px; font: inherit; }
        .snail-support-card button { min-height: 48px; border: 2px solid var(--snail-ink); padding: 0 14px; color: white; background: var(--snail-red); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }
        .snail-support-card button:disabled { opacity: .6; cursor: wait; }
        .snail-support-status { border: 1px solid var(--snail-ink); padding: 12px; font-size: 12px; line-height: 1.5; }
        .snail-vibe-card:nth-child(1) { grid-column: 1 / 5; grid-row: 1 / 6; transform: rotate(-2deg); }
        .snail-vibe-card:nth-child(2) { grid-column: 5 / 8; grid-row: 1 / 4; transform: rotate(1deg); }
        .snail-vibe-card:nth-child(3) { grid-column: 8 / 10; grid-row: 1 / 3; transform: rotate(-2deg); }
        .snail-vibe-card:nth-child(4) { grid-column: 10 / 13; grid-row: 1 / 4; transform: rotate(2deg); }
        .snail-vibe-card:nth-child(5) { grid-column: 1 / 3; grid-row: 6 / 8; transform: rotate(3deg); }
        .snail-vibe-card:nth-child(6) { grid-column: 3 / 5; grid-row: 6 / 9; transform: rotate(-2deg); }
        .snail-vibe-card:nth-child(7) { grid-column: 5 / 8; grid-row: 4 / 9; transform: rotate(1deg); }
        .snail-vibe-card:nth-child(8) { grid-column: 8 / 10; grid-row: 3 / 6; transform: rotate(2deg); }
        .snail-vibe-card:nth-child(9) { grid-column: 10 / 13; grid-row: 4 / 8; transform: rotate(-1deg); }
        .snail-vibe-card:nth-child(10) { grid-column: 1 / 5; grid-row: 9 / 12; transform: rotate(1deg); }
        .snail-vibe-card:nth-child(11) { grid-column: 8 / 13; grid-row: 8 / 12; transform: rotate(-1deg); }
        .snail-vibes-wall { grid-template-columns: repeat(6, minmax(0, 1fr)); grid-auto-rows: auto; grid-auto-flow: row; gap: 12px; margin-top: 24px; align-items: start; }
        .snail-vibe-card { min-height: 0; border: 0; background: transparent; box-shadow: none; overflow: visible; transform: none; }
        .snail-vibe-card:nth-child(n) { grid-column: auto; grid-row: auto; transform: none; }
        .snail-vibe-card img { height: auto; max-height: 145px; object-fit: contain; }
        .snail-checkout-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .72fr); gap: clamp(28px, 6vw, 80px); align-items: start; }
        .snail-checkout h2 { max-width: 680px; margin: 14px 0 18px; font-size: clamp(36px, 5.5vw, 70px); font-weight: 900; line-height: .92; letter-spacing: -.075em; text-wrap: balance; }
        .snail-checkout-copy { max-width: 590px; margin: 0; font-size: clamp(15px, 1.35vw, 18px); line-height: 1.48; }
        .snail-checkout-aside { display: flex; flex-direction: column; gap: 16px; }
        .snail-checkout-box { padding: 22px; border: 2px solid var(--snail-ink); background: var(--snail-lime); box-shadow: 6px 6px 0 var(--snail-ink); scroll-margin-top: 112px; }
        .snail-checkout-option-buttons { display: grid; width: min(100%, 590px); flex: 0 0 100%; align-items: start; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .snail-checkout-option-description { grid-column: 1 / -1; margin: 0; font-size: 9px; line-height: 1.4; }
        .snail-checkout-option { display: flex; width: 100%; min-width: 0; min-height: 60px; align-items: center; justify-content: space-between; gap: 8px; border: 2px solid var(--snail-ink); padding: 9px 11px; color: var(--snail-ink); background: #fffaf0; font: inherit; text-align: left; cursor: pointer; box-shadow: 4px 4px 0 var(--snail-ink); transition: transform .16s ease, box-shadow .16s ease, background-color .16s ease; }
        .snail-checkout-option:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--snail-ink); }
        .snail-checkout-option:disabled { cursor: wait; opacity: .58; transform: none; }
        .snail-checkout-option > span { display: grid; min-width: 0; gap: 4px; }
        .snail-checkout-option strong { font-size: 10px; font-weight: 900; letter-spacing: .08em; line-height: 1.2; text-transform: uppercase; }
        .snail-checkout-option small { font-size: 9px; line-height: 1.25; }
        .snail-checkout-option > svg { width: 15px; height: 15px; flex: 0 0 auto; }
        .snail-checkout-option--physical { color: #fff; background: var(--snail-red); }
        .snail-checkout-option--digital { background: #fffaf0; }
        .snail-coffee-price-compare {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0 12px;
        }
        .snail-coffee-price-compare img { width: 112px; height: 112px; flex: 0 0 auto; object-fit: contain; }
        .snail-coffee-price-compare span { max-width: 190px; font-size: 12px; font-weight: 600; line-height: 1.25; }
        .snail-coffee-price-compare strong { display: block; font-weight: 900; }
        .snail-question-section { scroll-margin-top: 112px; background: var(--snail-lime); }
        .snail-sticky-offer {
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 7px clamp(14px, 4vw, 56px);
          border-bottom: 2px solid var(--snail-ink);
          background: var(--snail-red);
          color: #fff;
          box-shadow: 0 5px 0 rgba(23,23,20,.18);
        }
        .snail-sticky-offer-inner {
          display: flex;
          width: min(100%, 1540px);
          margin: 0 auto;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .snail-sticky-offer .snail-cta { width: min(100%, 360px); min-height: 40px; flex: 0 0 auto; justify-content: center; gap: 10px; padding: 0 14px; border-color: var(--snail-ink); background: var(--snail-red); color: #fff !important; box-shadow: 3px 3px 0 var(--snail-ink); font-size: 10px; }
        .snail-sticky-offer .snail-cta:hover { background: #c93227; }
        .snail-sticky-offer .snail-cta:disabled { cursor: wait; opacity: .6; transform: none; }
        .snail-checkout-price { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(23,23,20,.32); font-size: 13px; }
        .snail-checkout-total { display: flex; justify-content: space-between; gap: 16px; padding: 16px 0; font-size: 18px; font-weight: 900; }
        .snail-postage-note { margin: -5px 0 12px; font-size: 11px; line-height: 1.45; }
        .snail-checkout-terms { margin: 12px 0 0; color: rgba(23,23,20,.74); font-size: 11px; line-height: 1.45; }
        .snail-terms-dropdown { margin-top: 12px; border-top: 1px solid rgba(23,23,20,.32); }
        .snail-terms-dropdown summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0 4px; cursor: pointer; font-size: 11px; font-weight: 900; letter-spacing: .08em; list-style: none; text-transform: uppercase; }
        .snail-terms-dropdown summary::-webkit-details-marker { display: none; }
        .snail-terms-dropdown summary::after { content: "+"; font-size: 16px; }
        .snail-terms-dropdown[open] summary::after { content: "−"; }
        .snail-terms-content { padding: 8px 0 2px; color: rgba(23,23,20,.78); font-size: 11px; line-height: 1.5; }
        .snail-terms-content p { margin: 0 0 8px; }
        .snail-terms-content p:last-child { margin-bottom: 0; }
        .snail-checkout-error { margin: 12px 0 0; border-left: 3px solid #8f1d12; padding: 9px 12px; color: #8f1d12; font-size: 12px; line-height: 1.5; }
        .snail-checkout-error p { margin: 0; font-weight: 700; }
        .snail-checkout-error a { display: inline-block; margin-top: 5px; color: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
        .snail-deliverables {
          margin-top: 24px;
          padding: 20px;
          border: 2px solid var(--snail-ink);
          background: #fffaf0;
          box-shadow: 5px 5px 0 var(--snail-ink);
        }
        .snail-deliverables-head { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(23,23,20,.28); }
        .snail-deliverables h3 { margin: 0; font-size: 15px; font-weight: 900; letter-spacing: -.03em; text-transform: uppercase; }
        .snail-deliverables-head span { color: var(--snail-muted); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .snail-deliverables-intro { margin: 13px 0 2px; font-size: 13px; line-height: 1.45; }
        .snail-deliverables ul { display: grid; grid-template-columns: 1fr; gap: 0; margin: 0; padding: 0; list-style: none; }
        .snail-deliverables li { display: flex; align-items: baseline; gap: 11px; min-width: 0; padding: 13px 0; border-bottom: 1px solid rgba(23,23,20,.16); font-size: 14px; font-weight: 750; line-height: 1.35; }
        .snail-deliverables li span { flex: 0 0 auto; color: var(--snail-red); font-size: 10px; font-weight: 900; letter-spacing: .08em; }
        .snail-checkout .snail-cta { width: 100%; min-height: 72px; margin-top: 8px; background: var(--snail-red); color: #fff !important; font-size: 14px; }
        .snail-checkout .snail-cta:hover { background: #c93227; }
        .snail-checkout .snail-cta:disabled { cursor: wait; opacity: .6; transform: none; }
        .snail-gift-option { display: flex; align-items: flex-start; gap: 11px; margin-top: 14px; padding: 12px; border: 1px solid var(--snail-ink); background: #fffaf0; cursor: pointer; font-size: 12px; line-height: 1.45; }
        .snail-gift-option input { flex: 0 0 auto; margin-top: 2px; accent-color: var(--snail-red); }
        .snail-gift-option strong { display: block; font-size: 13px; }
        .snail-gift-option small { display: block; margin-top: 3px; color: rgba(23,23,20,.76); font-size: 11px; line-height: 1.4; }
        .snail-actions .snail-hero-gift-option { flex: 0 0 100%; width: min(100%, 490px); margin: 0 0 1px; padding: 9px 11px; border-color: rgba(23,23,20,.4); background: rgba(255,250,240,.72); }
        .snail-checkout-gallery { position: relative; margin-top: 0; padding: 12px; border: 2px solid var(--snail-ink); background: #e5dec9; box-shadow: 5px 5px 0 rgba(23,23,20,.18); }
        .snail-envelope-gallery { top: -38px; right: 8px; width: 120px; transform: rotate(12deg); }
        .snail-checkout-gallery-stage { display: grid; min-height: 250px; grid-template-rows: minmax(0, 1fr) auto; place-items: center; }
        .snail-checkout-gallery-stage img { display: block; width: 100%; height: 260px; object-fit: contain; }
        .snail-checkout-gallery-stage figcaption { width: 100%; padding: 8px 2px 2px; font-size: 11px; font-weight: 700; }
        .snail-checkout-gallery-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 10px; border-top: 1px solid rgba(23,23,20,.35); font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .snail-checkout-gallery-buttons { display: flex; align-items: center; gap: 8px; }
        .snail-gallery-control { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid var(--snail-ink); background: var(--snail-paper); cursor: pointer; }
        .snail-gallery-control:disabled { cursor: not-allowed; opacity: .55; }
        .snail-gallery-control svg { width: 16px; height: 16px; }
        .snail-hero-art {
          position: relative;
          min-height: 440px;
          align-self: stretch;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .snail-sticker-link {
          position: relative;
          z-index: 2;
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
        }
        .snail-art-paper {
          position: absolute;
          inset: 7% 1% 5% 5%;
          border: 2px solid var(--snail-ink);
          background: #e5dec9;
          transform: rotate(3deg);
          box-shadow: 8px 9px 0 rgba(23,23,20,.14);
        }
        .snail-art-paper::before {
          position: absolute;
          top: 15px;
          left: 15px;
          right: 15px;
          height: 17px;
          border-top: 1px solid rgba(23,23,20,.5);
          border-bottom: 1px solid rgba(23,23,20,.5);
          content: "FIELD NOTES / POSTED FROM THE STUDIO";
          padding-top: 2px;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .15em;
        }
        .snail-hero-art img.snail-art-feature-collage {
          position: absolute;
          top: 1%;
          right: 1%;
          z-index: 6;
          width: min(55%, 300px);
          height: auto;
          max-height: none !important;
          object-fit: contain;
          filter: drop-shadow(5px 6px 0 rgba(23,23,20,.2));
          animation: none;
          transform: rotate(2deg);
        }
        .snail-hero-art img.snail-art-writer-photo {
          position: absolute;
          top: 34%;
          left: 19%;
          z-index: 5;
          width: min(31%, 175px);
          height: 218px;
          max-height: none;
          padding: 5px;
          border: 2px solid var(--snail-ink);
          background: #fffaf0;
          object-fit: cover;
          object-position: center 55%;
          filter: drop-shadow(5px 6px 0 rgba(23,23,20,.2));
          animation: none;
          transform: rotate(-4deg);
        }
        .snail-hero-art img.snail-art-pink-balaclava {
          position: absolute;
          top: 51%;
          right: 26%;
          z-index: 7;
          width: min(17%, 88px);
          height: 142px;
          max-height: none;
          padding: 4px;
          border: 2px solid var(--snail-ink);
          background: #fffaf0;
          object-fit: contain;
          filter: drop-shadow(4px 5px 0 rgba(23,23,20,.22));
          animation: none;
          transform: rotate(5deg);
        }
        .snail-hero-art img.snail-art-coffee-cups {
          position: absolute;
          bottom: 27%;
          left: 29%;
          z-index: 7;
          width: min(20%, 118px);
          height: 132px;
          max-height: none;
          object-fit: contain;
          filter: drop-shadow(3px 4px 0 rgba(23,23,20,.18));
          animation: none;
          transform: rotate(-7deg);
        }
        .snail-art-coffee-caption {
          position: absolute;
          bottom: 16%;
          left: 31%;
          z-index: 8;
          width: min(28%, 150px);
          padding: 7px 9px;
          border: 1px solid var(--snail-ink);
          background: #fffaf0;
          box-shadow: 2px 2px 0 var(--snail-ink);
          font-size: 9px;
          line-height: 1.25;
          transform: rotate(-2deg);
        }
        .snail-art-coffee-caption strong { display: block; font-size: 10px; }
        .snail-hero-samples {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
          pointer-events: none;
        }
        .snail-hero-art .snail-hero-samples img {
          position: absolute;
          width: 31%;
          max-height: none;
          padding: 5px;
          border: 2px solid var(--snail-ink);
          background: #fffaf0;
          object-fit: cover;
          opacity: .92;
          box-shadow: 5px 6px 0 rgba(23,23,20,.2);
          animation: snail-sample-drift 7s ease-in-out infinite alternate;
        }
        .snail-hero-samples img:nth-child(1) { top: 13%; left: 2%; --sample-angle: -8deg; }
        .snail-hero-samples img:nth-child(2) { top: 10%; right: 1%; --sample-angle: 7deg; animation-delay: -2.3s; }
        .snail-hero-samples img:nth-child(3) { right: 8%; bottom: 10%; --sample-angle: -5deg; animation-delay: -4.2s; }
        .snail-hero-art img {
          position: relative;
          z-index: 2;
          width: min(96%, 500px);
          max-height: 460px;
          object-fit: contain;
          filter: drop-shadow(0 9px 3px rgba(23,23,20,.12));
          animation: snail-arrive .85s cubic-bezier(.2,.8,.2,1) both;
        }
        .snail-hero-art img.snail-envelope-image {
          position: absolute;
          z-index: 4;
          width: 230px;
          max-height: none;
          filter: drop-shadow(1px 0 0 var(--snail-ink)) drop-shadow(-1px 0 0 var(--snail-ink)) drop-shadow(0 1px 0 var(--snail-ink)) drop-shadow(0 -1px 0 var(--snail-ink)) drop-shadow(5px 6px 1px rgba(23,23,20,.24));
          animation: none;
        }
        .snail-hero-art img.snail-slug-image {
          position: absolute;
          top: 37%;
          left: 1%;
          z-index: 3;
          width: min(36%, 200px);
          max-height: none;
          object-fit: contain;
          pointer-events: none;
          animation: snail-arrive .85s cubic-bezier(.2,.8,.2,1) both;
        }
        .snail-art-stamp {
          position: absolute;
          right: -2%;
          bottom: 11%;
          z-index: 3;
          display: grid;
          width: 116px;
          height: 116px;
          place-items: center;
          border: 2px dashed var(--snail-ink);
          border-radius: 50%;
          background: var(--snail-lime);
          font-size: 10px;
          font-weight: 900;
          line-height: 1.1;
          text-align: center;
          text-transform: uppercase;
          transform: rotate(11deg);
        }
        .snail-art-stamp span { display: block; }
        .snail-envelope-image {
          position: absolute;
          z-index: 4;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(3px 4px 1px rgba(23,23,20,.3));
          pointer-events: none;
        }
        .snail-hero-art img.snail-envelope-hero { top: auto; right: auto; bottom: 7%; left: -2%; width: 185px; transform: rotate(-14deg); }
        .snail-checkout-gallery .snail-envelope-gallery { z-index: 3; width: 120px; }
        .snail-scroll-cue {
          position: absolute;
          bottom: 16px;
          left: clamp(20px, 6vw, 92px);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--snail-muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .13em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .snail-scroll-cue svg { width: 14px; height: 14px; }
        .snail-tape {
          overflow: hidden;
          border-top: 2px solid var(--snail-ink);
          border-bottom: 2px solid var(--snail-ink);
          background: var(--snail-ink);
          color: var(--snail-lime);
        }
        .snail-tape-track {
          display: flex;
          width: max-content;
          padding: 11px 0;
          animation: snail-ticker 30s linear infinite;
        }
        .snail-tape span {
          padding: 0 18px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .snail-tape i { color: var(--snail-red); font-style: normal; }
        .snail-section { border-bottom: 2px solid var(--snail-ink); }
        .snail-section-inner { width: min(100%, 1300px); margin: 0 auto; padding: clamp(54px, 8vw, 112px) clamp(20px, 6vw, 82px); }
        .snail-story {
          display: grid;
          grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr);
          gap: clamp(26px, 7vw, 100px);
          align-items: start;
        }
        .snail-story h2, .snail-contents h2, .snail-final h2 {
          margin: 14px 0 0;
          font-size: clamp(36px, 5.2vw, 69px);
          font-weight: 900;
          line-height: .93;
          letter-spacing: -.075em;
          text-wrap: balance;
        }
        .snail-story-copy { max-width: 650px; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.6; }
        .snail-story-copy p { margin: 0 0 18px; }
        .snail-story-copy p:last-child { margin-bottom: 0; }
        .snail-story-copy strong { background: var(--snail-lime); box-shadow: 3px 0 var(--snail-lime), -3px 0 var(--snail-lime); }
        .snail-note {
          position: relative;
          margin: 40px 0 0;
          padding: 20px 22px 22px;
          border: 2px solid var(--snail-ink);
          background: #fffaf0;
          box-shadow: 6px 6px 0 var(--snail-ink);
          transform: rotate(-1deg);
        }
        .snail-note::before {
          position: absolute;
          top: -10px;
          left: 42%;
          width: 82px;
          height: 18px;
          background: rgba(198,255,61,.72);
          content: "";
          transform: rotate(2deg);
        }
        .snail-note p { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.45; }
        .snail-note cite { display: block; margin-top: 13px; color: var(--snail-muted); font-size: 10px; font-style: normal; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .snail-contents { background: var(--snail-lime); }
        .snail-contents .snail-section-inner { padding-top: clamp(50px, 7vw, 90px); padding-bottom: clamp(56px, 8vw, 104px); }
        .snail-faq { background: #fffaf0; }
        .snail-faq-heading { max-width: 760px; }
        .snail-faq-heading h2 { margin: 14px 0 0; font-size: clamp(36px, 5.2vw, 69px); font-weight: 900; line-height: .93; letter-spacing: -.075em; text-wrap: balance; }
        .snail-faq-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 30px; }
        .snail-faq-item { border: 1px solid rgba(23,23,20,.45); background: var(--snail-paper); }
        .snail-faq-item summary { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 16px; cursor: pointer; font-size: 13px; font-weight: 900; list-style: none; }
        .snail-faq-item summary::-webkit-details-marker { display: none; }
        .snail-faq-item summary::after { content: "+"; font-size: 18px; }
        .snail-faq-item[open] summary::after { content: "−"; }
        .snail-faq-item p { margin: 0; padding: 0 16px 16px; color: rgba(23,23,20,.78); font-size: 13px; line-height: 1.55; }
        .snail-faq-item a { font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
        .snail-contents-head { display: grid; grid-template-columns: minmax(0, .9fr) minmax(230px, .7fr); gap: 24px; align-items: end; }
        .snail-contents-head p:last-child { max-width: 390px; margin: 0 0 4px; font-size: 15px; line-height: 1.5; }
        .snail-mailings {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(8px, 2vw, 24px);
          margin-top: clamp(36px, 5vw, 65px);
          align-items: center;
        }
        .snail-mailing {
          position: relative;
          min-width: 0;
          padding: 10px;
          border: 2px solid var(--snail-ink);
          background: var(--snail-paper);
          box-shadow: 5px 5px 0 var(--snail-ink);
        }
        .snail-mailing:nth-child(1) { transform: rotate(-4deg) translateY(9px); }
        .snail-mailing:nth-child(2) { z-index: 1; transform: rotate(2deg) translateY(-6px); }
        .snail-mailing:nth-child(3) { transform: rotate(-2deg) translateY(11px); }
        .snail-mailing img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: contain; }
        .snail-mailing figcaption { padding: 8px 4px 2px; border-top: 1px solid rgba(23,23,20,.3); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .snail-contents-foot { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-top: 38px; padding-top: 17px; border-top: 1px solid rgba(23,23,20,.38); }
        .snail-contents-foot p { max-width: 670px; margin: 0; font-size: 13px; line-height: 1.5; }
        .snail-number { flex: 0 0 auto; font-size: 10px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
        .snail-exchange { background: var(--snail-ink); color: var(--snail-paper); }
        .snail-exchange-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .58fr); gap: 50px; align-items: center; }
        .snail-exchange h2 { max-width: 800px; margin: 14px 0 20px; color: var(--snail-lime); font-size: clamp(40px, 7vw, 86px); font-weight: 900; line-height: .9; letter-spacing: -.08em; }
        .snail-exchange p:not(.snail-label) { max-width: 650px; margin: 0; color: rgba(243,238,223,.84); font-size: 17px; line-height: 1.55; }
        .snail-exchange-quote { padding: 24px 20px; border: 1px solid rgba(243,238,223,.5); transform: rotate(2deg); }
        .snail-exchange-quote img { display: block; width: 90px; height: 90px; margin: 0 auto 14px; object-fit: contain; filter: invert(1); }
        .snail-exchange-quote p { color: var(--snail-lime) !important; font-size: 13px !important; font-weight: 700; text-align: center; }
        .snail-final { background: var(--snail-red); }
        .snail-final .snail-section-inner { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 36px; align-items: end; }
        .snail-final h2 { max-width: 780px; font-size: clamp(42px, 7vw, 88px); }
        .snail-final-copy > p:last-child { max-width: 600px; margin: 19px 0 0; font-size: 15px; line-height: 1.5; }
        .snail-final .snail-cta { min-width: min(100%, 270px); background: var(--snail-lime); color: var(--snail-ink) !important; }
        .snail-final .snail-cta:hover { background: #d8ff7d; }
        .snail-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px; padding: 22px clamp(20px, 6vw, 82px) 30px; background: var(--snail-paper); font-size: 11px; line-height: 1.5; }
        .snail-footer p { margin: 0; }
        .snail-footer-links { display: flex; flex-wrap: wrap; gap: 18px; }
        .snail-footer a { font-weight: 800; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .snail-share {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .snail-share svg { width: 14px; height: 14px; }
        @keyframes snail-arrive { from { opacity: 0; transform: translateY(18px) rotate(-3deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
        @keyframes snail-sample-drift { from { transform: translateY(4px) rotate(var(--sample-angle)); } to { transform: translateY(-8px) rotate(var(--sample-angle)); } }
        @keyframes snail-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 760px) {
          .snail-faq-list { grid-template-columns: 1fr; }
          .snail-support-inner { grid-template-columns: 1fr; }
          .snail-campaign [data-testid="patron-post-cutoff-countdown"] a { justify-self: end; }
          .snail-fund-goal-inner { grid-template-columns: 1fr; gap: 20px; padding: 26px 20px; }
          .snail-fund-goal h2 { font-size: clamp(26px, 7.5vw, 38px); }
          .snail-fund-goal-progress { border-top: 1px solid rgba(255,255,255,.55); border-left: 0; padding: 16px 0 0; }
          .snail-fund-goal-progress-value { font-size: clamp(32px, 9vw, 46px); }
          .snail-schedule-strip { padding: 9px 14px; }
          .snail-schedule-strip-inner { gap: 8px; }
          .snail-schedule-strip-title { font-size: 9px; }
          .snail-schedule-strip-copy { max-width: 245px; font-size: 9px; }
          .snail-schedule-strip a { min-height: 36px; gap: 6px; padding: 0 8px; font-size: 8px; }
          .snail-schedule-strip a svg { width: 13px; height: 13px; }
          .snail-sticky-offer { padding: 6px 10px; }
          .snail-sticky-offer-inner { gap: 8px; }
          .snail-sticky-offer .snail-cta { min-height: 38px; gap: 6px; padding: 0 9px; font-size: 9px; }
          .snail-timeline-heading { grid-template-columns: 1fr; gap: 14px; margin-bottom: 18px; }
          .snail-timeline-heading h2 { font-size: clamp(34px, 9vw, 48px); }
          .snail-hero { grid-template-columns: 1fr; gap: 10px; padding-top: 16px; padding-bottom: 24px; }
          .snail-hero-copy { display: flex; flex-direction: column; }
          .snail-hero h1 { max-width: 620px; margin-top: 10px; font-size: clamp(49px, 12.4vw, 84px); }
          .snail-hero-tagline { margin-top: 8px; }
          .snail-hero-intro { display: none; }
          .snail-actions { order: 1; align-items: stretch; flex-direction: column; gap: 8px; margin-top: 14px; }
          .snail-checkout-option-buttons { width: 100%; gap: 7px; }
          .snail-checkout-option { min-height: 54px; gap: 5px; padding: 7px; }
          .snail-checkout-option strong { font-size: 9px; letter-spacing: .04em; }
          .snail-checkout-option small { font-size: 8px; line-height: 1.2; }
          .snail-checkout-option > svg { width: 13px; height: 13px; }
          .snail-checkout-option-description { font-size: 8px; line-height: 1.35; }
          .snail-hero-recipient-fields { width: 100%; gap: 6px; }
          .snail-actions .snail-cta-note { width: 100%; max-width: none; font-size: 10px; line-height: 1.4; }
          .snail-actions .snail-hero-gift-option { width: 100%; margin: 0; }
          .snail-mobile-mail-proof { order: 0; display: grid; max-width: 510px; margin: 12px 0 0; grid-template-columns: minmax(138px, 40%) minmax(0, 1fr); align-items: center; gap: 14px; }
          .snail-mobile-mail-proof-images { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
          .snail-mobile-mail-proof img { display: block; width: 100%; height: 146px; border: 2px solid var(--snail-ink); background: #fffaf0; object-fit: cover; }
          .snail-mobile-mail-proof .snail-mobile-writer-photo { object-position: center 55%; }
          .snail-mobile-mail-proof figcaption { font-size: 13px; line-height: 1.4; }
          .snail-mobile-mail-proof figcaption strong { display: block; margin-bottom: 6px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
          .snail-hero-art { display: none; }
          .snail-hero-art img { max-height: 340px; width: 90%; }
          .snail-hero-art img.snail-art-feature-collage { top: 0; right: 0; z-index: 6; width: min(64%, 230px); }
          .snail-art-stamp { right: 0; bottom: 4%; width: 88px; height: 88px; font-size: 8px; }
          .snail-hero-art img.snail-envelope-image { width: 165px; }
          .snail-envelope-hero { left: -8%; top: 23%; }
          .snail-scroll-cue { bottom: 12px; }
          .snail-vibes-inner { padding: 28px 18px; }
          .snail-vibes-heading { align-items: flex-start; flex-direction: column; gap: 16px; }
          .snail-vibes-heading h2 { font-size: clamp(42px, 12vw, 64px); }
          .snail-vibes-wall { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: clamp(110px, 35vw, 180px); grid-auto-flow: dense; gap: 11px; margin-top: 26px; }
          .snail-vibe-card:nth-child(n) { grid-column: auto; grid-row: auto; }
          .snail-vibe-card:nth-child(1), .snail-vibe-card:nth-child(7), .snail-vibe-card:nth-child(9), .snail-vibe-card:nth-child(10), .snail-vibe-card:nth-child(11) { grid-column: span 2; grid-row: span 2; }
          .snail-vibes-wall { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: auto; grid-auto-flow: row; gap: 10px; margin-top: 20px; }
          .snail-vibe-card:nth-child(n) { grid-column: auto; grid-row: auto; transform: none; }
          .snail-story { grid-template-columns: 1fr; gap: 24px; }
          .snail-checkout { display: flex; flex-direction: column; }
          .snail-checkout-layout { order: 1; grid-template-columns: 1fr; gap: 20px; }
          .snail-checkout > [data-testid="patron-post-cutoff-countdown"] { order: 2; }
          .snail-checkout > #snail-fund-goal { order: 3; }
          .snail-checkout-story { display: contents; }
          .snail-checkout-aside { display: contents; }
          .snail-checkout-story > .snail-label { order: 1; }
          .snail-checkout-story > h2 { order: 2; }
          .snail-checkout-story > .snail-checkout-copy { order: 3; }
          .snail-checkout-aside > .snail-checkout-gallery { order: 4; }
          .snail-checkout-story > .snail-deliverables { order: 5; }
          .snail-checkout-aside > .snail-checkout-box { order: 6; }
          .snail-story h2, .snail-contents h2 { max-width: 560px; }
          .snail-contents-head { grid-template-columns: 1fr; gap: 16px; }
          .snail-contents-head p:last-child { max-width: 520px; }
          .snail-mailings { gap: 8px; }
          .snail-mailing { padding: 6px; box-shadow: 3px 3px 0 var(--snail-ink); }
          .snail-mailing figcaption { font-size: 7px; letter-spacing: .07em; }
          .snail-exchange-layout { grid-template-columns: 1fr; gap: 30px; }
          .snail-exchange-quote { width: min(100%, 340px); justify-self: center; }
          .snail-final .snail-section-inner { grid-template-columns: 1fr; align-items: start; gap: 26px; }
          .snail-footer { padding-bottom: 40px; }
        }
        @media (max-width: 430px) {
          .snail-actions { align-items: flex-start; flex-direction: column; }
          .snail-actions .snail-hero-gift-option { width: 100%; }
          .snail-cta { min-height: 54px; }
          .snail-cta-note { max-width: 250px; }
          .snail-hero-art { min-height: 250px; }
          .snail-vibes-wall { grid-auto-rows: auto; }
          .snail-section-inner { padding-right: 18px; padding-left: 18px; }
          .snail-checkout-layout { gap: 20px; }
          .snail-checkout h2 { margin: 10px 0 13px; font-size: clamp(34px, 10vw, 46px); }
          .snail-checkout-aside { gap: 12px; }
          .snail-checkout-box { padding: 17px; }
          .snail-deliverables { margin-top: 2px; padding: 16px; }
          .snail-deliverables-head { align-items: flex-start; flex-direction: column; gap: 4px; }
          .snail-deliverables-intro { margin-top: 10px; font-size: 12px; }
          .snail-deliverables li { padding: 11px 0; font-size: 14px; }
          .snail-checkout-gallery-stage { min-height: 210px; }
          .snail-checkout-gallery-stage img { height: 210px; }
          .snail-checkout-gallery-controls { flex-wrap: wrap; }
          .snail-mailing { padding: 4px; }
          .snail-mailing figcaption { min-height: 25px; padding: 6px 2px 1px; font-size: 6px; }
          .snail-contents-foot { align-items: flex-start; flex-direction: column; }
        }
        @media (prefers-reduced-motion: reduce) {
          .snail-campaign *, .snail-campaign *::before, .snail-campaign *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
        }
      `}</style>
      <div className="snail-grain" aria-hidden="true" />
      <aside className="snail-sticky-offer" aria-label="Patron Post checkout" data-testid="snail-sticky-offer">
        <div className="snail-sticky-offer-inner">
          <button
            type="button"
            onClick={() => startCheckoutForDelivery(deliveryType, "sticky_offer")}
            disabled={checkoutLoading || (deliveryType === "physical" && !pricing && !pricingUnavailable)}
            className="snail-cta"
            data-testid="button-snail-sticky-checkout"
          >
            {checkoutLoading ? "Opening checkout…" : "Continue to checkout"}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </aside>

      <header id="snail-hero" className="snail-hero">
        <div className="snail-hero-copy">
          <p className="snail-eyebrow">Countercult Patron Post</p>
          <h1><em>Become a snail (mail).</em></h1>
          <p className="snail-hero-tagline">An underground publication and original art, sent worldwide by post.</p>
          <figure className="snail-mobile-mail-proof" data-testid="snail-mobile-mail-proof">
            <div className="snail-mobile-mail-proof-images">
              <img src={letters} alt="A hand holding a stack of stamped letters in a studio." decoding="async" />
              <img className="snail-mobile-writer-photo" src={shonaMuralPhoto} alt="Sketchy Shona spray-painting a mural outdoors." decoding="async" />
            </div>
            <figcaption>
              <strong>One envelope, every month</strong>
              Original studio art, the Sketchy Sheet, a real letter, and a creative accountability card.
            </figcaption>
          </figure>
          <div className="snail-hero-intro">
            <p>
              Every month, <a className="snail-copy-link" href="/sketchyshona/">Sketchy Shona</a> and the <a className="snail-copy-link" href="/">Countercult</a> crew send one envelope by post, with original studio art, reporting from the scenes we know, and curated leads.
            </p>
            <p>
              It isn’t just mail. It’s infrastructure. Your membership helps fund the work that keeps the <a className="snail-copy-link" href="/">Countercult Network</a> and its resources free to access.
            </p>
          </div>
          <div className="snail-actions" id="snail-hero-form" data-testid="snail-hero-form">
            {deliveryType === "physical" && (
              <div className="snail-hero-recipient-fields" data-testid="snail-hero-recipient-fields">
                <p>{giftMode ? "Recipient name for the envelope" : "Name for the envelope"}</p>
                <div className="snail-hero-recipient-grid">
                  <label>
                    First name
                    <input
                      id="snail-hero-mailing-first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={mailingFirstName}
                      onChange={(event) => setMailingFirstName(event.currentTarget.value)}
                      data-testid="input-snail-hero-mailing-first-name"
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      id="snail-hero-mailing-last-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={mailingLastName}
                      onChange={(event) => setMailingLastName(event.currentTarget.value)}
                      data-testid="input-snail-hero-mailing-last-name"
                    />
                  </label>
                </div>
                <small>We’ll carry these names into checkout.</small>
              </div>
            )}
            {deliveryType === "physical" && (
              <label className="snail-gift-option snail-hero-gift-option" data-testid="snail-gift-hero">
                <input type="checkbox" checked={giftMode} onChange={(event) => setGiftMode(event.target.checked)} />
                <span>
                  <strong>Give as a gift</strong>
                  <small>The recipient gets one mailing each month. You pay monthly until you cancel.</small>
                </span>
              </label>
            )}
            <PatronPostOptionButtons
              location="hero"
              physicalTotalCents={pricing?.totalCents ?? null}
              digitalPricing={digitalPricing}
              physicalDisabled={checkoutLoading || (!pricing && !pricingUnavailable)}
              digitalDisabled={checkoutLoading}
              onSelect={(type) => startCheckoutForDelivery(type, "hero")}
            />
            {checkoutError && (
              <div className="snail-hero-checkout-error" role="alert">
                <p>{checkoutError}</p>
                <a
                  href={`mailto:hello@countercult.network?subject=${encodeURIComponent("Patron Post checkout problem")}&body=${encodeURIComponent("Checkout did not open on the Countercult Patron Post page. Please do not include card or payment details.")}`}
                >
                  Report checkout problem
                </a>
              </div>
            )}
            <span className="snail-cta-note">
              {deliveryType === "digital"
                ? digitalPricing
                  ? `${euros(digitalPricing.amountCents)} per month. No envelope or shipping. Renews monthly until canceled.`
                  : "A separate digital-only monthly option is available when its current Stripe price is configured."
                : pricing
                  ? `${euros(pricing.membershipCents)} membership + ${euros(pricing.totalCents - pricing.membershipCents)} shipping. ${euros(pricing.totalCents)} monthly total with shipping included. Join by the 5th for this month’s batch. Renews monthly until canceled.`
                  : "The €11 physical-mail total includes worldwide shipping."}
            </span>
          </div>
        </div>
        <div className="snail-hero-art" aria-label="Countercult Patron Post mail samples arranged behind the campaign slug">
          <div className="snail-art-paper" aria-hidden="true" />
          <div className="snail-hero-samples" aria-hidden="true">
            {editions.map((image) => <img key={image} src={image} alt="" />)}
          </div>
          <img
            className="snail-art-writer-photo"
            src={shonaMuralPhoto}
            alt="Sketchy Shona spray-painting a mural outdoors."
            decoding="async"
          />
          <img
            className="snail-art-feature-collage"
            src={natGeoCollage}
            alt="National Geographic meets Anthony Bourdain meets a DIY zine, illustrated with independent culture, travel and mail imagery"
          />
          <img
            className="snail-art-pink-balaclava"
            src={pinkBalaclavaFace}
            alt="Pink balaclava face from Countercult’s anonymous question sticker."
            decoding="async"
          />
          <img
            className="snail-art-coffee-cups"
            src={coffeeMugs}
            alt="Two black coffee cups, the approximate price comparison for Patron Post each month."
            decoding="async"
          />
          <p className="snail-art-coffee-caption" data-testid="snail-coffee-price-caption">
            {pricing ? `${euros(pricing.totalCents)} per month total.` : "Monthly total."}
            <strong>About the price of 2–3 coffees.</strong>
          </p>
          <img className="snail-envelope-image snail-envelope-hero" src={envelopeSticker} alt="" aria-hidden="true" />
          <img className="snail-slug-image" src={snailSticker} alt="A leopard slug, unofficial snail-mail mascot" />
          <div className="snail-art-stamp" aria-hidden="true"><span>Yes, it’s<br />a slug.<br />It counts.</span></div>
        </div>
        <a className="snail-scroll-cue" href="#inside-the-post">See what arrives <ArrowDown aria-hidden="true" /></a>
      </header>
      <section className="snail-section snail-checkout" id="inside-the-post" aria-labelledby="snail-checkout-title">
        <div className="snail-section-inner snail-checkout-layout">
          <div className="snail-checkout-story">
            <p className="snail-label">Patron Post</p>
            <h2 id="snail-checkout-title">What comes in the post?</h2>
            <p className="snail-checkout-copy">
              One monthly envelope of original art, cultural reporting, Countercult updates, and creative prompts.
            </p>
            <div className="snail-deliverables" aria-labelledby="snail-deliverables-title">
              <div className="snail-deliverables-head">
                <h3 id="snail-deliverables-title">Included each month</h3>
                <span>One envelope per paid month</span>
              </div>
              <ul>
                <li><span>01</span>Original studio art and the Sketchy Sheet coloring page</li>
                <li><span>02</span>A real letter from <a className="snail-copy-link" href="/sketchyshona/">Sketchy Shona</a></li>
                <li><span>03</span>Independent culture reporting, artist stories, and <a className="snail-copy-link" href="/">Countercult</a> Network updates</li>
                <li><span>04</span>Curated finds and opportunities, studio scraps, and surprises</li>
                <li><span>05</span>An accountability card for a personal check-in, with an anonymous question prompt on the reverse</li>
              </ul>
              <p className="snail-deliverables-intro">
                Questions are reviewed and may shape a future issue; a personal reply is not guaranteed.{" "}
                <a className="snail-copy-link" href="#patron-post-anonymous-question">Send a question anonymously.</a>
              </p>
            </div>
          </div>
          <div className="snail-checkout-aside">
            <div className="snail-checkout-gallery" role="region" aria-roledescription="carousel" aria-label="Examples of what arrives in Patron Post">
              <img className="snail-envelope-image snail-envelope-gallery" src={envelopeSticker} alt="" aria-hidden="true" />
              <figure className="snail-checkout-gallery-stage" aria-live="off">
                <img
                  src={editions[editionIndex]}
                  alt={`Patron Post mailing example ${editionIndex + 1}: ${editionCaptions[editionIndex]}`}
                />
                <figcaption>{editionCaptions[editionIndex]}</figcaption>
              </figure>
              <div className="snail-checkout-gallery-controls">
                <span>What arrives in your mailbox</span>
                <div className="snail-checkout-gallery-buttons">
                  <button
                    type="button"
                    className="snail-gallery-control"
                    aria-label="Show previous Patron Post example"
                    onClick={() => setEditionIndex((current) => (current + editions.length - 1) % editions.length)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span aria-live="polite">{editionIndex + 1} / {editions.length}</span>
                  <button
                    type="button"
                    className="snail-gallery-control"
                    aria-label="Show next Patron Post example"
                    onClick={() => setEditionIndex((current) => (current + 1) % editions.length)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="snail-gallery-control"
                    aria-label={prefersReducedMotion ? "Automatic rotation disabled by reduced-motion preference" : carouselPaused ? "Resume automatic example rotation" : "Pause automatic example rotation"}
                    aria-pressed={carouselPaused}
                    disabled={prefersReducedMotion}
                    onClick={() => setCarouselPaused((paused) => !paused)}
                  >
                    {carouselPaused || prefersReducedMotion ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="snail-checkout-box" id="snail-checkout" aria-label="Patron Post monthly checkout">
            {deliveryType === "physical" && (
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.12em]">
                    {giftMode ? "Who should receive the letter?" : "Name for the envelope"}
                  </p>
                  <p className="mb-2 text-xs leading-relaxed text-black/65">
                    {giftMode
                      ? "Enter the recipient’s first and last name. Add their delivery address in Stripe checkout."
                      : "Enter the first and last name to print on the envelope."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.1em]">
                      First name
                      <input
                        id="snail-mailing-first-name"
                        type="text"
                        required
                        autoComplete="given-name"
                        value={mailingFirstName}
                        onChange={(event) => setMailingFirstName(event.currentTarget.value)}
                        className="min-h-10 w-full border border-black/40 bg-white px-2 text-xs font-normal normal-case tracking-normal"
                        data-testid="input-snail-mailing-first-name"
                      />
                    </label>
                    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.1em]">
                      Last name
                      <input
                        type="text"
                        required
                        autoComplete="family-name"
                        value={mailingLastName}
                        onChange={(event) => setMailingLastName(event.currentTarget.value)}
                        className="min-h-10 w-full border border-black/40 bg-white px-2 text-xs font-normal normal-case tracking-normal"
                        data-testid="input-snail-mailing-last-name"
                      />
                    </label>
                  </div>
                </div>
            )}
            {deliveryType === "physical" && (
              <label className="snail-gift-option">
                <input type="checkbox" checked={giftMode} onChange={(event) => setGiftMode(event.target.checked)} />
                <span><strong>Give Patron Post as a gift</strong>The recipient gets one mailing each month. You pay monthly until you cancel.</span>
              </label>
            )}
            <PatronPostOptionButtons
              location="checkout"
              physicalTotalCents={pricing?.totalCents ?? null}
              digitalPricing={digitalPricing}
              physicalDisabled={checkoutLoading || (!pricing && !pricingUnavailable)}
              digitalDisabled={checkoutLoading}
              onSelect={(type) => startCheckoutForDelivery(type, "checkout_card")}
            />
            {checkoutError && (
              <div className="snail-checkout-error" role="alert" data-testid="text-snail-checkout-error">
                <p>{checkoutError}</p>
                <a
                  href={`mailto:hello@countercult.network?subject=${encodeURIComponent("Patron Post checkout problem")}&body=${encodeURIComponent("Checkout did not open on the Countercult Patron Post page. Please do not include card or payment details.")}`}
                  data-testid="link-snail-checkout-report"
                >
                  Report checkout problem
                </a>
              </div>
            )}
            <p className="snail-label">
              {deliveryType === "digital"
                ? "Digital-only monthly price"
                : "Physical mail monthly price"}
            </p>
            {deliveryType === "physical" && (
              <div className="snail-coffee-price-compare" role="note">
                <img src={coffeeMugs} alt="" aria-hidden="true" />
                <span>About the price of <strong>2–3 coffees a month.</strong></span>
              </div>
            )}
            {deliveryType === "physical" && pricing ? (
              <>
                <div className="snail-checkout-price"><span>Membership</span><strong>{euros(pricing.membershipCents)} / month</strong></div>
                <div className="snail-checkout-price"><span>Shipping included</span><strong>{euros(pricing.totalCents - pricing.membershipCents)} / month</strong></div>
                <div className="snail-checkout-total"><span>Total</span><strong>{euros(pricing.totalCents)} / month</strong></div>
                <p className="snail-postage-note">The €11 monthly total includes worldwide shipping.</p>
              </>
            ) : deliveryType === "digital" && digitalPricing ? (
              <>
                <div className="snail-checkout-total"><span>Digital edition</span><strong>{euros(digitalPricing.amountCents)} / month</strong></div>
                <p className="snail-postage-note">A high-resolution PDF by email around mid-month, when that month’s physical mailing is ready to go out. No physical mail or shipping.</p>
              </>
            ) : (
              <p className="snail-checkout-copy" style={{ marginTop: 14 }}>
                {deliveryType === "physical"
                  ? pricingUnavailable ? "The current price couldn't be loaded." : "Checking the current monthly price…"
                  : "Checking the current digital price…"}
              </p>
            )}
            <p className="snail-checkout-terms">
              {deliveryType === "digital"
                ? "Renews monthly until canceled. Digital edition only, with no envelope or shipping."
                : "Renews monthly from signup. Manage or cancel in Stripe; eligible memberships can pause for one month."}
            </p>
            <details className="snail-terms-dropdown">
              <summary>Terms and conditions</summary>
              <div className="snail-terms-content">
                {deliveryType === "digital"
                  ? <p><strong>Digital edition:</strong> A high-resolution PDF is emailed around mid-month, when that month’s physical mailing is ready to go out. This option does not include physical mail or shipping.</p>
                  : <p><strong>Billing:</strong> Membership and shipping renew monthly from your signup date. Each paid month includes one envelope.</p>}
                <p><strong>Manage or cancel:</strong> Use Stripe’s customer portal. Eligible memberships can pause for one month; cancellations stop future renewals at the end of the current period.</p>
                {deliveryType === "physical" && <p><strong>Mailing:</strong> Join by the 5th for this month’s batch, or after for next month’s. Mail goes out around mid-month. The first envelope can take 6–8 weeks if you join just after cutoff; international delivery may take longer.</p>}
                <p><strong>Countercult:</strong> Memberships help fund the work that keeps the Network and resources free to access. The global fund to pay local artists and builders to document cultural spaces launches at 1,000 readers.</p>
              </div>
            </details>
            </div>
          </div>
        </div>
        <PatronPostCutoffCountdown
          href={JOIN_URL}
          placement="snail_checkout_section"
          onJoinClick={() => trackEvent("patron_post_join_clicked", {
            ...getPatronPostPageContext("/snail"),
            placement: "cutoff_strip",
            gift: giftMode,
          })}
        />
        <section id="snail-fund-goal" className="snail-fund-goal" aria-labelledby="snail-fund-goal-title" data-testid="snail-fund-goal">
          <div className="snail-fund-goal-inner">
            <div className="snail-fund-goal-copy">
              <p>What your membership supports</p>
              <h2 id="snail-fund-goal-title">At <strong>1,000 readers</strong>, Patron Post will launch a global fund to pay <strong>local artists and builders to document cultural spaces.</strong></h2>
            </div>
            <div className="snail-fund-goal-progress" aria-live="polite">
              <p className="snail-fund-goal-progress-label">Current progress:</p>
              <strong className="snail-fund-goal-progress-value" data-testid="snail-fund-progress-value">
                {progress
                  ? `${progress.activeMembers.toLocaleString()} / ${progress.goal.toLocaleString()} readers.`
                  : progressUnavailable ? "Unavailable." : "Loading."}
              </strong>
              {progress && <span className="snail-fund-goal-remaining">
                {Math.max(progress.goal - progress.activeMembers, 0).toLocaleString()} readers to go
              </span>}
              {progress && <div
                className="snail-fund-goal-progress-track"
                role="progressbar"
                aria-label="Active monthly Patron Post memberships"
                aria-valuemin={0}
                aria-valuemax={progress.goal}
                aria-valuenow={Math.min(progress.activeMembers, progress.goal)}
              >
                <span style={{
                  width: `${progress.activeMembers > 0
                    ? Math.min(100, Math.max(1.5, (Math.min(progress.activeMembers, progress.goal) / progress.goal) * 100))
                    : 0}%`,
                }} />
              </div>}
            </div>
          </div>
        </section>
      </section>

      <section className="snail-section snail-question-section" id="ask-anonymously" aria-labelledby="patron-post-anonymous-question-title">
        <div className="snail-section-inner">
          <div className="mx-auto w-full max-w-5xl">
            <PatronPostAnonymousQuestionForm compact />
          </div>
        </div>
      </section>

      <section className="snail-section snail-support-section" id="snail-support" aria-labelledby="snail-support-title">
        <div className="snail-section-inner snail-support-inner">
          <div>
            <p className="snail-label">One-time support for Countercult</p>
            <h2 className="snail-section-title" id="snail-support-title">Support the work directly.</h2>
            <p className="snail-checkout-copy">Choose any whole-euro amount from €10. One-time gifts over €100 include original artwork with shipping.</p>
            <button
              type="button"
              className="snail-copy-link mt-5 inline-flex items-center gap-2 text-left"
              onClick={() => showPledgePopup()}
              data-testid="button-open-countercult-fundraiser"
            >
              See the timed Countercult fundraiser <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
          <div className="snail-support-card">
            {contributionComplete ? (
              <div className="snail-support-status" role="status">
                <strong>Thank you. Your one-time contribution to Countercult is confirmed.</strong>
                {contributionHasArtReward && <p>Your original artwork reward includes shipping. We’ll follow up about the artwork and delivery.</p>}
              </div>
            ) : (
              <form onSubmit={(event) => void startContribution(event)} className="grid gap-3">
                <label htmlFor="snail-contribution-amount">One-time amount in euros</label>
                <div className="flex flex-wrap gap-2">
                  <input id="snail-contribution-amount" type="number" min="10" max="10000" step="1" required value={contributionAmount} onChange={(event) => setContributionAmount(event.currentTarget.value)} />
                  <button type="submit" disabled={contributionLoading} data-testid="button-snail-contribution">
                    {contributionLoading ? "Opening secure checkout" : "Support Countercult"} <ArrowRight aria-hidden="true" />
                  </button>
                </div>
                <p className="snail-checkout-terms">One payment only. Stripe handles card details.</p>
                {contributionError && <p className="snail-support-status" role="alert">{contributionError}</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="snail-vibes" aria-labelledby="snail-vibes-title">
        <div className="snail-vibes-inner">
          <div className="snail-vibes-heading">
            <h2 id="snail-vibes-title">The vibes</h2>
            <p>Scenes, studio time, and ideas from behind the mail.</p>
          </div>
          <div className="snail-vibes-wall" aria-label="Patron Post inspiration collage">
            {vibeImages.map((image) => (
              <figure className="snail-vibe-card" key={image.src}>
                <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <PatronPostMemberHelp compact />

      <section className="snail-section snail-timeline-section" aria-labelledby="snail-timeline-title">
        <div className="snail-section-inner">
          <div className="snail-timeline-heading">
            <div>
              <p className="snail-label">Delivery dates</p>
              <h2 id="snail-timeline-title">When will the first envelope arrive?</h2>
            </div>
          </div>
          <PatronPostMailingTimeline />
        </div>
      </section>

      <section className="snail-section snail-faq" aria-labelledby="snail-faq-title">
        <div className="snail-section-inner">
          <div className="snail-faq-heading">
            <p className="snail-label">Membership help</p>
            <h2 id="snail-faq-title">A couple of useful things to know.</h2>
          </div>
          <div className="snail-faq-list">
            <details className="snail-faq-item">
              <summary>Can I pause instead of cancelling?</summary>
              <p>Eligible memberships can pause for one month in Stripe. The pause starts after the current billing period and resumes automatically. If the option is unavailable, <a href="mailto:countercultplatform@gmail.com?subject=Patron%20Post%20membership%20pause">email us</a>.</p>
            </details>
            <details className="snail-faq-item">
              <summary>Can I change my mailing address?</summary>
              <p>Update your address in Stripe. We sync changes to our mailing records within about 15 minutes.</p>
            </details>
          </div>
        </div>
      </section>

      <footer className="snail-footer">
        <p>Countercult Patron Post · Made with Sketchy Shona.</p>
        <div className="snail-footer-links">
          <button type="button" className="snail-share" onClick={() => void sharePage()} data-testid="button-snail-share">
            {shareState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {shareState === "copied" ? "Link copied" : "Share with a friend"}
          </button>
          <a href="/privacy" data-testid="link-snail-privacy">Privacy</a>
          <a href="/sketchyshona/" data-testid="link-snail-shona">Meet Shona <ArrowUpRight aria-hidden="true" style={{ display: "inline", width: 12, height: 12, verticalAlign: "-2px" }} /></a>
        </div>
      </footer>
    </main>
  );
}
