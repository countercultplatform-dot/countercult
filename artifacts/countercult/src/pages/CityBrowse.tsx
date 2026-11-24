import { useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useListEntries } from "@workspace/api-client-react";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta } from "@/lib/seo";
import { EditorialTrail } from "@/components/EditorialTrail";
import { getEditorialTrails } from "@/data/editorialTrails";
import { trackEvent } from "@/lib/analytics";
import { getAdditionalBaseCities, hasBaseCity } from "@/lib/entryLocations";

const KIND_LABEL: Record<string, string> = {
  artist: "artist",
  space: "space",
  artifact: "place / practice",
};

type PlaceContext = {
  eyebrow: string;
  intro: string;
  facts: string[];
  note: string;
};

const GENERIC_CONTEXT: PlaceContext = {
  eyebrow: "a cultural place page",
  intro:
    "Find real culture and the people and places already making this place distinctive.",
  facts: [
    "Start with the public cultural record before planning a visit.",
    "Use each voice as a route into the people and places behind local culture.",
  ],
  note:
    "This page only shows approved public entries. It is a connective layer, not a ranking or a complete picture of a place.",
};

const PLACE_CONTEXT: Record<string, PlaceContext> = {
  anceu: {
    eyebrow: "rural galicia · small village context",
    intro:
      "The culture is already there. Countercult makes it easier to find, experience, and support.",
    facts: [
      "Anceu is a small village in rural Galicia.",
      "Rural Hackers and local programming are part of the context.",
      "Countercult worked there as artists and developers.",
      "The demand and culture already existed; the missing layer was connective infrastructure.",
    ],
    note:
      "This is a place page for following those connections: start with the public entries, then decide how you want to visit, collaborate, or support.",
  },
};

function decodeCity(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "").trim();
  } catch {
    return (value ?? "").trim();
  }
}

