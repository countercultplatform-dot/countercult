import { useEffect } from "react";
import { ArrowRight, Building2, ClipboardList, Compass, Handshake, MapPinned, Mail, UsersRound } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { trackEvent } from "@/lib/analytics";

const CONTACT_EMAIL = "countercultplatform@gmail.com";

const briefRoutes = [
  {
    icon: MapPinned,
    number: "01",
    title: "a place, destination, or institution",
    copy: "Make existing artists, spaces, local operators, and cultural practices easier to find, understand, and work with.",
    href: "/studios/brief?route=place#brief",
  },
  {
    icon: Compass,
    number: "02",
    title: "economic development through culture",
    copy: "Build the cultural and economic infrastructure around local knowledge, commissions, programmes, experiences, partnerships, and durable records.",
    href: "/studios/brief?route=place#brief",
  },
  {
    icon: ClipboardList,
    number: "03",
    title: "technology, product, or experience",
    copy: "Bring cultural context and local relationships into product questions, customer experience, creative direction, and production. Shape the work with the people who hold that context.",
    href: "/studios/brief?route=business#brief",
  },
  {
    icon: Handshake,
    number: "04",
    title: "a fund or public-interest programme",
    copy: "Support artists and local operators with a public record, paid work, and a next step that can continue after a single project.",
    href: "/studios/brief?route=funder#brief",
  },
];

const workingSequence = [
  ["01", "bring the question", "Tell us what decision, place, audience, programme, or partnership needs to become more grounded."],
  ["02", "show the context", "Share what is already known, who holds the relationships, what is sensitive, and what should not be flattened."],
   ["03", "make the route", "We can move from local cultural context into a place brief, commissions, programmes, experiences, or delivery."],
  ["04", "leave useful evidence", "The work can create a public record and working network, with claims kept precise about what has actually happened."],
];

