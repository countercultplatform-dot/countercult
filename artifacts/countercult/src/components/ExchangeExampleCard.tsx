import type { ExchangeExample } from "@/data/exchangeExamples";

export function ExchangeExampleCard({ example, compact = false, href }: { example: ExchangeExample; compact?: boolean; href?: string }) {
  const cardClassName = `group flex flex-col overflow-hidden border-2 border-black bg-[#f1f1ee] text-black shadow-[5px_6px_0_#000] transition-transform ${
    compact ? "min-h-[185px]" : "min-h-[250px]"
  } ${href ? "cursor-pointer hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-[8px_9px_0_#000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black" : ""}`;
  const cardContent = (
    <>
      <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-[#e1e1dd] px-3 py-2.5 sm:px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
          {example.glyph}&nbsp; {example.kind}
        </span>
        <span className="shrink-0 border border-black px-1.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-black">
          example
        </span>
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-4" : "p-5"}`}>
        <span className="mb-3 inline-flex w-fit border border-black bg-[#fafaf7] px-1.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-black">
          example ways to post
        </span>
        <div className="flex items-baseline gap-2">
          <h3 className="font-black uppercase leading-tight tracking-[-0.02em]">{example.city}</h3>
          <span className="text-[9px] uppercase tracking-[0.1em] text-black">· {example.audience}</span>
        </div>
        <p className={`mt-3 leading-relaxed text-black ${compact ? "line-clamp-3 text-[10px]" : "text-[11px]"}`}>
          {example.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-black pt-3 text-[8px] font-bold uppercase tracking-[0.1em] text-black">
          <span>example · not live</span>
          {href && <span className="text-[13px] transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cardClassName}
        aria-label={`Use this example to start a ${example.kind} post in ${example.city}`}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <article
      className={cardClassName}
      aria-label={`Example way to post: ${example.kind} in ${example.city}. This is not a real post.`}
    >
      {cardContent}
    </article>
  );
}