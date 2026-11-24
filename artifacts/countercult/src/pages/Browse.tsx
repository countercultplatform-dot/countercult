import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useListEntries } from "@workspace/api-client-react";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta } from "@/lib/seo";

const KIND_GLYPH: Record<string, string> = {
  artist: "◉",
  space: "▣",
  artifact: "◬",
};

const KIND_LABEL: Record<string, string> = {
  artist: "artists",
  space: "spaces",
  artifact: "artifacts",
};

const KIND_DESC: Record<string, string> = {
  artist: "musicians, djs, performers, creatives, collectives, and communities",
  space: "clubs, studios, galleries, and cultural spaces",
  artifact: "murals, traditions, objects, ruins, and cultural things tied to a place",
};

export default function Browse() {
  const { kind } = useParams<{ kind: string }>();
  const [, navigate] = useLocation();
  const { data: entries = [], isLoading } = useListEntries();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const byKind = entries.filter((e) => e.kind === kind);
    if (!search.trim()) return byKind;
    const q = search.toLowerCase();
    return byKind.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
    );
  }, [entries, kind, search]);

  const validKinds = ["artist", "space", "artifact"];

  useEffect(() => {
    if (!validKinds.includes(kind ?? "")) return;
    const label = KIND_LABEL[kind ?? "artist"];
    const title = `${label.charAt(0).toUpperCase()}${label.slice(1)} on the Countercult Culture Map`;
    const description = kind === "artist"
      ? "Find independent artists, collectives, and cultural workers by city, practice, and tag on Countercult's curated public culture map."
      : `Browse approved public ${label}, their cities, tags, and voices on Countercult's curated culture map.`;
    const canonicalUrl = `${SEO_ORIGIN}/browse/${kind}`;
    document.title = `${title} | Countercult`;
    setSeoMeta("name", "description", description);
    setSeoMeta("name", "robots", isLoading || filtered.length < 2 ? "noindex, follow" : "index, follow");
    setSeoMeta("property", "og:title", `${title} | Countercult`);
    setSeoMeta("property", "og:description", description);
    setSeoMeta("property", "og:url", canonicalUrl);
    setSeoMeta("name", "twitter:title", `${title} | Countercult`);
    setSeoMeta("name", "twitter:description", description);
    setCanonical(canonicalUrl);
    const items = filtered.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: `${SEO_ORIGIN}/entries/${entry.id}`,
    }));
    const script = setJsonLd("countercult-browse-jsonld", {
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
          numberOfItems: items.length,
          itemListElement: items,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Countercult", item: `${SEO_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: title, item: canonicalUrl },
          ],
        },
      ],
    });
    return () => script.remove();
  }, [filtered, isLoading, kind]);

  if (!validKinds.includes(kind ?? "")) {
    navigate("/");
    return null;
  }

  return (
    <div className="h-dvh flex flex-col bg-black text-white font-sans lowercase selection:bg-[#c6ff3d] selection:text-black">

      {/* Top bar */}
      <div className="shrink-0 sticky top-0 z-10 bg-black border-b border-white/10">
        {/* Row 1: back + logo + kind filters */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/10">
          <a href="/" className="shrink-0">
            <img src="/images/cc-logo-white.png" alt="countercult" className="h-6 w-6 object-contain" />
          </a>
          <button
            onClick={() => navigate("/")}
            className="text-[9px] uppercase tracking-widest font-bold text-white/50 border border-white/20 px-2.5 py-1.5 hover:border-[#c6ff3d] hover:text-[#c6ff3d] transition-colors shrink-0"
          >
            ← map
          </button>
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {(["artist", "space", "artifact"] as const).map((k) => (
              <button
                key={k}
                onClick={() => { navigate(`/browse/${k}`); setSearch(""); }}
                className={`flex-1 min-w-0 text-[9px] uppercase tracking-widest font-bold px-2 py-1.5 border transition-colors whitespace-nowrap ${
                  k === kind
                    ? "bg-[#c6ff3d] text-black border-[#c6ff3d]"
                    : "border-white/20 text-white/40 hover:border-white/60 hover:text-white"
                }`}
              >
                {KIND_GLYPH[k]} {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        {/* Row 2: search - always visible, full width */}
        <div className="px-4 py-2.5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`search ${KIND_LABEL[kind ?? "artist"] ?? ""}…`}
              className="w-full border border-white/20 bg-white/5 text-white font-mono text-sm px-3 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-[#c6ff3d] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-10 pb-8 border-b-2 border-black bg-black text-white">
        <div className="text-[72px] md:text-[96px] font-mono font-black uppercase leading-none tracking-tight text-[#c6ff3d]">
          {KIND_GLYPH[kind ?? "artist"]}
        </div>
        <div className="text-[40px] md:text-[60px] font-mono font-black uppercase leading-none mt-2">
          {KIND_LABEL[kind ?? "artist"]}
        </div>
        <p className="text-white/50 text-sm mt-4 font-sans max-w-md">
          {KIND_DESC[kind ?? "artist"]}
        </p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
            {isLoading ? "loading…" : `${filtered.length} entr${filtered.length !== 1 ? "ies" : "y"}${search ? ` matching "${search}"` : " on the map"}`}
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[10px] uppercase tracking-widest font-bold text-[#c6ff3d] border border-[#c6ff3d]/40 px-2 py-0.5 hover:bg-[#c6ff3d] hover:text-black transition-colors"
            >
              clear ✕
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

      {/* Grid */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-36 border-2 border-black/10 animate-pulse bg-black/5" />
            ))
          : filtered.length === 0
          ? (
            <div className="col-span-full py-20 text-center">
              <div className="text-4xl font-mono text-white/10 mb-4">{KIND_GLYPH[kind ?? "artist"]}</div>
              <div className="text-sm font-mono text-white/30 uppercase tracking-widest">
                {search ? `nothing matching "${search}"` : "no entries yet"}
              </div>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 text-[10px] uppercase tracking-widest font-bold border border-white/20 px-3 py-1.5 hover:border-[#c6ff3d] hover:text-[#c6ff3d] transition-colors"
                >
                  clear search
                </button>
              )}
            </div>
          )
          : filtered.map((entry) => (
              <a
                key={entry.id}
                href={`/entries/${entry.id}`}
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
                      {KIND_GLYPH[kind ?? "artist"]}
                    </span>
                  </div>
                )}
                <div className="p-3 flex flex-col gap-1">
                  <div className="font-mono font-bold text-[11px] uppercase leading-tight break-words line-clamp-2 text-white group-hover:text-black">
                    {entry.name}
                  </div>
                  <div className="text-[9px] text-white/40 group-hover:text-black/60 truncate font-sans">
                    {entry.city}, {entry.country}
                  </div>
                </div>
              </a>
            ))}
      </div>

      </div>{/* end scrollable */}

      {/* Footer - always visible */}
      <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-black flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-[10px] uppercase tracking-widest font-bold text-white/50 border border-white/20 px-4 py-2 hover:border-[#c6ff3d] hover:text-[#c6ff3d] transition-colors"
        >
          ← back to map
        </button>
        <button
          onClick={() => navigate("/submit")}
          className="text-[10px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black border-2 border-[#c6ff3d] px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors"
        >
          + add entry
        </button>
      </div>
    </div>
  );
}
