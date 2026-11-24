type StatsVariant = "macro" | "experiential" | "commercial" | "entry-markets" | "places" | "funders";

const proofStatsByVariant: Record<StatsVariant, {
  eyebrow: string;
  heading: string;
  intro: string;
  stats: { value: string; label: string }[];
  sources: { href: string; label: string; external?: boolean }[];
}> = {
  macro: {
    eyebrow: "published evidence",
    heading: "culture is not decoration.",
    intro: "Culture already creates economic value at scale. The gap is infrastructure: who gets found, who gets paid, and whether the people and places making culture can keep going.",
    stats: [
      { value: "$1.17T", label: "US arts and cultural production in 2023" },
      { value: "4.2%", label: "of US GDP comes from arts and cultural production" },
      { value: "3.1%", label: "of global GDP comes from the creative economy" },
      { value: "6.2%", label: "of global employment sits in the creative economy" },
    ],
    sources: [
      { href: "/journal/funding-rural-cultural-archive/", label: "US arts + culture production / BEA →" },
      { href: "/journal/why-subcultures-need-cultural-infrastructure/", label: "global creative economy / UNESCO →" },
    ],
  },
  experiential: {
    eyebrow: "the economic loop",
    heading: "culture moves money.",
    intro: "culture is economic. our job is to make the work move through the local economy.",
    stats: [
      { value: "4.2%", label: "of US GDP comes from arts and cultural production" },
      { value: "3.1%", label: "of global GDP comes from the creative economy" },
      { value: "6.2%", label: "of global employment sits in the creative economy" },
      { value: "$1.17T", label: "US arts and cultural production in 2023" },
    ],
    sources: [
      { href: "/journal/funding-rural-cultural-archive/", label: "US arts + culture production / BEA →" },
      { href: "/journal/why-subcultures-need-cultural-infrastructure/", label: "global creative economy / UNESCO →" },
    ],
  },
  commercial: {
    eyebrow: "the commercial opportunity",
    heading: "tourism is already moving.",
    intro: "International travel has recovered at scale. The next advantage is not another generic destination campaign; it is culturally grounded experiences, operators, and stories that people can actually enter, book, and remember.",
    stats: [
      { value: "1.4B", label: "international tourists travelled in 2024" },
      { value: "$1.6T", label: "in international tourism receipts in 2024" },
      { value: "$1.1K", label: "estimated average spend per international arrival" },
      { value: "$1.17T", label: "US arts and cultural production in 2023" },
    ],
    sources: [
      { href: "https://www.untourism.int/news/international-tourism-recovers-pre-pandemic-levels-in-2024", label: "UN Tourism / 2024 →", external: true },
      { href: "/journal/funding-rural-cultural-archive/", label: "US arts + culture / BEA →" },
    ],
  },
  "entry-markets": {
    eyebrow: "the first step",
    heading: "start where demand already is.",
    intro: "We begin with tourism and experiential work: the markets where local culture already meets attention, participation, and spend. Countercult brings local context, relationships, and delivery infrastructure to turn that demand into local value.",
    stats: [
      { value: "1.4B", label: "international tourists travelled in 2024" },
      { value: "$1.6T", label: "in international tourism receipts in 2024" },
      { value: "$1.1K", label: "estimated average spend per international arrival" },
      { value: "$1.17T", label: "US arts and cultural production in 2023" },
    ],
    sources: [
      { href: "https://www.untourism.int/news/international-tourism-recovers-pre-pandemic-levels-in-2024", label: "UN Tourism / 2024 →", external: true },
      { href: "/journal/funding-rural-cultural-archive/", label: "US arts + culture / BEA →" },
    ],
  },
  places: {
    eyebrow: "place + regional evidence",
    heading: "under-invested places need infrastructure.",
    intro: "Economic development is not only a growth target. It is the work of making local culture visible, fundable, and useful in rural regions, smaller cities, and districts that have been overlooked or under-invested.",
    stats: [
      { value: "$1.17T", label: "US arts and cultural production in 2023" },
      { value: "6.6%", label: "real growth in US arts and culture, vs 2.9% overall" },
      { value: "83%", label: "of EU territory is rural" },
      { value: "66.3M", label: "people lived in rural US areas in 2020" },
    ],
    sources: [
      { href: "/journal/why-rural-places-need-living-cultural-archives/", label: "EU rural scale / European Commission →" },
      { href: "/journal/funding-rural-cultural-archive/", label: "US rural context / Census Bureau →" },
    ],
  },
  funders: {
    eyebrow: "participation + living heritage",
    heading: "fund what should still be here.",
    intro: "A cultural archive is not only a record of the past. It is a participatory infrastructure for the people who carry living heritage now, and for the places that need the next chapter to remain possible.",
    stats: [
      { value: "3,000+", label: "rural citizens contributing to the EU archive conversation" },
      { value: "170", label: "rural workshops held across the EU" },
      { value: "19", label: "EU countries represented in that participation" },
      { value: "66.3M", label: "people lived in rural US areas in 2020" },
    ],
    sources: [
      { href: "/journal/why-rural-places-need-living-cultural-archives/", label: "living archives + participation →" },
      { href: "/journal/funding-rural-cultural-archive/", label: "rural funding context / Census Bureau →" },
    ],
  },
};

export function StudiosProofStats({
  tone = "lime",
  variant = "macro",
}: {
  tone?: "lime" | "dark";
  variant?: StatsVariant;
}) {
  const isDark = tone === "dark";
  const content = proofStatsByVariant[variant];

  return (
    <section className={`border-b-2 border-black ${isDark ? "bg-black text-white" : "bg-[#c6ff3d] text-black"}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.24em] ${isDark ? "text-[#c6ff3d]" : "text-black/60"}`}>
              {content.eyebrow}
            </p>
            <h2 className="mt-2 max-w-xl text-3xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-4xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              {content.heading}
            </h2>
          </div>
          <p className={`max-w-sm text-sm leading-relaxed ${isDark ? "text-white/60" : "text-black/65"}`}>
            {content.intro}
          </p>
        </div>

        <div className={`mt-7 grid grid-cols-2 border-y-2 ${isDark ? "border-white/30" : "border-black"} sm:grid-cols-4`}>
          {content.stats.map((stat, index) => (
            <div
              key={stat.value + stat.label}
              className={`py-4 pr-4 sm:px-4 sm:py-5 ${index > 0 ? `border-l-2 ${isDark ? "border-white/30" : "border-black"}` : ""} ${index > 1 ? `border-t-2 ${isDark ? "border-white/30" : "border-black"} sm:border-t-0` : ""}`}
            >
              <p className="text-5xl font-black leading-none tracking-[-0.07em] sm:text-6xl lg:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                {stat.value}
              </p>
              <p className={`mt-3 text-[11px] leading-snug ${isDark ? "text-white/65" : "text-black/65"}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className={`mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em] ${isDark ? "text-white/45" : "text-black/50"}`}>
          {content.sources.map((source) => (
            <a
              key={source.href}
              href={source.href}
              target={source.external ? "_blank" : undefined}
              rel={source.external ? "noreferrer" : undefined}
              className="underline decoration-1 underline-offset-4 hover:text-current"
            >
              {source.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}