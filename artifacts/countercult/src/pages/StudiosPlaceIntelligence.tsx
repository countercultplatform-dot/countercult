import { ArrowDownRight, ArrowRight, ArrowUpRight, Landmark, MapPin, Network, WalletCards } from "lucide-react";
import { useEffect } from "react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";
import { trackEvent } from "@/lib/analytics";

const delivery = [
  {
    number: "01",
    icon: MapPin,
    title: "Find the value already here",
    copy: "Map the artists, spaces, operators, relationships and practices shaping a place, with the people who know it.",
  },
  {
    number: "02",
    icon: WalletCards,
    title: "Connect it to real demand",
    copy: "Make local culture easier to understand, contract and connect to existing audiences, public investment and commercial budgets.",
  },
  {
    number: "03",
    icon: Network,
    title: "Deliver and leave it working",
    copy: "Make the commission, programme or place project. Leave a public record and a working local network for what comes next.",
  },
];

export default function StudiosPlaceIntelligence() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Economic Development Through Culture | Countercult Studios";
    const description =
      "Countercult maps the people, spaces and practices shaping a place, connects local cultural value to existing demand and budgets, then delivers paid place work and leaves a public record and working network.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    const source = new URLSearchParams(window.location.search).get("source");
    if (source) trackEvent("place_intelligence_visited", { source });
  }, []);

  function trackCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: "/studios/place-intelligence",
      placement,
    });
  }

  return (
    <div className="studios-route-page min-h-[100dvh] bg-[#F9F9F6] text-black selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="Countercult" className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.18em]">
              <span className="sm:hidden">countercult / studios</span>
              <span className="hidden sm:inline">countercult / studios / place development</span>
            </span>
          </a>
          <nav className="flex shrink-0 items-center gap-3 text-[9px] font-bold uppercase tracking-[0.12em] sm:gap-5 sm:text-[10px] sm:tracking-[0.16em]">
            <WorkWithUsMenu />
            <a href="/studios/economic-development" className="hidden hover:text-black/50 md:inline">economic development</a>
            <a href={`${import.meta.env.BASE_URL}studios/start`} className="hidden hover:text-black/50 sm:inline">← all routes</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b-2 border-black bg-[#c6ff3d]">
          <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-16 lg:py-20">
            <div>
              <p className="mb-5 max-w-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-black/65 sm:text-[11px]">
                economic development through culture / for places and the people shaping them
              </p>
              <h1 className="max-w-5xl text-[clamp(3.2rem,9vw,8.5rem)] font-black uppercase leading-[0.8] tracking-[-0.085em]">
                build on<br />what&apos;s here.
              </h1>
            </div>
            <div className="max-w-xl lg:justify-self-end">
              <p className="font-sans text-lg leading-snug tracking-[-0.025em] sm:text-[1.45rem]">
                The economy is already there. Countercult makes local cultural value easier to find, understand, contract and connect to it.
              </p>
              <p className="mt-5 max-w-lg font-sans text-sm leading-relaxed text-black/70 sm:text-base">
                We map the people, spaces and practices shaping a place; connect them to existing demand and budgets; then deliver paid local work.
              </p>
              <a
                href="/studios/brief?route=place#brief"
                onClick={() => trackCta("hero")}
                className="mt-7 inline-flex min-h-12 items-center gap-4 border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
              >
                talk about your place <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-7 right-[4%] hidden rotate-[-7deg] border-2 border-black bg-[#F9F9F6] px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] lg:block">
            culture → local value
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#F9F9F6] px-4 py-12 sm:px-8 sm:py-16" aria-labelledby="delivery-heading">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 grid gap-5 sm:grid-cols-[.8fr_1.2fr] sm:items-end sm:gap-10">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">what Countercult does</p>
                <h2 id="delivery-heading" className="max-w-2xl text-4xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-6xl">
                  from local knowledge<br className="hidden sm:block" /> to paid work.
                </h2>
              </div>
              <p className="max-w-2xl font-sans text-sm leading-relaxed text-black/65 sm:justify-self-end sm:text-base">
                Countercult is an artist-founded culture-tech and fintech startup building open cultural and economic infrastructure. Studios brings that infrastructure into the place: we do the mapping, make the connections and carry the work through delivery.
              </p>
            </div>
            <div className="grid border-y-2 border-black md:grid-cols-3 md:divide-x-2 md:divide-black">
              {delivery.map(({ number, icon: Icon, title, copy }) => (
                <article key={number} className="group border-b-2 border-black py-6 last:border-0 md:border-b-0 md:px-6 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-black/45">{number} / 03</span>
                    <Icon className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-8 max-w-xs text-2xl font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-3xl">{title}</h3>
                  <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-black/65">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-black text-white" aria-labelledby="anceu-heading">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[.92fr_1.08fr]">
            <div className="relative min-h-[270px] overflow-hidden border-b-2 border-black sm:min-h-[390px] lg:border-b-0 lg:border-r-2">
              <img
                src="/images/rural-hackers-mural-workshop.webp"
                alt="An artist-led mural workshop in Anceu, Galicia"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-4 left-4 border-2 border-black bg-[#c6ff3d] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-black">
                Anceu / Galicia
              </div>
            </div>
            <div className="flex flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-14">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c6ff3d]">a small, public place pilot</p>
              <h2 id="anceu-heading" className="max-w-2xl text-5xl font-black uppercase leading-[0.82] tracking-[-0.075em] sm:text-7xl">
                 Anceu: public record,<br />paid continuation.
              </h2>
              <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-white/75 sm:text-lg">
                With Rural Hackers, Anceu Coliving and local partners, Countercult documented the culture and relationships already shaping the village. The work includes a public cultural record and paid follow-on to develop the case study.
              </p>
              <div className="mt-6 border-l-2 border-[#c6ff3d] pl-4 font-sans text-sm leading-relaxed text-white/60">
                This is evidence of a public record and paid continuation, not measured visitor spend, broad economic impact or a guaranteed next phase.
              </div>
              <a
                href="/journal/preserving-the-unpreserved/"
                className="mt-7 inline-flex w-fit items-center gap-3 border-b border-[#c6ff3d] pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] hover:text-white"
              >
                read the Anceu case study <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#f3f2ed] px-4 py-12 sm:px-8 sm:py-16" aria-labelledby="economy-heading">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-16">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/45">the point is local value</p>
              <h2 id="economy-heading" className="max-w-xl text-4xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-6xl">
                 connect culture<br />to existing demand.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl font-sans text-base leading-relaxed text-black/70 sm:text-lg">
                Visitors, institutions, businesses and public bodies already spend and invest. Local artists, spaces and operators already create value. We build the connective work between them so a place can commission, programme and deliver with the people who shape it.
              </p>
              <div className="mt-7 flex items-start gap-4 border-t-2 border-black pt-5">
                <Landmark className="mt-1 h-6 w-6 shrink-0 stroke-[1.5]" aria-hidden="true" />
                <p className="max-w-xl font-sans text-sm leading-relaxed text-black/60">
                  The result we work toward: more existing value reaching the people and places creating the culture. The proof should be specific to each project.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">for municipalities, destinations + place-based organisations</p>
              <h2 className="max-w-3xl text-4xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-6xl">
                have a place to move forward?
              </h2>
              <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-black/65 sm:text-base">
                Bring a real place, a live decision and the people who can help make it happen.
              </p>
            </div>
            <a
              href="/studios/brief?route=place#brief"
              onClick={() => trackCta("closing")}
              className="inline-flex min-h-12 w-fit shrink-0 items-center gap-4 border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
            >
              talk about your place <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}
