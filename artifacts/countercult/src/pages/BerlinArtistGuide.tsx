import { useEffect } from "react";
import berlinArtistGuide from "@/data/berlin-artist-guide.json";

type Segment = { text: string; href?: string };

function renderSegments(segments: Segment[]) {
  return segments.map((segment, index) =>
    segment.href ? (
      <a
        key={`${segment.href}-${index}`}
        href={segment.href}
        className="font-semibold underline decoration-black/35 underline-offset-4 hover:decoration-black"
      >
        {segment.text}
      </a>
    ) : (
      segment.text
    ),
  );
}

export default function BerlinArtistGuide() {
  useEffect(() => {
    document.title = berlinArtistGuide.title;

    let description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = berlinArtistGuide.description;

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://countercult.network/${berlinArtistGuide.path}/`;
  }, []);

  return (
    <main className="min-h-[100dvh] bg-[#f9f9f6] px-6 py-10 pb-32 font-sans text-[#111] sm:px-10 sm:py-14 sm:pb-36">
      <nav aria-label="Primary navigation" className="mx-auto max-w-[820px] text-sm">
        <a href="/" className="font-bold no-underline">countercult</a>
        <span aria-hidden="true" className="mx-2">/</span>
        <a href="/explore" className="underline underline-offset-4">explore the network</a>
      </nav>

      <article className="mx-auto mt-14 max-w-[820px]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">Berlin · artists · commissioning</p>
        <h1 className="mt-5 max-w-[760px] text-4xl font-bold uppercase leading-[0.96] tracking-[-0.04em] sm:text-6xl">
          {berlinArtistGuide.heading}
        </h1>
        <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-black/70">{berlinArtistGuide.description}</p>

        <div className="mt-10 max-w-[680px] space-y-7 text-base leading-[1.75]">
          <p>{renderSegments(berlinArtistGuide.intro)}</p>
          {berlinArtistGuide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.heading}-${index}`}>{renderSegments(paragraph)}</p>
              ))}
            </section>
          ))}
        </div>

        <nav aria-label="Further reading" className="mt-12 border-t border-black/20 pt-7">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em]">Further reading</h2>
          <ul className="mt-4 space-y-3">
            {berlinArtistGuide.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="font-semibold underline decoration-black/35 underline-offset-4 hover:decoration-black">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </main>
  );
}