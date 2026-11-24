import { Marquee } from "@/components/Marquee";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { trackEvent } from "@/lib/analytics";

export default function About() {
  return (
    <div className="min-h-[100dvh] bg-black text-white font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-black border-b border-white/10 flex items-center gap-3 px-4 py-2.5">
        <a href="/" className="shrink-0">
          <img src="/images/cc-logo-white.png" alt="countercult" className="h-7 w-7 object-contain" />
        </a>
        <form
          onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement)?.value.trim(); window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore'; }}
          className="flex-1 min-w-0"
        >
          <input
            type="text"
            placeholder="search the map…"
            defaultValue={new URLSearchParams(window.location.search).get('q') ?? ''}
            className="w-full bg-white/5 border border-white/10 focus:border-[#c6ff3d]/50 px-3 py-1.5 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none transition-colors"
          />
        </form>
        <a href="/explore" className="shrink-0 text-[10px] uppercase tracking-widest text-white/40 hover:text-[#c6ff3d] transition-colors font-bold">
          ← map
        </a>
      </header>

      <Marquee
        text="economic development through culture • public map • artist exchange • paid stewardship • local value • worldwide •"
        className="bg-[#c6ff3d] !text-black !py-1 text-xs"
        speed={70}
      />

      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">

        {/* Intro */}
        <div className="border-b border-white/10 pb-10">
           <p className="text-[9px] uppercase tracking-[0.3em] text-[#c6ff3d] mb-3">artist-founded cultural infrastructure · economic development through culture · open infrastructure</p>
          <h1 className="max-w-3xl text-4xl font-bold uppercase tracking-[-0.04em] text-white leading-[0.92] mb-5 sm:text-6xl">
              economic development through culture
          </h1>
           <p className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Countercult is an artist-founded fintech and culture-tech startup building open-source infrastructure for local circular economies, starting with culture. Founder and CTO Shona Neary leads its product and software work, with artists, cultural workers, collaborators, and supporters shaping the Network. Shona’s visual practice is published as Sketchy Shona, a distinct artist identity. Countercult Studios is a distinct paid service for strategy, local marketing, creative production, and delivery.
          </p>
           <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                Countercult’s software is open source under AGPL-3.0-or-later. The public Network supports discovery, and the protected Exchange supports member participation. <a href="https://github.com/countercultplatform-dot/countercult" target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-4 hover:text-[#c6ff3d]">Explore the public source on GitHub →</a> Artists retain rights to their work, and members keep control over how their information is shared.
           </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
              Artists are the connective intelligence underneath this model. They notice shifts before they become reports, understand how people gather and exchange value, and connect local knowledge to a brief without making a place generic. Countercult makes people and places discoverable; Countercult Studios works with business clients. The Fund currently keeps the budget with the client, who pays commissioned artists and Studios separately. Automated holding and routing are not live.
          </p>
          <div className="mt-8 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-3">
            <a href="/explore" data-testid="link-about-discover" className="group bg-black p-4 transition-colors hover:bg-[#c6ff3d] hover:text-black">
              <span className="block text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d] group-hover:text-black">01 · discover</span>
              <span className="mt-3 block text-sm leading-relaxed text-white/70 group-hover:text-black/75">Find artists, spaces, scenes, and cultural places outside the usual feeds.</span>
            </a>
            <a href="/explore?action=join" data-testid="link-about-share" className="group bg-black p-4 transition-colors hover:bg-[#c6ff3d] hover:text-black">
              <span className="block text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d] group-hover:text-black">02 · share</span>
              <span className="mt-3 block text-sm leading-relaxed text-white/70 group-hover:text-black/75">Put your work, place, practice, or opportunity somewhere people can find it.</span>
            </a>
            <a href="/studios" onClick={() => trackEvent("studios_cta_clicked", { source_route: "/about", placement: "intro" })} data-testid="link-about-work-with-studios" className="group bg-black p-4 transition-colors hover:bg-[#c6ff3d] hover:text-black">
              <span className="block text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d] group-hover:text-black">03 · work with us</span>
              <span className="mt-3 block text-sm leading-relaxed text-white/70 group-hover:text-black/75">Bring local knowledge and independent talent into a serious brief.</span>
            </a>
          </div>
           <div id="open-source" className="mt-6 scroll-mt-6 border-l-2 border-[#c6ff3d] bg-[#c6ff3d]/[0.06] px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#c6ff3d]">open cultural infrastructure</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                Countercult’s core software is released under the AGPL-3.0-or-later licence, so developers can inspect, reuse, and improve it. Artists retain rights to their work, and members keep control over how their information is shared.
            </p>
             <a
               href="https://github.com/countercultplatform-dot/countercult"
               target="_blank"
               rel="noopener noreferrer"
               className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] underline decoration-1 underline-offset-4 hover:text-white"
             >
               view the Countercult source on GitHub →
             </a>
          </div>
           <div className="mt-4 border-l-2 border-white/25 px-4 py-3">
             <p className="text-[9px] uppercase tracking-[0.22em] text-white/45">public thesis / guarded operations</p>
             <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
               We publish the category thesis, current operating model, public case studies, and the thinking behind the infrastructure. We keep member information, private partner terms, security details, unreleased features, and defensible operating advantages protected.
             </p>
           </div>
           <a
             href="/model"
             className="mt-6 inline-block text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] underline decoration-1 underline-offset-4 hover:text-white"
           >
             see how the Countercult model connects →
           </a>
        </div>

        {/* Long-term direction */}
        <section id="direction" className="border-b border-white/10 py-10 scroll-mt-6">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#c6ff3d] mb-3">where this is going</p>
           <h2 className="max-w-3xl text-2xl font-bold uppercase tracking-[-0.03em] text-white leading-tight mb-4 sm:text-4xl">
             from local culture to economic development
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">
                The map is the first layer of a larger cultural infrastructure system. Countercult is building the repeatable route that lets a place move from finding its culture to understanding it, working with it responsibly, and directing more value toward the people and places creating it. The point is not to add culture after the economic plan. It is to use cultural intelligence to make the plan more relevant, connected, and locally useful.
          </p>
          <div className="mt-7 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["01 · discover", "Find artists, spaces, practices, and local operators through a curated public layer."],
               ["02 · understand", "Turn local cultural knowledge into place context, opportunity, and responsible routes in."],
              ["03 · introduce", "Connect the right people to briefs, partners, programmes, and opportunities."],
              ["04 · commission", "Create paid work through campaigns, experiences, cultural programmes, and place partnerships."],
              ["05 · manage", "Add briefs, proposals, contracts, milestones, and reporting around real institutional work."],
               ["06 · pay + measure", "Support payment and outcome layers as demand grows, while protecting consent, attribution, and local value."],
            ].map(([label, description]) => (
              <div key={label} className="bg-black p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d]">{label}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-l-2 border-white/25 px-4">
            <p className="text-sm leading-relaxed text-white/60">
                The public network stays curated and consent-based. Countercult does not sell member data or flatten local culture into a scraped marketplace. Future payment layers will support genuine commissions and partnerships when the work requires them; they are not the starting point or the definition of the network.
            </p>
          </div>
        </section>

        {/* 01 - Global Platform */}
        <div className="border-b border-white/10 py-10">
          <div className="flex items-start gap-6">
            <div className="shrink-0 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/20 mb-1">01</div>
              <span className="text-3xl text-[#c6ff3d] leading-none">◉</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold uppercase tracking-widest text-white mb-3">the global platform</h2>
              <p className="text-sm leading-relaxed text-white/60 mb-5">
                start with a city, a tag, a person, or a place. follow the threads through the map, the Journal, and the people connected to it. the point is not to flatten culture into a list. it is to make the people and places already doing the work easier to find.
              </p>
              <a
                href="/"
                className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] text-[#c6ff3d] px-5 py-2.5 hover:bg-[#c6ff3d] hover:text-black transition-colors"
              >
                explore the map →
              </a>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 py-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-3">for funders and philanthropic partners</p>
          <h2 className="text-base font-bold uppercase tracking-widest text-white mb-3">help keep the public layer independent</h2>
          <p className="text-sm leading-relaxed text-white/60 mb-5">
            countercult is not venture-funded. philanthropic and mission-aligned support can keep discovery free for artists and independent spaces while helping the network document, connect, and direct more value toward the people who make culture.
          </p>
          <a href="/journal/fund-independent-cultural-infrastructure/" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] text-[#c6ff3d] px-5 py-2.5 hover:bg-[#c6ff3d] hover:text-black transition-colors">
            the case for supporting countercult →
          </a>
        </div>

        {/* 02 - Programs */}
        <div className="border-b border-white/10 py-10">
          <div className="flex items-start gap-6">
            <div className="shrink-0 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/20 mb-1">02</div>
              <span className="text-3xl text-[#c6ff3d] leading-none">◬</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold uppercase tracking-widest text-white mb-1">programmes, writing & field work</h2>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">irl & digital</p>
              <p className="text-sm leading-relaxed text-white/60 mb-5">
                events, cultural programming, research, writing, and experiments that bring the network into real life. follow along for what is happening, what we are learning, and where the next invitation leads.
              </p>
              <a
                href="https://countercultplatform.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] text-[#c6ff3d] px-5 py-2.5 hover:bg-[#c6ff3d] hover:text-black transition-colors"
              >
                follow on substack ↗
              </a>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 py-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-3">for clients and partners</p>
          <h2 className="text-base font-bold uppercase tracking-widest text-white mb-3">hire countercult</h2>
          <p className="text-sm leading-relaxed text-white/60 mb-5">
              countercult studios is the paid stewardship and delivery arm around open cultural infrastructure. we work with brands, institutions, destinations, founders, and agencies on economic development through culture, local research, spatial programming, and place-based projects. artists and cultural workers provide the local intelligence; Studios turns that intelligence into a clear brief, a paid outcome, and a relationship that can continue. this is the current commercial route into the wider system.
          </p>
          <a
            href="/studios"
            onClick={() => trackEvent("studios_cta_clicked", { source_route: "/about", placement: "hire_countercult" })}
            className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] text-[#c6ff3d] px-5 py-2.5 hover:bg-[#c6ff3d] hover:text-black transition-colors"
          >
            work with countercult studios →
          </a>
        </div>

        <div className="py-10">
           <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-3">artist-founded economic development</p>
           <h2 className="text-base font-bold uppercase tracking-widest text-white mb-3">
             founded and built by{" "}
             <a href="/journal/shona-neary-founder-interview/" className="underline decoration-[#c6ff3d] underline-offset-4 hover:text-[#c6ff3d]">shona neary</a>
             {" / "}
             <a href="https://countercult.network/sketchyshona/" target="_blank" rel="noopener noreferrer" className="underline decoration-[#c6ff3d] underline-offset-4 hover:text-[#c6ff3d]">sketchy shona</a>
           </h2>
          <p className="text-sm leading-relaxed text-white/60 mb-5">
                shona neary is Countercult’s artist-founder and CTO. their authored visual practice is sketchy shona; the floor is their artist-owned cultural venture; countercult is the public network and software layer; countercult studios delivers paid work. these practices are connected, but remain distinct. shona led countercult’s product roadmap, software, and technical architecture, while artists, cultural workers, collaborators, and supporters shaped the platform. the current system joins public discovery, protected member exchange, paid studios work, and a client-held fund.
          </p>
           <p className="text-sm leading-relaxed text-white/60 mb-5">
                  shona started countercult because culture and the people who make it need the conditions to survive and thrive. they use the network as an artist and share what they learn through the sketchy shona journal. this is knowledge from lived use, not a finished-product claim. automated fund holding and routing, and property expansion, remain future development. countercult's open-source license applies to software, not artists' work or member and private records; those rights remain with their respective holders.
           </p>
          <div className="flex flex-wrap gap-3">
            <a href="/journal/shona-neary-founder-interview/" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] bg-[#c6ff3d] text-black px-5 py-2.5 hover:bg-transparent hover:text-[#c6ff3d] transition-colors">
              founder conversation →
            </a>
            <a href="https://countercult.network/shona-neary-portfolio/" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-white/30 text-white px-5 py-2.5 hover:border-white transition-colors">
              shona’s professional portfolio / selected work →
            </a>
            <a href="/journal/shona-neary-sketchy-shona/" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] text-[#c6ff3d] px-5 py-2.5 hover:bg-[#c6ff3d] hover:text-black transition-colors">
              meet shona / sketchy shona →
            </a>
            <a href="/journal/artist-founded-culture-tech-infrastructure/" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-white/30 text-white px-5 py-2.5 hover:border-white transition-colors">
              why this is open cultural infrastructure →
            </a>
             <a href="https://countercult.network/sketchyshona/studio/" target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-white/30 text-white px-5 py-2.5 hover:border-white transition-colors">
               see the practice architecture →
             </a>
             <a href="https://countercult.network/sketchyshona/journal/" target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] uppercase tracking-widest font-bold border-2 border-white/30 text-white px-5 py-2.5 hover:border-white transition-colors">
               read the artist OS journal →
             </a>
          </div>
        </div>

      </div>

      <footer className="border-t border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-white/20">© {new Date().getFullYear()} countercult</span>
          <ArchitectSignature className="mt-1 max-w-xl text-white/30" />
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("cc:open-terms"))}
          className="text-[10px] text-white/20 hover:text-[#c6ff3d] transition-colors uppercase tracking-widest"
        >
          terms & privacy
        </button>
      </footer>

    </div>
  );
}
