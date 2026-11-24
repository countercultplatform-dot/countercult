import { useParams } from "wouter";
import { useEffect } from "react";
import { getListResidencyOffersQueryKey, useListEntries, useListResidencyOffers } from "@workspace/api-client-react";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta } from "@/lib/seo";
import { normalizeTags } from "@/data/tags";

const KIND_GLYPH: Record<string, string> = {
  artist: "◉",
  space: "▣",
  artifact: "◬",
};
const routeUrl = (path: string) =>
  `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export default function TagBrowse() {
  const { tag } = useParams<{ tag: string }>();
  const { data: entries = [], isLoading } = useListEntries();

  const decoded = decodeURIComponent(tag ?? "");
  const normalizedTag = normalizeTags([decoded])[0] ?? decoded.toLowerCase().trim();
  const sessionToken = (() => {
    try {
      const session = JSON.parse(localStorage.getItem("cc_auth") ?? "null") as { token?: string } | null;
      return session?.token ?? null;
    } catch {
      return null;
    }
  })();
  const { data: offers = [], isLoading: offersLoading } = useListResidencyOffers({
    query: { queryKey: [...getListResidencyOffersQueryKey(), "tag-browse", normalizedTag, sessionToken ? "member" : "public"] },
    request: { headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined },
  });
  const filtered = entries.filter((e) =>
    normalizeTags([...(e.tags ?? []), ...(e.openTo ?? [])]).includes(normalizedTag)
  );
  const matchingOffers = offers.filter((offer) =>
    [...(offer.tags ?? []), ...((offer as typeof offer & { publicTags?: string[] }).publicTags ?? [])].some((offerTag) =>
      (normalizeTags([offerTag])[0] ?? offerTag.toLowerCase().trim()) === normalizedTag
    )
  );

  useEffect(() => {
    const title = `${normalizedTag} artists, spaces, and cultural places`;
    const description = `Find artists, spaces, and cultural places tagged ${normalizedTag} in Countercult's curated public culture map.`;
    const canonicalUrl = `${SEO_ORIGIN}/tag/${encodeURIComponent(normalizedTag)}`;
    document.title = `${title} | Countercult`;
    setSeoMeta("name", "description", description);
    setSeoMeta("name", "robots", isLoading || filtered.length < 2 ? "noindex, follow" : "index, follow");
    setSeoMeta("property", "og:title", `${title} | Countercult`);
    setSeoMeta("property", "og:description", description);
    setSeoMeta("property", "og:url", canonicalUrl);
    setSeoMeta("name", "twitter:title", `${title} | Countercult`);
    setSeoMeta("name", "twitter:description", description);
    setCanonical(canonicalUrl);
    const script = setJsonLd("countercult-tag-jsonld", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${canonicalUrl}#page`,
          name: title,
          description,
          url: canonicalUrl,
          isPartOf: { "@id": `${SEO_ORIGIN}/#website` },
          mainEntity: { "@id": `${canonicalUrl}#list` },
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
            { "@type": "ListItem", position: 2, name: "Tags", item: `${SEO_ORIGIN}/explore` },
            { "@type": "ListItem", position: 3, name: normalizedTag, item: canonicalUrl },
          ],
        },
      ],
    });
    return () => script.remove();
  }, [filtered, isLoading, normalizedTag]);

  return (
    <div className="min-h-screen bg-black text-white font-sans lowercase selection:bg-[#c6ff3d] selection:text-black">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-black border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
         <a href={routeUrl("/")} className="shrink-0">
          <img src={routeUrl("/images/cc-logo-white.png")} alt="countercult" className="h-6 w-6 object-contain" />
        </a>
        <form
          onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement)?.value.trim(); window.location.href = routeUrl(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore"); }}
          className="flex-1 min-w-0"
        >
          <input
            type="text"
            placeholder="search the map…"
            defaultValue={new URLSearchParams(window.location.search).get('q') ?? ''}
            className="w-full bg-white/5 border border-white/10 focus:border-[#c6ff3d]/50 px-3 py-1.5 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none transition-colors"
          />
        </form>
        <a
          href={routeUrl("/")}
          className="shrink-0 text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-[#c6ff3d] transition-colors"
        >
          ← map
        </a>
      </div>

      {/* Hero */}
      <div className="px-6 pt-10 pb-8 border-b-2 border-black bg-black text-white">
        <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-3">tagged with</div>
        <div className="text-[56px] md:text-[80px] font-mono font-black uppercase leading-none text-[#c6ff3d]">
          {normalizedTag}
        </div>
        <p className="text-white/50 text-sm mt-4 font-sans">
          all entries on the map tagged with this keyword
        </p>
        <div className="mt-4 text-[10px] uppercase tracking-widest text-white/30 font-mono">
           {isLoading || offersLoading ? "loading…" : `${filtered.length} entr${filtered.length !== 1 ? "ies" : "y"}${matchingOffers.length ? ` · ${matchingOffers.length} exchange listing${matchingOffers.length === 1 ? "" : "s"}` : ""}`}
        </div>
      </div>

      {matchingOffers.length > 0 && (
        <section className="border-t border-white/10 px-5 py-7" aria-labelledby="tag-exchange-listings">
          <h2 id="tag-exchange-listings" className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d]">
            exchange listings
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchingOffers.map((offer) => (
              <a
                key={offer.id}
                 href={routeUrl(`/residency?tag=${encodeURIComponent(normalizedTag)}`)}
                className="border border-white/20 bg-white/5 p-4 transition-colors hover:border-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black"
              >
                <span className="block font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">{offer.city}</span>
                <span className="mt-2 block text-sm font-bold leading-snug">{offer.description}</span>
                <span className="mt-3 block text-[9px] font-bold uppercase tracking-widest">view on Exchange ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Grid */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 border-2 border-black/10 animate-pulse bg-black/5" />
            ))
          : filtered.length === 0
          ? (
              <div className="col-span-full py-16 text-center text-white/30 text-sm uppercase tracking-widest font-mono">
                no entries found for "{normalizedTag}"
              </div>
            )
          : filtered.map((entry) => (
              <a
                key={entry.id}
                href={routeUrl(`/entries/${entry.id}`)}
                className="border border-white/10 p-0 text-left flex flex-col bg-white/5 hover:bg-[#c6ff3d] hover:border-[#c6ff3d] transition-all group"
              >
                {entry.heroPhoto ? (
                  <img
                    src={entry.heroPhoto}
                    alt=""
                    className="w-full h-28 object-cover border-b border-white/10 group-hover:border-black"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-28 bg-black flex items-center justify-center border-b border-white/10 group-hover:bg-[#c6ff3d] transition-colors">
                    <span className="text-[#c6ff3d] group-hover:text-black text-3xl transition-colors">
                      {KIND_GLYPH[entry.kind as string] ?? "?"}
                    </span>
                  </div>
                )}
                <div className="p-3 flex flex-col gap-1.5">
                  <div className="font-mono font-bold text-[11px] uppercase truncate leading-tight text-white group-hover:text-black">
                    {entry.name}
                  </div>
                  <div className="text-[9px] text-white/40 group-hover:text-black/60 truncate font-sans">
                    {entry.city}, {entry.country}
                  </div>
                  <div className="text-[8px] uppercase tracking-wider text-white/30 group-hover:text-black/40 font-mono">
                    {entry.kind}
                  </div>
                </div>
              </a>
            ))}
      </div>

      {/* Related tags - all unique tags from matching entries */}
      {filtered.length > 0 && (
        <div className="px-6 pb-10 border-t border-white/10 pt-6">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-3">related tags</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(
                normalizeTags(
                  filtered.flatMap((e) => [...(e.tags ?? []), ...(e.openTo ?? [])])
                ).filter((t) => t !== normalizedTag)
            ).map((t: string) => (
              <a
                key={t}
                href={routeUrl(`/tag/${encodeURIComponent(t)}`)}
                className="text-[10px] uppercase tracking-widest border border-white/20 px-2 py-0.5 hover:border-[#c6ff3d] hover:text-[#c6ff3d] transition-colors"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-8 border-t border-white/10 flex items-center justify-between">
        <a
          href={routeUrl("/")}
          className="text-[10px] uppercase tracking-widest font-bold text-white/50 border border-white/20 px-4 py-2 hover:border-[#c6ff3d] hover:text-[#c6ff3d] transition-colors"
        >
          ← back to map
        </a>
        <button
          onClick={() => history.back()}
          className="text-[10px] uppercase tracking-widest font-bold text-white/30 hover:text-white transition-colors"
        >
          ← back
        </button>
      </div>
    </div>
  );
}
