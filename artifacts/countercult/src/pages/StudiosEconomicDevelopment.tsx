import { useEffect } from "react";
import { Archive, MapPinned, UsersRound } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { StudiosClientFit } from "@/components/StudiosClientFit";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";
import { trackEvent } from "@/lib/analytics";

const services = [
  {
    number: "01",
    icon: MapPinned,
    title: "find what is already here",
    copy: "Work with local people to identify the artists, spaces, stories, skills, and businesses already shaping the place.",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "make it easier to find",
    copy: "Build the public cultural record, stories, visitor routes, and marketing that bring this existing value into view.",
  },
  {
    number: "03",
    icon: Archive,
    title: "connect it to people + spending",
    copy: "Connect the audiences, commissioners, partners, and budgets a place wants to reach with the people carrying its culture.",
  },
];

export default function StudiosEconomicDevelopment() {
  function trackBookingCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: "/studios/economic-development",
      placement,
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Local Economic Development Through Local Culture | Countercult Studios";
    const description =
      "Countercult builds cultural discovery infrastructure and marketing that connect a place's existing culture to the audiences, partners, commissions, and budgets local people want to reach.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, []);

  return (
    <div className="studios-route-page min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">
              <span className="sm:hidden">countercult</span>
              <span className="hidden sm:inline">countercult / studios / economic development</span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] sm:gap-5">
            <WorkWithUsMenu />
            <a href="/studios/tourism" className="hidden hover:text-black/50 lg:inline-flex">tourism + experiences</a>
            <a href="/studios/place-intelligence" className="hidden hover:text-black/50 lg:inline-flex">place intelligence</a>
            <a href={`${import.meta.env.BASE_URL}studios/start`} className="hidden hover:text-black/50 sm:inline-flex">← all routes</a>
          </div>
        </div>
      </header>

      <main className="w-full">
        <section className="grid border-b-2 border-black bg-[#ff6b4a] lg:grid-cols-[1.05fr_.95fr]">
          <div className="px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
            <p className="mb-5 max-w-xl text-[10px] font-bold uppercase tracking-[0.28em] text-black/60">local economic development · for municipalities, destinations + place-based organisations</p>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl lg:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              bringing the<br />economy to you<br />through culture.
            </h1>
            <p className="mt-7 max-w-2xl font-sans text-base leading-relaxed text-black/75 sm:text-lg">
              Every place already holds artists, spaces, knowledge, businesses, and relationships that create cultural value. Countercult builds discovery infrastructure and marketing that connect this value to the audiences, partners, commissions, and budgets local people want to reach.
            </p>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-black/70 sm:text-base">
              The goal is not automatically more visitors. A place might want stronger local demand, institutional partners, commissions, funding, or new audiences. Shona uses their own practice as Countercult's first test site, then we validate approaches with artists, spaces, and local partners in the Network before adapting them to a place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a data-testid="link-start-place-brief" href="#client-fit" className="border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black">start a place brief ↓</a>
              <a data-testid="link-anceu-case-study" href="#anceu-case" className="border-2 border-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-white">see a place case study ↘</a>
            </div>
          </div>
          <div className="relative min-h-[300px] overflow-hidden border-t-2 border-black lg:min-h-full lg:border-l-2 lg:border-t-0">
            <img
              src="/images/rural-hackers-mural-workshop.webp"
              alt="People taking part in an artist-led mural workshop in Anceu, Galicia"
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        </section>

        <section className="border-b-2 border-black px-4 py-12 sm:px-8 sm:py-16" aria-labelledby="place-services-heading">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">what you can hire us to do</p>
              <h2 id="place-services-heading" className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>make what is here<br />easier to find.</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-black/65 sm:text-base">
              A place does not need an outside story imposed on it or more visitors by default. It needs infrastructure and marketing that help existing culture reach the people local partners actually want to connect with.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {services.map(({ number, icon: Icon, title, copy }) => (
              <article key={number} data-testid={`card-place-service-${number}`} className="border-2 border-black bg-white p-5 sm:p-7">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-black/40">{number}</span>
                  <Icon className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
                </div>
                <h3 className="mt-10 text-2xl font-black uppercase leading-[0.9] tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-black/65">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="anceu-case" className="border-b-2 border-black bg-[#f3f2ed]" aria-labelledby="anceu-case-heading">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-16">
            <div className="overflow-hidden border-2 border-black bg-black shadow-[8px_8px_0_#c6ff3d]">
              <img
                src="/images/rural-hackers-mural-detail.webp"
                alt="Detail of the Rural Hackers mural in Anceu, Galicia"
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">one example / Anceu · Galicia</p>
              <h2 id="anceu-case-heading" className="max-w-3xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                start with<br />what is<br />already there.
              </h2>
              <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-black/70 sm:text-lg">
                Countercult worked with Rural Hackers, Anceu Coliving, and local partners to document the culture and relationships already shaping the region. After the first place-based pilot, the WordPress community paid Countercult to return and build a public case study with local partners.
              </p>
              <p className="mt-5 max-w-2xl border-l-2 border-black pl-4 text-base font-bold leading-relaxed sm:text-lg">
                This is evidence of a paid follow-on and a public cultural record, not measured visitor spending or wider economic impact.
              </p>
              <a data-testid="link-read-anceu-case-study" href="/journal/preserving-the-unpreserved/" className="mt-8 inline-flex border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">read the Anceu case study →</a>
            </div>
          </div>
        </section>

        <StudiosClientFit
          route="place"
          href="/studios/brief?route=place#brief"
          label="start a place brief"
          onClick={() => trackBookingCta("qualified_brief")}
        />
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}