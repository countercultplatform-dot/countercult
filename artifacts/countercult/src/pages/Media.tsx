import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Marquee } from "@/components/Marquee";

interface Post {
  id: number;
  kind: "editorial" | "member";
  title: string;
  body: string;
  authorName: string;
  authorEntryId: number | null;
  heroImage: string | null;
  tags: string[];
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function tagColor(tag: string) {
  const hash = Array.from(tag).reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 3 === 0 ? "bg-[#c6ff3d] text-black" : hash % 3 === 1 ? "bg-black text-[#c6ff3d]" : "bg-white border border-black text-black";
}

export default function Media() {
  const [, navigate] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const r = await fetch("/api/posts");
        if (!r.ok) throw new Error(`posts request failed: ${r.status}`);
        const result: unknown = await r.json();
        if (!Array.isArray(result)) throw new Error("posts response was not a list");
        if (active) setPosts(result as Post[]);
      } catch {
        if (active) {
          setPosts([]);
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [retryCount]);

  const editorial = posts.filter((p) => p.kind === "editorial");

  return (
    <div className="min-h-[100dvh] bg-[#f3efe7] text-black font-mono lowercase selection:bg-[#c6ff3d]">

      {/* Header */}
      <header className="bg-white border-b-2 border-black">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="shrink-0">
              <img src="/images/cc-logo-black.png" alt="countercult" className="h-8 w-8 object-contain" />
            </a>
            <div className="hidden sm:block">
              <div className="text-[9px] uppercase tracking-widest text-black/40">countercult</div>
              <h1 className="text-sm font-bold tracking-widest uppercase leading-none">media</h1>
            </div>
          </div>
          <form
          onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement)?.value.trim(); window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore'; }}
            className="flex-1 min-w-0"
          >
            <input
              type="text"
              placeholder="search the map…"
              defaultValue={new URLSearchParams(window.location.search).get('q') ?? ''}
              className="w-full bg-black/5 border border-black/10 focus:border-black/40 px-3 py-1.5 text-[11px] font-mono text-black placeholder:text-black/25 focus:outline-none transition-colors"
            />
          </form>
          <a href="/explore" className="shrink-0 text-xs text-black/40 hover:text-black transition-colors uppercase tracking-widest font-bold">
            ← map
          </a>
        </div>
        <Marquee
          text="features • interviews • local context • shared resources • sustainable local economies • exchange •"
          className="bg-[#c6ff3d] !text-black !py-1 text-xs"
          speed={70}
        />
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <a
          href="/media/countercult-free/"
          className="block border-2 border-black bg-[#c6ff3d] mb-6 shadow-[5px_5px_0_#000] hover:bg-white transition-colors"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-stretch">
            <img
              src="/images/countercult-free.webp"
              alt="countercult free shareable graphic"
              width="1506"
              height="1890"
              loading="lazy"
              decoding="async"
              className="w-full h-44 sm:h-full object-cover object-top border-b-2 sm:border-b-0 sm:border-r-2 border-black"
            />
            <div className="p-5 flex flex-col justify-center">
              <div className="text-[9px] uppercase tracking-widest font-bold text-black/50 mb-2">shareable graphic · countercult free</div>
              <h2 className="text-2xl font-black uppercase leading-none mb-2">send the free network around</h2>
              <p className="text-xs leading-relaxed text-black/65 max-w-xl">A free map for artists, spaces, and people who make things happen. Open it →</p>
            </div>
          </div>
        </a>

        <section aria-labelledby="media-channels-heading" className="mb-6 border-2 border-black bg-white shadow-[5px_5px_0_#000]">
          <div className="border-b-2 border-black bg-black px-5 py-4 text-white">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#c6ff3d]">our media channels</p>
            <h2 id="media-channels-heading" className="mt-2 text-xl font-black uppercase leading-none">where to find Countercult</h2>
          </div>
          <div className="grid grid-cols-1 divide-y-2 divide-black sm:grid-cols-3 sm:divide-y-0 sm:divide-x-2">
            <article className="flex flex-col p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-black/45">publication</p>
              <h3 className="mt-2 text-lg font-black uppercase">Substack</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-black/65">
                Read Countercult’s journal, interviews, and field notes from the network.
              </p>
              <a
                href="https://countercultplatform.substack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-10 items-center self-start border-2 border-black bg-[#c6ff3d] px-3 text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                read + subscribe ↗
              </a>
            </article>
            <article className="flex flex-col p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-black/45">professional updates</p>
              <h3 className="mt-2 text-lg font-black uppercase">LinkedIn</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-black/65">
                Follow Countercult Studios for project and partnership updates.
              </p>
              <a
                href="https://www.linkedin.com/company/countercult-studios/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-10 items-center self-start border-2 border-black bg-white px-3 text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                follow on LinkedIn ↗
              </a>
            </article>
            <article className="flex flex-col p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-black/45">social</p>
              <h3 className="mt-2 text-lg font-black uppercase">Instagram</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-black/65">
                We’d love to move off Instagram, but we still share work and updates there for now.
              </p>
              <a
                href="https://www.instagram.com/countercult_creatives/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-10 items-center self-start border-2 border-black bg-white px-3 text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                visit Instagram ↗
              </a>
            </article>
          </div>
        </section>

        <div className="border-2 border-black bg-white p-5 mb-6">
          <div className="text-[9px] uppercase tracking-widest font-bold text-black/40 mb-2">up next · exchange residency</div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase leading-none mb-2">the cohort will be documented here</h2>
              <p className="text-xs leading-relaxed text-black/60 max-w-xl">
                selected artists from the first Exchange Residency cohort will share reflections and process notes in Countercult Media.
                cohort features are part of the programme, with participant consent.
              </p>
            </div>
            <a href="/residency" className="shrink-0 text-[10px] uppercase tracking-widest font-bold border-2 border-black px-4 py-2 bg-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d] transition-colors">
              learn about the exchange →
            </a>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-black/5 border-2 border-black/10 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="border-2 border-black bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-black uppercase tracking-widest">posts couldn’t load</h2>
            <p className="mt-3 text-sm leading-relaxed text-black/60">The media list is temporarily unavailable. Try again in a moment.</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-6 border-2 border-black bg-[#c6ff3d] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d]"
            >
              retry
            </button>
          </div>
        ) : editorial.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-6xl text-black/10 mb-4">✦</div>
            <div className="text-sm font-mono text-black/30 uppercase tracking-widest">no posts yet</div>
          </div>
        ) : (
          <section>
            {/* Featured (first editorial) */}
            {editorial[0] && (
              <div
                className="border-2 border-black bg-black text-white mb-4 cursor-pointer hover:bg-[#c6ff3d] hover:text-black group transition-colors"
                onClick={() => navigate(`/media/${editorial[0]!.id}`)}
              >
                {editorial[0].heroImage && (
                  <img src={editorial[0].heroImage} alt="" className="w-full h-56 object-cover border-b-2 border-black" />
                )}
                <div className="p-6">
                  <div className="text-[9px] uppercase tracking-widest text-[#c6ff3d] group-hover:text-black font-bold mb-2">
                    ✦ editorial · {timeAgo(editorial[0].createdAt)}
                  </div>
                  <h2 className="text-2xl font-black uppercase leading-tight mb-3">{editorial[0].title}</h2>
                  <p className="text-sm text-white/60 group-hover:text-black/60 leading-relaxed line-clamp-3">{editorial[0].body}</p>
                  {editorial[0].tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {editorial[0].tags.map((t) => (
                        <span key={t} className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 ${tagColor(t)}`}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of posts */}
            {editorial.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editorial.slice(1).map((post) => (
                  <div
                    key={post.id}
                    className="border-2 border-black bg-white cursor-pointer hover:bg-[#c6ff3d] group transition-colors shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                    onClick={() => navigate(`/media/${post.id}`)}
                  >
                    {post.heroImage && (
                      <img src={post.heroImage} alt="" className="w-full h-32 object-cover border-b-2 border-black" />
                    )}
                    <div className="p-4">
                      <div className="text-[9px] uppercase tracking-widest text-black/30 font-bold mb-1">
                        ✦ {timeAgo(post.createdAt)}
                      </div>
                      <h3 className="font-black uppercase text-sm leading-tight mb-2">{post.title}</h3>
                      <p className="text-xs text-black/50 leading-relaxed line-clamp-2">{post.body}</p>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.map((t) => (
                            <span key={t} className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-black text-[#c6ff3d]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black bg-white px-6 py-6">
        <a href="/explore" className="text-[10px] uppercase tracking-widest font-bold border-2 border-black px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors">
          ← back to map
        </a>
      </div>
    </div>
  );
}
