import { ArrowUpRight } from "lucide-react";

export function ExchangeCommunitySticker({ onStartSharing }: { onStartSharing: () => void }) {
  return (
    <aside className="exchange-community-sticker" aria-labelledby="exchange-community-sticker-title">
      <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-2 font-mono text-[8px] font-bold uppercase tracking-[0.15em]">
        <span>exchange / built together</span>
        <span aria-hidden="true">01</span>
      </div>
      <h2 id="exchange-community-sticker-title" className="mt-3 text-xl font-black uppercase leading-[0.92] tracking-[-0.045em]">
        this board only works when we all share.
      </h2>
      <p className="mt-2 text-[11px] font-medium leading-relaxed">
        Your room, skill, opportunity or local knowledge could be exactly what another artist needs. Add yours to the board.
      </p>
      <button
        type="button"
        onClick={onStartSharing}
        className="mt-3 inline-flex min-h-9 items-center justify-between gap-3 border-2 border-black bg-black px-3 py-2 text-left font-mono text-[9px] font-black uppercase tracking-[0.1em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
        data-testid="button-exchange-community-share"
      >
        share something
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </aside>
  );
}
