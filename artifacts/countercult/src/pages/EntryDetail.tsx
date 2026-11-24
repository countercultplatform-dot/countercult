import { useState, useEffect, useRef } from "react";
import { normalizeEntryUrl, normalizeProfileUrl } from "@/utils/normalizeProfileUrl";
import { useParams } from "wouter";
import {
  getListEntriesQueryKey,
  getListPublicArtistCardsQueryKey,
  getListResidencyOffersQueryKey,
  getGetEntryQueryKey,
  useGetEntry,
  useListEntries,
  useListPublicArtistCards,
  useListResidencyOffers,
  type EntryPin,
  type EntryKind,
} from "@workspace/api-client-react";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta, toSeoUrl } from "@/lib/seo";
import { EditorialTrail } from "@/components/EditorialTrail";
import { getEditorialTrails } from "@/data/editorialTrails";
import { formatOpenToLabel, normalizeTags } from "@/data/tags";
import { getPublicOpenTo, parseOfferings } from "@/data/profileChoices";
import { useServerValidatedSession } from "@/hooks/useServerValidatedSession";
import { ProtectedProfileImage } from "@/components/ProtectedProfileImage";

interface Experience {
  title?: string | null;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  url?: string | null;
}

const KIND_GLYPH: Record<EntryKind, string> = {
  artist: "◉",
  space: "▣",
  artifact: "◬",
};

