import { useEffect } from "react";
import envelopeSticker from "@/assets/repo-placeholder.svg";
import { getAnalyticsConsent } from "@/lib/analytics";
import {
  recordPatronPostStickerClick,
  trackPatronPostStickerExposure,
} from "@/lib/patronPostStickerExperiment";
import type { StickerPosition } from "./sticker-position";

export default function FixedPatronPostSticker({ position }: { position: StickerPosition }) {
  const variant = "envelope" as const;

  useEffect(() => {
    let tracked = false;
    let observer: MutationObserver | null = null;

    const recordVisibleExposure = () => {
      if (
        tracked
        || document.visibilityState !== "visible"
        || getAnalyticsConsent() !== "granted"
        || document.querySelector('[aria-label="Countercult loading animation"]')
      ) return;

      tracked = true;
      observer?.disconnect();
      trackPatronPostStickerExposure(variant);
    };

    observer = new MutationObserver(recordVisibleExposure);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", recordVisibleExposure);
    window.addEventListener("cc:analytics-consent-change", recordVisibleExposure);
    recordVisibleExposure();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", recordVisibleExposure);
      window.removeEventListener("cc:analytics-consent-change", recordVisibleExposure);
    };
  }, [variant]);

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-3 z-[9400] flex items-end gap-1 sm:bottom-6 sm:right-6 sm:gap-2">
      <a
        href="/explore"
        aria-label="Open the Countercult map"
        className="cc-patron-sticker pointer-events-auto relative block w-12 shrink-0 sm:w-16"
      >
        <img
          src="/images/renaissance-explore-globe.png"
          alt=""
          aria-hidden="true"
          className="block w-full"
          style={{ filter: "brightness(1.4) contrast(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.85))" }}
        />
        <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap border border-black bg-[#c6ff3d] px-1 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.08em] text-black sm:px-1.5 sm:py-1 sm:text-[9px]">
          THE MAP
        </span>
      </a>
      </div>
      <a
        href="/snail"
        aria-label="Become our pen pal. Visit the Patron Post page."
        title="Become our pen pal"
        data-testid="link-fixed-patron-post-sticker"
        data-patron-post-sticker-variant={variant}
        onClick={() => recordPatronPostStickerClick(variant)}
        className={`cc-patron-sticker pointer-events-auto fixed z-[9400] block h-[88px] w-[88px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black motion-reduce:transition-none sm:h-36 sm:w-36 ${position}`}
      >
        <img
          src={envelopeSticker}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 block h-full w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:scale-110 motion-reduce:transition-none"
        />
        <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 rotate-[-3deg] whitespace-nowrap border-2 border-black bg-[#c6ff3d] px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.02em] text-black shadow-[1px_1px_0_#111] sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.05em]">
          Become our pen pal
        </span>
      </a>
    </>
  );
}
