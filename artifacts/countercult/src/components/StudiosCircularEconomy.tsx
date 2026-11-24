import { Building2, Eye, MapPin, Repeat2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "culture exists",
    copy: "artists, spaces, local practices, and operators are already making a place distinctive.",
  },
  {
    number: "02",
    icon: Eye,
    title: "we make it visible",
    copy: "the network gives that value context, discoverability, and a route in.",
  },
  {
    number: "03",
    icon: Building2,
    title: "existing demand finds it",
    copy: "tourism, brands, small businesses, agencies, institutions, and visitors find the right fit.",
  },
  {
    number: "04",
    icon: Repeat2,
    title: "value circulates",
    copy: "commissions, visits, partnerships, and local spend move through the people and places creating culture.",
  },
];

export function StudiosCircularEconomy() {
  return (
    <section className="overflow-hidden border-b-2 border-black bg-black text-[#F9F9F6]" aria-labelledby="circular-economy-heading">
      <div className="border-b-2 border-black bg-[#c6ff3d]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-8">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]">the Countercult model</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/55">culture → value → place</span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">circular economics through culture</p>
            <h2 id="circular-economy-heading" className="max-w-xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              culture is<br />already creating<br />value.
            </h2>
            <p className="mt-6 max-w-md font-sans text-sm leading-relaxed text-white/65">
              Countercult does not create demand. We connect the cultural value already present in a place to the people and organisations already looking for it.
            </p>
            <p className="mt-6 max-w-md border-l-2 border-[#c6ff3d] pl-4 text-lg font-bold leading-tight text-[#c6ff3d]">
              Countercult turns cultural value into economic value.
            </p>
          </div>
          <div className="grid gap-px border border-white/25 bg-white/25 sm:grid-cols-2">
            {steps.map(({ number, icon: Icon, title, copy }) => (
              <div key={number} className="bg-black p-5 sm:p-6">
                <div className="mb-10 flex items-center justify-between text-[#c6ff3d]">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                  <span className="font-mono text-[10px]">{number}</span>
                </div>
                <h3 className="mb-3 text-2xl font-black uppercase leading-none tracking-[-0.03em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                <p className="max-w-xs font-sans text-[12px] leading-relaxed text-white/60">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}