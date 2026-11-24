import { useState, useEffect } from "react";
import { Marquee } from "@/components/Marquee";

interface NewsItem {
  title: string;
  link: string;
  date: string;
  isoDate: string;
  excerpt: string;
  thumbnail: string | null;
}

function formatDate(isoDate: string) {
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/news");
        if (!r.ok) throw new Error(`${r.status}`);
        setItems(await r.json() as NewsItem[]);
      } catch (e: any) {
        setError("could not load news - try again shortly");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#F9F9F6] border-b border-black/10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="shrink-0">
              <img src="/images/cc-logo-black.png" alt="countercult" className="h-8 w-8 object-contain" />
            </a>
            <div className="hidden sm:block">
              <div className="text-[9px] uppercase tracking-widest text-black/30">countercult</div>
              <h1 className="text-sm font-bold tracking-widest uppercase leading-none">news</h1>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = (e.currentTarget.querySelector("input") as HTMLInputElement)?.value.trim();
              window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : "/explore";
            }}
            className="flex-1 min-w-0"
          >
            <input
              type="text"
              placeholder="search the map…"
              className="w-full bg-black/5 border border-black/10 focus:border-black/40 px-3 py-1.5 text-[11px] font-mono text-black placeholder:text-black/25 focus:outline-none transition-colors"
            />
          </form>
          <a href="/explore" className="shrink-0 text-xs text-black/40 hover:text-black transition-colors uppercase tracking-widest font-bold">
            ← map
          </a>
        </div>

        <Marquee
          text="COUNTERCULT // NEWS // CULTURE THAT HAPPENS OFFLINE // SHARED RESOURCES // "
          speed={38}
          className="text-[9px]"
        />
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        <div className="mb-7 border-2 border-black bg-[#c6ff3d] p-4 sm:flex sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-black/55">from time to time</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] leading-none">stay in the loop</h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-black/65">
              a person, a place, a project, or a useful lead. if it is worth passing on, it goes in here.
            </p>
          </div>
          <a
            href="https://countercultplatform.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex shrink-0 border-2 border-black bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-white hover:text-black sm:mt-0"
          >
            follow on substack ↗
          </a>
        </div>

        {/* Section label */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xs uppercase tracking-[0.18em] font-bold text-black/50">
              notes
            </h2>
            <p className="text-[10px] text-black/30 mt-0.5 uppercase tracking-widest">
              from countercult on substack
            </p>
          </div>
          <a
            href="https://countercultplatform.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] uppercase tracking-widest font-bold border border-black/20 px-3 py-1.5 hover:bg-black hover:text-[#c6ff3d] transition-colors"
          >
            follow ↗
          </a>
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-black/10 bg-white animate-pulse">
                <div className="h-36 bg-black/5" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-3 bg-black/10 rounded w-1/4" />
                  <div className="h-5 bg-black/10 rounded w-3/4" />
                  <div className="h-3 bg-black/8 rounded w-full" />
                  <div className="h-3 bg-black/8 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-black/10 p-6 text-center">
            <p className="text-sm text-black/50">{error}</p>
            <a
              href="https://countercultplatform.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] px-4 py-2 bg-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d] transition-colors"
            >
              read on substack ↗
            </a>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="border border-black/10 p-8 text-center">
            <p className="text-sm text-black/40 uppercase tracking-widest">no posts yet</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-0 border border-black/10">
            {items.map((item, i) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white hover:bg-[#f5ffe0] transition-colors border-b border-black/10 last:border-b-0"
              >
                {/* Thumbnail - full bleed if present */}
                {item.thumbnail && (
                  <div className="overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-full object-cover"
                      style={{ maxHeight: i === 0 ? 280 : 160 }}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.remove(); }}
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Date */}
                  <div className="text-[9px] uppercase tracking-widest text-black/35 mb-2 font-bold">
                    {formatDate(item.isoDate)}
                  </div>

                  {/* Title */}
                  <h3
                    style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                    className="text-base font-extrabold text-black leading-tight mb-2 group-hover:underline group-hover:[text-decoration-color:#c6ff3d] [text-underline-offset:3px]"
                  >
                    {item.title}
                  </h3>

                  {/* Excerpt */}
                  {item.excerpt && (
                    <p className="text-[12px] text-black/60 leading-relaxed line-clamp-3">
                      {item.excerpt}
                    </p>
                  )}

                  <div className="mt-3 text-[9px] uppercase tracking-widest font-bold text-black/30 group-hover:text-[#555] transition-colors">
                    read on substack ↗
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        {!loading && items.length > 0 && (
          <div className="mt-6 text-center pb-2">
            <a
              href="https://countercultplatform.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-widest font-bold border-2 border-black px-5 py-2.5 hover:bg-black hover:text-[#c6ff3d] transition-colors inline-block"
            >
              all posts on substack ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