function GeneratedAvatar({ name, kind, size = "md" }: { name: string; kind: string; size?: "sm" | "md" | "lg" }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const glyph = KIND_GLYPH[kind as EntryKind] ?? "?";
  const bg = kind === "artist" ? "bg-black" : kind === "space" ? "bg-[#c6ff3d]" : "bg-[#F9F9F6]";
  const fg = kind === "artist" ? "text-[#c6ff3d]" : "text-black";
  const border = kind === "artifact" ? "border-2 border-black" : "";
  const textSize = size === "lg" ? "text-6xl" : size === "md" ? "text-3xl" : "text-xl";
  const subSize = size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-xs";
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center select-none ${bg} ${border}`}>
      <span className={`font-bold font-mono leading-none ${fg} ${textSize}`}>{initial}</span>
      <span className={`leading-none mt-1 opacity-30 ${fg} ${subSize}`}>{glyph}</span>
    </div>
  );
}

function WebsitePreviewCard({ preview }: { preview: {
  sourceUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
} | null }) {
  if (!preview || (!preview.imageUrl && !preview.title && !preview.description)) return null;
  return (
    <a
      href={preview.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="mt-5 block max-w-2xl overflow-hidden border-2 border-black bg-white transition-transform hover:-translate-y-0.5"
      aria-label={`Open ${preview.title || "website"} in a new tab`}
    >
      {preview.imageUrl && (
        <img
          src={preview.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
          className="aspect-[1.91/1] w-full bg-black/5 object-cover"
        />
      )}
      {(preview.title || preview.description) && (
        <div className="p-3">
          {preview.title && <p className="text-xs font-bold uppercase tracking-wide">{preview.title}</p>}
          {preview.description && <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-black/60">{preview.description}</p>}
          <span className="mt-2 block text-[9px] uppercase tracking-widest text-black/40">website preview ↗</span>
        </div>
      )}
    </a>
  );
}

type PublicArtistCardPreview = Pick<EntryPin, "id" | "name" | "city" | "country" | "tags" | "heroPhoto">;

function PublicArtistProfileGate({
  preview,
  relatedProfiles,
  isAuthenticated,
}: {
  preview: PublicArtistCardPreview;
  relatedProfiles: PublicArtistCardPreview[];
  isAuthenticated: boolean;
}) {
  const displayName = preview.name?.trim() || (preview.city ? `${preview.city} artist` : "Countercult artist");
  const location = [preview.city, preview.country].filter(Boolean).join(", ");
  const tags = normalizeTags(preview.tags ?? []).slice(0, 6);

  return (
    <main className="min-h-[100dvh] bg-[#F9F9F6] px-4 py-10 font-mono lowercase text-black sm:px-8">
      <section
        aria-labelledby="public-artist-profile-title"
        className="mx-auto max-w-4xl overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_#c6ff3d]"
        data-testid="public-artist-profile-gate"
      >
        <div className="grid gap-6 bg-black p-6 text-white sm:grid-cols-[1fr_12rem] sm:p-8">
          <div className="min-w-0">
            <p className="inline-block bg-[#c6ff3d] px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-black">
              artist · public preview
            </p>
            <h1
              id="public-artist-profile-title"
              className="mt-5 max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl"
            >
              {displayName}
            </h1>
            {location && (
              <p className="mt-4 text-[10px] uppercase tracking-widest text-white/65">
                {location}
              </p>
            )}
            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="border border-white/20 px-2 py-1 text-[8px] uppercase tracking-widest text-white/75">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="h-40 w-40 overflow-hidden border-2 border-white/15 bg-white/10 sm:h-48 sm:w-48">
            {preview.heroPhoto ? (
              <ProtectedProfileImage
                src={preview.heroPhoto}
                alt="Consented artist public-preview photograph"
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <GeneratedAvatar name={displayName} kind="artist" size="lg" />
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="max-w-2xl text-sm leading-relaxed text-black/70">
            {isAuthenticated
              ? "You are viewing a public artist preview. Full profiles are available after your Countercult Network application is approved."
              : "This public preview shows the artist's name, location, and selected interests. Create a free Countercult Network account to apply for full profile access. Full profiles open after approval."}
          </p>
          {relatedProfiles.length > 0 && (
            <section className="mt-8" aria-labelledby="public-artist-recommendations">
              <h2 id="public-artist-recommendations" className="mb-3 text-[10px] font-bold uppercase tracking-widest">
                more artists to explore
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {relatedProfiles.map((profile) => {
                  const name = profile.name?.trim() || "Countercult artist";
                  return (
                    <a
                      key={profile.id}
                      href={`/entries/${profile.id}`}
                      className="group overflow-hidden border border-black/15 bg-white transition-colors hover:border-black"
                    >
                      <div className="aspect-square overflow-hidden bg-black/5">
                        {profile.heroPhoto ? (
                          <ProtectedProfileImage
                            src={profile.heroPhoto}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <GeneratedAvatar name={name} kind="artist" />
                        )}
                      </div>
                      <div className="border-t border-black/10 p-2">
                        <p className="truncate text-[9px] font-bold uppercase">{name}</p>
                        <p className="truncate text-[8px] uppercase text-black/45">
                          {[profile.city, profile.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <a
                href="/member-home"
                className="border-2 border-black bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d]"
              >
                check your account
              </a>
            ) : (
              <>
                <a
                  href="/explore?action=signin"
                  className="border-2 border-black px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white"
                >
                  sign in
                </a>
                <a
                  href="/explore?action=join&intent=network"
                  className="border-2 border-black bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d]"
                >
                  apply to join for free
                </a>
              </>
            )}
            <a
              href="/explore"
              className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest underline underline-offset-4"
            >
              back to Explore
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

interface LocalSession {
  token: string;
  email?: string;
  entryId?: number | null;
  entryName?: string | null;
}

function buildClaimRequestHref(entry: {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
}) {
  const location = [entry.city, entry.country].filter(Boolean).join(", ");
  const body = [
    "Hello Countercult team,",
    "",
    `I manage ${entry.name} and would like to request verified access to this Countercult space listing.`,
    "",
    `Location: ${location}`,
    `Listing: ${window.location.origin}/entries/${entry.id}`,
    "",
    "Please let me know what verification you need.",
  ].join("\n");
  return `mailto:countercultplatform@gmail.com?subject=${encodeURIComponent(`Listing access request: ${entry.name}`)}&body=${encodeURIComponent(body)}`;
}

function EntryRating({ entryId, myEntryId, token }: { entryId: number; myEntryId: number | null; token: string | null }) {
  const [rating, setRating] = useState<{ avg: number | null; count: number; myStars: number | null } | null>(null);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}/rating`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setRating(await res.json() as { avg: number | null; count: number; myStars: number | null });
    } catch { /* ignore */ }
  };

  useEffect(() => { void load(); }, [entryId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRate = async (stars: number) => {
    if (!token || submitting) return;
    setSubmitting(true);
    setHover(0); // clear hover immediately so the UI doesn't stay stuck on touch
    try {
      await fetch(`/api/entries/${entryId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stars }),
      });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const canRate = !!token && myEntryId != null && myEntryId !== entryId;
  const activeStars = hover || rating?.myStars || 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={`text-xl leading-none ${rating?.avg != null && s <= Math.round(rating.avg) ? "text-[#c6ff3d]" : "text-black/15"}`}>★</span>
          ))}
        </div>
        {rating != null && rating.count > 0 ? (
          <span className="text-[10px] uppercase tracking-widest text-black/40">
            {rating.avg?.toFixed(1)} avg · {rating.count} {rating.count === 1 ? "rating" : "ratings"} from verified artists
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-black/20">no ratings yet</span>
        )}
      </div>

      {canRate ? (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-black/30 mb-2">
            {rating?.myStars ? `your rating: ${rating.myStars}★ - tap to change` : "rate this artist or space"}
          </p>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                disabled={submitting}
                onClick={() => void handleRate(s)}
                onMouseEnter={() => setHover(s)}
                className={`text-2xl leading-none transition-colors disabled:opacity-40 cursor-pointer ${
                  s <= activeStars ? "text-[#c6ff3d]" : "text-black/15 hover:text-[#c6ff3d]/60"
                }`}
              >★</button>
            ))}
          </div>
        </div>
      ) : !token ? (
        <p className="text-[9px] uppercase tracking-widest text-black/25">
          <a href="/explore?action=signin" className="underline hover:text-black transition-colors">sign in</a> as an approved member to rate
        </p>
      ) : null}
    </div>
  );
}

// ---------- Comments ----------
type CommentRow = { id: number; content: string; createdAt: string; authorEntryId: number; authorName: string };

function EntryComments({ entryId, myEntryId, token }: { entryId: number; myEntryId: number | null; token: string | null }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`);
      if (res.ok) setComments(await res.json() as CommentRow[]);
    } catch { /* ignore */ }
  };

  useEffect(() => { void load(); }, [entryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !token || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "failed to post"); return; }
      setText("");
      await load();
    } catch {
      setError("something went wrong - try again");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!token) return;
    try {
      await fetch(`/api/entries/${entryId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch { /* ignore */ }
  };

  const canComment = !!token && myEntryId != null;

  return (
    <div className="flex flex-col gap-4">
      {comments.length > 0 && (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-[#c6ff3d] pl-4 py-0.5 group">
              <div className="flex items-baseline gap-2 justify-between">
                <a
                  href={`/artists/${c.authorEntryId}`}
                  className="text-[9px] uppercase tracking-widest font-bold hover:text-black/50 transition-colors"
                >
                  {c.authorName}
                </a>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-black/25">
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {myEntryId === c.authorEntryId && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(c.id)}
                      className="text-[9px] text-black/20 hover:text-black/60 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-black/70 mt-1 leading-relaxed whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {canComment ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="leave a note for this artist…"
            className="w-full bg-transparent border border-black/15 focus:border-black px-3 py-2 text-xs outline-none transition-colors resize-none font-mono placeholder:text-black/25"
          />
          {error && <p className="text-[9px] text-black/50">{error}</p>}
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-black/20">{text.length}/1000</span>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="text-[9px] uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-black/70 transition-colors disabled:opacity-30"
            >
              {submitting ? "posting…" : "post →"}
            </button>
          </div>
        </form>
      ) : !token ? (
        <p className="text-[9px] uppercase tracking-widest text-black/25">
          <a href="/explore?action=signin" className="underline hover:text-black transition-colors">sign in</a> as a verified member to leave a comment
        </p>
      ) : null}
    </div>
  );
}

function SpaceEnquiryForm({ entryId }: { entryId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", enquiryType: "booking", message: "" });
  const [status, setStatus] = useState("");
  useEffect(() => {
    fetch(`/api/entries/${entryId}/subscription`).then((response) => response.ok ? response.json() : null)
      .then((data) => setEnabled(Boolean(data?.toolsEnabled))).catch(() => setEnabled(false));
  }, [entryId]);
  if (!enabled) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setStatus("sending…");
    const response = await fetch(`/api/entries/${entryId}/enquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setStatus(data.error ?? "couldn't send enquiry"); return; }
    setForm({ name: "", email: "", enquiryType: "booking", message: "" }); setStatus("enquiry sent ✓");
  };
  return <section className="mb-8"><div className="border-t-2 border-black pt-3 mb-4"><span className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/40">send an enquiry</span></div>
    <form onSubmit={(event) => void submit(event)} className="grid gap-2">
      <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="your name" className="border border-black/20 bg-transparent p-2 text-xs" />
      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your email" className="border border-black/20 bg-transparent p-2 text-xs" />
      <select value={form.enquiryType} onChange={(e) => setForm({ ...form, enquiryType: e.target.value })} className="border border-black/20 bg-transparent p-2 text-xs"><option value="booking">booking</option><option value="collaboration">collaboration</option><option value="programme">programme</option><option value="other">other</option></select>
      <textarea required maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="what would you like to discuss?" className="border border-black/20 bg-transparent p-2 text-xs min-h-24" />
      <button className="justify-self-start bg-black px-4 py-2 text-[10px] uppercase tracking-widest text-[#c6ff3d]">send enquiry →</button>{status && <p className="text-[10px] text-black/50">{status}</p>}
    </form></section>;
}
export default function EntryDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const [copied, setCopied] = useState(false);
  const { session: validatedSession, status: authStatus, isAuthenticated } = useServerValidatedSession();
  const session = isAuthenticated ? validatedSession as LocalSession : null;
  const isApprovedNetworkMember = isAuthenticated
    && validatedSession?.isApproved === true
    && validatedSession.accountRole !== "partner_poster";
  const requestOptions = isApprovedNetworkMember && validatedSession
    ? { headers: { Authorization: `Bearer ${validatedSession.token}` } }
    : undefined;
  const audienceKey = isApprovedNetworkMember ? "approved-network" : "public";
  const viewedEntryIdRef = useRef<number | null>(null);

  const entryId = Number.isNaN(id) ? 0 : id;
  const {
    data: publicArtistCardResponse = [],
    isLoading: publicArtistCardsLoading,
  } = useListPublicArtistCards({
    query: {
      queryKey: [...getListPublicArtistCardsQueryKey(), "public"],
      enabled: !isApprovedNetworkMember,
    },
  });
  const publicArtistCards = Array.isArray(publicArtistCardResponse) ? publicArtistCardResponse : [];
  const publicArtistPreview = publicArtistCards.find((profile) => profile.id === entryId && profile.kind === "artist");
  const { data: entry, isLoading, error, refetch } = useGetEntry(entryId, {
    request: requestOptions,
    query: {
      queryKey: [...getGetEntryQueryKey(entryId), audienceKey],
      enabled: !Number.isNaN(id)
        && authStatus !== "checking"
        && (isApprovedNetworkMember || !publicArtistPreview),
    },
  });
  const previewRefreshAttemptedId = useRef<number | null>(null);
  useEffect(() => {
    if (!entry?.url || entry.websitePreview || previewRefreshAttemptedId.current === entryId) return;
    previewRefreshAttemptedId.current = entryId;
    const timer = window.setTimeout(() => { void refetch(); }, 4_500);
    return () => window.clearTimeout(timer);
  }, [entry?.id, entry?.url, entry?.websitePreview, entryId, refetch]);
  const { data: all = [] } = useListEntries({
    request: requestOptions,
    query: {
      queryKey: [...getListEntriesQueryKey(), audienceKey],
      enabled: Boolean(entry) && authStatus !== "checking" && (isApprovedNetworkMember || entry?.kind !== "artist"),
    },
  });
  const previewTags = new Set(normalizeTags(publicArtistPreview?.tags ?? []).map((tag) => tag.toLowerCase()));
  const publicRelatedProfiles = publicArtistPreview
    ? publicArtistCards
      .filter((profile) => profile.id !== publicArtistPreview.id && profile.kind === "artist")
      .map((profile) => {
        const sharedTags = normalizeTags(profile.tags ?? []).filter((tag) => previewTags.has(tag.toLowerCase())).length;
        const sameCity = Boolean(publicArtistPreview.city && profile.city
          && publicArtistPreview.city.toLowerCase() === profile.city.toLowerCase());
        return { profile, score: (sameCity ? 5 : 0) + sharedTags * 3 };
      })
      .sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name))
      .slice(0, 4)
      .map(({ profile }) => profile)
    : [];
  const { data: allOffers = [] } = useListResidencyOffers({
    query: {
      queryKey: getListResidencyOffersQueryKey(),
      enabled: Boolean(entry) && (isApprovedNetworkMember || entry?.kind !== "artist"),
    },
  });

  useEffect(() => {
    if (!Number.isNaN(id) && entry && viewedEntryIdRef.current !== id) {
      viewedEntryIdRef.current = id;
      void fetch(`/api/entries/${id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [id, entry]);

  useEffect(() => {
    if (publicArtistPreview) {
      const displayName = publicArtistPreview.name?.trim() || "Countercult artist";
      const location = [publicArtistPreview.city, publicArtistPreview.country].filter(Boolean).join(", ");
      const tags = normalizeTags(publicArtistPreview.tags ?? []).slice(0, 6);
      const interestSummary = tags.length ? ` Interests include ${tags.slice(0, 3).join(", ")}.` : "";
      const description = `Public artist profile for ${displayName}${location ? ` in ${location}` : ""} on Countercult's consent-based cultural network.${interestSummary}`.slice(0, 160);
      const title = `${displayName} | Independent Artist | Countercult`;
      const canonicalUrl = `${SEO_ORIGIN}/entries/${publicArtistPreview.id}`;
      const profileImage = toSeoUrl(publicArtistPreview.heroPhoto);
      const setMeta = (attribute: "name" | "property", name: string, content: string) => {
        let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute(attribute, name);
          document.head.appendChild(element);
        }
        element.content = content;
      };

      document.title = title;
      setMeta("name", "description", description);
      setMeta("name", "robots", "index, follow");
      setMeta("property", "og:title", title);
      setMeta("property", "og:description", description);
      setMeta("property", "og:url", canonicalUrl);
      setMeta("property", "og:type", "profile");
      setMeta("property", "og:image", profileImage ?? "");
      setMeta("name", "twitter:title", title);
      setMeta("name", "twitter:description", description);
      setMeta("name", "twitter:image", profileImage ?? "");
      setCanonical(canonicalUrl);

      const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": canonicalUrl,
        name: displayName,
        url: canonicalUrl,
        description,
        ...(profileImage ? { image: profileImage } : {}),
        ...(tags.length ? { knowsAbout: tags } : {}),
        ...(location
          ? {
              address: {
                "@type": "PostalAddress",
                ...(publicArtistPreview.city ? { addressLocality: publicArtistPreview.city } : {}),
                ...(publicArtistPreview.country ? { addressCountry: publicArtistPreview.country } : {}),
              },
            }
          : {}),
        isPartOf: { "@id": "https://countercult.network/#website" },
      };
      setJsonLd("countercult-entry-jsonld", {
        "@context": "https://schema.org",
        "@graph": [
          personSchema,
          {
            "@type": "WebPage",
            "@id": `${canonicalUrl}#page`,
            url: canonicalUrl,
            name: title,
            description,
            about: { "@id": canonicalUrl },
            mainEntity: { "@id": canonicalUrl },
            isPartOf: { "@id": "https://countercult.network/#website" },
          },
        ],
      });
      return;
    }

    if (!publicArtistPreview && !entry && publicArtistCardsLoading) {
      return;
    }

    if (!entry || error) {
      setSeoMeta("name", "robots", "noindex, follow");
      return;
    }

    const title = `${entry.name} | ${entry.kind === "artist" ? "Independent Artist" : entry.kind === "space" ? "Cultural Space" : "Cultural Place"} | Countercult`;
    const location = [entry.city, entry.country].filter(Boolean).join(", ");
    const blurb = entry.blurb?.trim() ?? "";
    const tags = (entry.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean);
    const editorialTrails = getEditorialTrails({
      city: entry.city,
      kind: entry.kind,
      tags,
    });
    const description = blurb
      ? `${entry.name}${location ? ` in ${location}` : ""} - ${blurb}`.slice(0, 160)
      : `${entry.name}${location ? ` in ${location}` : ""} - a public ${entry.kind} voice on Countercult's curated culture map.`;
    const canonicalUrl = `${SEO_ORIGIN}/entries/${entry.id}`;
    const profileImage = toSeoUrl(entry.heroPhoto ?? entry.portfolioPhotos?.[0]);
    const externalLinks = Array.isArray(entry.externalLinks)
      ? (entry.externalLinks as { url?: string }[]).map((link) => link.url).filter((url): url is string => Boolean(url))
      : [];

    document.title = title;
    const setMeta = (attribute: "name" | "property", name: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta("name", "description", description);
    setMeta("name", "robots", entry.kind === "artist" ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", entry.kind === "artist" ? "profile" : "website");
    if (profileImage) setMeta("property", "og:image", profileImage);
    if (tags.length > 0) setMeta("name", "keywords", tags.join(", "));
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (profileImage) setMeta("name", "twitter:image", profileImage);

    setCanonical(canonicalUrl);

    const entityType = entry.kind === "artist"
      ? "Person"
      : entry.kind === "space"
        ? ["LocalBusiness", "Place"]
        : "CreativeWork";
    const schema = {
      "@type": entityType,
      "@id": canonicalUrl,
      name: entry.name,
      url: canonicalUrl,
      description: blurb || description,
      image: profileImage,
      keywords: tags,
      sameAs: [...externalLinks, entry.url, (entry as any).shopUrl].filter(Boolean),
      mainEntityOfPage: { "@id": `${canonicalUrl}#page` },
      subjectOf: editorialTrails.map((trail) => ({
        "@type": "Article",
        name: trail.title,
        url: `${SEO_ORIGIN}${trail.href}`,
      })),
      ...(entry.kind === "artifact" && entry.city
        ? { locationCreated: { "@type": "Place", name: entry.city } }
        : {}),
      address: location
        ? {
            "@type": "PostalAddress",
            addressLocality: entry.city || undefined,
            addressCountry: entry.country || undefined,
          }
        : undefined,
      isPartOf: { "@id": "https://countercult.network/#website" },
    };
    const pageSchema = {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#page`,
      url: canonicalUrl,
      name: title,
      description,
      isPartOf: { "@id": "https://countercult.network/#website" },
      about: { "@id": canonicalUrl },
      mainEntity: { "@id": canonicalUrl },
      breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
    };
    const breadcrumbSchema = {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Countercult", item: `${SEO_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: entry.kind, item: `${SEO_ORIGIN}/browse/${entry.kind}` },
          ...(entry.city
            ? [{ "@type": "ListItem", position: 3, name: entry.city, item: `${SEO_ORIGIN}/place/${encodeURIComponent(entry.city)}` }]
            : []),
          {
            "@type": "ListItem",
            position: entry.city ? 4 : 3,
            name: entry.name,
            item: canonicalUrl,
          },
      ],
    };
    setJsonLd("countercult-entry-jsonld", {
      "@context": "https://schema.org",
      "@graph": [schema, pageSchema, breadcrumbSchema],
    });
  }, [entry, error, publicArtistPreview, publicArtistCardsLoading]);

  const shouldGateArtistProfile =
    !isApprovedNetworkMember &&
    authStatus !== "checking" &&
    (Boolean(publicArtistPreview) || Boolean(error) || entry?.kind === "artist");
  if (shouldGateArtistProfile && publicArtistCardsLoading) {
    return <LoadingState />;
  }
  if (shouldGateArtistProfile && publicArtistPreview) {
    return (
      <PublicArtistProfileGate
        preview={publicArtistPreview}
        relatedProfiles={publicRelatedProfiles}
        isAuthenticated={isAuthenticated}
      />
    );
  }
  if (Number.isNaN(id) || error || (!isApprovedNetworkMember && entry?.kind === "artist")) {
    return <NotFound />;
  }

  if (isLoading || !entry) {
    return <LoadingState />;
  }

  const entryTags = new Set(normalizeTags(entry.tags ?? []).map((tag) => tag.toLowerCase()));
  const profileCandidates = [
    ...all.filter((candidate) => candidate.id !== entry.id),
    ...publicArtistCards.filter((candidate) => candidate.id !== entry.id && !all.some((entry) => entry.id === candidate.id)),
  ];
  const relatedProfiles = profileCandidates
    .map((profile) => {
      const profileTags = normalizeTags(profile.tags ?? []).map((tag) => tag.toLowerCase());
      const sharedTags = profileTags.filter((tag) => entryTags.has(tag)).length;
      const sameCity = Boolean(entry.city && profile.city && entry.city.toLowerCase() === profile.city.toLowerCase());
      const sameKind = profile.kind === entry.kind;
      return { profile, score: (sameCity ? 5 : 0) + sharedTags * 3 + (sameKind ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name))
    .map(({ profile }) => profile);
  const relatedArtists = relatedProfiles.filter((profile) => profile.kind === "artist").slice(0, 4);
  const relatedOtherProfiles = relatedProfiles.filter((profile) => profile.kind !== "artist").slice(0, 8 - relatedArtists.length);
  const more = [...relatedArtists, ...relatedOtherProfiles];
  const moreSectionLabel = "more profiles";
  const editorialTrails = getEditorialTrails({
    city: entry.city,
    kind: entry.kind,
    tags: entry.tags ?? [],
  });
  const heroPhoto = entry.heroPhoto ?? entry.portfolioPhotos?.[0] ?? null;
  const kindLabel = entry.kind + ((entry as any).secondaryKind ? ` + ${(entry as any).secondaryKind}` : "");
  const locationLine = [kindLabel.toUpperCase(), "•", entry.city, entry.country, entry.postal]
    .filter(Boolean)
    .join(" ");
  void locationLine;

  const exps = (entry.experiences ?? []) as Experience[];
  const legacyExps = exps.filter((e) => !e.url);

  const openTo = getPublicOpenTo(((entry as any).openTo ?? []) as string[]);
  const rawOfferings = typeof (entry as any).offerings === "string"
    ? (entry as any).offerings.trim()
    : "";
  const { choices: offeringChoices, details: offeringDetails } = parseOfferings(rawOfferings);
  const exchangeOpenToKind = (value: string): "swap" | "free_space" | "collab" | null => {
    const normalized = value.trim().toLowerCase();
    if (normalized === "room swap" || normalized === "room swaps") return "swap";
    if (normalized === "free space" || normalized === "free spaces") return "free_space";
    if (normalized === "commission" || normalized === "commissions") return "collab";
    return null;
  };
  const entrySpaceOffer = entry as typeof entry & {
    spaceOfferAvailable?: boolean;
    spaceOfferTypes?: string[];
    spaceOfferCategory?: string | null;
    spaceOfferPricing?: string | null;
    spaceOfferDetails?: string | null;
  };
  const hasSpaceOffer = entry.kind === "space" && entrySpaceOffer.spaceOfferAvailable === true;
  const isResidencyOffer = hasSpaceOffer && entrySpaceOffer.spaceOfferCategory === "residency";
  const isHousingOffer = hasSpaceOffer && (
    entrySpaceOffer.spaceOfferCategory === "housing" || isResidencyOffer
  );
  const offerPricingLabel = entrySpaceOffer.spaceOfferPricing === "free"
    ? "free for artists"
    : entrySpaceOffer.spaceOfferPricing === "paid"
      ? "cost discussed with the venue"
      : entrySpaceOffer.spaceOfferPricing === "case_by_case"
        ? "terms decided per collaboration"
        : null;
  const contactMethod = String((entry as any).contactMethod ?? "").toLowerCase();
  const contactHandle = String((entry as any).contactHandle ?? "").trim();
  const contactHref = (() => {
    if (!contactHandle) return null;
    if (contactMethod === "email") return `mailto:${contactHandle}`;
    if (contactMethod === "whatsapp") return `https://wa.me/${contactHandle.replace(/[^0-9+]/g, "")}`;
    if (contactMethod === "instagram") {
      return contactHandle.startsWith("http")
        ? contactHandle
        : `https://instagram.com/${contactHandle.replace(/^@/, "")}`;
    }
    return contactHandle.startsWith("http") ? contactHandle : null;
  })();
  const primaryAction = entry.url
    ? {
        href: normalizeEntryUrl(entry.url),
        label: entry.kind === "space" ? "visit space →" : entry.kind === "artifact" ? "open source →" : "see their work →",
      }
    : (entry as any).shopUrl
      ? { href: (entry as any).shopUrl as string, label: "shop →" }
      : contactHref
        ? { href: contactHref, label: `contact ${entry.kind === "space" ? "this space" : "this voice"} →` }
        : { href: "#editorial-context", label: "follow the context →" };
  const hasPublicHiringPath = entry.kind !== "artifact" && Boolean(
    entry.url ||
    (entry as any).shopUrl ||
    offeringDetails ||
    contactMethod ||
    contactHandle,
  );

  // Section divider helper
  const Divider = ({ label }: { label: string }) => (
    <div className="mb-5 flex items-center gap-3 border-t-2 border-black pt-3">
      <span className="h-2 w-2 shrink-0 bg-[#c6ff3d]" aria-hidden="true" />
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-black">{label}</span>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase">

      {/* ── top nav ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 py-2.5 bg-[#F9F9F6] border-b-2 border-black">
        <div className="flex items-center gap-2 shrink-0">
          <a href="/" className="text-[10px] uppercase tracking-widest font-bold font-mono text-black/40 hover:text-black transition-colors">HOME</a>
          <span className="text-black/20">/</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-black/60">{entry.kind}</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement)?.value.trim(); window.location.href = q ? `/explore?q=${encodeURIComponent(q)}` : '/explore'; }}
          className="flex-1 min-w-0 hidden sm:block"
        >
          <input
            type="text"
            placeholder="search the map…"
            defaultValue={new URLSearchParams(window.location.search).get('q') ?? ''}
            className="w-full bg-black/5 border border-black/10 focus:border-black/40 px-3 py-1.5 text-[11px] font-mono text-black placeholder:text-black/25 focus:outline-none transition-colors"
          />
        </form>
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              void navigator.share({ title: entry.name, url });
            } else {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }
          }}
          className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors cursor-pointer"
        >
          {copied ? "copied ✓" : "↗ share"}
        </button>
      </div>

      {/* ── hero: huge name + passport photo ────────────── */}
      <div className="relative border-b-2 border-black px-4 pb-6 pt-8 md:px-8">
        {/* Passport-stamp photo - top right */}
        <div className="absolute right-4 top-6 h-24 w-24 shrink-0 overflow-hidden border-2 border-black bg-black md:right-8 md:h-28 md:w-28">
          {heroPhoto ? (
            <ProtectedProfileImage src={heroPhoto} token={session?.token} alt={entry.name} className="w-full h-full object-cover" />
          ) : (
            <GeneratedAvatar name={entry.name} kind={entry.kind} size="lg" />
          )}
        </div>

        {/* Kind + claimed badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2 pr-28 md:pr-36">
          <span className="bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#c6ff3d]">
            {entry.kind}
          </span>
          {(entry as any).secondaryKind && (
            <span className="border border-black/20 bg-black/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black">
              + {(entry as any).secondaryKind}
            </span>
          )}
        </div>

        {/* MASSIVE NAME */}
        <h1
          className="mb-4 pr-28 font-black uppercase leading-[0.9] tracking-tight md:pr-36"
          style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}
        >
          {entry.name}
        </h1>

        {/* Location */}
        <p className="mb-5 text-[10px] uppercase tracking-widest text-black">
          {entry.city ? (
            <a
                      href={`/place/${encodeURIComponent(entry.city)}`}
              className="underline decoration-black/15 underline-offset-2 transition-colors hover:text-black"
            >
              {[entry.city, entry.country].filter(Boolean).join(", ")}
            </a>
          ) : (
            [entry.city, entry.country].filter(Boolean).join(", ")
          )}
          {(entry as any).basedIn && (entry as any).basedIn.length > 0 && (
            <span className="text-black"> · also: {((entry as any).basedIn as string[]).join(" · ")}</span>
          )}
        </p>

        {entry.tags.length > 0 && (
          <div className="mb-5 flex max-w-4xl flex-wrap gap-1.5">
            {normalizeTags(entry.tags).map((tag) => (
              <a
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="border border-black/25 bg-transparent px-2.5 py-1 text-[9px] uppercase tracking-widest text-black transition-colors hover:border-[#c6ff3d] hover:bg-[#c6ff3d]"
              >
                {tag}
              </a>
            ))}
          </div>
        )}

        <a
          href={primaryAction.href}
          target={primaryAction.href.startsWith("http") ? "_blank" : undefined}
          rel={primaryAction.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="inline-block border-2 border-black bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black"
        >
          {primaryAction.label}
        </a>
        <WebsitePreviewCard preview={entry.websitePreview} />
        {entry.kind === "space" && entry.claimRequestAvailable && session?.entryId !== entry.id && (
          <div
            className="mt-4 max-w-xl border border-black/20 bg-white/60 p-3"
            data-testid={`status-unclaimed-space-${entry.id}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-black">manage this space?</p>
            <p className="mt-1 text-[10px] leading-relaxed text-black/60">
              This listing is part of Countercult’s curated map and may have been added by our team. If you manage this space, contact us to request verified access to its listing. We check each request before making changes.
            </p>
            <a
              href={buildClaimRequestHref(entry)}
              data-testid={`link-claim-space-${entry.id}`}
              aria-label={`Request verified listing access for ${entry.name}`}
              className="mt-2 inline-block border-2 border-black bg-[#c6ff3d] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              request listing access →
            </a>
          </div>
        )}
      </div>

      {/* ── body sections ───────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 md:px-8">

         {/* commercial space enquiry */}
         {entry.kind === "space" && <SpaceEnquiryForm entryId={entry.id} />}

        {/* what they offer */}
        {(offeringChoices.length > 0 || offeringDetails) && (
          <div className="mb-8">
            <Divider label="what they can offer" />
            {offeringChoices.length > 0 && (
              <div className="mb-3 flex max-w-xl flex-wrap gap-1.5">
                {offeringChoices.map((choice) => (
                  <span key={choice} className="border border-black/15 bg-[#c6ff3d]/30 px-2.5 py-1 text-[9px] uppercase tracking-widest text-black">
                    {choice}
                  </span>
                ))}
              </div>
            )}
            {offeringDetails && (
              <p className="max-w-xl whitespace-pre-line font-sans text-sm leading-relaxed text-black">
                {offeringDetails}
              </p>
            )}
          </div>
        )}

        {entry.blurb?.trim() && (
          <div className="mb-8 max-w-2xl border-t border-black/10 pt-4">
            <p className="mb-2 text-[8px] uppercase tracking-[0.2em] text-black/45">
              about this {entry.kind}
            </p>
            <p className="font-sans text-sm leading-relaxed text-black/65">
              {entry.blurb.trim()}
            </p>
          </div>
        )}

         {/* open to */}
        {openTo.length > 0 && (
          <div id="open-to" className="mb-8">
            <Divider label="open to" />
            <p className="mb-4 text-[9px] uppercase tracking-[0.16em] text-black">
              ways this {entry.kind} is open to working, sharing, or collaborating
            </p>
            <div className="flex flex-wrap gap-1.5">
              {openTo.map((item) => (
                <a
                  key={item}
                  href={(() => {
                    const exchangeKind = exchangeOpenToKind(item);
                    return exchangeKind
                      ? "/residency"
                      : `/tag/${encodeURIComponent(normalizeTags([item])[0] ?? item.toLowerCase().trim())}`;
                  })()}
                  className="border border-black/15 bg-[#c6ff3d]/30 px-2.5 py-1 text-[9px] uppercase tracking-widest transition-colors hover:border-black hover:bg-black hover:text-[#c6ff3d]"
                >
                  {formatOpenToLabel(item)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* swap board listings */}
        {(() => {
           const swapOffers = allOffers.filter((o) =>
             o.entryId === entry.id &&
             o.kind !== "venue_offer" &&
             !(o.kind === "host" && isHousingOffer) &&
             !(o.kind === "open_call" && isResidencyOffer)
           );
          if (swapOffers.length === 0) return null;
          const KIND_META: Record<string, { glyph: string; label: string }> = {
            host: { glyph: "⌂", label: "hosting" },
            swap: { glyph: "⇄", label: "swap" },
            looking: { glyph: "?", label: "looking" },
            workshop: { glyph: "◉", label: "workshop" },
            collab: { glyph: "⊕", label: "collab" },
            performance: { glyph: "♪", label: "performance" },
            residency: { glyph: "⌂", label: "residency" },
             venue_offer: { glyph: "⊕", label: "space collaboration" },
          };
          return (
            <div className="mb-8">
              <Divider label="on the swap board" />
              <div className="flex flex-col gap-3">
                {swapOffers.map((offer) => {
                  const meta = KIND_META[offer.kind] ?? { glyph: "◉", label: offer.kind };
                  const dest = (offer as any).destination as string | null | undefined;
                   const isPublicPreview = offer.isPublicPreview === true;
                  return (
                    <div key={offer.id} className="border border-black/10 p-4 flex flex-col gap-2 bg-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest bg-[#c6ff3d] text-black px-2 py-0.5 font-bold">
                          {meta.glyph} {meta.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-black/40">{offer.city}</span>
                         {dest && !isPublicPreview && (
                          <>
                            <span className="text-[10px] text-black/20">→</span>
                            <span className="text-[10px] uppercase tracking-widest text-black/40">{dest}</span>
                          </>
                        )}
                      </div>
                       {isPublicPreview ? (
                         <p className="text-[10px] text-black/45 leading-relaxed">
                           public preview. sign in to view the full post, terms, availability, and contact details.
                         </p>
                       ) : (
                         <p className="text-xs text-black/60 leading-relaxed">{offer.description}</p>
                       )}
                       {!isPublicPreview && (offer.availableFrom || offer.availableTo) && (
                        <div className="text-[10px] uppercase tracking-widest text-black/30">
                          {offer.availableFrom && <span>from {offer.availableFrom}</span>}
                          {offer.availableFrom && offer.availableTo && <span> - </span>}
                          {offer.availableTo && <span>to {offer.availableTo}</span>}
                        </div>
                      )}
                       {!isPublicPreview && offer.contact && (
                        <div className="text-[10px] uppercase tracking-widest text-black/30">
                          contact: <span className="font-bold text-black">{offer.contact}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* room / space */}
        {(() => {
          const e = entry as any;
          const rows: { label: string; value: string }[] = [];
          const visitorAccessLabels: Record<string, string> = {
            public: "public",
            appointment_only: "appointment-only",
            community_protected: "community-protected",
          };
          if (e.swapType) rows.push({ label: "type", value: e.swapType.replace(/_/g, " ") });
          if (e.spacePrivacy) {
            rows.push({
              label: visitorAccessLabels[e.spacePrivacy] ? "visitor access" : "privacy",
              value: visitorAccessLabels[e.spacePrivacy] ?? e.spacePrivacy.replace(/_/g, " "),
            });
          }
          if (e.financialStructure) rows.push({ label: "terms", value: e.financialStructure.replace(/_/g, " ") });
          if (e.costDetails) rows.push({ label: "cost", value: e.costDetails });
          if (e.durationTerms) rows.push({ label: "duration", value: e.durationTerms });
          if (e.vibeTags) rows.push({ label: "vibe", value: e.vibeTags });
          if (e.dealbreakers) rows.push({ label: "rules", value: e.dealbreakers });
          if (e.noiseAndGuests) rows.push({ label: "noise", value: e.noiseAndGuests });
           if (rows.length === 0 && !isHousingOffer) return null;
           return (
               <div className="mb-8">
                 <Divider label={isHousingOffer ? "housing" : "room / space"} />
               {isHousingOffer && (
                 <div className="border-2 border-[#c6ff3d] bg-[#c6ff3d]/10 p-4 mb-4">
                   <p className="text-[10px] uppercase tracking-widest font-bold mb-2">
                     {isResidencyOffer ? "artist residency / coliving" : "coliving / artist residence"}
                   </p>
                   <p className="text-xs text-black/65 leading-relaxed mb-3">
                     {isResidencyOffer
                       ? "open to hosting artists for a live-in residency that also belongs in opportunities."
                       : "open to hosting artists for a residence stay."}
                   </p>
                   {offerPricingLabel && (
                     <p className="text-[9px] uppercase tracking-widest font-bold mb-2">{offerPricingLabel}</p>
                   )}
                    {entrySpaceOffer.spaceOfferDetails && (
                      <p className="text-[11px] text-black/60 leading-relaxed">{entrySpaceOffer.spaceOfferDetails}</p>
                    )}
                  </div>
               )}
               {rows.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                   {rows.map(({ label, value }) => (
                     <div key={label} className="flex gap-3 items-baseline border-b border-black/8 pb-2">
                       <span className="text-[8px] uppercase tracking-[0.2em] text-black/30 w-16 shrink-0">{label}</span>
                       <span className="text-[11px] text-black/70 font-sans leading-snug">{value}</span>
                     </div>
                   ))}
                 </div>
                )}
               </div>
          );
        })()}

        {/* preferred contact method */}
        {hasPublicHiringPath && (
          <div className="mb-8">
            <Divider label="how to hire / work with them" />
            {offeringDetails && (
              <div className="mb-4 max-w-xl border border-[#ff6b4a]/45 bg-[#ff6b4a]/10 p-4">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-black">details from them</p>
                <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-black">{offeringDetails}</p>
              </div>
            )}
            {(entry as any).contactHandle && (
              <div className="border-t border-black/10 p-3.5">
                <div className="flex items-center gap-3 flex-wrap">
                  {(entry as any).contactMethod && (
                    <span className="text-[9px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black px-2.5 py-1">
                      {(entry as any).contactMethod}
                    </span>
                  )}
                  {(() => {
                    const method: string = (entry as any).contactMethod ?? "";
                    const handle: string = (entry as any).contactHandle ?? "";
                    let href: string | null = null;
                    if (method === "instagram") {
                      if (handle.startsWith("http")) { href = handle; }
                      else { href = `https://instagram.com/${handle.replace(/^@/, "")}`; }
                    } else if (method === "whatsapp") {
                      const digits = handle.replace(/[^0-9+]/g, "");
                      href = `https://wa.me/${digits}`;
                    } else if (method === "email") {
                      href = `mailto:${handle}`;
                    } else if (handle.startsWith("http")) {
                      href = handle;
                    }
                    return href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-black font-mono underline decoration-[#c6ff3d] decoration-2 hover:text-[#555] transition-colors"
                      >
                        {handle} ↗
                      </a>
                    ) : (
                      <span className="text-sm font-bold text-black font-mono">{handle}</span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* work */}
        {(() => {
          const allLinks = ((entry.externalLinks ?? []) as { platform: string; url: string }[])
            .map((link) => ({ ...link, url: normalizeProfileUrl(link.platform, link.url) }))
            .filter((link) => link.url)
            .filter((link, index, links) => links.findIndex((candidate) => candidate.url === link.url) === index);
          const igPosts = (entry.portfolioPhotos ?? []).filter((p) => p.match(/instagram\.com\/(p|reel|tv)\//));
          const photos = (entry.portfolioPhotos ?? []).filter((p) => !p.match(/instagram\.com\//));

          const safeHostname = (url: string) => {
            try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
          };
          const safeHandle = (url: string) =>
            url.replace(/https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/?/, "@").replace(/\/$/, "");
          const hasContent =
            allLinks.length > 0 || igPosts.length > 0 || photos.length > 0;
          if (!hasContent) return null;

          const externalLinkCard = (url: string, index: number) => {
            const platform = (() => {
              try {
                const h = new URL(url).hostname.replace(/^www\./, "");
                if (h.includes("bandcamp.com")) return "bandcamp";
                if (h.includes("soundcloud.com")) return "soundcloud";
                if (h.includes("spotify.com")) return "spotify";
                if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
                if (h.includes("vimeo.com")) return "vimeo";
                if (h.includes("tiktok.com")) return "tiktok";
                if (h.includes("mixcloud.com")) return "mixcloud";
                return h.split(".")[0] ?? "link";
              } catch { return "link"; }
            })();
            const sourceLink = allLinks.find((link) => link.url === url);
            const platformLabel = sourceLink?.platform?.trim() || platform;
            let displayText = url;
            try {
              const parsed = new URL(url);
              const path = parsed.pathname.replace(/\/$/, "").split("/").pop() ?? "";
              displayText = sourceLink?.platform?.toLowerCase().includes("instagram") && parsed.pathname
                ? safeHandle(url)
                : path.length > 4 ? path.slice(0, 40) : parsed.hostname.replace(/^www\./, "");
            } catch {}
            return (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between border border-black/15 bg-white/50 px-3.5 py-3 transition-colors hover:border-black hover:bg-[#c6ff3d]"
              >
                <div className="min-w-0">
                   <p className="text-[8px] uppercase tracking-[0.18em] text-black/30 mb-0.5">{platformLabel}</p>
                  <p className="text-[10px] font-bold uppercase text-black group-hover:text-black/50 transition-colors truncate">
                    {displayText}
                  </p>
                </div>
                <span className="text-sm text-black/25 group-hover:text-black transition-colors shrink-0 ml-3">↗</span>
              </a>
            );
          };

          return (
            <div className="mb-8">
              <Divider label="selected work & links" />

              {allLinks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {allLinks.map((link, index) => externalLinkCard(link.url, index))}
                </div>
              )}

              {(igPosts.length > 0 || photos.length > 0) && (
                <details className="border border-black/15 bg-white/30 group">
                  <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-bold hover:bg-[#c6ff3d]/20 transition-colors">
                  <span>more visual work</span>
                    <span className="text-black/35 group-open:rotate-45 transition-transform text-base leading-none">+</span>
                  </summary>
                  <div className="border-t border-black/10 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {igPosts.map((url, i) => externalLinkCard(url, i))}
                    {photos.map((url, i) => externalLinkCard(url, i + igPosts.length))}
                  </div>
                </details>
              )}
            </div>
          );
        })()}

        {/* selected work / experiences */}
        {legacyExps.length > 0 && (
          <div className="mb-8">
            <Divider label="selected moments" />
            <p className="mb-4 max-w-xl text-[10px] leading-relaxed text-black/40">
              a few projects, events, and moments that give this voice context.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {legacyExps.slice(0, 3).map((ex, i) => (
                <div key={i} className="border border-black/15 bg-white/40 p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-[11px] uppercase leading-tight text-black">{ex.title}</h3>
                    <span className="text-[8px] text-[#718b00] uppercase tracking-widest shrink-0">↗</span>
                  </div>
                  {(ex.date || ex.location) && (
                    <p className="text-[8px] text-black/40 uppercase tracking-widest mb-2">
                      {[ex.date, ex.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {ex.description && (
                    <p className="text-[11px] text-black/60 leading-relaxed font-sans">{ex.description}</p>
                  )}
                </div>
              ))}
            </div>
            {legacyExps.length > 3 && (
              <details className="mt-2 border border-black/15 bg-white/30 group">
                <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-bold hover:bg-[#c6ff3d]/20 transition-colors">
                  <span>show {legacyExps.length - 3} more</span>
                  <span className="text-black/35 group-open:rotate-45 transition-transform text-base leading-none">+</span>
                </summary>
                <div className="border-t border-black/10 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {legacyExps.slice(3).map((ex, i) => (
                    <div key={i} className="border border-black/10 p-3.5">
                      <h3 className="font-bold text-[11px] uppercase leading-tight text-black mb-2">{ex.title}</h3>
                      {(ex.date || ex.location) && (
                        <p className="text-[8px] text-black/40 uppercase tracking-widest mb-2">
                          {[ex.date, ex.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {ex.description && (
                        <p className="text-[11px] text-black/60 leading-relaxed font-sans">{ex.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* community feedback - kept below the voice's work and connection details */}
        <div className="mb-8">
          <Divider label="community rating" />
          <EntryRating entryId={id} myEntryId={session?.entryId ?? null} token={session?.token ?? null} />
        </div>

        <div className="mb-8">
          <Divider label="comments" />
          <EntryComments entryId={id} myEntryId={session?.entryId ?? null} token={session?.token ?? null} />
        </div>

        <div id="editorial-context" className="md:col-span-12">
          <EditorialTrail trails={editorialTrails} />
        </div>

        {/* more from the map */}
        {more.length > 0 && (
          <div className="mt-14 md:col-span-12">
            <Divider label={moreSectionLabel} />
            <div className="grid grid-cols-2 gap-2 pb-2 md:grid-cols-4">
              {more.map((e) => (
                <a
                  key={e.id}
                  href={`/entries/${e.id}`}
                  className="group block border-2 border-black/10 transition-colors hover:border-black"
                >
                  <div className="bg-black/5 overflow-hidden aspect-square">
                    {e.heroPhoto ? (
                      <ProtectedProfileImage
                        src={e.heroPhoto}
                        token={session?.token}
                        alt={e.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full">
                        <GeneratedAvatar name={e.name} kind={e.kind} size="lg" />
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 border-t-2 border-black/10 group-hover:border-black transition-colors">
                    <p className="text-[9px] font-bold uppercase truncate text-black">{e.name}</p>
                    <p className="text-[8px] text-black/40 uppercase truncate">{e.kind} · {e.city}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export function EntryDetailIncoming() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<LocalSession | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cc_auth");
      if (!raw) return;
      const p = JSON.parse(raw) as LocalSession;
      if (p?.token && p?.email) setSession(p);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!Number.isNaN(id)) {
      void fetch(`/api/entries/${id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [id]);

  const { data: entry, isLoading, error } = useGetEntry(Number.isNaN(id) ? 0 : id);
  const { data: all = [] } = useListEntries();
  const { data: allOffers = [] } = useListResidencyOffers();

  useEffect(() => {
    if (!entry || error) {
      setSeoMeta("name", "robots", "noindex, follow");
      return;
    }

    const title = `${entry.name} | ${entry.kind === "artist" ? "Independent Artist" : entry.kind === "space" ? "Cultural Space" : "Cultural Place"} | Countercult`;
    const location = [entry.city, entry.country].filter(Boolean).join(", ");
    const blurb = entry.blurb?.trim() ?? "";
    const tags = (entry.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean);
    const editorialTrails = getEditorialTrails({
      city: entry.city,
      kind: entry.kind,
      tags,
    });
    const description = blurb
      ? `${entry.name}${location ? ` in ${location}` : ""} - ${blurb}`.slice(0, 160)
      : `${entry.name}${location ? ` in ${location}` : ""} - a public ${entry.kind} profile on Countercult's curated culture map.`;
    const canonicalUrl = `${SEO_ORIGIN}/entries/${entry.id}`;
    const profileImage = toSeoUrl(entry.heroPhoto ?? entry.portfolioPhotos?.[0]);
    const externalLinks = Array.isArray(entry.externalLinks)
      ? (entry.externalLinks as { url?: string }[]).map((link) => link.url).filter((url): url is string => Boolean(url))
      : [];

    document.title = title;
    const setMeta = (attribute: "name" | "property", name: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta("name", "description", description);
    setMeta("name", "robots", "index, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", entry.kind === "artist" ? "profile" : "website");
    if (profileImage) setMeta("property", "og:image", profileImage);
    if (tags.length > 0) setMeta("name", "keywords", tags.join(", "));
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (profileImage) setMeta("name", "twitter:image", profileImage);

    setCanonical(canonicalUrl);

    const entityType = entry.kind === "artist"
      ? "Person"
      : entry.kind === "space"
        ? ["LocalBusiness", "Place"]
        : "CreativeWork";
    const schema = {
      "@type": entityType,
      "@id": canonicalUrl,
      name: entry.name,
      url: canonicalUrl,
      description: blurb || description,
      image: profileImage,
      keywords: tags,
      sameAs: [...externalLinks, entry.url, (entry as any).shopUrl].filter(Boolean),
      mainEntityOfPage: { "@id": `${canonicalUrl}#page` },
      subjectOf: editorialTrails.map((trail) => ({
        "@type": "Article",
        name: trail.title,
        url: `${SEO_ORIGIN}${trail.href}`,
      })),
      ...(entry.kind === "artifact" && entry.city
        ? { locationCreated: { "@type": "Place", name: entry.city } }
        : {}),
      address: location
        ? {
            "@type": "PostalAddress",
            addressLocality: entry.city || undefined,
            addressCountry: entry.country || undefined,
          }
        : undefined,
      isPartOf: { "@id": "https://countercult.network/#website" },
    };
    const pageSchema = {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#page`,
      url: canonicalUrl,
      name: title,
      description,
      isPartOf: { "@id": "https://countercult.network/#website" },
      about: { "@id": canonicalUrl },
      mainEntity: { "@id": canonicalUrl },
      breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
    };
    const breadcrumbSchema = {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Countercult", item: `${SEO_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: entry.kind, item: `${SEO_ORIGIN}/browse/${entry.kind}` },
          ...(entry.city
            ? [{ "@type": "ListItem", position: 3, name: entry.city, item: `${SEO_ORIGIN}/city/${encodeURIComponent(entry.city)}` }]
            : []),
          {
            "@type": "ListItem",
            position: entry.city ? 4 : 3,
            name: entry.name,
            item: canonicalUrl,
          },
      ],
    };
    setJsonLd("countercult-entry-jsonld", {
      "@context": "https://schema.org",
      "@graph": [schema, pageSchema, breadcrumbSchema],
    });
  }, [entry, error]);

  if (Number.isNaN(id) || error) {
    return <NotFound />;
  }

  if (isLoading || !entry) {
    return <LoadingState />;
  }

  const sameCity = all.filter((e) => e.id !== entry.id && e.city?.toLowerCase() === entry.city?.toLowerCase());
  const otherRandom = all.filter((e) => e.id !== entry.id && e.city?.toLowerCase() !== entry.city?.toLowerCase()).sort(() => Math.random() - 0.5);
  const more = [...sameCity, ...otherRandom].slice(0, 8);
  const moreSectionLabel = sameCity.length > 0 ? `more in ${entry.city}` : "more from the map";
  const editorialTrails = getEditorialTrails({
    city: entry.city,
    kind: entry.kind,
    tags: entry.tags ?? [],
  });
  const heroPhoto = entry.heroPhoto ?? entry.portfolioPhotos?.[0] ?? null;
  const kindLabel = entry.kind + ((entry as any).secondaryKind ? ` + ${(entry as any).secondaryKind}` : "");
  const locationLine = [kindLabel.toUpperCase(), "•", entry.city, entry.country, entry.postal]
    .filter(Boolean)
    .join(" ");
  void locationLine;

  const exps = (entry.experiences ?? []) as Experience[];
  const legacyExps = exps.filter((e) => !e.url);

  const openTo = getPublicOpenTo(((entry as any).openTo ?? []) as string[]);
  const rawOfferings = typeof (entry as any).offerings === "string"
    ? (entry as any).offerings.trim()
    : "";
  const { choices: offeringChoices, details: offeringDetails } = parseOfferings(rawOfferings);
  const entrySpaceOffer = entry as typeof entry & {
    spaceOfferAvailable?: boolean;
    spaceOfferTypes?: string[];
    spaceOfferCategory?: string | null;
    spaceOfferPricing?: string | null;
    spaceOfferDetails?: string | null;
  };
  const hasSpaceOffer = entry.kind === "space" && entrySpaceOffer.spaceOfferAvailable === true;
  const isResidencyOffer = hasSpaceOffer && entrySpaceOffer.spaceOfferCategory === "residency";
  const isHousingOffer = hasSpaceOffer && (
    entrySpaceOffer.spaceOfferCategory === "housing" || isResidencyOffer
  );
  const isWorkOffer = hasSpaceOffer && (
    entrySpaceOffer.spaceOfferCategory === "work" || isResidencyOffer
  );
  const offerPricingLabel = entrySpaceOffer.spaceOfferPricing === "free"
    ? "free for artists"
    : entrySpaceOffer.spaceOfferPricing === "paid"
      ? "cost discussed with the venue"
      : entrySpaceOffer.spaceOfferPricing === "case_by_case"
        ? "terms decided per collaboration"
        : null;
  const contactMethod = String((entry as any).contactMethod ?? "").toLowerCase();
  const contactHandle = String((entry as any).contactHandle ?? "").trim();
  const contactHref = (() => {
    if (!contactHandle) return null;
    if (contactMethod === "email") return `mailto:${contactHandle}`;
    if (contactMethod === "whatsapp") return `https://wa.me/${contactHandle.replace(/[^0-9+]/g, "")}`;
    if (contactMethod === "instagram") {
      return contactHandle.startsWith("http")
        ? contactHandle
        : `https://instagram.com/${contactHandle.replace(/^@/, "")}`;
    }
    return contactHandle.startsWith("http") ? contactHandle : null;
  })();
  const primaryAction = entry.url
    ? {
        href: normalizeEntryUrl(entry.url),
        label: entry.kind === "space" ? "visit space →" : entry.kind === "artifact" ? "open source →" : "see their work →",
      }
    : (entry as any).shopUrl
      ? { href: (entry as any).shopUrl as string, label: "shop →" }
      : contactHref
        ? { href: contactHref, label: `contact ${entry.kind === "space" ? "this space" : "this profile"} →` }
        : { href: "#editorial-context", label: "follow the context →" };

  // Section divider helper
  const Divider = ({ label }: { label: string }) => (
    <div className="border-t-2 border-black pt-3 mb-5">
      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/40">{label}</span>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase">

      {/* ── top nav ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 py-2.5 bg-[#F9F9F6] border-b-2 border-black">
        <div className="flex items-center gap-2 shrink-0">
          <a href="/" className="text-[10px] uppercase tracking-widest font-bold font-mono text-black/40 hover:text-black transition-colors">HOME</a>
          <span className="text-black/20">/</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-black/60">{entry.kind}</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement)?.value.trim(); window.location.href = q ? `/?q=${encodeURIComponent(q)}` : '/'; }}
          className="flex-1 min-w-0 hidden sm:block"
        >
          <input
            type="text"
            placeholder="search the map…"
            defaultValue={new URLSearchParams(window.location.search).get('q') ?? ''}
            className="w-full bg-black/5 border border-black/10 focus:border-black/40 px-3 py-1.5 text-[11px] font-mono text-black placeholder:text-black/25 focus:outline-none transition-colors"
          />
        </form>
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              void navigator.share({ title: entry.name, url });
            } else {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }
          }}
          className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors cursor-pointer"
        >
          {copied ? "copied ✓" : "↗ share"}
        </button>
      </div>

      {/* ── hero: huge name + passport photo ────────────── */}
      <div className="relative px-4 md:px-8 pt-8 pb-6 border-b-2 border-black">
        {/* Passport-stamp photo - top right */}
        <div className="absolute top-6 right-4 md:right-8 w-24 h-24 md:w-28 md:h-28 shrink-0 overflow-hidden border-2 border-black bg-black">
          {heroPhoto ? (
            <img src={heroPhoto} alt={entry.name} className="w-full h-full object-cover" />
          ) : (
            <GeneratedAvatar name={entry.name} kind={entry.kind} size="lg" />
          )}
        </div>

        {/* Kind + claimed badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap pr-28 md:pr-36">
          <span className="text-[9px] uppercase tracking-widest bg-black text-[#c6ff3d] px-2 py-0.5 font-bold">
            {entry.kind}
          </span>
          {(entry as any).secondaryKind && (
            <span className="text-[9px] uppercase tracking-widest bg-black/10 text-black border border-black/20 px-2 py-0.5 font-bold">
              + {(entry as any).secondaryKind}
            </span>
          )}
        </div>

        {/* MASSIVE NAME */}
        <h1
          className="font-black uppercase leading-[0.9] tracking-tight pr-28 md:pr-36 mb-4"
          style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}
        >
          {entry.name}
        </h1>

        {/* Location */}
        <p className="text-[10px] uppercase tracking-widest text-black/40 mb-5">
          {entry.city ? (
            <a
              href={`/city/${encodeURIComponent(entry.city)}`}
              className="underline decoration-black/15 underline-offset-2 hover:text-black transition-colors"
            >
              {[entry.city, entry.country].filter(Boolean).join(", ")}
            </a>
          ) : (
            [entry.city, entry.country].filter(Boolean).join(", ")
          )}
          {(entry as any).basedIn && (entry as any).basedIn.length > 0 && (
            <span className="text-black/25"> · also: {((entry as any).basedIn as string[]).join(" · ")}</span>
          )}
        </p>

        {(offeringChoices.length > 0 || offeringDetails) && (
          <div className="mb-5 max-w-2xl">
            <p className="mb-2 text-[8px] uppercase tracking-[0.2em] text-black/35">what they can offer</p>
            <div className="flex flex-wrap gap-1.5">
              {offeringChoices.slice(0, 4).map((item) => (
                <span key={item} className="border border-black/15 bg-[#c6ff3d]/45 px-2.5 py-1 text-[9px] uppercase tracking-widest">
                  {item}
                </span>
              ))}
              {offeringChoices.length > 4 && (
                <a href="#offers" className="px-2 py-1 text-[9px] uppercase tracking-widest text-black/45 hover:text-black transition-colors">
                  +{offeringChoices.length - 4} more
                </a>
              )}
            </div>
          </div>
        )}

        {entry.blurb?.trim() && (
          <div className="mb-8 max-w-2xl border-t border-black/10 pt-4">
            <p className="mb-2 text-[8px] uppercase tracking-[0.2em] text-black/45">
              about this {entry.kind}
            </p>
            <p className="text-sm leading-relaxed text-black/65 font-sans">
              {entry.blurb.trim()}
            </p>
          </div>
        )}

        {openTo.length > 0 && (
          <div className="mb-5 max-w-2xl">
            <p className="text-[8px] uppercase tracking-[0.2em] text-black/35 mb-2">currently open to</p>
            <div className="flex flex-wrap gap-1.5">
              {openTo.slice(0, 4).map((item) => (
                <a
                  key={item}
                  href={`/tag/${encodeURIComponent(normalizeTags([item])[0] ?? item.toLowerCase().trim())}`}
                  className="text-[9px] uppercase tracking-widest bg-[#c6ff3d]/45 border border-black/15 px-2.5 py-1 hover:bg-black hover:text-[#c6ff3d] hover:border-black transition-colors"
                >
                  {formatOpenToLabel(item)}
                </a>
              ))}
              {openTo.length > 4 && (
                <a
                  href="#open-to"
                  className="text-[9px] uppercase tracking-widest text-black/45 px-2 py-1 hover:text-black transition-colors"
                >
                  +{openTo.length - 4} more
                </a>
              )}
            </div>
          </div>
        )}

        <a
          href={primaryAction.href}
          target={primaryAction.href.startsWith("http") ? "_blank" : undefined}
          rel={primaryAction.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="inline-block text-xs uppercase tracking-widest font-bold bg-black text-[#c6ff3d] border-2 border-black px-6 py-3 hover:bg-[#c6ff3d] hover:text-black transition-colors"
        >
          {primaryAction.label}
        </a>
        {entry.kind === "space" && entry.claimRequestAvailable && session?.entryId !== entry.id && (
          <div
            className="mt-4 max-w-xl border border-black/20 bg-white/60 p-3"
            data-testid={`status-unclaimed-space-${entry.id}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-black">manage this space?</p>
            <p className="mt-1 text-[10px] leading-relaxed text-black/60">
              This listing is part of Countercult’s curated map and may have been added by our team. If you manage this space, contact us to request verified access to its listing. We check each request before making changes.
            </p>
            <a
              href={buildClaimRequestHref(entry)}
              data-testid={`link-claim-space-${entry.id}`}
              aria-label={`Request verified listing access for ${entry.name}`}
              className="mt-2 inline-block border-2 border-black bg-[#c6ff3d] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              request listing access →
            </a>
          </div>
        )}
      </div>

      {/* ── body sections ───────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-8 pb-16">

         {/* commercial space enquiry */}
         {entry.kind === "space" && <SpaceEnquiryForm entryId={entry.id} />}

         {/* tags */}
        {entry.kind === "space" && <SpaceEnquiryForm entryId={entry.id} />}
        {entry.tags.length > 0 && (
          <div className="mb-8">
            <Divider label="tags" />
            <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-black/35">
              click a tag to find everyone else with it
            </p>
            <div className="flex flex-wrap gap-1.5">
              {normalizeTags(entry.tags).map((tag) => (
                <a
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-[9px] uppercase tracking-widest border border-black/20 px-2.5 py-1 bg-transparent hover:bg-[#c6ff3d] hover:text-black hover:border-[#c6ff3d] transition-colors"
                >
                  {tag}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* offers */}
        {(offeringChoices.length > 0 || offeringDetails) && (
          <div id="offers" className="mb-8">
            <Divider label="what they can offer" />
            {offeringChoices.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {offeringChoices.map((item) => (
                  <span key={item} className="border border-black/15 bg-[#c6ff3d]/30 px-2.5 py-1 text-[9px] uppercase tracking-widest text-black">
                    {item}
                  </span>
                ))}
              </div>
            )}
            {offeringDetails && (
              <p className="max-w-xl whitespace-pre-line font-sans text-sm leading-relaxed text-black/70">
                {offeringDetails}
              </p>
            )}
          </div>
        )}

        {/* open to */}
        {openTo.length > 0 && (
          <div id="open-to" className="mb-8">
            <details className="border border-black/15 bg-white/30 group">
              <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-bold hover:bg-[#c6ff3d]/20 transition-colors">
                <span>what this profile is open to</span>
                <span className="text-black/35 group-open:rotate-45 transition-transform text-base leading-none">+</span>
              </summary>
              <div className="border-t border-black/10 p-3.5">
                <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-black/35">
                  ways this profile is open to working, sharing, or collaborating
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {openTo.map((item) => (
                    <a
                      key={item}
                      href={`/tag/${encodeURIComponent(normalizeTags([item])[0] ?? item.toLowerCase().trim())}`}
                      className="text-[9px] uppercase tracking-widest bg-[#c6ff3d]/30 text-black border border-black/15 px-2.5 py-1 hover:bg-black hover:text-[#c6ff3d] hover:border-black transition-colors"
                    >
                      {formatOpenToLabel(item)}
                    </a>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* preferred contact method */}
        {((entry as any).contactMethod || (entry as any).contactHandle) && (
          <div className="mb-8">
            <details className="border border-black/15 bg-white/30 group">
              <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-bold hover:bg-[#c6ff3d]/20 transition-colors">
                <span>more links &amp; contact</span>
                <span className="text-black/35 group-open:rotate-45 transition-transform text-base leading-none">+</span>
              </summary>
              <div className="border-t border-black/10 p-3.5">
                <div className="flex items-center gap-3 flex-wrap">
                  {(entry as any).contactMethod && (
                    <span className="text-[9px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black px-2.5 py-1">
                      {(entry as any).contactMethod}
                    </span>
                  )}
                  {(entry as any).contactHandle && (() => {
                    const method: string = (entry as any).contactMethod ?? "";
                    const handle: string = (entry as any).contactHandle ?? "";
                    let href: string | null = null;
                    if (method === "instagram") {
                      if (handle.startsWith("http")) { href = handle; }
                      else { href = `https://instagram.com/${handle.replace(/^@/, "")}`; }
                    } else if (method === "whatsapp") {
                      const digits = handle.replace(/[^0-9+]/g, "");
                      href = `https://wa.me/${digits}`;
                    } else if (method === "email") {
                      href = `mailto:${handle}`;
                    } else if (handle.startsWith("http")) {
                      href = handle;
                    }
                    return href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-black font-mono underline decoration-[#c6ff3d] decoration-2 hover:text-[#555] transition-colors"
                      >
                        {handle} ↗
                      </a>
                    ) : (
                      <span className="text-sm font-bold text-black font-mono">{handle}</span>
                    );
                  })()}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* swap board listings */}
        {(() => {
           const swapOffers = allOffers.filter((o) =>
             o.entryId === entry.id &&
             o.kind !== "venue_offer" &&
             !(o.kind === "host" && isHousingOffer) &&
             !(o.kind === "open_call" && isResidencyOffer)
           );
          if (swapOffers.length === 0) return null;
          const KIND_META: Record<string, { glyph: string; label: string }> = {
            host: { glyph: "⌂", label: "hosting" },
            swap: { glyph: "⇄", label: "swap" },
            looking: { glyph: "?", label: "looking" },
            workshop: { glyph: "◉", label: "workshop" },
            collab: { glyph: "⊕", label: "collab" },
            performance: { glyph: "♪", label: "performance" },
            residency: { glyph: "⌂", label: "residency" },
             venue_offer: { glyph: "⊕", label: "space collaboration" },
          };
          return (
            <div className="mb-8">
              <Divider label="on the swap board" />
              <div className="flex flex-col gap-3">
                {swapOffers.map((offer) => {
                  const meta = KIND_META[offer.kind] ?? { glyph: "◉", label: offer.kind };
                  const dest = (offer as any).destination as string | null | undefined;
                  return (
                    <div key={offer.id} className="border border-black/10 p-4 flex flex-col gap-2 bg-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest bg-[#c6ff3d] text-black px-2 py-0.5 font-bold">
                          {meta.glyph} {meta.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-black/40">{offer.city}</span>
                        {dest && (
                          <>
                            <span className="text-[10px] text-black/20">→</span>
                            <span className="text-[10px] uppercase tracking-widest text-black/40">{dest}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-black/60 leading-relaxed">{offer.description}</p>
                      {(offer.availableFrom || offer.availableTo) && (
                        <div className="text-[10px] uppercase tracking-widest text-black/30">
                          {offer.availableFrom && <span>from {offer.availableFrom}</span>}
                          {offer.availableFrom && offer.availableTo && <span> - </span>}
                          {offer.availableTo && <span>to {offer.availableTo}</span>}
                        </div>
                      )}
                      {offer.contact && (
                        <div className="text-[10px] uppercase tracking-widest text-black/30">
                          contact: <span className="font-bold text-black">{offer.contact}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* room / space */}
        {(() => {
          const e = entry as any;
          const rows: { label: string; value: string }[] = [];
          if (e.swapType) rows.push({ label: "type", value: e.swapType.replace(/_/g, " ") });
          if (e.spacePrivacy) rows.push({ label: "privacy", value: e.spacePrivacy.replace(/_/g, " ") });
          if (e.financialStructure) rows.push({ label: "terms", value: e.financialStructure.replace(/_/g, " ") });
          if (e.costDetails) rows.push({ label: "cost", value: e.costDetails });
          if (e.durationTerms) rows.push({ label: "duration", value: e.durationTerms });
          if (e.vibeTags) rows.push({ label: "vibe", value: e.vibeTags });
          if (e.dealbreakers) rows.push({ label: "rules", value: e.dealbreakers });
          if (e.noiseAndGuests) rows.push({ label: "noise", value: e.noiseAndGuests });
           if (rows.length === 0 && !isHousingOffer) return null;
          return (
             <div className="mb-8">
               <Divider label={isHousingOffer ? "housing" : "room / space"} />
               {isHousingOffer && (
                 <div className="border-2 border-[#c6ff3d] bg-[#c6ff3d]/10 p-4 mb-4">
                   <p className="text-[10px] uppercase tracking-widest font-bold mb-2">
                     {isResidencyOffer ? "artist residency / coliving" : "coliving / artist residence"}
                   </p>
                   <p className="text-xs text-black/65 leading-relaxed mb-3">
                     {isResidencyOffer
                       ? "open to hosting artists for a live-in residency that also belongs in opportunities."
                       : "open to hosting artists for a residence stay."}
                   </p>
                   {offerPricingLabel && (
                     <p className="text-[9px] uppercase tracking-widest font-bold mb-2">{offerPricingLabel}</p>
                   )}
                   {entrySpaceOffer.spaceOfferDetails && (
                     <p className="text-[11px] text-black/60 leading-relaxed">{entrySpaceOffer.spaceOfferDetails}</p>
                   )}
                 </div>
               )}
               {rows.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                   {rows.map(({ label, value }) => (
                     <div key={label} className="flex gap-3 items-baseline border-b border-black/8 pb-2">
                       <span className="text-[8px] uppercase tracking-[0.2em] text-black/30 w-16 shrink-0">{label}</span>
                       <span className="text-[11px] text-black/70 font-sans leading-snug">{value}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          );
        })()}

        {/* work */}
        {(() => {
          const allLinks = ((entry.externalLinks ?? []) as { platform: string; url: string }[])
            .map((link) => ({ ...link, url: normalizeProfileUrl(link.platform, link.url) }))
            .filter((link) => link.url)
            .filter((link, index, links) => links.findIndex((candidate) => candidate.url === link.url) === index);
          const igPosts = (entry.portfolioPhotos ?? []).filter((p) => p.match(/instagram\.com\/(p|reel|tv)\//));
          const photos = (entry.portfolioPhotos ?? []).filter((p) => !p.match(/instagram\.com\//));

          const safeHostname = (url: string) => {
            try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
          };
          const safeHandle = (url: string) =>
            url.replace(/https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/?/, "@").replace(/\/$/, "");
          const hasContent =
            isWorkOffer || allLinks.length > 0 || igPosts.length > 0 || photos.length > 0;
          if (!hasContent) return null;

          const externalLinkCard = (url: string, index: number) => {
            const platform = (() => {
              try {
                const h = new URL(url).hostname.replace(/^www\./, "");
                if (h.includes("bandcamp.com")) return "bandcamp";
                if (h.includes("soundcloud.com")) return "soundcloud";
                if (h.includes("spotify.com")) return "spotify";
                if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
                if (h.includes("vimeo.com")) return "vimeo";
                if (h.includes("tiktok.com")) return "tiktok";
                if (h.includes("mixcloud.com")) return "mixcloud";
                return h.split(".")[0] ?? "link";
              } catch { return "link"; }
            })();
            const sourceLink = allLinks.find((link) => link.url === url);
            const platformLabel = sourceLink?.platform?.trim() || platform;
            let displayText = url;
            try {
              const parsed = new URL(url);
              const path = parsed.pathname.replace(/\/$/, "").split("/").pop() ?? "";
              displayText = sourceLink?.platform?.toLowerCase().includes("instagram") && parsed.pathname
                ? safeHandle(url)
                : path.length > 4 ? path.slice(0, 40) : parsed.hostname.replace(/^www\./, "");
            } catch {}
            return (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-black/15 bg-white/50 px-3.5 py-3 transition-colors group hover:border-black"
              >
                <div className="min-w-0">
                   <p className="text-[8px] uppercase tracking-[0.18em] text-black/30 mb-0.5">{platformLabel}</p>
                  <p className="text-[10px] font-bold uppercase text-black group-hover:text-black/50 transition-colors truncate">
                    {displayText}
                  </p>
                </div>
                <span className="text-sm text-black/25 group-hover:text-black transition-colors shrink-0 ml-3">↗</span>
              </a>
            );
          };

          return (
            <div className="mb-8">
              <Divider label="selected work & links" />

              {isWorkOffer && (
                <div className="border-2 border-[#c6ff3d] bg-[#c6ff3d]/10 p-4 mb-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-2">
                    {isResidencyOffer ? "artist residency" : "space collaborations"}
                  </p>
                  <p className="text-xs text-black/65 leading-relaxed mb-3">
                    {isResidencyOffer
                      ? "a live-in residency for artists; see the Housing section for the residence side."
                      : "open to sharing this space with artists for:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(entrySpaceOffer.spaceOfferTypes ?? []).map((type) => (
                      <span key={type} className="text-[8px] uppercase tracking-widest bg-white border border-black/15 px-2.5 py-1">
                        {type}
                      </span>
                    ))}
                  </div>
                  {offerPricingLabel && (
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2">{offerPricingLabel}</p>
                  )}
                  {entrySpaceOffer.spaceOfferDetails && (
                    <p className="text-[11px] text-black/60 leading-relaxed">{entrySpaceOffer.spaceOfferDetails}</p>
                  )}
                </div>
              )}

              {allLinks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {allLinks.map((link, index) => externalLinkCard(link.url, index))}
                </div>
              )}

              {photos.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open portfolio photo ${index + 1} by ${entry.name}`}
                      className="block aspect-[4/3] overflow-hidden border border-black/15 bg-black/5"
                    >
                      <ProtectedProfileImage
                        src={url}
                        token={session?.token}
                        alt={`Portfolio photo ${index + 1} by ${entry.name}`}
                        loading="lazy"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              )}
              {igPosts.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {igPosts.map((url, index) => externalLinkCard(url, index))}
                </div>
              )}
            </div>
          );
        })()}

        {/* selected work / experiences */}
        {legacyExps.length > 0 && (
          <div className="mb-8">
            <Divider label="selected moments" />
            <p className="text-[10px] text-black/40 leading-relaxed mb-4 max-w-xl">
              a few projects, events, and moments that give this profile context.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {legacyExps.slice(0, 3).map((ex, i) => (
                <div key={i} className="border border-black/15 bg-white/40 p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-[11px] uppercase leading-tight text-black">{ex.title}</h3>
                    <span className="text-[8px] text-[#718b00] uppercase tracking-widest shrink-0">↗</span>
                  </div>
                  {(ex.date || ex.location) && (
                    <p className="text-[8px] text-black/40 uppercase tracking-widest mb-2">
                      {[ex.date, ex.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {ex.description && (
                    <p className="text-[11px] text-black/60 leading-relaxed font-sans">{ex.description}</p>
                  )}
                </div>
              ))}
            </div>
            {legacyExps.length > 3 && (
              <details className="mt-2 border border-black/15 bg-white/30 group">
                <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] font-bold hover:bg-[#c6ff3d]/20 transition-colors">
                  <span>show {legacyExps.length - 3} more</span>
                  <span className="text-black/35 group-open:rotate-45 transition-transform text-base leading-none">+</span>
                </summary>
                <div className="border-t border-black/10 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {legacyExps.slice(3).map((ex, i) => (
                    <div key={i} className="border border-black/10 p-3.5">
                      <h3 className="font-bold text-[11px] uppercase leading-tight text-black mb-2">{ex.title}</h3>
                      {(ex.date || ex.location) && (
                        <p className="text-[8px] text-black/40 uppercase tracking-widest mb-2">
                          {[ex.date, ex.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {ex.description && (
                        <p className="text-[11px] text-black/60 leading-relaxed font-sans">{ex.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* community feedback - kept below the profile's work and connection details */}
        <div className="mb-8">
          <Divider label="community rating" />
          <EntryRating entryId={id} myEntryId={session?.entryId ?? null} token={session?.token ?? null} />
        </div>

        <div className="mb-8">
          <Divider label="comments" />
          <EntryComments entryId={id} myEntryId={session?.entryId ?? null} token={session?.token ?? null} />
        </div>

        <div id="editorial-context">
          <EditorialTrail trails={editorialTrails} />
        </div>

        {/* more from the map */}
        {more.length > 0 && (
          <div>
            <Divider label={moreSectionLabel} />
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4">
              {more.map((e) => (
                <a
                  key={e.id}
                  href={`/entries/${e.id}`}
                  className="group block border-2 border-black/10 hover:border-black transition-colors shrink-0 w-32 md:w-auto"
                >
                  <div className="bg-black/5 overflow-hidden aspect-square">
                    {e.heroPhoto ? (
                      <img
                        src={e.heroPhoto}
                        alt={e.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-black text-3xl font-bold">{KIND_GLYPH[e.kind as EntryKind]}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 border-t-2 border-black/10 group-hover:border-black transition-colors">
                    <p className="text-[9px] font-bold uppercase truncate text-black">{e.name}</p>
                    <p className="text-[8px] text-black/40 uppercase truncate">{e.kind} · {e.city}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] font-mono lowercase">
      <div className="w-full bg-black/5" style={{ aspectRatio: "16/7", maxHeight: 440 }}>
        <div className="w-full h-full animate-pulse bg-black/10" />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="border border-black/10 p-6">
          <div className="h-4 bg-black/10 rounded w-1/4 mb-4 animate-pulse" />
          <div className="h-8 bg-black/10 rounded w-3/4 mb-3 animate-pulse" />
          <div className="h-4 bg-black/10 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase flex items-center justify-center">
      <div className="text-center p-8 border-2 border-black max-w-xs">
        <div className="text-6xl font-bold text-black mb-4">404</div>
        <p className="text-sm uppercase tracking-widest text-black/40 mb-6">entry not found</p>
        <a
          href="/explore"
          className="block py-3 px-6 bg-[#c6ff3d] text-black border-2 border-black hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest font-bold"
        >
          ← back to map
        </a>
      </div>
    </div>
  );
}
