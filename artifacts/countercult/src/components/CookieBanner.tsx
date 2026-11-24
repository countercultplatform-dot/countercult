import { useState, useEffect } from "react";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

const INTRO_KEY = "cc_intro_seen_v2";

export default function CookieBanner({
  showIntro = true,
  showConsent = true,
}: {
  showIntro?: boolean;
  showConsent?: boolean;
}) {
  const [introVisible, setIntroVisible] = useState(() => {
    if (!showIntro) return false;
    try {
      return !sessionStorage.getItem(INTRO_KEY);
    } catch {
      return true;
    }
  });
  const [analyticsConsent, setAnalyticsConsentState] = useState(getAnalyticsConsent);

  useEffect(() => {
    if (!introVisible) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* best effort */ }
      setIntroVisible(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [introVisible]);

  useEffect(() => {
    const syncConsent = () => setAnalyticsConsentState(getAnalyticsConsent());
    window.addEventListener("cc:analytics-consent-change", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("cc:analytics-consent-change", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  const chooseConsent = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setAnalyticsConsentState(value);
  };

  return (
    <>
      {introVisible && (
        <div
          className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black text-[#c6ff3d]"
          style={{ zIndex: 11000 }}
          role="dialog"
          aria-modal="true"
          aria-label="Countercult loading animation"
        >
          <img
            src="/cult-rat.gif"
            alt=""
            aria-hidden="true"
            className="cc-intro-rat h-28 w-auto sm:h-40"
          />
        </div>
      )}
      {showConsent && analyticsConsent === "unset" && (
        <aside
          role="region"
          aria-label="Optional analytics consent"
          className="fixed inset-x-0 bottom-0 z-[10500] border-t border-black/15 bg-[#F9F9F6] text-black shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-1 sm:px-6">
            <p className="min-w-0 flex-1 font-mono text-[8px] leading-tight sm:text-[10px]">
              <span className="hidden sm:inline">Can we use analytics to count visits?</span>
              <span className="sm:hidden">Count visits with analytics?</span>{" "}
              <a
                href="/privacy#optional-analytics"
                className="font-bold underline underline-offset-2 hover:text-black/60"
              >
                Details
              </a>
            </p>
            <div className="flex shrink-0 items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => chooseConsent("denied")}
                className="h-7 border border-black/20 bg-white px-2.5 font-mono text-[8px] font-bold uppercase tracking-widest hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-3 sm:text-[9px]"
              >
                No thanks
              </button>
              <button
                type="button"
                onClick={() => chooseConsent("granted")}
                className="h-7 border border-black/25 bg-[#F9F9F6] px-2.5 font-mono text-[8px] font-bold uppercase tracking-widest hover:bg-[#c6ff3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-3 sm:text-[9px]"
              >
                OK
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
