import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const floorPhoto = (name: string) => `${import.meta.env.BASE_URL}images/the-floor/${name}`;
const PHOTOS = [
  { file: "floor-1.webp", alt: "Shared project and studio space at THE FLOOR." },
  { file: "open-call-resident-mad-mod.webp", alt: "Resident Mad.Mod in the garden for THE FLOOR's open call." },
  { file: "floor-3.webp", alt: "A view inside THE FLOOR's artist residency." },
  { file: "residency-floor-plan.webp", alt: "Floor plan showing two bedrooms, project studio, kitchen, bathroom, and private garden." },
  { file: "floor-2.webp", alt: "The private garden at THE FLOOR." },
  { file: "live-create-with-artists.webp", alt: "THE FLOOR residency graphic describing a one-to-three-month live-and-create stay." },
  { file: "floor-4.webp", alt: "A resident's private live/work room." },
  { file: "open-call-resident-ohhi-uisce.webp", alt: "Resident Ohhi Uisce working in the indoor and outdoor studio area." },
  { file: "floor-5.webp", alt: "Another view of THE FLOOR's shared space." },
  { file: "open-call-resident-sketchy-shona.webp", alt: "Sketchy Shona in the garden at THE FLOOR." },
].map((photo) => ({ ...photo, src: floorPhoto(photo.file) }));

const APPLICATION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdxrjFnWYmkUkjonOJMXRBStBfOAbbkHUF6MxDMwn66w_eKdg/viewform";
const FLOOR_INSTAGRAM_URL = "https://www.instagram.com/thefloorberlin/";
const PINK_SPY_JOURNAL_URL = "/journal/pink-spy-the-floor-art-residency/";
const PINK_SPY_IMAGE = "/journal/pink-spy-the-floor-art-residency/assets/01-pink-spy-presents.jpg";
const FLOOR_CASE_STUDY_URL = "/journal/the-floor-berlin-wg-more-room-for-culture/";
const FLOOR_ECONOMIC_CASE_STUDY_URL = "/journal/the-floor-cultural-economic-experiment/";

