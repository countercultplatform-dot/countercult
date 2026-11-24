import { useEffect } from "react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { trackEvent } from "@/lib/analytics";

type RouteChoice = {
  number: string;
  title: string;
  href?: string;
  comingSoon?: boolean;
};

const routes: RouteChoice[] = [
  {
    number: "01",
    title: "Paid projects + experiences",
    href: `${import.meta.env.BASE_URL}studios/for-you`,
  },
  {
    number: "02",
    title: "Join the fintech building local circular economies",
    href: `${import.meta.env.BASE_URL}fund`,
  },
  {
    number: "03",
    title: "Develop place-based economic infrastructure through culture",
    href: `${import.meta.env.BASE_URL}studios`,
  },
];

const caseStudies = [
  {
    number: "01",
    label: "guest curation + production / Berlin",
    title: "Most Wanted: Music",
    href: "https://countercultcreatives.com/2026/01/10/case-study-most-wanted-music/",
    image: "/images/case-studies/most-wanted-music.jpg",
    external: true,
  },
  {
    number: "02",
    label: "curation workshops / Berlin",
    title: "Zalando Pride",
    href: "https://countercultcreatives.com/2026/01/13/case-study-most-wanted-music-2/",
    image: "/images/case-studies/zalando-pride.jpg",
    external: true,
  },
  {
    number: "03",
    label: "creative curation + production / Berlin",
    title: "AVOMIND + StickerApp",
    href: "https://countercultcreatives.com/2026/01/12/case-study-creative-market/",
    image: "/images/case-studies/avomind-stickerapp.jpg",
    external: true,
  },
  {
    number: "04",
    label: "creative technology exchange / Berlin + New York",
    title: "The Delta",
    href: "/journal/creative-tech-collaboration-cultural-intelligence/",
  },
  {
    number: "05",
    label: "curation + production + PR / Berlin",
    title: "Klunkerkranich",
    href: "/journal/klunkerkranich-countercult-paid-cultural-curation/",
    image: "/images/klunkerkranich-event-og.jpg",
  },
  {
    number: "06",
    label: "field record / Galicia",
    title: "Rural Hackers + Anceu",
    href: "https://countercultcreatives.com/2025/11/20/el-arte-de-la-conexion/",
    image: "/images/rural-hackers-mural-workshop.webp",
    external: true,
  },
];

const supporters = [
  { label: "European Social Fund+", href: "https://european-social-fund-plus.ec.europa.eu/" },
  { label: "Berlin Senate", href: "https://www.berlin.de/sen/kultur/en/" },
  { label: "WordPress / Pontevedra", href: "https://wppontevedra.org/" },
  { label: "WISE Music Conference", href: "https://www.wisenotwise.com/" },
  { label: "StickerApp", href: "https://stickerapp.com/" },
  { label: "The Delta Campus", href: "https://thedelta.io/" },
  { label: "Grace Accelerator", href: "https://www.grace-accelerator.de/alumnae/alumnareader/shona-neary.html" },
  { label: "Lynk & Co", href: "https://www.lynkco.com/" },
  { label: "Rural Hackers", href: "https://ruralhackers.com/" },
  { label: "Anceu", href: "https://anceu.com/" },
];

