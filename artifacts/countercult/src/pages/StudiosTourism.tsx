import { useEffect } from "react";
import { Archive, BarChart3, Briefcase, ClipboardList, MapPin, RefreshCw, Sparkles, UsersRound } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { Marquee } from "@/components/Marquee";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";
import { trackEvent } from "@/lib/analytics";

const workGroups = [
  {
    number: "01",
    title: "understand the place",
    copy: "local context, operator knowledge, and a brief grounded in the place.",
    items: [
      {
        icon: MapPin,
        title: "local cultural research",
        copy: "understand the local context, including what should be shared and who should lead.",
      },
      {
        icon: UsersRound,
        title: "operator discovery + curation",
        copy: "find the artists, hosts, makers, venues, and connectors a platform or destination would not find through a normal search.",
      },
    ],
  },
  {
    number: "02",
    title: "build the cultural record",
    copy: "map it, archive it, and create a foundation that outlasts one campaign.",
    items: [
      {
        icon: Archive,
        title: "branded map + archive",
        copy: "build a place map and cultural archive you can publish under your own identity.",
      },
      {
        icon: Briefcase,
        title: "paid commissions",
        copy: "pay local people for defined roles, real work, and useful expertise.",
      },
    ],
  },
  {
    number: "03",
    title: "create public value",
    copy: "turn local context into reasons to visit, participate, stay, and spend.",
    items: [
      {
        icon: Sparkles,
        title: "campaign strategy",
        copy: "turn local context into a campaign people can understand and act on.",
      },
      {
        icon: ClipboardList,
        title: "experience production",
        copy: "shape niche local operators into experiences with consent, context, a clear production plan, and a reason for people to book.",
      },
    ],
  },
  {
    number: "04",
    title: "sustain + measure",
    copy: "leave the place with useful infrastructure, relationships, and evidence.",
    items: [
      {
        icon: RefreshCw,
        title: "cultural stewardship",
        copy: "keep the map, archive, and local relationships useful after the campaign ends.",
      },
      {
        icon: BarChart3,
        title: "useful measurement",
        copy: "measure local value, not just reach.",
      },
    ],
  },
];

const clients = [
  "experience marketplaces",
  "tourism boards",
  "destination teams",
  "cities + towns + rural places",
  "hospitality groups",
  "experiential agencies",
  "place partnerships",
];

const proofPoints = [
  {
    icon: MapPin,
    value: "1.4B",
    label: "international tourists travelled in 2024",
    source: "UN Tourism · 2024",
    href: "https://www.untourism.int/news/international-tourism-recovers-pre-pandemic-levels-in-2024",
  },
  {
    icon: UsersRound,
    value: "$1.6T",
    label: "in international tourism receipts in 2024",
    source: "UN Tourism · 2024",
    href: "https://www.untourism.int/news/international-tourism-recovers-pre-pandemic-levels-in-2024",
  },
  {
    icon: BarChart3,
    value: "$1.1K",
    label: "estimated average spend per international arrival",
    source: "UN Tourism · 2024",
    href: "https://www.untourism.int/news/international-tourism-recovers-pre-pandemic-levels-in-2024",
  },
];

