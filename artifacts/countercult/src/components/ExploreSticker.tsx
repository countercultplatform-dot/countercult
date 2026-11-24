import { trackEvent } from "@/lib/analytics";

export function ExploreSticker() {
  return (
    <a
      href="/explore"
      aria-label="Explore Countercult"
      title="Explore Countercult"
      data-testid="link-home-explore-sticker"
      onClick={() => trackEvent("explore_section_clicked", { placement: "homepage_fixed_sticker" })}
      className="fixed right-4 z-[50] block w-16 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:right-6 sm:w-24 lg:w-48 xl:w-56"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
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
  );
}
