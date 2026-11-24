import { useEffect } from "react";
import { Archive, ArrowRight, Building2, HeartHandshake, MapPin, Sparkles, UsersRound } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { SHONA_PERSON_JSON_LD } from "@/config/siteIdentity";
import { StudiosProofStats } from "@/components/StudiosProofStats";
import { StudiosCircularEconomy } from "@/components/StudiosCircularEconomy";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";
import { trackEvent } from "@/lib/analytics";

const waysOfWorking = [
  {
    number: "01",
    icon: MapPin,
    title: "map what is already here",
    description: "make the artists, spaces, operators, and cultural practices shaping a place easier to find, understand, and work with.",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "find and contract local people",
    description: "source and contract credible artists, hosts, makers, venues, and connectors for commissions, programmes, and visitor work.",
  },
  {
    number: "03",
    icon: HeartHandshake,
    title: "create places people return to",
    description: "connect local culture to existing budgets and demand across tourism, experiences, brands, public investment, and place programmes, including landmarks with a reason to revisit.",
  },
  {
    number: "04",
    icon: Building2,
    title: "leave a working record",
    description: "leave a public cultural archive and working network that keeps helping the place find people, build programmes, and route value locally.",
  },
];

const funderOutcomes = [
  {
    number: "01",
    icon: MapPin,
    title: "make it findable",
    description: "public place pages, maps, and cultural records that let people reach what already matters.",
  },
  {
    number: "02",
    icon: HeartHandshake,
    title: "pay the people",
    description: "commissions, research, and delivery roles for the artists and local operators carrying the work.",
  },
  {
    number: "03",
    icon: Archive,
    title: "keep the record",
    description: "stories, films, archives, and documentation that do not disappear when a project ends.",
  },
  {
    number: "04",
    icon: Building2,
    title: "build the next step",
    description: "programmes and partnerships that turn one supported project into durable local value.",
  },
];

function FunderPage({ onTrack }: { onTrack: (placement: string) => void }) {
  return (
    <div className="studios-route-page min-h-[100dvh] bg-[#F9F9F6] text-black lowercase selection:bg-[#c6ff3d] selection:text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult / studios / funders</span>
          </a>
          <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.16em]">
            <WorkWithUsMenu />
            <a href="/studios/tourism" className="hover:text-black/50">tourism + experiences</a>
            <a href={`${import.meta.env.BASE_URL}studios/start`} className="hover:text-black/50">← all routes</a>
          </div>
        </div>
      </header>

       <main className="w-full">
        <section className="relative isolate overflow-hidden border-b-2 border-black bg-black text-white">
          <div className="grid gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-20 lg:py-24">
            <div>
              <p className="mb-5 max-w-xl font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#c6ff3d]">
                for foundations · philanthropists · place funders
              </p>
              <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.83] tracking-[-0.08em] sm:text-8xl lg:text-[8.5rem]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                archive culture.<br />fund its future.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
                Philanthropy can help culture survive long enough to be found, practiced, paid for, and passed on. Countercult documents the artists, places, and practices already making a life, then helps fund the next chapter.
              </p>
              <a
                 href="/studios/brief#brief"
                onClick={() => onTrack("funder_hero")}
                className="group mt-8 inline-flex items-center gap-4 border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white"
              >
                start a funding brief
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="relative">
              <img
                src="/images/rural-hackers-mural-workshop.webp"
                alt="A group of people taking part in an artist-led workshop inside a mural-covered space"
                className="aspect-[4/5] w-full border-2 border-[#c6ff3d] object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-[#c6ff3d] p-4 text-black sm:bottom-6 sm:left-6 sm:right-6 sm:p-6">
                 <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]">rural hackers / anceu, galicia</p>
                <p className="mt-3 text-3xl font-black uppercase leading-[0.86] tracking-[-0.06em] sm:text-5xl">
                   fund the people<br />who keep a place<br />alive.
                </p>
              </div>
            </div>
          </div>
        </section>

        <StudiosProofStats tone="lime" variant="funders" />

        <section className="grid gap-8 border-b-2 border-black bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em]">the better question</p>
            <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              archive what<br />is here.<br />keep it<br />alive.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
            A good cultural fund does more than pay for a moment. It makes living culture findable, gives local knowledge a public life, pays the people doing the work, and leaves an archive that can keep working.
          </p>
        </section>

        <section className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:gap-16">
            <div>
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">what your funding can change</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl">
                leave more<br />than a report.
              </h2>
              <img
                src="/images/rural-hackers-mural-detail.webp"
                alt="Detail of a large artist-painted mural depicting a landscape and people"
                className="mt-8 aspect-[4/3] w-full border-2 border-black object-cover grayscale-[20%]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {funderOutcomes.map(({ number, icon: Icon, title, description }) => (
                <article key={number} className="group border-2 border-black bg-white p-5 transition-colors hover:bg-black hover:text-white sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] font-bold text-black/40 group-hover:text-[#c6ff3d]">{number}</span>
                    <Icon className="h-8 w-8 stroke-[1.5] group-hover:text-[#c6ff3d]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-12 text-3xl font-black uppercase leading-[0.86] tracking-[-0.05em]">{title}</h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-black/60 group-hover:text-white/65">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">next step</p>
            <h2 className="text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              fund the<br />archive.<br />keep culture<br />alive.
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">
              Tell us what culture you want to keep in the world, who knows the story, and what continuation would look like. No perfect brief needed.
            </p>
            <a
              href="/studios/brief#brief"
              onClick={() => onTrack("funder_closing")}
              className="group mt-8 inline-flex items-center gap-4 border-2 border-black bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black"
            >
              start the conversation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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

