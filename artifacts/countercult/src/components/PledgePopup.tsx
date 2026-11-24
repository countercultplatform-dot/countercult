import { useState, useEffect } from "react";
import editionOne from "@/assets/repo-placeholder.svg";
import editionTwo from "@/assets/repo-placeholder.svg";
import editionThree from "@/assets/repo-placeholder.svg";
import envelopeFront from "@/assets/repo-placeholder.svg";
import envelopeOpen from "@/assets/repo-placeholder.svg";
import honestWorkMeme from "@/assets/repo-placeholder.svg";

const SESSION_KEY = "cc_pledge_done_v2";
const BLOCKED_PATHS = [
  "/admin",
  "/auth",
  "/login",
  "/member-home",
  "/profile",
  "/register",
  "/register-vetted-artist",
  "/reset-password",
  "/setup-password",
];

function canShowOnLocation(location: string) {
  const [path, query = ""] = location.split("?");
  if (BLOCKED_PATHS.some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) return false;
  const action = new URLSearchParams(query).get("action");
  return action !== "join" && action !== "signin" && action !== "submit";
}

function hasActiveEditingFlow() {
  if (document.querySelector('[data-cc-editing="true"]')) return true;
  if (document.querySelector('[role="dialog"] form')) return true;

  const active = document.activeElement;
  return active instanceof HTMLInputElement
    || active instanceof HTMLTextAreaElement
    || active instanceof HTMLSelectElement;
}

/** Dispatch this from anywhere to request the popup to show */
export function showPledgePopup(options?: { delay?: number; persistAcrossNavigation?: boolean }) {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("cc:show-pledge", { detail: { reason: "action" } }));
  }, options?.delay ?? 0);
}

export function PledgePopup({ location }: { location: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const latestLocation = `${window.location.pathname}${window.location.search}`;
    if (!canShowOnLocation(latestLocation)) {
      setVisible(false);
    }
  }, [location]);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    let active = true;
    const showIfAllowed = () => {
      const latestLocation = `${window.location.pathname}${window.location.search}`;
      if (
        active
        && !sessionStorage.getItem(SESSION_KEY)
        && canShowOnLocation(latestLocation)
        && !hasActiveEditingFlow()
      ) {
        setVisible(true);
      }
    };
    const firstTimer = window.setTimeout(showIfAllowed, 120_000);
    const secondTimer = window.setTimeout(showIfAllowed, 420_000);

    return () => {
      active = false;
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, []);

  useEffect(() => {
    const handle = (event: Event) => {
      const isAction = event instanceof CustomEvent && event.detail?.reason === "action";
      if (!isAction) return;
      const latestLocation = `${window.location.pathname}${window.location.search}`;
      if (!canShowOnLocation(latestLocation) || hasActiveEditingFlow()) return;
      setVisible(true);
    };

    window.addEventListener("cc:show-pledge", handle);
    return () => {
      window.removeEventListener("cc:show-pledge", handle);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[12000] backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel - meme first, offer copy and CTA, then physical mail examples */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[12001] max-h-[92dvh] w-full overflow-x-hidden overflow-y-auto border-2 border-[#c6ff3d] bg-black pb-[env(safe-area-inset-bottom)] text-white md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(100%-2rem,31rem)] md:-translate-x-1/2 md:-translate-y-1/2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pledge-popup-title"
        aria-describedby="pledge-popup-description"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="relative">
          <img
            src={honestWorkMeme}
            alt="A farmer in a field with the caption, It ain't much, but it's honest work"
            className="block h-auto w-full"
          />
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center border border-white/50 bg-black/80 text-xl leading-none text-white transition-colors hover:bg-[#c6ff3d] hover:text-black"
            aria-label="Close support popup"
            data-testid="button-close-pledge-popup"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-2 pt-4 sm:px-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d]">
            Patron Post · monthly mail
          </p>
          <h2 id="pledge-popup-title" className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.06em] text-white sm:text-5xl">
            Support the work
          </h2>
          <p id="pledge-popup-description" className="mt-3 text-[13px] leading-relaxed text-white/85 sm:text-sm">
            Culture happens between people and in places, not just online. For centuries, patrons kept artists free to make weird, honest work. Patron Post sends studio art and a real letter by mail. Your support helps keep Countercult’s Network and resources free to access. At 1,000 readers, we’ll launch a global fund to pay local artists and builders to document cultural spaces around the world.
          </p>
          <a
            href="/snail"
            onClick={dismiss}
            className="mt-4 flex w-full items-center justify-between border-2 border-black bg-[#c6ff3d] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white"
            data-testid="link-snail-patron-post"
          >
            Get Patron Post <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="relative mx-auto mt-1 h-56 w-full max-w-[30rem] sm:h-64" aria-label="Examples of the physical Patron Post mailings">
          <img src={envelopeFront} alt="" aria-hidden="true" className="absolute left-[1%] top-[16%] z-0 w-[53%] -rotate-6 object-contain opacity-90" />
          <img src={envelopeOpen} alt="" aria-hidden="true" className="absolute bottom-[2%] right-0 z-0 w-[53%] rotate-6 object-contain opacity-90" />
          <img src={editionOne} alt="" aria-hidden="true" className="absolute left-[2%] top-0 z-10 w-[48%] -rotate-6 object-contain drop-shadow-md" />
          <img src={editionTwo} alt="" aria-hidden="true" className="absolute right-[1%] top-[8%] z-20 w-[48%] rotate-6 object-contain drop-shadow-md" />
          <img src={editionThree} alt="" aria-hidden="true" className="absolute bottom-0 left-[23%] z-30 w-[54%] -rotate-2 object-contain drop-shadow-md" />
        </div>
      </div>
    </>
  );
}
