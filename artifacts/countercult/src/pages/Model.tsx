import {
  ArrowUpRight,
  Briefcase,
  CircleDollarSign,
  MapPinned,
  Network,
  Route,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

const layers = [
  {
    number: "01",
    title: "The Network",
    icon: MapPinned,
    href: "/explore",
    linkLabel: "Explore the Network",
    text: "A consent-based public record of the artists, spaces, practices, and local operators already making a place distinctive.",
  },
  {
    number: "02",
    title: "Exchange",
    icon: UsersRound,
    href: "/residency",
    linkLabel: "Explore the Exchange",
    text: "Protected member participation for sharing rooms, spaces, opportunities, skills, and local knowledge.",
  },
  {
    number: "03",
    title: "Countercult Studios",
    icon: Briefcase,
    href: "/studios",
    linkLabel: "Work with Studios",
    text: "A distinct private commercial B2B service for local research, curation, commissions, programmes, experiences, and place partnerships.",
  },
  {
    number: "04",
    title: "Countercult Studios Fund",
    icon: CircleDollarSign,
    href: "/fund",
    linkLabel: "See the Fund infrastructure",
    text: "A client-held budget linked to selected sales or a defined programme. The client pays artists and Countercult Studios separately; automated fund holding or routing is exploratory.",
  },
] satisfies Array<{ number: string; title: string; icon: LucideIcon; href: string; linkLabel: string; text: string }>;

const routes = [
  ["Discover", "Find local culture through a maintained public layer."],
  ["Understand", "Add context, place knowledge, and responsible routes in."],
  ["Introduce", "Connect the right people to a brief, partner, or opportunity."],
  ["Commission", "Turn cultural value into paid work, programmes, and experiences."],
  ["Manage", "Carry briefs, delivery, reporting, and partnerships around real work."],
  ["Pay and measure", "Connect value to payment and outcomes without selling member data."],
] as const;

const visionPillars = [
  {
    title: "Creator technology",
    state: "7,000+ network members",
    text: "The open-source, AI-enabled Network connects creators, spaces, and local operators across every continent. Four hub contexts have been tested in Berlin, New York, Vietnam, and Spain.",
  },
  {
    title: "Cultural fintech",
    state: "Capital into paid work",
    text: "Studios and the client-held Fund connect business and place budgets to paid cultural work today. The client keeps the budget and pays artists and Studios directly; repeatable cross-city financial rails are the next layer.",
  },
  {
    title: "Tourism and property",
    state: "Physical places",
    text: "Pop-ups and local partnerships test how culture can build lasting local value. The long-term route carries that value into artist-led Art Houses and property, with the first investment an active expansion goal.",
  },
] as const;

export default function Model() {
  return (
    <main className="min-h-[100dvh] bg-[#f7f7f2] font-mono text-black">
      <header className="border-b border-black px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <a href="/" className="text-xs font-black uppercase tracking-[0.24em]">
            Countercult
          </a>
          <a href="/" className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/50 hover:text-black">
            Home
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <section className="border-b border-black pb-12 sm:pb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            The Countercult model
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-7xl">
            Post-AI data and financial infrastructure for local economic development.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
            The Network turns verified local cultural knowledge into intelligence for city capital, paid work, and artist-led places.
          </p>
        </section>

        <section className="border-b border-black py-12 sm:py-16" aria-labelledby="vision-heading">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            The larger system
          </p>
          <h2 id="vision-heading" className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            One local network, three connected layers.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-black/65">
            This is one system, not three separate services. Creator technology builds the verified data layer; cultural fintech connects public and commercial budgets to paid creative work; tourism and property carry that value into physical places.
          </p>
          <div className="mt-8 grid gap-px border border-black bg-black sm:grid-cols-2 lg:grid-cols-3">
            {visionPillars.map((pillar) => (
              <article key={pillar.title} className="bg-[#f7f7f2] p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">{pillar.state}</p>
                <h3 className="mt-3 text-lg font-black">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/65">{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-black py-12 sm:py-16" aria-labelledby="works-heading">
           <h2 id="works-heading" className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            What operates now
          </h2>
           <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65">
                The operating system is already real: an open-source public Network, a protected member Exchange, paid Studios projects, and a client-held Fund with direct payment. Together they connect discovery to delivery. The next build is a repeatable cross-city layer that can deploy capital and support physical property.
           </p>
          <ol className="mt-8 divide-y divide-black border-y border-black">
            {layers.map((layer) => (
              <li key={layer.number} className="grid gap-4 py-6 sm:grid-cols-[56px_180px_1fr] sm:gap-6">
                <span className="text-[10px] font-bold text-black/45">{layer.number}</span>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-black">
                    <layer.icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <h3 className="font-black">{layer.title}</h3>
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-black/65">{layer.text}</p>
                  <a
                    href={layer.href}
                    className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] underline decoration-1 underline-offset-4 hover:text-black/55"
                  >
                    {layer.linkLabel}
                    <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-black py-12 sm:py-16" aria-labelledby="physical-heading">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            Digital first, physical by design
          </p>
          <h2 id="physical-heading" className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            Digital intelligence, physical consequence.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70">
            Digital discovery matters when it changes where money and attention go: toward the artists, spaces, and local operators already shaping a place. Countercult connects local knowledge to real decisions, paid work, cultural programmes, and physical places, with the people involved setting the context and terms.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-black/65">
            Countercult publishes its Journal digitally. Founder Sketchy Shona’s separate Patron Post is a paid monthly field journal by mail that carries connected editorial work into physical form and supports the free Network. It is one expression of the wider practice, not a replacement for Countercult’s digital infrastructure.
          </p>
          <a
            href="/journal/patron-post-independent-cultural-journalism/"
            className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] underline decoration-1 underline-offset-4 hover:text-black/55"
          >
            Read about Patron Post
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
          </a>
        </section>

         <section className="border-b border-black py-12 sm:py-16" aria-labelledby="route-heading">
           <div className="flex items-start gap-4">
             <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-black">
               <Route aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
             </span>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
                 The operating route
               </p>
               <h2 id="route-heading" className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                   From cultural intelligence to local value.
               </h2>
             </div>
           </div>
           <ol className="mt-8 grid gap-px border border-black bg-black sm:grid-cols-2">
             {routes.map(([title, text], index) => (
               <li key={title} className="bg-[#f7f7f2] p-5 sm:p-6">
                 <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-black/45">0{index + 1}</span>
                   <h3 className="font-black">{title}</h3>
                 </div>
                 <p className="mt-3 text-sm leading-relaxed text-black/65">{text}</p>
               </li>
             ))}
           </ol>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-black/65">
                Countercult’s system follows one route: discover local cultural capacity, understand it in context, introduce the right partners, commission paid work, and return learning to the network. Studios is the paid delivery practice; the enduring asset is the verified intelligence and relationships that make the next place easier to serve.
           </p>
         </section>

        <section className="border-b border-black py-12 sm:py-16" aria-labelledby="business-heading">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            For businesses
          </p>
          <h2 id="business-heading" className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
               Put capital to work locally.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70">
                Countercult connects governments, destinations, institutions, employers, and brands to local cultural intelligence, then carries their briefs into paid delivery. Studios already delivers research, curation, programmes, visitor experiences, production, and place partnerships. The client-held Fund can connect selected sales or a defined budget to commissioned creative work, with agreed fees and direct payment.
          </p>
          <a
            href="/fund"
            className="mt-8 inline-flex border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#c6ff3d] hover:text-black"
          >
             Start a Fund conversation
          </a>
        </section>

        <section className="border-b border-black py-12 sm:py-16" aria-labelledby="future-heading">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
                Physical expansion and finance
          </p>
          <h2 id="future-heading" className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              From local knowledge to artist-led places.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-black/70">
                The investment thesis connects cross-city cultural intelligence to physical places. Pop-ups and local partnerships test the operating model; the next stage is building with place partners and raising aligned capital for the first artist-led cultural property. The long-term design directs economic value back toward the local people and spaces creating it. The first property investment is an active goal; a property portfolio and automated financial rails are expansion work.
          </p>
          <a
            href="/journal/the-countercult-fund-is-financial-infrastructure-for-local-culture/"
            className="mt-7 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] underline decoration-1 underline-offset-4 hover:text-black/55"
          >
            Read the financial infrastructure note
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
          </a>
        </section>

         <footer className="flex gap-3 pt-8 text-xs leading-relaxed text-black/50">
           <Network aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
             <span>Countercult connects local cultural intelligence to capital, paid work, and artist-led places.</span>
        </footer>
      </div>
    </main>
  );
}