export default function Partners() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Work With Countercult | Cultural + Economic Infrastructure";
  }, []);

  function trackPartnerCta(placement: string) {
    trackEvent("studios_cta_clicked", { source_route: "/partners", placement });
  }

  return (
    <div className="min-h-[100dvh] bg-[#f9f9f6] font-mono text-black selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#f9f9f6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">countercult / partnerships</span>
          </a>
          <nav className="hidden items-center gap-5 text-[10px] font-bold uppercase tracking-[0.15em] sm:flex">
            <a href="#routes" className="transition-colors hover:text-black/50">partnership routes</a>
            <a href="#method" className="transition-colors hover:text-black/50">how we work</a>
            <a href="#start" className="transition-colors hover:text-black/50">start</a>
          </nav>
          <a href="/" className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-black/50">← home</a>
        </div>
      </header>

      <main>
        <section className="border-b-2 border-black bg-[#ff6b4a]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-end lg:gap-20 lg:py-24">
            <div className="min-w-0">
              <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.28em] text-black/60">for places · institutions · technology teams · funders · local organisations</p>
              <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] sm:text-8xl lg:text-[clamp(3.5rem,6vw,6rem)]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                work with<br />Countercult.
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-relaxed text-black/75 sm:text-lg">
                Countercult builds cultural and economic infrastructure connecting local knowledge, technology, business activity, and place. The public Network supports discovery, the protected Exchange serves members, and Studios carries defined projects into paid delivery. A partnership can start with a place, a product question, or a longer-term local challenge.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#routes" onClick={() => trackPartnerCta("hero_routes")} className="border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-transform hover:-translate-y-1">find your route ↓</a>
                <a href={`mailto:${CONTACT_EMAIL}?subject=Countercult%20partner%20enquiry`} className="border-2 border-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-black hover:text-[#c6ff3d]">email the team</a>
              </div>
            </div>
            <div className="min-w-0 border-2 border-black bg-[#f9f9f6] p-5 sm:p-7">
              <Building2 className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-10 text-3xl font-black uppercase leading-[0.86] tracking-[-0.06em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>infrastructure<br />with local<br />context.</p>
               <p className="mt-6 border-t-2 border-black pt-4 text-sm leading-relaxed text-black/65">Software and strategy only matter when they work with the people, relationships, and responsibilities already shaping a place.</p>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-black text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">the proposition</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] text-[#c6ff3d] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>start with<br />what is<br />already here.</h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">A place does not need another invented identity. A technology team does not need local context reduced to a dataset. Countercult starts with the people, practices, spaces, and relationships already carrying meaning, then works with partners to connect that knowledge to decisions, paid work, and durable local value.</p>
          </div>
        </section>

        <section id="routes" className="scroll-mt-16 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:gap-20">
              <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">01 / choose a starting point</p>
                <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>four ways<br />to build<br />together.</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">The starting point depends on the system or place you are working with. Studios is one part of Countercult, carrying selected work into paid delivery. Other partnerships can focus on local intelligence, technology, funding, or the conditions for longer-term place work.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {briefRoutes.map(({ icon: Icon, number, title, copy, href }) => (
                <a key={number} href={href} onClick={() => trackPartnerCta(`route_${number}`)} className="group border-2 border-black bg-white p-5 transition-transform hover:-translate-y-1 hover:bg-[#c6ff3d] sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-bold text-black/40">{number}</span>
                    <Icon className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-12 max-w-md text-3xl font-black uppercase leading-[0.86] tracking-[-0.05em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-black/65">{copy}</p>
                   <span className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">explore this route <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="method" className="scroll-mt-16 border-b-2 border-black bg-[#c6ff3d] px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">02 / first conversation</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>bring the<br />context,<br />not polish.</h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-black/65">A perfect brief is not required. Useful context is.</p>
            </div>
            <div className="divide-y-2 divide-black border-y-2 border-black">
              {workingSequence.map(([number, title, copy]) => (
                <div key={number} className="grid gap-4 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-start sm:gap-6">
                  <p className="text-[10px] font-bold">{number}</p>
                  <h3 className="text-lg font-black uppercase leading-[0.9] tracking-[-0.03em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                  <p className="max-w-xl text-sm leading-relaxed text-black/65">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">03 / what can be in the room</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>the people<br />around<br />the work.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [UsersRound, "artists and cultural workers", "local artists, collectives, hosts, makers, and cultural practitioners who can shape and deliver the work"],
                [MapPinned, "spaces and local operators", "artist-run spaces, venues, independent businesses, destinations, and people with situated knowledge"],
                [Handshake, "institutions and agencies", "partners who need a cultural route through a public programme, commission, campaign, or place decision"],
                [Compass, "audiences and participants", "the residents, visitors, customers, and communities who give a project its real setting"],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof UsersRound;
                return (
                  <article key={title as string} className="border-2 border-black bg-[#f3f2ed] p-5 sm:p-6">
                    <ItemIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
                    <h3 className="mt-10 text-2xl font-black uppercase leading-[0.88] tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title as string}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-black/60">{copy as string}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="start" className="scroll-mt-16 border-b-2 border-black bg-black px-4 py-14 text-white sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">04 / next step</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] text-[#c6ff3d] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>send the<br />unfinished<br />version.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">Use the route that feels closest, or write directly. Share the place or organisation, the question, the people already involved, and what a useful outcome would make possible. If the idea is early, that is enough to begin a conversation.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/studios/brief" onClick={() => trackPartnerCta("closing_brief")} className="inline-flex items-center gap-3 border-2 border-[#c6ff3d] bg-[#c6ff3d] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white">start a Studios project <ArrowRight className="h-4 w-4" /></a>
                <a href={`mailto:${CONTACT_EMAIL}?subject=Countercult%20partner%20enquiry`} className="inline-flex items-center gap-3 border-2 border-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black"><Mail className="h-4 w-4" /> {CONTACT_EMAIL}</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <ArchitectSignature className="text-white/35" />
          <a href="/press" className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 transition-colors hover:text-[#c6ff3d]">for press →</a>
        </div>
      </footer>
    </div>
  );
}