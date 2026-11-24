import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { getGetPatronPostProgressQueryKey, useGetPatronPostProgress } from "@workspace/api-client-react";
import {
  clearPatronPostAttribution,
  getPatronPostAttribution,
  getPatronPostPageContext,
  rememberPatronPostAttribution,
  trackEvent,
} from "@/lib/analytics";
import editionOne from "@/assets/repo-placeholder.svg";
import editionTwo from "@/assets/repo-placeholder.svg";
import editionThree from "@/assets/repo-placeholder.svg";
import envelopeFront from "@/assets/repo-placeholder.svg";
import envelopeOpen from "@/assets/repo-placeholder.svg";
import snailSticker from "@/assets/repo-placeholder.svg";
import { PatronPostMailingTimeline } from "@/components/PatronPostMailingTimeline";
import { PatronPostAnonymousQuestionForm, PatronPostMemberHelp } from "@/components/PatronPostMemberHelp";

const CONTACT_EMAIL = "countercultplatform@gmail.com";
const patronPostMockups = [editionOne, editionTwo, editionThree];

type PatronPostPricing = {
  earlySupporter: boolean;
  membershipCents: number;
  totalCents: number;
};

function euros(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function CollectiveFund() {
  const [pricing, setPricing] = useState<PatronPostPricing | null>(null);
  const [pricingUnavailable, setPricingUnavailable] = useState(false);
  const [giftMode, setGiftMode] = useState(false);
  const [mailingFirstName, setMailingFirstName] = useState("");
  const [mailingLastName, setMailingLastName] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [contributionAmount, setContributionAmount] = useState("10");
  const [contributionLoading, setContributionLoading] = useState(false);
  const [membershipComplete, setMembershipComplete] = useState(false);
  const [contributionComplete, setContributionComplete] = useState(false);
  const [contributionHasArtReward, setContributionHasArtReward] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [mainMenuHeight, setMainMenuHeight] = useState(42);
  const { data: progress, isLoading: progressLoading, isError: progressUnavailable } = useGetPatronPostProgress({
    query: { queryKey: getGetPatronPostProgressQueryKey(), staleTime: 30_000, refetchInterval: 60_000 },
  });

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
        trackEvent("patron_post_checkout_error", {
          ...getPatronPostPageContext("/collective-fund"),
          flow: "membership",
          placement: "price_check",
          stage: "price_check",
          reason: "price_unavailable",
        });
        setPricingUnavailable(true);
      }
    }
  }

  useEffect(() => {
    const menu = document.querySelector<HTMLElement>("[data-main-site-menu]");
    if (!menu) return;

    const updateMenuHeight = () => setMainMenuHeight(menu.getBoundingClientRect().height);
    updateMenuHeight();
    const observer = new ResizeObserver(updateMenuHeight);
    observer.observe(menu);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshPricing(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "1") {
      setCheckoutError("Checkout was not completed. You can try again below.");
      if (params.get("support") !== "1") {
        trackEvent("patron_post_checkout_cancelled", {
          ...getPatronPostAttribution("/collective-fund"),
          return_route: "/collective-fund",
        });
      }
      clearPatronPostAttribution();
      window.history.replaceState({}, "", `${window.location.pathname}#countercult-support`);
    }
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    const isContribution = params.get("support") === "1";
    let active = true;
    fetch(isContribution ? "/api/patron-post/contribution/complete" : "/api/patron-post/complete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { completed?: boolean; artReward?: boolean; error?: string };
        if (!response.ok || !result.completed) {
          throw new Error(result.error || "Your payment is still being confirmed.");
        }
        if (active) {
          if (isContribution) {
            setContributionComplete(true);
            setContributionHasArtReward(Boolean(result.artReward));
          }
          else setMembershipComplete(true);
        }
      })
      .catch((error: unknown) => {
        if (active) setCheckoutError(error instanceof Error ? error.message : "Your payment is still being confirmed.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const postageCents = pricing ? pricing.totalCents - pricing.membershipCents : null;

  async function startCheckout(placement: string) {
    const flow = giftMode ? "gift_membership" : "membership";
    const firstName = mailingFirstName.trim();
    const lastName = mailingLastName.trim();
    if (!firstName || !lastName) {
      setCheckoutError("Enter the first and last name for the mailing.");
      document.getElementById("collective-fund-mailing-first-name")?.focus();
      return;
    }
    let checkoutErrorTracked = false;
    setCheckoutLoading(true);
    setCheckoutError("");
    const attribution = rememberPatronPostAttribution("/collective-fund", placement, giftMode);
    trackEvent("patron_post_join_clicked", attribution);
    try {
      const response = await fetch("/api/countercult-patron-post/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gift: giftMode, mailingFirstName: firstName, mailingLastName: lastName }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        trackEvent("patron_post_checkout_error", {
          ...attribution,
          flow,
          stage: "create_session",
          reason: response.ok ? "missing_checkout_url" : "server_rejected",
          http_status: response.status,
        });
        checkoutErrorTracked = true;
        throw new Error(result.error || "Secure checkout could not be opened.");
      }
      trackEvent("patron_post_checkout_session_created", attribution);
      window.location.assign(result.url);
    } catch (error) {
      if (!checkoutErrorTracked) {
        trackEvent("patron_post_checkout_error", {
          ...attribution,
          flow,
          stage: "create_session",
          reason: "request_or_redirect_failed",
        });
      }
      clearPatronPostAttribution();
      setCheckoutError(error instanceof Error ? error.message : "Secure checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }

  async function startContribution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContributionLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/countercult-patron-post/contribution/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(Number(contributionAmount) * 100) }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "One-time checkout could not be opened.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "One-time checkout could not be opened.");
      setContributionLoading(false);
    }
  }

  async function manageMembership() {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) return;
    setPortalLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/patron-post/portal", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Membership management could not be opened.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Membership management could not be opened.");
      setPortalLoading(false);
    }
  }

  const checkoutButton = (className: string, testId: string, ctaLabel?: string) => (
    <button
      type="button"
      onClick={() => pricing ? void startCheckout(testId) : void refreshPricing()}
      disabled={(!pricing && !pricingUnavailable) || checkoutLoading}
      data-testid={testId}
      className={className}
    >
      {checkoutLoading
        ? "Opening secure checkout"
        : pricing
          ? giftMode ? "Gift Patron Post monthly" : ctaLabel ?? "Join Patron Post monthly"
          : pricingUnavailable ? "Retry price check" : "Checking current price"}
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );

  const patronPostTicker = (
    <div className="flex flex-col gap-1 border-b-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <strong>Patron Post · monthly art mail from <a href="/sketchyshona/" className="cc-proper-name underline underline-offset-2">Sketchy Shona</a></strong>
      <span>Independent culture, delivered by post</span>
    </div>
  );

  const patronPostSection = (
    <section id="join" className="border-b-2 border-black px-4 py-10 sm:px-8 sm:py-14" aria-labelledby="patron-post-title">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="relative mx-auto aspect-[1.05/1] w-full max-w-xl" aria-label="Patron Post mailing mockups with envelope graphics">
          <img src={envelopeFront} alt="" aria-hidden="true" className="absolute left-[1%] top-[12%] z-0 w-[76%] -rotate-6 object-contain opacity-90" loading="lazy" />
          <img src={envelopeOpen} alt="" aria-hidden="true" className="absolute bottom-[5%] right-0 z-0 w-[72%] rotate-6 object-contain opacity-90" loading="lazy" />
          <img
            src={patronPostMockups[0]}
            alt="Patron Post mailing with a Sketchy Sheet, studio drawing and letter"
            className="absolute left-[2%] top-[1%] z-10 w-[56%] -rotate-6 object-contain drop-shadow-md"
            loading="lazy"
          />
          <img
            src={patronPostMockups[1]}
            alt="Patron Post mailing with studio artwork and notes"
            className="absolute right-[1%] top-[12%] z-20 w-[55%] rotate-6 object-contain drop-shadow-md"
            loading="lazy"
          />
          <img
            src={patronPostMockups[2]}
            alt="Patron Post mailing with drawings and a letter"
            className="absolute bottom-0 left-[23%] z-30 w-[56%] -rotate-2 object-contain drop-shadow-md"
            loading="lazy"
          />
          <a
            href="/collective-fund#join"
            aria-label="Click the snail to join Countercult Patron Post."
            title="Click the snail"
            className="cc-patron-sticker group absolute bottom-[3%] left-[1%] z-40 block w-[38%] min-w-28 max-w-52 -rotate-6 transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <img src={snailSticker} alt="" aria-hidden="true" className="block w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" loading="lazy" />
            <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 rotate-[-3deg] whitespace-nowrap border-2 border-black bg-[#c6ff3d] px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.06em] text-black shadow-[2px_2px_0_#111] sm:text-[10px]">
              Click the snail
            </span>
          </a>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">Monthly mail · <span className="cc-proper-name">Sketchy Shona</span> + <span className="cc-proper-name">Countercult</span></p>
          <h2 id="patron-post-title" className="mt-2 max-w-2xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            This is how we keep things running
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
            Every month, Sketchy Shona and the Countercult team send one envelope by post with studio art, creative leads, and writing about how independent culture survives. Your membership supports the work that keeps Countercult’s Network and resources free to access. At 1,000 readers, we’ll launch a global fund to pay local artists and builders to document cultural spaces around the world.
          </p>

          <div className="mt-6 border-2 border-black bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black bg-[#c6ff3d] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Patron Post · monthly mailing</p>
                <div className="mt-2">
                  <p className="text-3xl font-black uppercase leading-none tracking-[-0.06em] sm:text-4xl">
                    {pricing ? `${euros(pricing.membershipCents)} / month` : "Current monthly price"}
                  </p>
                  {pricing && postageCents !== null && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] sm:text-sm">
                      + {euros(postageCents)} shipping · {euros(pricing.totalCents)} per mailing, shipping included worldwide
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-4 px-5 py-5 sm:px-6">
              <div className="border-t border-black/15 pt-3">
                {progress ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <p className="font-bold" data-testid="text-patron-post-progress">{progress.activeMembers.toLocaleString("en-US")} of {progress.goal.toLocaleString("en-US")} active monthly memberships</p>
                    </div>
                    <div
                      className="mt-2 h-3 overflow-hidden border border-black bg-white"
                      role="progressbar"
                      aria-label="Patron Post progress toward 1,000 active monthly memberships"
                      aria-valuemin={0}
                      aria-valuemax={progress.goal}
                      aria-valuenow={Math.min(progress.activeMembers, progress.goal)}
                    >
                      <div className="h-full bg-[#e53935]" style={{ width: `${Math.min(100, (progress.activeMembers / progress.goal) * 100)}%` }} />
                    </div>
                  </>
                ) : (
                  <div role="status" className="text-xs font-bold">
                    {progressUnavailable ? "Our goal is 1,000 active monthly memberships." : "Loading current membership progress toward 1,000…"}
                    {progressLoading && <div className="mt-2 h-3 animate-pulse border border-black/30 bg-black/10" />}
                  </div>
                )}
              </div>
              <div className="border-t border-black/15 pt-3 text-sm leading-relaxed text-black/70">
                {pricing && postageCents !== null ? (
                  <p>
                    {euros(pricing.membershipCents)} membership plus {euros(postageCents)} shipping
                    {" "}({euros(pricing.totalCents)} monthly total, shipping included worldwide); it renews each month until you cancel.
                  </p>
                ) : (
                  <p>The current monthly total includes worldwide shipping and will be confirmed before checkout.</p>
                )}
              </div>
              <PatronPostMailingTimeline />
              <div>
                <p className="text-sm font-bold text-black">What we’re offering for now:</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-black/75 marker:text-[#e53935]">
                  <li>Independent cultural journalism and updates from the <span className="cc-proper-name">Countercult</span> Network.</li>
                  <li>Original studio art and writing from <a href="/sketchyshona/" className="cc-proper-name font-bold underline underline-offset-2">Sketchy Shona</a>.</li>
                  <li>Stories about being an artist, from finding work to finding other artists.</li>
                  <li>A creative check-in card with an anonymous question prompt on the reverse.</li>
                  <li>Curated favorite finds, cultural spots, funding leads, and opportunities from the Network.</li>
                  <li>A coloring page and other surprises.</li>
                </ul>
              </div>
              <p className="border-t border-black/15 pt-3 text-sm leading-relaxed text-black/75">
                The Collective Fund is <span className="cc-proper-name">Countercult</span>’s community fundraiser, supported through Patron Post. Memberships support the work that keeps the Network and resources free to access. At 1,000 readers, Patron Post will launch a global fund to pay local artists and builders to document cultural spaces around the world.
              </p>
              <label className="flex cursor-pointer items-start gap-3 border border-black px-3 py-3 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  checked={giftMode}
                  onChange={(event) => setGiftMode(event.currentTarget.checked)}
                  className="mt-1 accent-black"
                  data-testid="input-patron-post-gift"
                />
                <span>
                  <strong className="block">Give this membership as a gift</strong>
                  <span className="mt-1 block text-xs text-black/65">The monthly charge stays on your account until you cancel. Enter the recipient’s first and last name below, then add their delivery address in secure checkout.</span>
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.12em]">
                  {giftMode ? "Recipient first name" : "First name for the envelope"}
                  <input
                    id="collective-fund-mailing-first-name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={mailingFirstName}
                    onChange={(event) => setMailingFirstName(event.currentTarget.value)}
                    className="min-h-11 border border-black/40 bg-white px-3 text-sm font-normal normal-case tracking-normal"
                    data-testid="input-collective-mailing-first-name"
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.12em]">
                  {giftMode ? "Recipient last name" : "Last name for the envelope"}
                  <input
                    type="text"
                    required
                    autoComplete="family-name"
                    value={mailingLastName}
                    onChange={(event) => setMailingLastName(event.currentTarget.value)}
                    className="min-h-11 border border-black/40 bg-white px-3 text-sm font-normal normal-case tracking-normal"
                    data-testid="input-collective-mailing-last-name"
                  />
                </label>
              </div>
              {checkoutButton(
                "inline-flex min-h-[68px] w-full items-center justify-between gap-4 border-2 border-black bg-[#e53935] px-6 py-5 text-left text-xs font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#b71c1c] disabled:cursor-wait disabled:opacity-60",
                "button-collective-fund-checkout",
              )}
              <PatronPostAnonymousQuestionForm />
              <details className="mt-4 border-t border-black/15 pt-3 text-sm leading-relaxed text-black/75">
                <summary className="cursor-pointer font-bold text-black underline decoration-black/30 underline-offset-4">
                  Mailing schedule and delivery
                </summary>
                <div className="mt-3">
                  <p>
                    Sign up by the 5th to join that month’s mailing batch. Sign up after the 5th and your first mailing goes in the following month’s batch. If you join just after the cutoff, allow around 6–8 weeks for your first mailing; joining later in the month usually means a shorter wait. We post around the middle of each month. Delivery depends on where you’re based and the postal service, and international mail may take longer.
                  </p>
                  <p className="mt-2">
                    Mail can go missing in transit. If yours doesn’t arrive, <a href={`mailto:${CONTACT_EMAIL}?subject=Patron%20Post%20missing%20mail`} className="font-bold underline underline-offset-2">email us</a> so we can look into it. If we don’t hear from you, we won’t know to investigate, and your membership continues to support the Countercult Network and independent culture.
                  </p>
                </div>
              </details>
              <details className="border-t border-black/15 pt-3 text-sm leading-relaxed text-black/75">
                <summary className="cursor-pointer font-bold text-black underline decoration-black/30 underline-offset-4">
                  Cancellation policy
                </summary>
                <p className="mt-3">
                  You can cancel at any time in Stripe’s secure customer portal. Cancellation takes effect at the end of your current billing period and stops future renewals. Your current paid month still includes one mailing. Contact us about a payment or delivery issue.
                </p>
              </details>
              <p className="text-xs leading-relaxed text-black/65">
                Manage your membership in the secure <span className="cc-proper-name">Stripe</span> portal to pause eligible memberships for one month, change the mailing address, or cancel. If you need help, <a href={`mailto:${CONTACT_EMAIL}?subject=Patron%20Post%20membership%20help`} className="font-bold underline underline-offset-2">email us</a>. Shona manages Patron Post alone, so please allow one or two days for a reply.
              </p>
              {checkoutError && <p role="alert" className="text-sm text-red-700">{checkoutError}</p>}
              {membershipComplete ? (
                <div className="border-2 border-black bg-[#c6ff3d] p-4">
                  <p className="text-sm font-bold">Your Countercult Patron Post membership is confirmed.</p>
                  <button type="button" onClick={() => void manageMembership()} disabled={portalLoading} className="mt-3 inline-flex items-center gap-2 text-xs font-bold underline underline-offset-4 disabled:opacity-60">
                    {portalLoading ? "Opening membership management" : "Manage this membership"} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <main
      className="min-h-[100dvh] bg-[#f9f9f6] text-black selection:bg-[#c6ff3d] selection:text-black"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <aside
        aria-label="Patron Post monthly mailing schedule"
        data-testid="collective-fund-sticky-mailing-bar"
        className="sticky z-[9000] border-b-2 border-black bg-black px-4 py-2.5 text-white shadow-md sm:px-8"
        style={{ top: `${mainMenuHeight}px` }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <strong className="block text-[10px] font-black uppercase tracking-[0.12em] sm:text-xs">
              Monthly mailing schedule
            </strong>
            <span className="block text-[9px] leading-snug text-white/75 sm:text-[11px]">
              By the 5th: this month’s batch. After: next month’s batch.
            </span>
          </div>
          {membershipComplete ? (
            <button
              type="button"
              onClick={() => void manageMembership()}
              disabled={portalLoading}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 border-2 border-white bg-[#e53935] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#b71c1c] disabled:opacity-60 sm:px-5 sm:text-[10px]"
            >
              {portalLoading ? "Opening Stripe" : "Manage membership"}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            checkoutButton(
              "inline-flex min-h-10 shrink-0 items-center justify-between gap-2 border-2 border-white bg-[#e53935] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#b71c1c] disabled:cursor-wait disabled:opacity-60 sm:gap-4 sm:px-5 sm:text-[10px]",
              "button-collective-fund-checkout-banner",
              "Join Patron Post",
            )
          )}
        </div>
      </aside>
      {patronPostSection}
      <section id="countercult-support" className="border-b-2 border-black bg-white px-4 py-10 sm:px-8 sm:py-14" aria-labelledby="countercult-support-title">
        <div className="mx-auto grid max-w-7xl items-center gap-6 border-2 border-black p-5 sm:p-8 md:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]">One-time support for Countercult</p>
            <h2 id="countercult-support-title" className="mt-2 text-3xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-5xl">Support the work directly.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/70">Choose any whole-euro amount from €10. Contributions over €100 include an original artwork, with shipping included. This one-time support helps Countercult.</p>
          </div>
          <div>
            {contributionComplete ? (
              <div role="status" className="border border-black bg-[#c6ff3d] p-4 text-sm font-bold">
                Thank you. Your one-time contribution to Countercult is confirmed.
                {contributionHasArtReward && <span className="mt-1 block font-normal">Your original artwork reward includes shipping. We’ll follow up about the artwork and delivery.</span>}
              </div>
            ) : (
              <form onSubmit={(event) => void startContribution(event)} className="grid gap-3">
                <label className="text-xs font-bold" htmlFor="countercult-contribution-amount">One-time amount in euros</label>
                <div className="flex flex-wrap gap-2">
                  <input id="countercult-contribution-amount" type="number" min="10" max="10000" step="1" required value={contributionAmount} onChange={(event) => setContributionAmount(event.currentTarget.value)} className="min-h-12 w-32 border-2 border-black bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-black" />
                  <button type="submit" disabled={contributionLoading} data-testid="button-countercult-contribution" className="inline-flex min-h-12 flex-1 items-center justify-between gap-3 border-2 border-black bg-[#e53935] px-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-[#b71c1c] disabled:opacity-60">
                    {contributionLoading ? "Opening secure checkout" : "Support Countercult"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-black/60">One payment only. Stripe handles card details.</p>
                {checkoutError && <p role="alert" className="text-sm text-red-700">{checkoutError}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
      {patronPostTicker}

      <section className="border-b-2 border-black bg-white px-4 py-10 sm:px-8 sm:py-14" aria-labelledby="note-from-shona">
        <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[1fr_0.9fr] md:gap-16">
          <div>
            <h2 id="note-from-shona" className="max-w-2xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              A note from our artist founder
            </h2>
            <div className="mt-5 max-w-2xl space-y-4 text-sm leading-relaxed text-black/70 sm:text-base">
              <p>
                I’m <a href="/sketchyshona/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Sketchy Shona</a>, an artist and the founder of <a href="/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Countercult</a>. I started the platform and network so people can discover independent artists, cultural spaces and local opportunities, then connect around work in their own places.
              </p>
              <p>
                Artists and the places shaping culture need infrastructure that helps them find each other, share opportunities and sustain local creative work, rather than leaving discovery only to large platforms or institutions.
              </p>
              <p>
            Patron Post is a physical field journal that brings studio art and first-person work together with an insert from <a href="/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Countercult</a>, the people behind the <a href="/explore" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Network</a> and <a href="/sketchyshona/floor/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">THE FLOOR</a>. As it grows, it can help fund paid work for artists and independent journalists.
              </p>
            </div>
          </div>
          <figure className="m-0">
            <div
              className="grid aspect-[1.12/1] grid-cols-2 gap-2 sm:gap-3"
              aria-label="Countercult gatherings and events"
            >
              <img
                src="/images/studios-cases/klunker-gathering.webp"
                alt="Two guests together at a Klunkerkranich gathering"
                className="h-full min-h-0 w-full border-2 border-black object-cover object-center"
                loading="lazy"
              />
              <img
                src="/images/fomo-community.webp"
                alt="Countercult community members together at an event"
                className="h-full min-h-0 w-full border-2 border-black object-cover object-center"
                loading="lazy"
              />
              <img
                src="/images/studios-cases/klunker-session.webp"
                alt="Guests drawing together during a Klunkerkranich session"
                className="h-full min-h-0 w-full border-2 border-black object-cover object-center"
                loading="lazy"
              />
              <img
                src="/images/studios-cases/quouch-community.webp"
                alt="Members of the Quouch community sharing an event moment"
                className="h-full min-h-0 w-full border-2 border-black object-cover object-center"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-black/45">
              People, gatherings and events · Berlin and beyond
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">
            Countercult’s Collective Fund
          </p>
          <h1
            className="max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] text-[#c6ff3d] sm:text-8xl lg:text-[clamp(4rem,9vw,9rem)]"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            Real mail from real people building our culture
          </h1>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {checkoutButton(
              "inline-flex min-h-[68px] items-center justify-between gap-5 border-2 border-white bg-[#e53935] px-6 py-5 text-left text-xs font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#b71c1c] disabled:cursor-wait disabled:opacity-60",
              "button-collective-fund-checkout-top",
            )}
            {checkoutError && <p role="alert" className="max-w-md text-sm text-white">{checkoutError}</p>}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-10 sm:px-8 sm:py-14" aria-labelledby="why-sketchy-shona">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-[0.85fr_1.15fr] sm:items-end sm:gap-12">
          <div>
            <h2 id="why-sketchy-shona" className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              The people behind Countercult
            </h2>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-black/75 sm:text-base">
            <p>
              Patron Post is run by <a href="/sketchyshona/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Sketchy Shona</a>, <a href="/" className="cc-proper-name underline decoration-black/30 underline-offset-2 hover:decoration-black">Countercult</a>’s artist founder. They bring their art and community work into each mailing, adding more to Patron Post while bringing you closer to the real people behind our culture.
            </p>
            <p className="mt-4">
              <span className="cc-proper-name">Countercult</span> has received Spanish government funding. Patron Post is an artist-led monthly mailing with one <span className="cc-proper-name">Countercult</span> insert. Buying cultural spaces remains a future ambition, not a claim about current spending.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Help%20grow%20the%20Collective%20Fund`}
              className="mt-5 inline-flex items-center gap-2 border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Help with sales or production <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <PatronPostMemberHelp />
    </main>
  );
}
