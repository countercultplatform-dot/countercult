import { ArrowRight, House } from "lucide-react";

export function FloorOpenCallSticker({ className = "" }: { className?: string }) {
  return (
    <a
      href="/the-floor"
      data-testid="link-floor-open-call-sticker"
      aria-label="View The Floor artist residency open call"
      className={`group block w-[min(20rem,calc(100vw-2rem))] rotate-2 border-2 border-black bg-black px-4 py-4 text-white shadow-[5px_5px_0_#c6ff3d] transition-transform hover:-rotate-1 ${className}`}
    >
      <span className="flex items-center justify-between gap-4 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#c6ff3d] sm:text-[9px]">
        <span>open call</span>
        <span className="text-white/55">berlin</span>
      </span>
      <span className="mt-2 flex items-center gap-2 text-lg font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-xl">
        <House className="h-6 w-6 shrink-0 text-[#c6ff3d]" strokeWidth={1.8} aria-hidden="true" />
        <span>the floor residency</span>
      </span>
      <span className="mt-3 flex items-center justify-between gap-3 font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.1em] text-white/65">
        stays from november 2026
        <ArrowRight className="h-4 w-4 shrink-0 text-[#c6ff3d] transition-transform group-hover:translate-x-1" />
      </span>
    </a>
  );
}