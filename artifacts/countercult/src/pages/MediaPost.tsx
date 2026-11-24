import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Marquee } from "@/components/Marquee";

interface Post {
  id: number;
  kind: "editorial" | "member";
  title: string;
  body: string;
  authorName: string;
  authorEntryId: number | null;
  authorEmail: string | null;
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
  return days < 30 ? `${days}d ago` : new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MediaPost() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const session = (() => {
    try { return JSON.parse(localStorage.getItem("cc_auth") ?? "null"); } catch { return null; }
  })();

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      setLoadError(false);
      setPost(null);
      try {
        const r = await fetch(`/api/posts/${id ?? ""}`);
        if (r.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        if (!r.ok) throw new Error(`post request failed: ${r.status}`);
        const result: unknown = await r.json();
        if (!result || typeof result !== "object") throw new Error("post response was invalid");
        if (active) setPost(result as Post);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, retryCount]);

  const handleDelete = async () => {
    if (!confirm("delete this post?")) return;
    const r = await fetch(`/api/posts/${id ?? ""}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.token ?? ""}` },
    });
    if (r.ok) navigate("/media");
  };

  const canDelete = session && post && (session.email === post.authorEmail || post.kind === "editorial");

  return (
    <div className="min-h-[100dvh] bg-[#f3efe7] text-black font-mono lowercase selection:bg-[#c6ff3d]">
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
          <a href="/media" className="shrink-0 text-xs text-black/40 hover:text-black transition-colors uppercase tracking-widest font-bold">
            ← posts
          </a>
        </div>
        <Marquee
          text="features • interviews • artist posts • culture notes • residency reports • event reviews •"
          className="bg-[#c6ff3d] !text-black !py-1 text-xs"
          speed={70}
        />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 bg-black/5 animate-pulse" />
            <div className="h-4 bg-black/5 animate-pulse w-1/2" />
            <div className="h-48 bg-black/5 animate-pulse mt-8" />
          </div>
        ) : notFound ? (
          <div className="py-24 text-center">
            <div className="text-6xl text-black/10 mb-4">✦</div>
            <div className="text-sm text-black/30 uppercase tracking-widest">post not found</div>
            <button onClick={() => navigate("/media")} className="mt-6 text-[10px] uppercase tracking-widest font-bold border border-black px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors">
              ← back to media
            </button>
          </div>
        ) : loadError ? (
          <div role="alert" className="py-24 text-center">
            <h2 className="text-lg font-black uppercase tracking-widest">post couldn’t load</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-black/60">This post is temporarily unavailable. Try again in a moment.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="text-[10px] uppercase tracking-widest font-bold border-2 border-black bg-[#c6ff3d] px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors"
              >
                retry
              </button>
              <button onClick={() => navigate("/media")} className="text-[10px] uppercase tracking-widest font-bold border border-black px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors">
                ← back to media
              </button>
            </div>
          </div>
        ) : post ? (
          <article>
            {/* Meta */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 ${post.kind === "editorial" ? "bg-black text-[#c6ff3d]" : "bg-[#c6ff3d] text-black border border-black"}`}>
                {post.kind === "editorial" ? "✦ editorial" : "◉ member post"}
              </span>
              <span className="text-[9px] text-black/30">{timeAgo(post.createdAt)}</span>
            </div>

            {/* Title */}
            <h1 className="text-[32px] md:text-[48px] font-black uppercase leading-none tracking-tight mb-4">
              {post.title}
            </h1>

            {/* Author */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-black">
              <span className="text-[10px] uppercase tracking-widest font-bold">
                {post.kind === "editorial" ? "✦ countercult" : `◉ ${post.authorName}`}
              </span>
              {post.authorEntryId && (
                <a
                  href={`/entries/${post.authorEntryId}`}
                  className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black underline decoration-[#c6ff3d]"
                >
                  view voice →
                </a>
              )}
            </div>

            {/* Hero image */}
            {post.heroImage && (
              <img src={post.heroImage} alt="" className="w-full border-2 border-black mb-6 object-cover max-h-80" />
            )}

            {/* Body */}
            <div className="text-sm leading-relaxed text-black/80 whitespace-pre-wrap mb-8">
              {post.body}
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-black/10">
                {post.tags.map((t) => (
                  <span key={t} className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 bg-black text-[#c6ff3d]">{t}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/media")} className="text-[10px] uppercase tracking-widest font-bold border-2 border-black px-4 py-2 hover:bg-black hover:text-[#c6ff3d] transition-colors">
                ← all posts
              </button>
              {canDelete && (
                <button
                  onClick={() => void handleDelete()}
                  className="text-[10px] uppercase tracking-widest font-bold border border-black/30 text-black/30 px-4 py-2 hover:border-black hover:text-black transition-colors ml-auto"
                >
                  delete
                </button>
              )}
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