export default function StudiosSelector() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const routeCardContent = (route: RouteChoice) => (
    <>
      {route.comingSoon && (
        <span className="absolute right-5 top-4 z-10 -rotate-[8deg] border border-black bg-[#3155e7] px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white sm:text-[9px]">
          coming soon
        </span>
      )}
      <div className="flex h-full min-h-[240px] flex-col items-start sm:min-h-[280px]">
        <div className="flex w-full items-center gap-3 font-mono text-[8px] uppercase tracking-[0.13em] text-black/50">
          <span>{route.number}</span>
          <span className="h-px flex-1 bg-black/15" />
        </div>
        <h2 className="studios-route-choice-title mt-12 max-w-[16ch] text-[clamp(1.65rem,2.5vw,2.3rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
          {route.title}
        </h2>
        {!route.comingSoon && (
          <span className="mt-auto inline-flex items-center gap-2 border-b border-black/40 pt-8 font-mono text-[8px] font-bold uppercase tracking-[0.12em] transition-colors group-hover:border-black group-hover:text-black sm:text-[9px]">
            {route.number === "01" ? "work with Studios" : route.number === "02" ? "see the Fund" : "explore Countercult Studios"}
            <span className="text-sm leading-none transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
          </span>
        )}
        {route.comingSoon && route.href && (
          <span className="mt-auto inline-flex items-center gap-2 border-b border-black/40 pt-8 font-mono text-[8px] font-bold uppercase tracking-[0.12em] transition-colors group-hover:border-black group-hover:text-black sm:text-[9px]">
            read the Anceu case study
            <span className="text-sm leading-none transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
          </span>
        )}
      </div>
    </>
  );

  const renderRouteCard = (route: RouteChoice) => {
    const cardClassName = "studios-route-card group relative isolate block h-full border border-black/15 bg-white p-7 text-left transition-[border-color,transform,box-shadow] duration-200 sm:p-8";
    if (!route.href) {
      return (
        <div
          key={route.number}
          role="group"
          aria-label={`${route.title}, coming soon`}
          aria-disabled="true"
          className={`${cardClassName} cursor-default`}
        >
          {routeCardContent(route)}
        </div>
      );
    }

    return (
    <a
      key={route.number}
      href={route.href}
      aria-label={route.comingSoon
        ? `${route.title}, coming soon. Read the Anceu case study in the Countercult Journal.`
        : route.title}
      data-testid={`link-studios-route-${route.number}`}
      onClick={() => trackEvent("studios_route_selected", {
        route_number: route.number,
        route_title: route.title,
        route_kind: route.comingSoon ? "case_study" : "buyer",
      })}
      className={`${cardClassName} cursor-pointer hover:-translate-y-0.5 hover:border-black hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3155e7] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none`}
    >
      {routeCardContent(route)}
    </a>
    );
  };

  return (
    <div className="studios-selector-page flex min-h-[100dvh] flex-col bg-[#F9F9F6] text-black lowercase selection:bg-[#c6ff3d] selection:text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
       <main className="w-full flex-1">
          <section className="border-b-2 border-black bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12" aria-labelledby="studios-selector-title">
            <div className="mx-auto max-w-7xl">
              <div className="studios-selector-intro mb-8 border-b border-black/15 pb-6 sm:mb-10 sm:pb-8">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-black/50">countercult studios / work with us</p>
                <h1 id="studios-selector-title" className="mt-2 text-[clamp(2.6rem,6vw,5.5rem)] font-black uppercase leading-[0.86] tracking-[-0.075em]">
                  work with Countercult
                </h1>
                <p className="mt-6 max-w-3xl text-sm leading-relaxed text-black/70 sm:text-base">
                  Countercult is a fintech and culture-tech company building open cultural and economic infrastructure that connects local knowledge, technology, business activity, and place.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3 md:gap-6 lg:gap-8">
                {routes.map(renderRouteCard)}
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-black/15 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.1em]">
                <a className="underline underline-offset-4 hover:no-underline" href={`${import.meta.env.BASE_URL}model`}>how the Countercult model works ↗</a>
                <a className="underline underline-offset-4 hover:no-underline" href={`${import.meta.env.BASE_URL}journal/artist-founded-culture-tech-infrastructure/`}>Countercult as culture technology ↗</a>
              </div>
            </div>
          </section>

          <section className="overflow-hidden border-b-2 border-black bg-[#c6ff3d] py-5 text-black" aria-label="Clients and supporters">
           <div className="countercult-voices-marquee flex w-max items-center gap-5 whitespace-nowrap">
             {[...supporters, ...supporters].map((supporter, index) => (
               <span key={`${supporter.label}-${index}`} className="flex items-center gap-5">
                 <a
                   href={supporter.href}
                   target="_blank"
                   rel="noreferrer"
                   className="text-[10px] font-black uppercase tracking-[0.12em] underline decoration-1 underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black sm:text-xs"
                 >
                   {supporter.label}
                 </a>
                 <span className="text-sm font-black" aria-hidden="true">✳</span>
               </span>
             ))}
           </div>
         </section>

          <section className="border-b-2 border-black bg-black px-6 py-14 text-white sm:px-12 sm:py-18 lg:px-20 lg:py-20" aria-labelledby="selected-work">
           <div className="mb-5">
             <h2 id="selected-work" className="text-3xl font-black uppercase leading-none tracking-[-0.06em] sm:text-4xl">selected work</h2>
           </div>
           <div className="border-t-2 border-white/40">
             {caseStudies.map((caseStudy) => (
               <a
                 key={caseStudy.title}
                 href={caseStudy.href}
                  target={caseStudy.external ? "_blank" : undefined}
                  rel={caseStudy.external ? "noreferrer" : undefined}
                 onClick={() => trackEvent("studios_case_study_clicked", {
                   case_study: caseStudy.title,
                   source_route: "/studios/start",
                 })}
                   className="group flex items-center gap-3 border-b-2 border-white/40 py-7 transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] sm:gap-5 sm:py-8"
               >
                 <span className="w-8 shrink-0 text-xs font-black tracking-[0.12em] text-white/45 transition-colors group-hover:text-black/45">{caseStudy.number}</span>
                 {caseStudy.image ? <img src={caseStudy.image} alt="" className="h-14 w-20 shrink-0 object-cover sm:h-16 sm:w-24" /> : null}
                 <div className="min-w-0 flex-1">
                   <h3 className="text-base font-black uppercase leading-none tracking-[-0.05em] sm:text-xl">{caseStudy.title}</h3>
                   <p className="mt-2 text-[9px] font-black uppercase leading-tight tracking-[0.12em] text-white/45 transition-colors group-hover:text-black/45">{caseStudy.label}</p>
                 </div>
                 <span className="text-lg font-black" aria-hidden="true">↗</span>
               </a>
             ))}
           </div>
         </section>

          <section className="border-b-2 border-black bg-[#c6ff3d] px-6 py-14 sm:px-12 sm:py-18 lg:px-20 lg:py-20" aria-labelledby="direct-links">
            <div className="mx-auto max-w-6xl">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">direct links</p>
              <h2 id="direct-links" className="max-w-3xl text-3xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                the director behind the work.
              </h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <a
                  href="https://countercult.network/shona-neary-portfolio/"
                  className="group border-2 border-black bg-white p-5 transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  <span className="block text-xl font-black uppercase tracking-[-0.04em]">Shona Neary</span>
                  <span className="mt-3 block text-xs leading-relaxed text-black/65 group-hover:text-white/75">Professional portfolio, creative direction, product, technology, and direct work.</span>
                  <span className="mt-5 block text-[10px] font-bold uppercase tracking-[0.15em]">visit Shona Neary’s portfolio ↗</span>
                </a>
                <a
                  href="https://countercult.network/sketchyshona/"
                  className="group border-2 border-black bg-white p-5 transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  <span className="block text-xl font-black uppercase tracking-[-0.04em]">Sketchy Shona</span>
                  <span className="mt-3 block text-xs leading-relaxed text-black/65 group-hover:text-white/75">Artist archive, original work, public projects, and the wider practice.</span>
                  <span className="mt-5 block text-[10px] font-bold uppercase tracking-[0.15em]">visit the Sketchy Shona archive ↗</span>
                </a>
              </div>
            </div>
          </section>
      </main>

       <footer className="border-t-2 border-black bg-black px-6 py-6 text-white sm:px-12 lg:px-20">
         <ArchitectSignature className="text-white/35" />
      </footer>
    </div>
  );
}