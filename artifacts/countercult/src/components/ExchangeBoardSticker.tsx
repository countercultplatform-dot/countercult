import { ArrowUpRight } from "lucide-react";

export function ExchangeBoardSticker() {
  return (
    <a
      href="/residency"
      data-testid="sticker-home-exchange-board"
      aria-label="Not sure where to start? Open the Exchange board"
      className="group block w-[min(16rem,calc(100vw-2rem))] rotate-[-2deg] border-2 border-black bg-[#c6ff3d] px-4 py-3 text-black shadow-[5px_5px_0_#000] transition-transform hover:-translate-y-1 hover:rotate-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
    >
      <span className="flex items-center justify-between gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em]">
        <span>countercult / exchange</span>
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </span>
      <span className="mt-2 block text-[15px] font-black uppercase leading-[0.9] tracking-[-0.03em]">
        Not sure where to start?
      </span>
      <span className="mt-2 block font-mono text-[9px] font-bold uppercase tracking-[0.12em] underline underline-offset-2">
        Open the Exchange board
      </span>
    </a>
  );
}