export default function StudiosPlaces() {
  const isFunder = new URLSearchParams(window.location.search).get("audience") === "funder";

  function trackBookingCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: isFunder ? "/studios/places?audience=funder" : "/studios/places",
      placement,
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    const scriptId = "countercult-places-jsonld";
    let script = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": "https://countercult.network/studios/places#service",
       name: "Countercult Studios for places, destinations, and funders",
        serviceType: [
          "Public place pages",
          "Cultural mapping and archiving",
          "Artist-led programming",
          "Economic development through culture",
           "Place-based landmark creation",
        ],
       description:
         "Countercult helps places make existing local culture easier to find, experience, and support through public place pages, cultural mapping, artist-led programmes, commissions, and long-term stewardship.",
      provider: { "@id": "https://countercult.network/#organization" },
      areaServed: ["Berlin, Germany", "New York City, United States", "Philadelphia, Pennsylvania, United States", "EU-US cross-border briefs"],
      audience: [
        { "@type": "Audience", audienceType: "Cities and rural places" },
        { "@type": "Audience", audienceType: "Tourism and place teams" },
        { "@type": "Audience", audienceType: "Philanthropists, foundations, and cultural funders" },
      ],
      providerMobility: "dynamic",
      employee: SHONA_PERSON_JSON_LD,
      url: "https://countercult.network/studios/places",
    });
    return () => script?.remove();
  }, []);

  if (isFunder) return <FunderPage onTrack={trackBookingCta} />;

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult / studios / {isFunder ? "funders" : "places"}</span>
          </a>
          <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.16em]">
            <WorkWithUsMenu />
            <a href={`${import.meta.env.BASE_URL}studios/start`} className="hover:text-black/50">← all routes</a>
          </div>
        </div>
      </header>

         <main className="w-full">
        <section className="grid gap-10 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:gap-20">
          <div>
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-black/45">
               route {isFunder ? "3 / funder or philanthropist" : "2 / place, destination, tourism, or development"}
            </p>
             <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.87] tracking-[-0.07em] sm:text-7xl lg:text-[7.2rem]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
               {isFunder ? <>save stories.<br />keep culture going.</> : <>the economy<br />is already here.</>}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-black/60 sm:text-lg">
              {isFunder
                ? "find the stories, artists, and places you want to keep. then help them keep going."
                   : "visitors are travelling, brands are spending, and governments and institutions are investing in places. countercult brings the infrastructure that connects that demand to the artists, spaces, and local operators already creating value."
              }
            </p>
          </div>
          <div className="border-2 border-black bg-[#c6ff3d] p-6 sm:p-8">
             {isFunder ? <Archive className="h-12 w-12 stroke-[1.5]" aria-hidden="true" /> : <Building2 className="h-12 w-12 stroke-[1.5]" aria-hidden="true" />}
            <p className="mt-8 text-3xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                 {isFunder ? <>make the past<br />useful now.</> : <>connect culture<br />to demand.</>}
            </p>
          </div>
        </section>

         <StudiosProofStats tone="lime" variant="commercial" />

        {isFunder && (
          <section className="grid gap-8 border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">the archive question</p>
              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                what should still be here in ten years?
              </h2>
            </div>
            <p className="max-w-2xl font-sans text-base leading-relaxed text-white/70">
              an archive can be a story, a film, a place, or a project. we help you find what matters and the people who can make it.
            </p>
          </section>
        )}

        <section className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mb-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-16">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">what we deliver</p>
              <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>we bring the<br />missing<br />infrastructure.</h2>
            </div>
             <p className="max-w-2xl font-sans text-base leading-relaxed text-black/65 sm:text-lg">
              you do not need another strategy to own. we bring the infrastructure that connects existing demand to the artists, spaces, and local operators already shaping the place. then we help deliver the work and leave a public cultural archive and working network behind.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {waysOfWorking.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="border-2 border-black bg-white p-6 transition-colors hover:bg-[#c6ff3d] sm:p-8">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-black/40">{number}</span>
                  <Icon className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
                </div>
                <h3 className="mt-10 text-2xl font-black uppercase leading-none tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                 <p className="mt-4 font-sans text-sm leading-relaxed text-black/60">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {!isFunder && <StudiosCircularEconomy />}

        {!isFunder && (
          <section className="border-b-2 border-black bg-[#f3f2ed]" aria-labelledby="floor-case-study-heading">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
              <a
                href="/journal/pink-spy-the-floor-art-residency/"
                className="group block overflow-hidden border-2 border-black bg-black shadow-[8px_8px_0_#c6ff3d]"
                aria-label="Read the Pink Spy and The Floor case study"
              >
                <img
                  src="/journal/pink-spy-the-floor-art-residency/assets/01-pink-spy-presents.jpg"
                  alt="Pink Spy presenting their visual diary of The Floor art residency"
                  className="aspect-[4/3] w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                  loading="lazy"
                />
              </a>
              <div>
                <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">case study / THE FLOOR · Berlin</p>
                <h2 id="floor-case-study-heading" className="max-w-3xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                  start small.<br />build outward.
                </h2>
                 <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-black/70 sm:text-lg">
                  Two interns arrived fully funded by a Latvian public programme. Countercult and THE FLOOR provided the place, projects, network, supervision, and cultural context. They lived with artists, contributed to exhibitions, entered Berlin&apos;s local cultural life, and documented what happened.
                </p>
                <div className="mt-8 grid gap-px border-2 border-black bg-black sm:grid-cols-2">
                  {[
                    ["micro", "two paid interns gained experience, relationships, and a real way into a city."],
                    ["place", "THE FLOOR gained residents, contributors, projects, and more activity."],
                    ["network", "artists, studios, exhibitions, shops, and local operators became connected through participation."],
                    ["macro", "the same infrastructure can help public funding create wider local value across places."],
                  ].map(([label, copy]) => (
                    <div key={label} className="bg-white p-4 sm:p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">{label}</p>
                       <p className="mt-3 font-sans text-sm leading-relaxed text-black/70">{copy}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 max-w-xl border-l-2 border-black pl-4 text-lg font-bold leading-tight">
                  this is the case for cultural infrastructure: prove the loop at human scale, then repeat and adapt it across places.
                </p>
                <a
                  href="/journal/pink-spy-the-floor-art-residency/"
                  className="mt-7 inline-flex border-2 border-black bg-black px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black"
                >
                  read the case study →
                </a>
              </div>
            </div>
          </section>
        )}

        {!isFunder && (
          <section className="grid gap-8 border-b-2 border-black bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">pilot frame / Galicia</p>
              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                artists draw<br />curiosity.
              </h2>
            </div>
            <div>
               <p className="max-w-2xl font-sans text-base leading-relaxed text-black/70">
                Artists give people a reason to notice a place, arrive, participate, stay, and return. A Galicia pilot can connect local artists, spaces, and operators to visitors, local communities, public investment, and place partners, then leave a public cultural archive and working network behind.
              </p>
            </div>
          </section>
        )}

         {!isFunder && (
           <section className="grid gap-8 border-b-2 border-black bg-[#f3f2ed] px-4 py-12 text-black sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
               <div className="mb-4 flex items-center gap-3">
                 <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-[#c6ff3d]" aria-hidden="true">
                   <Sparkles className="h-4 w-4" strokeWidth={2} />
                 </span>
                 <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/50">live proof / Berlin</p>
               </div>
               <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                test the experience ourselves.
              </h2>
            </div>
            <div>
                 <p className="max-w-2xl font-sans text-base leading-relaxed text-black/65">
                Shona Neary is testing two artist-led Berlin experiences through GetYourGuide. It is a live example of how local knowledge, art practice, storytelling, product design, and delivery can become one public experience.
              </p>
               <a href="/journal/sketchy-shona-getyourguide/" className="mt-7 inline-flex border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">read the public experiment →</a>
            </div>
          </section>
        )}

        <section className="grid gap-8 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">next step</p>
            <h2 className="text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              {isFunder ? <>make the<br />archive useful.</> : <>tell us<br />your idea.</>}
            </h2>
          </div>
          <div>
              <p className="max-w-2xl font-sans text-base leading-relaxed text-black/65">
              {isFunder
                ? "tell us what you want to save and who knows the story. no perfect brief needed."
                   : "represent a place, destination, institution, or development? work with Countercult to connect existing demand to local culture, deliver the work, and leave more value circulating through the place."
              }
            </p>
             <a href={isFunder ? "/studios/brief#brief" : "/studios/places"} onClick={isFunder ? () => trackBookingCta("closing") : undefined} className="mt-8 inline-flex border-2 border-black bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">
               {isFunder ? "start the conversation ↓" : "explore Studios for Places →"}
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