import { PinkSoapSticker } from "@/components/PinkSoapSticker";
import { trackEvent } from "@/lib/analytics";

export function WorkWithUsStickers({ hideSoap = false }: { hideSoap?: boolean }) {
  return (
    <div className="pointer-events-none fixed right-3 top-[5.25rem] z-[60] flex items-start gap-1 sm:right-6 sm:top-[6rem] sm:gap-2">
      <a
        href="/explore"
        aria-label="Explore Countercult"
        title="Explore Countercult"
        onClick={() => trackEvent("explore_section_clicked", { placement: "work_with_us_globe_sticker" })}
        className="pointer-events-auto relative block w-16 shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] sm:w-20"
      >
        <img
          src="/images/renaissance-explore-globe.png"
          alt=""
          aria-hidden="true"
          className="block w-full"
          style={{ filter: "brightness(1.4) contrast(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.85))" }}
        />
        <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap border border-black bg-[#c6ff3d] px-1.5 py-1 font-mono text-[7px] font-black uppercase tracking-[0.12em] text-black sm:px-2 sm:text-[9px]">
          explore
        </span>
      </a>
      {!hideSoap && (
        <a
          href="https://countercultplatform.substack.com/subscribe"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Subscribe to Countercult on Substack"
          title="Subscribe to Countercult on Substack"
          className="pointer-events-auto mt-1 block w-[4.75rem] shrink-0 rotate-[10deg] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] sm:mt-2 sm:w-28"
        >
          <PinkSoapSticker />
        </a>
      )}
    </div>
  );
}
