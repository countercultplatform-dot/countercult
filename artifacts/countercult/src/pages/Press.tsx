import { useEffect } from "react";
import { ArrowUpRight, Download, Image, Mail, UserRound } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";

const CONTACT_EMAIL = "countercultplatform@gmail.com";

const records = [
  {
    label: "field report",
    title: "Rural Hackers / Anceu",
    place: "Anceu, Galicia",
    copy: "A published record of a 97-person village, a mural, local references, and the relationships around Rural Hackers and Anceu Coliving.",
    image: "/images/rural-hackers-mural-workshop.webp",
    href: "/journal/preserving-the-unpreserved/",
  },
  {
    label: "case record",
    title: "THE FLOOR",
    place: "Berlin, Germany",
    copy: "A record of the artist-run residency and project-space model, including the people, room, exhibitions, and exchange around it.",
    image: "/journal/pink-spy-the-floor-art-residency/assets/01-pink-spy-presents.jpg",
    href: "/journal/floor-artist-run-space-berlin/",
  },
  {
    label: "public experiment",
    title: "Sketchy Shona / GetYourGuide",
    place: "Berlin, Germany",
    copy: "A live experiment in turning local knowledge, art practice, storytelling, product design, and delivery into public experiences.",
    image: "/images/cult-soap.png",
    href: "/journal/sketchy-shona-getyourguide/",
  },
];

const pressFacts = [
  ["what it is", "Countercult is artist-founded cultural and economic infrastructure."],
  ["how it works", "It helps places, institutions, agencies, destinations, brands, and local operators discover existing culture, understand its context, and turn it into paid work and local value."],
  ["the public layer", "The open-source core includes a free, curated public map for discovering artists, spaces, local scenes, and cultural places."],
  ["the paid layer", "Countercult Studios provides paid stewardship and delivery around research, relationships, commissions, programmes, experiences, and place-based work."],
  ["the Countercult Fund", "A client-held marketing or community budget for a defined brief. Selected sales may inform the agreed budget. Countercult Studios shapes the brief, connects it with local artists and cultural workers, and coordinates delivery; the client pays artists and Studios separately. Each engagement defines scope, fees, recording, and settlement. It is not an open grant or pooled fund, and it does not imply automatic sales tracking or transfers."],
];

