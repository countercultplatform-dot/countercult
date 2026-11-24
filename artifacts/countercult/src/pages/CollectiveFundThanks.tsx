import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { PatronPostAnonymousQuestionForm, PatronPostMemberHelp } from "@/components/PatronPostMemberHelp";
import { trackPatronPostStickerConversion } from "@/lib/patronPostStickerExperiment";
import {
  clearPatronPostAttribution,
  getPatronPostAttribution,
  trackEvent,
  trackPatronPostMembershipConfirmation,
  trackPatronPostReturn,
} from "@/lib/analytics";

type CompletionResult = {
  completed?: boolean;
  error?: string;
  gift?: boolean;
  deliveryType?: "physical" | "digital";
  welcomeEmailSent?: boolean;
};

export default function CollectiveFundThanks() {
  const [status, setStatus] = useState<"checking" | "confirmed" | "error">("checking");
  const [error, setError] = useState("");
  const [welcomeEmailSent, setWelcomeEmailSent] = useState(false);
  const [gift, setGift] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"physical" | "digital">("physical");
  const [portalLoading, setPortalLoading] = useState(false);

  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setError("We couldn’t find the checkout confirmation. If your payment went through, email us and we’ll check it.");
      setStatus("error");
      return;
    }

    trackPatronPostReturn({
      ...getPatronPostAttribution("/collective-fund"),
      return_route: "/collective-fund/thanks",
    });

    let active = true;
    fetch("/api/patron-post/complete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as CompletionResult;
        if (!response.ok || !result.completed) {
          throw new Error(result.error || "Your membership is still being confirmed.");
        }
        if (active) {
          const confirmedDeliveryType = result.deliveryType === "digital" ? "digital" : "physical";
          if (confirmedDeliveryType === "physical") trackPatronPostStickerConversion(Boolean(result.gift));
          trackPatronPostMembershipConfirmation({
            ...getPatronPostAttribution("/collective-fund"),
            return_route: "/collective-fund/thanks",
            gift: Boolean(result.gift),
            membership_type: confirmedDeliveryType,
          });
          clearPatronPostAttribution();
          setWelcomeEmailSent(Boolean(result.welcomeEmailSent));
          setGift(Boolean(result.gift));
          setDeliveryType(confirmedDeliveryType);
          setStatus("confirmed");
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        trackEvent("patron_post_confirmation_error", {
          ...getPatronPostAttribution("/collective-fund"),
          return_route: "/collective-fund/thanks",
          stage: "confirm_session",
          reason: "server_confirmation_failed",
        });
        setError(reason instanceof Error ? reason.message : "Your membership is still being confirmed.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  async function manageMembership() {
    if (!sessionId) return;
    setPortalLoading(true);
    setError("");
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Membership management could not be opened.");
      setPortalLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f9f9f6] px-4 py-12 text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <section className="w-full max-w-2xl border-2 border-black bg-white p-6 sm:p-10" aria-live="polite">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">Countercult’s Collective Fund · Patron Post</p>
        {status === "checking" ? (
          <>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.07em] sm:text-6xl">Confirming your membership</h1>
            <p className="mt-5 text-sm leading-relaxed text-black/70">We’re checking your secure checkout now. This usually takes a moment.</p>
          </>
        ) : status === "confirmed" ? (
          <>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-7xl">
              {deliveryType === "digital" ? "Thanks for choosing the digital edition" : "Thanks for joining Patron Post"}
            </h1>
            {deliveryType === "digital" ? (
              <p className="mt-5 text-base leading-relaxed text-black/75">
                Your digital-only membership is confirmed. Around mid-month, when that month’s physical mailing is ready to go out, we’ll email you a high-resolution PDF of the mailing and Countercult insert. This option does not include physical mail or shipping, and renews monthly until canceled. {welcomeEmailSent ? "We’ve sent a confirmation email with the key details." : "If you don’t see a confirmation email, contact us and we’ll help."}
              </p>
            ) : (
              <p className="mt-5 text-base leading-relaxed text-black/75">
                {gift
                  ? "Your gift membership is confirmed. The monthly charge stays on your account until you cancel, and the mail will go to the recipient address entered at checkout."
                  : "Your Patron Post membership is confirmed."} {welcomeEmailSent ? "We’ve sent a confirmation email with the key details." : "If you don’t see a confirmation email, contact us and we’ll help."} We post around the middle of each month. Sign up by the 5th for that month’s batch; after the 5th, you’re in the following month’s batch. If you join just after the cutoff, allow around 6–8 weeks for your first mailing. Joining later in the month usually means a shorter wait. International mail may take longer. Each paid monthly cycle includes one mailing. Your membership renews from your signup date, not the mailing date.
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-black/75">Use Stripe’s secure customer portal to pause eligible memberships for one month, change the mailing address, or cancel.</p>
            <div className="mt-7 border-2 border-black bg-[#c6ff3d] p-5">
              <p className="font-bold">What happens next</p>
              {deliveryType === "digital" ? (
                <p className="mt-2 text-sm leading-relaxed">
                  Your membership helps keep Countercult’s Network and resources free to access. At 1,000 readers, Patron Post will launch a global fund to pay local artists and builders to document cultural spaces around the world. If your PDF doesn’t arrive, email <a className="font-bold underline underline-offset-2" href="mailto:countercultplatform@gmail.com?subject=Patron%20Post%20digital%20edition">countercultplatform@gmail.com</a> so we can look into it.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed">
                  Your Patron Post membership helps keep Countercult’s Network and resources free to access. At 1,000 readers, Patron Post will launch a global fund to pay local artists and builders to document cultural spaces around the world. If your mailing doesn’t arrive, email <a className="font-bold underline underline-offset-2" href="mailto:countercultplatform@gmail.com?subject=Patron%20Post%20missing%20mail">countercultplatform@gmail.com</a> so we can look into it.
                </p>
              )}
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => void manageMembership()} disabled={portalLoading} className="inline-flex items-center justify-center gap-2 border-2 border-black bg-[#e53935] px-5 py-4 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-[#b71c1c] disabled:opacity-60">
                {portalLoading ? "Opening membership management" : "Manage membership"} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link href="/collective-fund" className="inline-flex items-center justify-center gap-2 border-2 border-black px-5 py-4 text-xs font-black uppercase tracking-[0.12em] hover:bg-black hover:text-white">
                Back to the Collective Fund <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.07em] sm:text-6xl">We’re still checking</h1>
            <p className="mt-5 text-sm leading-relaxed text-black/70">{error}</p>
            <p className="mt-3 text-sm leading-relaxed text-black/70">
              Please allow one or two days for a reply. You can also revisit this page to retry the confirmation.
            </p>
            <a href="mailto:countercultplatform@gmail.com?subject=Patron%20Post%20checkout%20confirmation" className="mt-6 inline-flex border-2 border-black bg-[#c6ff3d] px-5 py-4 text-xs font-black uppercase tracking-[0.12em]">
              Email us about your checkout
            </a>
          </>
        )}
        <PatronPostAnonymousQuestionForm />
        <PatronPostMemberHelp />
      </section>
    </main>
  );
}
