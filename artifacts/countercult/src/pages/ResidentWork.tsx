import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { ArchitectSignature } from "@/components/ArchitectSignature";

const photos = [
  {
    src: `${import.meta.env.BASE_URL}images/berlin-street-art/01-paste-up-close.webp`,
    alt: "Close view of a resident working on a paste-up in Berlin",
  },
  {
    src: `${import.meta.env.BASE_URL}images/berlin-street-art/02-paste-up-group.webp`,
    alt: "A group contributing to a street-art paste-up in Berlin",
  },
  {
    src: `${import.meta.env.BASE_URL}images/berlin-street-art/03-wall-portrait.webp`,
    alt: "Participant standing beside a Berlin street-art wall",
  },
  {
    src: `${import.meta.env.BASE_URL}images/berlin-street-art/04-paste-up-hands.webp`,
    alt: "Hands placing a paste-up on a Berlin street-art wall",
  },
  {
    src: `${import.meta.env.BASE_URL}images/berlin-street-art/05-painting-detail.webp`,
    alt: "Artist painting a detail on a Berlin street-art wall",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "@id": "https://countercult.network/studios/resident-work#record",
  name: "Making Street Art Together in Berlin",
  alternateName: "A resident-led project at THE FLOOR",
  description:
    "I brought artists and visitors together for a Berlin street-art session along a route I planned. Nash, a resident at THE FLOOR, photographed the day.",
  url: "https://countercult.network/studios/resident-work",
  image: photos.map((photo) => `https://countercult.network${photo.src.replace(/\/+$/, "")}`),
  creator: {
    "@type": "Organization",
    name: "Countercult Studios",
    url: "https://countercult.network/studios",
  },
  contributor: {
    "@type": "Person",
    name: "Nash",
    description: "Photographer and resident at THE FLOOR.",
  },
  about: [
    "artist residency",
    "resident-led project",
    "Berlin street art",
    "local cultural work",
  ],
  locationCreated: {
    "@type": "City",
    name: "Berlin",
    addressCountry: "DE",
  },
  isPartOf: {
    "@type": "WebSite",
    name: "Countercult",
    url: "https://countercult.network",
  },
};

export default function ResidentWork() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Making Street Art Together in Berlin | Countercult Studios";
    const scriptId = "countercult-resident-work-jsonld";
    let script = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => script?.remove();
  }, []);

  return (
    <div className="studios-route-page min-h-[100dvh] bg-[#f3f2ed] font-sans text-black selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#f3f2ed]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src={`${import.meta.env.BASE_URL}images/cc-logo-black.png`} alt="countercult" className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">countercult / studios / resident work</span>
          </a>
          <a href="/studios" className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-black/50">← studios</a>
        </div>
      </header>

      <main>
        <section className="border-b-2 border-black bg-black text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-16 lg:py-20">
            <div>
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">A resident-led project at THE FLOOR</p>
              <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Making street art together in Berlin
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                I brought artists and visitors together for a Berlin street-art session along a route I planned. Nash, a resident at THE FLOOR, photographed the day. THE FLOOR is a locally run, FLINTA, queer and migrant art residency.
              </p>
            </div>
            <aside className="border-2 border-[#c6ff3d] bg-[#c6ff3d] p-5 text-black sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">My part in the project</p>
              <ul className="mt-6 divide-y divide-black/20 text-sm leading-relaxed">
                <li className="py-3"><strong>Artistic direction:</strong> shaped the idea and how people could take part.</li>
                <li className="py-3"><strong>Route:</strong> connected the session to the city and its street-art context.</li>
                <li className="py-3"><strong>Photography:</strong> Nash documented the day as a resident at THE FLOOR.</li>
              </ul>
              <p className="mt-3 border-t-2 border-black/20 pt-4 text-sm leading-relaxed text-black/70">
                The resident keeps authorship. The project creates a shared experience and a record they can carry forward.
              </p>
            </aside>
          </div>
        </section>

        <section className="border-b-2 border-black bg-white px-4 py-5 sm:px-8 sm:py-8">
          <div className="mx-auto mb-5 max-w-7xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">The day, in photographs</p>
          </div>
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((photo) => (
              <figure key={photo.src} className="overflow-hidden border-2 border-black bg-black">
                <img src={photo.src} alt={photo.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="mx-auto mt-4 flex max-w-7xl flex-wrap justify-between gap-3 text-[9px] font-bold uppercase tracking-[0.16em] text-black/50">
            <span>Berlin street art / resident record</span>
            <span>Photography by Nash / resident at THE FLOOR</span>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-16">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em]">How I approach resident-led work</p>
                <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>Start with the person and the place.</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-black/75 sm:text-lg">A residency is more than a room. I want artists to have space to make work, meaningful ways to meet people around them, and a record they can use after the project ends.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Make room for the work", "I start with what the resident wants to make, rather than a format I want them to fit."],
                ["02", "Connect it to its place", "Local artists, spaces and streets can become part of the work, not just its backdrop."],
                ["03", "Invite people in", "A shared activity gives residents, collaborators and visitors a way to meet through making."],
                ["04", "Keep the resident's record", "The resident stays the author and keeps a clear record of the work and relationships it creates."],
              ].map(([number, title, copy]) => (
                <article key={number} className="border-2 border-black bg-white p-5 sm:p-6">
                  <p className="text-[10px] font-bold text-black/45">{number}</p>
                  <h3 className="mt-8 text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-black/65">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-white px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">What the group took from it</p>
              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>A different way to see Berlin.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-black/75 sm:text-lg">
                One guest from the UK described the value of the route this way:
              </p>
              <blockquote className="mt-8 border-y-2 border-black py-6 text-2xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                “You get to see a part of Berlin that you wouldn’t get to see without local knowledge.”
              </blockquote>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">A guest on the Berlin route</p>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-16">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">Have a project in mind?</p>
              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>Tell me about the people and place.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">If you run a residency, cultural space or local programme, tell me who is involved, what they want to make and what the place can support. I’ll help shape a project around the people already there.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/the-floor" className="inline-flex items-center gap-3 border-2 border-[#c6ff3d] bg-[#c6ff3d] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white">see THE FLOOR <ArrowRight className="h-4 w-4" /></a>
                <a href="/studios/brief" className="inline-flex items-center gap-3 border-2 border-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black">tell me about your project <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <ArchitectSignature className="text-white/35" />
          <a href="/partners" className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 transition-colors hover:text-[#c6ff3d]">for partners <ArrowUpRight className="inline h-3.5 w-3.5" /></a>
        </div>
      </footer>
    </div>
  );
}