export default function Press() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Countercult Press Kit | Facts, Records + Contact";
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f3f2ed] font-mono text-black selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#f3f2ed]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">countercult / press file</span>
          </a>
          <nav className="hidden items-center gap-5 text-[10px] font-bold uppercase tracking-[0.15em] sm:flex">
            <a href="#facts" className="transition-colors hover:text-black/50">facts</a>
            <a href="#records" className="transition-colors hover:text-black/50">records</a>
            <a href="#contact" className="transition-colors hover:text-black/50">contact</a>
          </nav>
          <a href="/" className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-black/50">← home</a>
        </div>
      </header>

      <main>
        <section className="border-b-2 border-black bg-black text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-20 lg:py-24">
            <div>
              <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c6ff3d]">public working dossier / updated for people making a story</p>
              <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] sm:text-8xl lg:text-[9rem]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                culture<br />is already<br />in the room.
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                Countercult is artist-founded cultural and economic infrastructure. This is the useful version of a press kit: what Countercult is, what has actually been documented, who founded it, and where to ask for more.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#records" className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-transform hover:-translate-y-1">open the records ↓</a>
                <a href={`mailto:${CONTACT_EMAIL}?subject=Countercult%20press%20enquiry`} className="border-2 border-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black">contact the team</a>
              </div>
            </div>
            <aside className="border-2 border-[#c6ff3d] bg-[#c6ff3d] p-5 text-black sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">short version</p>
              <p className="mt-8 text-3xl font-black uppercase leading-[0.86] tracking-[-0.06em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                find what is here.<br />understand it.<br />pay for the work.
              </p>
              <p className="mt-7 border-t-2 border-black/20 pt-4 text-sm leading-relaxed text-black/70">
                Culture is the entry point. The work connects existing people, places, practices, and demand without treating a living scene as raw material.
              </p>
            </aside>
          </div>
          <div className="border-t-2 border-white/15">
            <div className="mx-auto grid max-w-7xl divide-y-2 divide-white/15 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
              {[
                ["01", "public map", "a free, curated layer for finding people and places already doing the work"],
                ["02", "paid stewardship", "Countercult Studios turns context and relationships into serious briefs"],
                ["03", "local value", "commissions, programmes, experiences, partnerships, and durable records"],
              ].map(([number, title, copy]) => (
                <div key={number} className="px-4 py-5 sm:px-8">
                  <p className="text-[10px] font-bold text-[#c6ff3d]">{number}</p>
                  <p className="mt-4 text-base font-bold uppercase tracking-[0.08em]">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="facts" className="scroll-mt-16 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">01 / the record in plain language</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>no fog.<br />just the<br />working model.</h2>
            </div>
            <div className="divide-y-2 divide-black border-y-2 border-black">
              {pressFacts.map(([label, copy]) => (
                <div key={label} className="grid gap-3 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">{label}</p>
                  <p className="max-w-2xl font-sans text-base leading-relaxed text-black/75">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">02 / named people and projects</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>keep the<br />names<br />attached.</h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-black/65">Countercult, Countercult Studios, Countercult Fund, Sketchy Shona, and THE FLOOR are not interchangeable labels. The distinctions matter in a story.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["countercult", "Artist-founded public cultural and economic infrastructure."],
                ["countercult studios", "The paid stewardship and delivery arm for briefs, relationships, commissions, programmes, experiences, and place work."],
                ["countercult fund", "A client-held budget for paid local creative work, which may be linked to selected sales under agreed terms."],
                ["sketchy shona", "The artist identity and practice of Shona Neary, Countercult's founder."],
                ["the floor", "An artist-run residency and project space in Berlin, with its own records and programme."],
              ].map(([title, copy]) => (
                <article key={title} className="border-2 border-black bg-white p-5 transition-transform hover:-translate-y-1 sm:p-6">
                  <p className="text-lg font-black uppercase leading-none tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</p>
                  <p className="mt-4 text-sm leading-relaxed text-black/65">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="records" className="scroll-mt-16 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">03 / public records and images</p>
                <h2 className="max-w-3xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>start with<br />what exists.</h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-black/60">These are published records, not invented case studies. Each one gives a journalist a route into the people, place, and context.</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {records.map((record) => (
                <article key={record.title} className="group border-2 border-black bg-white">
                  <a href={record.href} className="block">
                    <img src={record.image} alt={`${record.title}, ${record.place}`} className="aspect-[1.2] w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0" loading="lazy" />
                    <div className="border-t-2 border-black p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">{record.label} / {record.place}</p>
                        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </div>
                      <h3 className="mt-8 text-3xl font-black uppercase leading-[0.86] tracking-[-0.05em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{record.title}</h3>
                      <p className="mt-4 text-sm leading-relaxed text-black/65">{record.copy}</p>
                    </div>
                  </a>
                  <a href={record.image} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-t border-black/15 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black/55 transition-colors hover:bg-[#c6ff3d] hover:text-black sm:px-6">
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> open image file
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-black px-4 py-14 text-white sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">04 / founder and source material</p>
              <h2 className="max-w-xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] text-[#c6ff3d] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>speak to<br />the builder.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">Shona Neary founded Countercult and Countercult Studios. They are a multidisciplinary artist, curator, designer, creative director, and the builder of Countercult's product and software. Their artist practice is Sketchy Shona.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <a href="/journal/shona-neary-founder-interview/" className="border-2 border-white p-5 transition-colors hover:bg-[#c6ff3d] hover:text-black">
                  <UserRound className="h-6 w-6 text-[#c6ff3d]" aria-hidden="true" />
                  <p className="mt-8 text-sm font-bold uppercase tracking-[0.12em]">founder interview →</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55 group-hover:text-black/60">A direct source for the origin and ambition of Countercult’s infrastructure work.</p>
                </a>
                <a href="https://countercult.network/sketchyshona/" target="_blank" rel="noopener noreferrer" className="border-2 border-white p-5 transition-colors hover:bg-[#c6ff3d] hover:text-black">
                  <Image className="h-6 w-6 text-[#c6ff3d]" aria-hidden="true" />
                  <p className="mt-8 text-sm font-bold uppercase tracking-[0.12em]">Sketchy Shona ↗</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">The separate artist practice and portfolio.</p>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-16 bg-[#ff6b4a] px-4 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">05 / contact</p>
              <h2 className="max-w-2xl text-5xl font-black uppercase leading-[0.84] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>make the<br />next question<br />specific.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">For interview requests, image permissions, records, founder questions, or a story about cultural infrastructure, write to the existing public Countercult address. Include your deadline, publication, angle, and what you need.</p>
              <a href={`mailto:${CONTACT_EMAIL}?subject=Countercult%20press%20enquiry`} className="mt-8 inline-flex items-center gap-3 border-2 border-black bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">
                <Mail className="h-4 w-4" aria-hidden="true" /> {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <ArchitectSignature className="text-white/35" />
          <a href="/partners" className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 transition-colors hover:text-[#c6ff3d]">for partners →</a>
        </div>
      </footer>
    </div>
  );
}