export default function StudiosTourism() {
  function trackBookingCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: "/studios/tourism",
      placement,
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="studios-route-page min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult / studios / tourism</span>
          </a>
          <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.16em]">
            <WorkWithUsMenu />
            <a href={`${import.meta.env.BASE_URL}studios/start`} className="hover:text-black/50">← all routes</a>
          </div>
        </div>
      </header>

      <Marquee
        text="we work with cities · towns · rural areas · we work globally · we travel · "
        speed={30}
        className="bg-black !text-[#c6ff3d] !border-black py-2 text-[10px]"
      />

      <main className="w-full">
        <section className="relative isolate min-h-[560px] overflow-hidden border-b-2 border-black bg-black text-white">
          <img
            src="/images/rural-hackers-mural-workshop.webp"
            alt="artists and visitors inside the Rural Hackers mural project in Anceu, Galicia"
            loading="eager"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden="true" />
          <div className="relative flex min-h-[560px] items-end px-4 py-14 sm:px-8 sm:py-20">
            <div className="max-w-5xl">
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c6ff3d]">tourism platforms, destination teams, and places that need stronger local value</p>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">founder-led between Berlin + New York · working internationally</p>
              <h1 className="max-w-6xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.7rem]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                 make the place<br />worth coming<br />for.
              </h1>
               <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                    we help destinations turn culture into economic development by building experiences people want to visit, book, and remember, while supporting the people carrying it and the infrastructure that makes local value last.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/studios/brief?route=tourism#brief" onClick={() => trackBookingCta("hero")} className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:border-white hover:bg-white">start a place project ↓</a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black px-4 py-10 sm:px-8 sm:py-12">
          <div className="mb-6 flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/45">the opportunity</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>tourism is already moving.</h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-relaxed text-black/55 sm:block">the question is where attention goes next.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {proofPoints.map(({ icon: Icon, value, label, source, href }) => (
              <div key={value} className="border-2 border-black bg-[#c6ff3d] p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-4xl font-black leading-none tracking-[-0.06em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{value}</p>
                  <Icon className="h-7 w-7 shrink-0 stroke-[1.5]" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-bold uppercase leading-tight">{label}</p>
                <a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-block text-[9px] font-bold uppercase tracking-[0.1em] underline underline-offset-4">{source} ↗</a>
              </div>
            ))}
          </div>
           <div className="mt-8 grid gap-4 border-2 border-black bg-[#c6ff3d] p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-7">
             <div>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em]">read the thinking</p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/70">Countercult's developing media publication brings together stories, features, curation, field guides, and case studies about open infrastructure, tourism, and the value left after a campaign.</p>
             </div>
             <div className="flex flex-wrap content-start gap-x-5 gap-y-3">
               <a href="/journal/open-cultural-infrastructure-is-economic-infrastructure/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">open cultural infrastructure →</a>
               <a href="/journal/the-better-way-to-buy-culture-is-through-a-contract/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">buy culture through a contract →</a>
               <a href="/journal/tourism-is-a-cultural-infrastructure-question/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">tourism as cultural infrastructure →</a>
                <a href="/journal/tourism-campaigns-under-traveled-areas/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">campaigns for under-traveled areas →</a>
                <a href="/journal/under-visited-places-cultural-tourism/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">working with under-visited places →</a>
                <a href="/rural-economic-development/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">rural places and local value →</a>
                <a href="/journal/preserving-the-unpreserved/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">the Anceu rural case →</a>
               <a href="/journal/the-campaign-is-not-the-product/" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-white">the campaign is not the product →</a>
             </div>
           </div>
        </section>

        <section id="work" className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
               <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">what we deliver</p>
                <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>research,<br />curation,<br />delivery.</h2>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">research, curation, production, and stewardship for place-led work.</p>
            </div>
                <a href={`${import.meta.env.BASE_URL}studios`} className="hidden text-[10px] font-bold uppercase tracking-[0.15em] underline decoration-2 underline-offset-4 sm:block">see all Studios services →</a>
          </div>
           <div className="border-y-2 border-black">
             {workGroups.map(({ number, title, copy, items }) => (
               <section key={number} className="border-b-2 border-black last:border-b-0">
                 <div className="grid gap-3 bg-[#c6ff3d] px-4 py-4 sm:grid-cols-[3rem_1fr_1.25fr] sm:items-center sm:gap-8">
                   <span className="text-[10px] font-bold text-black/45">{number}</span>
                   <h3 className="text-lg font-black uppercase leading-none tracking-[-0.04em] sm:text-xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                   <p className="max-w-xl text-xs leading-relaxed text-black/65 sm:text-sm">{copy}</p>
                 </div>
                 <div className="divide-y divide-black/35">
                   {items.map(({ icon: Icon, title: itemTitle, copy: itemCopy }) => (
                     <div key={itemTitle} className="grid gap-4 px-4 py-5 transition-colors hover:bg-[#c6ff3d] sm:grid-cols-[3rem_1fr_1.25fr] sm:items-center sm:gap-8 sm:py-6">
                       <Icon className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />
                       <h4 className="text-xl font-black uppercase leading-none tracking-[-0.04em] sm:text-2xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{itemTitle}</h4>
                       <p className="max-w-xl text-sm leading-relaxed text-black/60">{itemCopy}</p>
                     </div>
                   ))}
                 </div>
               </section>
             ))}
          </div>
        </section>

         <section className="border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16">
           <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
             <div>
               <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c6ff3d]">local operator sourcing</p>
               <h2 className="max-w-2xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                 find the people<br />your destination<br />is missing.
               </h2>
             </div>
             <div>
               <p className="max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                 artists, makers, hosts, and spaces, found, prepared, and paid for real visitor work.
               </p>
               <div className="mt-7 grid gap-3 border-y border-white/25 py-4 sm:grid-cols-3">
                 {[
                   ["01", "find", "local people beyond the usual search"],
                   ["02", "shape", "a clear, bookable offer"],
                   ["03", "launch", "with the right support around it"],
                 ].map(([number, title, copy]) => (
                   <div key={number} className="border-l border-white/25 pl-3 first:border-l-0 first:pl-0">
                     <p className="text-[9px] font-bold tracking-[0.16em] text-[#c6ff3d]">{number}</p>
                     <p className="mt-2 text-sm font-black uppercase">{title}</p>
                     <p className="mt-1 max-w-[13rem] text-[11px] leading-relaxed text-white/55">{copy}</p>
                   </div>
                 ))}
               </div>
               <a href="/studios/brief?route=tourism#brief" onClick={() => trackBookingCta("operator_sourcing")} className="mt-7 inline-block border-2 border-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">build a local operator brief →</a>
                <a href="/explore?action=join&intent=network" className="mt-4 inline-block text-[10px] font-bold uppercase tracking-[0.14em] text-white underline underline-offset-4 hover:text-[#c6ff3d]">apply for a free curated operator profile →</a>
             </div>
           </div>
         </section>

        <section className="grid gap-8 border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
             <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c6ff3d]">not just another destination campaign</p>
            <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
               the campaign<br />is the beginning.
            </h2>
          </div>
          <div>
              <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
               tourism is competitive. the creative opportunity is to make the right places and people easier to find without flattening the culture or extracting the story. the campaign gets attention; the archive, paid relationships, and local knowledge help the work continue.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {clients.map((client) => (
                <span key={client} className="border border-white/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">{client}</span>
              ))}
            </div>
            <p className="mt-7 max-w-2xl border-l-2 border-[#c6ff3d] pl-4 text-sm leading-relaxed text-white/80">
              local context comes before campaign language. people are paid for their contribution, stories are used with consent, and local value is part of the brief.
            </p>
          </div>
        </section>

        <section className="grid gap-4 border-b-2 border-black bg-white px-4 py-12 sm:grid-cols-2 sm:px-8 sm:py-16">
          <div className="border-2 border-black p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">founder experience</p>
            <p className="mt-6 text-3xl font-black uppercase leading-[0.9] tracking-[-0.05em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>over a decade<br />in experiential +<br />tourism work.</p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-black/60"><a href="/shona-neary-portfolio/" className="font-bold text-black underline underline-offset-4">Shona Neary</a> brings first-hand experience across experiential campaigns, tourism, art, fashion, culture, and design, with work for Fendi, New York Fashion Week, MoMA, Ann Taylor, Sunday Natural, Tommy Hilfiger, and venture-backed startups.</p>
          </div>
          <div className="border-2 border-black bg-black p-6 text-white sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">live product test</p>
            <p className="mt-6 text-3xl font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#c6ff3d]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>Shona is<br />testing the<br />market too.</p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/70">Shona is testing artist-led Berlin experiences as a GetYourGuide supplier.</p>
            <a href="/journal/sketchy-shona-getyourguide/" className="mt-6 inline-block text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] underline decoration-2 underline-offset-4">read the live test →</a>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">before we start</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
             have a place,<br />tourism, or<br />economic-development brief?
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-black/70">
             send the place, stakeholders, problem, and desired outcome.
          </p>
          <a href="/studios/brief?route=tourism#brief" onClick={() => trackBookingCta("closing")} className="mt-8 inline-flex border-2 border-black bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black">start the conversation ↓</a>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}