export default function CityBrowse() {
  const { city: rawCity, place: rawPlace } = useParams<{ city?: string; place?: string }>();
  const [, navigate] = useLocation();
  const { data, isLoading, isError, refetch } = useListEntries();
  const city = decodeCity(rawPlace ?? rawCity);
  const placePath = rawPlace ? "place" : "city";
  const entries = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => entries.filter((entry) => hasBaseCity(entry, city)),
    [entries, city],
  );
  const context = PLACE_CONTEXT[city.toLowerCase()] ?? GENERIC_CONTEXT;
  const editorialTrails = getEditorialTrails({ city });
  const canonicalUrl = `${SEO_ORIGIN}/${placePath}/${encodeURIComponent(city)}`;

  useEffect(() => {
    const title = `Independent culture in ${city}`;
    const description =
      city.toLowerCase() === "anceu"
        ? "Find the artists, spaces, and local cultural context connected to Anceu, Galicia through Countercult."
        : `Find real culture, artists, spaces, and local knowledge in ${city} through Countercult's curated public network.`;
    document.title = `${title} | Countercult`;
    setSeoMeta("name", "description", description);
    setSeoMeta("name", "robots", isLoading || filtered.length < 2 ? "noindex, follow" : "index, follow");
    setSeoMeta("property", "og:title", `${title} | Countercult`);
    setSeoMeta("property", "og:description", description);
    setSeoMeta("property", "og:url", canonicalUrl);
    setSeoMeta("name", "twitter:title", `${title} | Countercult`);
    setSeoMeta("name", "twitter:description", description);
    setCanonical(canonicalUrl);
    const script = setJsonLd("countercult-city-jsonld", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${canonicalUrl}#page`,
          name: title,
          description,
          url: canonicalUrl,
          isPartOf: { "@id": `${SEO_ORIGIN}/#website` },
          about: { "@id": `${canonicalUrl}#place` },
          mainEntity: { "@id": `${canonicalUrl}#list` },
          subjectOf: editorialTrails.map((trail) => ({
            "@type": "Article",
            name: trail.title,
            url: `${SEO_ORIGIN}${trail.href}`,
          })),
        },
        {
          "@type": "Place",
          "@id": `${canonicalUrl}#place`,
          name: city,
          description: context.intro,
          ...(city.toLowerCase() === "anceu"
            ? { containedInPlace: { "@type": "AdministrativeArea", name: "Galicia, Spain" } }
            : {}),
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#list`,
          name: title,
          numberOfItems: filtered.length,
          itemListElement: filtered.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": entry.kind === "artist" ? "Person" : entry.kind === "space" ? "Place" : "CreativeWork",
              "@id": `${SEO_ORIGIN}/entries/${entry.id}`,
              name: entry.name,
              url: `${SEO_ORIGIN}/entries/${entry.id}`,
            },
          })),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Countercult", item: `${SEO_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "Explore", item: `${SEO_ORIGIN}/explore` },
            { "@type": "ListItem", position: 3, name: city, item: canonicalUrl },
          ],
        },
      ],
    });
    return () => script.remove();
  }, [canonicalUrl, city, filtered, isLoading]);

  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-3 md:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2" aria-label="countercult home">
          <img src="/images/cc-logo-white.png" alt="countercult" className="h-6 w-6 object-contain" />
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 sm:inline">
            countercult
          </span>
        </a>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-white/25 md:inline">
            public place page
          </span>
          <a href="/explore" className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-[#c6ff3d]">
             ← search for culture
          </a>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 px-5 pb-12 pt-10 md:px-10 md:pb-20 md:pt-16">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:gap-20">
            <div>
              <div className="mb-5 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">
                <span className="h-2 w-2 bg-[#c6ff3d]" aria-hidden="true" />
                {context.eyebrow}
              </div>
              <h1 className="max-w-5xl break-words font-mono text-[clamp(3.25rem,10vw,8.5rem)] font-black uppercase leading-[0.82] tracking-[-0.08em] text-[#c6ff3d]">
                {city || "place"}
              </h1>
              <p className="mt-8 max-w-2xl text-[clamp(1.25rem,2.5vw,2.2rem)] leading-[1.05] tracking-[-0.03em] text-white/90">
                {context.intro}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                <span>{isLoading ? "loading public entries" : `${filtered.length} public entr${filtered.length !== 1 ? "ies" : "y"}`}</span>
                <span className="text-white/15">/</span>
                <span>approved public layer</span>
              </div>
            </div>
            <aside className="self-end border-l-2 border-[#c6ff3d] pl-5 md:pl-7">
              <div className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                place context
              </div>
              <ul className="space-y-4 text-sm leading-relaxed text-white/75">
                {context.facts.map((fact) => (
                  <li key={fact} className="flex gap-3">
                    <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 bg-[#c6ff3d]" aria-hidden="true" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/45">{context.note}</p>
            </aside>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#11110f] px-5 py-10 md:px-10 md:py-14">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d]">start here</div>
              <h2 className="mt-4 max-w-sm font-mono text-2xl font-bold uppercase leading-tight tracking-[-0.04em] text-white md:text-3xl">
                Follow the public entries into the place.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-white/65">
                Countercult is a free, curated public network of artists, physical spaces, and local culture. These are the entries currently approved for {city || "this place"}. Use them as practical starting points: an artist to meet, a space to visit, or local knowledge to build around.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                <span>for artists: be findable</span>
                <span>for visitors: find a route in</span>
                <span>for place teams: see what is here</span>
              </div>
            </div>
          </div>
        </section>

        <EditorialTrail
          trails={editorialTrails}
          tone="dark"
          title="read the place, then explore it"
          description="The Journal adds context to the people and places here, then routes you back into the public cultural record."
        />

        <section className="px-5 py-10 md:px-10 md:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">the public layer</div>
                <h2 className="mt-2 font-mono text-xl font-bold uppercase tracking-[-0.03em] text-white md:text-2xl">
                  artists, spaces, and local culture
                </h2>
              </div>
              <a href="/explore" className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:text-white">
                 search all culture →
              </a>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-52 animate-pulse border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : isError ? (
              <div className="border border-[#c6ff3d]/40 bg-[#c6ff3d]/5 px-5 py-10 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/70">
                  the public entries could not be loaded
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-5 border border-[#c6ff3d] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black"
                >
                  try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="border border-dashed border-white/20 px-5 py-14 text-center">
                <p className="font-mono text-sm uppercase tracking-[0.14em] text-white/45">
                  no approved public entries found for “{city}”
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/35">
                  The absence of a listing is not a measure of what exists. If you know a cultural place or artist here, help make the connection findable.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/explore?action=join")}
                  className="mt-6 bg-[#c6ff3d] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white"
                >
                  suggest an entry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((entry) => {
                  const additionalBases = getAdditionalBaseCities(entry);
                  const primaryLocation = [entry.city, entry.country].filter(Boolean).join(", ");
                  return (
                  <a
                    key={entry.id}
                    href={`/entries/${entry.id}`}
                    className="group flex min-h-52 flex-col border border-white/10 bg-white/[0.04] text-left transition-colors hover:border-[#c6ff3d] hover:bg-[#c6ff3d]"
                  >
                    {entry.heroPhoto ? (
                      <img
                        src={entry.heroPhoto}
                        alt=""
                        className="h-36 w-full border-b border-white/10 object-cover grayscale transition-[filter] duration-300 group-hover:border-black group-hover:grayscale-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-36 items-end border-b border-white/10 bg-[#080808] p-4 transition-colors group-hover:border-black group-hover:bg-[#c6ff3d]">
                        <span className="h-8 w-8 border-2 border-[#c6ff3d] group-hover:border-black" aria-hidden="true" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between gap-5 p-4">
                      <div>
                        <div className="font-mono text-sm font-bold uppercase leading-tight text-white group-hover:text-black">{entry.name}</div>
                        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/40 group-hover:text-black/60">{primaryLocation}</div>
                        {additionalBases.length > 0 && (
                          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/35 group-hover:text-black/55">
                            also based in {additionalBases.join(" · ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40 group-hover:border-black/20 group-hover:text-black/60">
                        <span>{KIND_LABEL[entry.kind] ?? entry.kind}</span>
                        <span aria-hidden="true">view →</span>
                      </div>
                    </div>
                  </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#c6ff3d] px-5 py-10 text-black md:px-10 md:py-14">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">for places and place teams</div>
              <p className="mt-4 text-[clamp(1.45rem,3vw,2.7rem)] font-bold leading-[1.02] tracking-[-0.045em]">
                Represent a place, destination, institution, or development? Work with Countercult to make local culture easier to find, experience, and support. Explore Studios for Places →
              </p>
            </div>
            <a
              href="/studios/places"
              onClick={() => trackEvent("studios_cta_clicked", { source_route: window.location.pathname, placement: "city_places" })}
              className="inline-flex min-h-12 items-center justify-center border-2 border-black px-5 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-[#c6ff3d]"
            >
              Explore Studios for Places →
            </a>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-8 md:px-10">
        <a href="/explore" className="border border-white/20 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/50 transition-colors hover:border-[#c6ff3d] hover:text-[#c6ff3d]">
           ← search for culture
        </a>
        <button
          type="button"
          onClick={() => navigate("/explore?action=join")}
          className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#c6ff3d]"
        >
          suggest an entry
        </button>
      </footer>
    </div>
  );
}