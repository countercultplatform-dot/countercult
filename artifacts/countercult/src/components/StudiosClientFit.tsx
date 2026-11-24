type ClientFitRoute = "business" | "place";

const fitByRoute: Record<ClientFitRoute, {
  eyebrow: string;
  heading: string;
  intro: string;
  checks: string[];
  notFit: string;
}> = {
  business: {
    eyebrow: "got a pop-up to make?",
    heading: "bring us the brief.",
    intro: "a real brief, a budget, and someone who can make a decision.",
    checks: [
      "you need a product, campaign, launch, or live experience",
      "creative direction, product, production, or operations is part of it",
      "someone owns the decision",
    ],
    notFit: "not for a moodboard with no budget, owner, or next decision.",
  },
  place: {
    eyebrow: "qualify the brief",
    heading: "bring us the place, the budget, and the decision.",
    intro: "No perfect brief needed. Tell us what is happening, who is accountable, what needs to change, and where you need us to carry the work through production and delivery.",
    checks: [
      "a place, destination, or development is the focus",
      "someone can make the decision and open the doors",
      "there is budget for research, people, production, fabrication, or commissions",
      "there is a real outcome: demand, work, participation, or value kept local",
    ],
    notFit: "not a fit: a free strategy exercise, a listing request, or a campaign with nobody responsible for what happens next.",
  },
};

export function StudiosClientFit({
  route,
  href,
  label,
  onClick,
}: {
  route: ClientFitRoute;
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const content = fitByRoute[route];

  return (
    <section id="client-fit" className="border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">{content.eyebrow}</p>
          <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {content.heading}
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/65">{content.intro}</p>
          <p className="mt-5 max-w-lg text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-white/45">{content.notFit}</p>
        </div>
        <div>
          <ul className="divide-y divide-white/25 border-y border-white/25">
            {content.checks.map((check, index) => (
              <li key={check} className="flex gap-4 py-4 text-sm leading-relaxed text-white/80">
                <span className="font-mono text-[10px] font-bold text-[#c6ff3d]">0{index + 1}</span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c6ff3d]">strong fit = 3+ yeses</p>
          <a
            href={href}
            onClick={onClick}
            className="mt-7 inline-flex border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:border-white hover:bg-white"
          >
            {label} →
          </a>
        </div>
      </div>
    </section>
  );
}