export default function TheFloor() {
  const renderApplicationAction = (placement: "hero" | "bottom") => {
    const isBottom = placement === "bottom";
    const buttonClass = isBottom
      ? "inline-flex items-center gap-3 border-4 border-white bg-white px-8 py-5 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-black shadow-[8px_8px_0_#fff] transition-all hover:-translate-y-1 hover:bg-black hover:text-white hover:shadow-[12px_12px_0_#fff]"
      : "inline-flex items-center gap-3 border-2 border-white bg-white px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-black hover:text-white";
    const ctaLabel = isBottom ? "link-floor-application-bottom" : "link-floor-application";

    return (
      <a
        href={APPLICATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={ctaLabel}
        className={`group ${buttonClass}`}
      >
        open the Google Form application
        <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isBottom ? "sm:h-5 sm:w-5" : ""}`} />
      </a>
    );
  };

  return (
    <main className="floor-page min-h-screen bg-white pb-24 text-black font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <PageHeader title="the floor" subtitle="artist-run art residency · neukölln, berlin" />
      <a
        href="#resident-diary"
        aria-label="See what our residents think about THE FLOOR"
        className="fixed right-3 top-16 z-30 w-24 border-2 border-black bg-white p-1.5 shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-1 sm:right-6 sm:top-20 sm:w-28"
      >
        <img src={PINK_SPY_IMAGE} alt="" className="aspect-square w-full object-cover" />
        <span className="block px-1 py-1 font-bold text-[10px] uppercase leading-tight tracking-[0.08em] sm:text-[11px]">See what residents think ↓</span>
      </a>
      
      <article>
        {/* Hero Section */}
        <header className="border-b-2 border-black bg-black px-5 py-8 text-white sm:px-8 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
              berlin
            </p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              <a href={FLOOR_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">the floor</a>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/80 sm:text-lg">
              THE FLOOR is an artist-run art residency and a locally run FLINTA, queer and migrant cultural space in Neukölln, Berlin. Artists live and work here while developing their practice. Its 100m² space includes private 22m² live/work rooms and an additional 50m² of indoor and outdoor project and studio space.
            </p>
            
            <div className="mt-6 flex flex-col items-start gap-3">
              {renderApplicationAction("hero")}
                <p className="max-w-xl text-xs leading-relaxed text-white/60">
                Apply directly through THE FLOOR’s Google Form. A Countercult account is not required.
              </p>
            </div>
            <div className="mt-7 grid max-w-3xl grid-cols-3 border-y border-white/25 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/60 sm:text-[10px]">
                <a href="#space" className="border-r border-white/25 py-3 pr-3 transition-colors hover:text-white">space<br /><span className="text-white">100m² total</span></a>
              <a href="#details" className="border-r border-white/25 px-3 py-3 transition-colors hover:text-white">residents<br /><span className="text-white">2–4 at a time</span></a>
              <a href="#details" className="py-3 pl-3 transition-colors hover:text-white">from<br /><span className="text-white">€750 / month</span></a>
            </div>
            <a href="#space" className="mt-4 inline-flex items-center font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white">see the space, residency and local context ↓</a>
          </div>
        </header>

        {/* Image reference */}
        <section id="space" className="scroll-mt-6 border-b-2 border-black bg-black px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-end justify-between gap-4 text-white">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">the space in berlin</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">visual reference</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PHOTOS.map((photo) => (
                <div key={photo.file} className="aspect-[3/4] overflow-hidden bg-white/10">
                  <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="details" className="scroll-mt-6 border-b-2 border-black bg-white px-5 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 border-b-2 border-black pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">why this residency exists</p>
                  <h2 className="mt-4 max-w-md text-4xl font-black uppercase leading-[0.88] tracking-[-0.05em] sm:text-6xl">
                   An artist-run art residency making room for culture.
                </h2>
              </div>
              <div className="max-w-2xl text-sm leading-relaxed text-black/70 sm:text-base">
                <p>
                  THE FLOOR brings accommodation, workspace and artistic guidance together in an artist-run cultural space, giving residents room to make work and connect with Neukölln's cultural life.
                </p>
              </div>
            </div>
            <div className="mt-8 grid gap-px border-2 border-black bg-black sm:grid-cols-3">
              {[
                 ["01", "Create", "Residents have private live/work rooms and shared studio space to develop their own practice."],
                 ["02", "Connect", "Mentorship and local introductions help residents build relationships with artists and cultural spaces in Berlin."],
                 ["03", "Keep space cultural", "An artist-run home and project room keeps making, exchange and occasional gatherings connected."],
              ].map(([number, title, copy]) => (
                <div key={number} className="bg-white p-5 sm:p-6">
                  <p className="font-mono text-[10px] font-bold text-black/45">{number}</p>
                  <h3 className="mt-8 text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em]">{title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-black/70">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 border-t-2 border-black pt-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">practical information</p>
              <div className="mt-3 divide-y-2 divide-black border-y-2 border-black">
                <details open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
                    availability + fees
                    <span className="text-2xl font-normal" aria-hidden="true">+</span>
                  </summary>
                  <div className="grid gap-5 pb-5 text-sm leading-relaxed text-black/70 sm:grid-cols-3">
                     <p><strong className="text-black">Applications:</strong> stays beginning November 2026.</p>
                     <p><strong className="text-black">Length:</strong> full calendar months only. Winter and spring stays are three months; summer and autumn are month to month.</p>
                     <p><strong className="text-black">Cost:</strong> EUR 750 per month for one artist, EUR 900 for a couple or artist duo, plus a refundable EUR 200 deposit.</p>
                  </div>
                </details>
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
                    what the space includes
                    <span className="text-2xl font-normal" aria-hidden="true">+</span>
                  </summary>
                  <div className="pb-5 text-sm leading-relaxed text-black/70">
                    <p>The residency spans 100m² in total, with private 22m² live/work rooms and an additional 50m² of indoor and outdoor project and studio space. Kitchen, bathroom, private garden, utilities, internet, and mentorship are included. Art materials, insurance, visa support, and personal costs are not.</p>
                    <p className="mt-3">Residents receive curatorial guidance and weekly critiques. Public exhibition and festival opportunities depend on the project and are not guaranteed.</p>
                  </div>
                </details>
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
                    applying to THE FLOOR
                    <span className="text-2xl font-normal" aria-hidden="true">+</span>
                  </summary>
                  <div className="pb-5 text-sm leading-relaxed text-black/70">
                    <p>The residency is for artists developing their practice who are comfortable with shared living. The Google Form asks about your practice, portfolio, dates, and funding needs. A Countercult account is not required.</p>
                  </div>
                </details>
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
                    fees and funded places
                    <span className="text-2xl font-normal" aria-hidden="true">+</span>
                  </summary>
                  <div className="pb-5 text-sm leading-relaxed text-black/70">
                    <p>The standard fee is €750 per month for one artist or €900 for a couple or artist duo, plus a refundable €200 deposit. Selected artists may receive fully funded places. Sketchy Shona can support external grant applications. Funding is selective and not guaranteed.</p>
                  </div>
                </details>
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
                    local transport and culture
                    <span className="text-2xl font-normal" aria-hidden="true">+</span>
                  </summary>
                  <div className="pb-5 text-sm leading-relaxed text-black/70">
                    <p>THE FLOOR is in Neukölln. The district is connected by the U7 and U8 lines and the Ringbahn. Cultural spaces across Neukölln include KINDL Centre for Contemporary Art, Galerie im Saalbau, WerkStadt and Heimathafen Neukölln. The exact address is shared with accepted residents.</p>
                    <a className="mt-3 inline-flex border-b border-black pb-1 font-bold text-black" href="https://www.berlin.de/kunst-und-kultur-neukoelln/kulturorte/" target="_blank" rel="noopener noreferrer">Explore Neukölln’s cultural spaces</a>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </section>

        <section id="resident-diary" className="scroll-mt-20 border-b-2 border-black bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
            <a
              href={PINK_SPY_JOURNAL_URL}
              className="group block overflow-hidden border-2 border-black bg-black shadow-[8px_8px_0_#000]"
              aria-label="Read a resident's visual diary"
            >
              <img
                src={PINK_SPY_IMAGE}
                alt="A resident's visual diary of The Floor art residency"
                className="aspect-[3/4] w-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </a>
            <div>
              <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
                from the journal · resident perspective
              </p>
                <h2 className="max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">
                  See what our residents think.
              </h2>
               <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/70 sm:text-base">
                 Read a resident&apos;s visual diary of shared living, focused work, and finding a way into Berlin&apos;s creative life.
              </p>
              <a
                href={PINK_SPY_JOURNAL_URL}
                className="mt-6 inline-flex items-center border-2 border-black bg-black px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-black"
              >
                 read the resident diary <ArrowRight className="ml-2 h-4 w-4" />
              </a>
               <a
                 href="/studios/resident-work"
                 className="mt-6 inline-flex items-center border-2 border-black px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[#c6ff3d]"
               >
                 see how resident work moves outward <ArrowRight className="ml-2 h-4 w-4" />
               </a>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-white px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 border-y-2 border-black py-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                 <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">the residency in practice</p>
                 <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">A home, studio and project room.</h2>
              </div>
              <div className="max-w-md text-sm leading-relaxed text-black/70">
                 <p>Residents live and work in an artist-run space, with occasional private gatherings. THE FLOOR is not a public event venue, commercial sublet, or long-term flat.</p>
                <a href={FLOOR_CASE_STUDY_URL} className="mt-4 inline-flex items-center gap-2 border-b-2 border-black pb-1 font-mono text-[10px] font-black uppercase tracking-[0.14em]">
                  read the case study <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a href={FLOOR_ECONOMIC_CASE_STUDY_URL} className="mt-4 inline-flex items-center gap-2 border-b-2 border-black pb-1 font-mono text-[10px] font-black uppercase tracking-[0.14em]">
                  read the cultural economics case study <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a href="/sketchyshona/floor/" className="mt-4 inline-flex items-center gap-2 border-b-2 border-black pb-1 font-mono text-[10px] font-black uppercase tracking-[0.14em]">
                  see THE FLOOR through Sketchy Shona’s artist archive <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a href={FLOOR_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" data-testid="link-floor-instagram" className="mt-4 inline-flex items-center gap-2 border-b-2 border-black pb-1 font-mono text-[10px] font-black uppercase tracking-[0.14em]">
                  follow @thefloorberlin <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-black px-5 py-12 text-center text-white sm:px-8">
          <div className="mx-auto max-w-2xl">
            {renderApplicationAction("bottom")}
          </div>
        </section>
      </article>
    </main>
  );
}
