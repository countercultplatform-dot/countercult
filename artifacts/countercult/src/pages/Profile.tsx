import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import {
  OFFERING_CHOICES,
  OPEN_TO_CHOICES,
  getPublicOpenTo,
  parseOfferings,
  serializeOfferings,
} from "@/data/profileChoices";

interface SessionEntry {
  id: number;
  name: string;
  kind: string;
  city: string;
  country: string;
  status: string;
}

interface MeResponse {
  email: string;
  isApproved: boolean;
  entryId: number | null;
  entries: SessionEntry[];
}

interface FullEntry {
  id: number;
  name: string;
  kind: string;
  city: string;
  country: string;
  status: string;
  blurb: string | null;
  heroPhoto: string | null;
  portfolioPhotos: string[];
  url: string | null;
  shopUrl?: string | null;
  offerings?: string | null;
  basedIn?: string[];
  externalLinks: { platform: string; url: string }[];
  experiences: { title?: string; description?: string; date?: string; location?: string; url?: string }[];
  contactMethod: string | null;
  contactHandle: string | null;
  spaceOfferAvailable?: boolean;
  spaceOfferTypes?: string[];
  spaceOfferCategory?: string | null;
  spaceOfferPricing?: string | null;
  spaceOfferDetails?: string | null;
  isHidden: boolean;
  organizationModel?: string | null;
  intendedCommercialUse?: boolean | null;
  derivedClassification?: string;
  reviewedClassification?: string | null;
}

interface ExchangePost {
  id: number;
  entryId?: number | null;
  kind: string;
  city: string;
  description: string;
  cost?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  isActive?: boolean;
}

type ExperienceDraft = {
  url: string;
  title: string;
  description: string;
  date: string;
  location: string;
};

const PLATFORMS = ["Bandcamp", "Spotify", "RA", "SoundCloud", "Instagram", "Mixcloud", "YouTube", "Vimeo", "Behance", "Website", "Other"];

import { normalizeProfileUrl, cleanLinks } from "@/utils/normalizeProfileUrl";
const KIND_GLYPH: Record<string, string> = { artist: "◉", space: "▣", artifact: "◬" };

const LEGACY_RESIDENT_VALUES = ["housing offers", "residencies", "residency opportunities", "artist residencies"];
function selectedOfferingChoices(value: string): string[] {
  return parseOfferings(value).choices;
}

function offeringDetails(value: string): string {
  return parseOfferings(value).details;
}

type BioBuilderNotes = {
  practice: string;
  focus: string;
  based: string;
  openTo: string;
};

function finishSentence(value: string): string {
  const clean = value.trim().replace(/[.!?]+$/, "");
  return clean ? `${clean}.` : "";
}

function buildBioDraft(notes: BioBuilderNotes): string {
  return [
    notes.practice ? `I’m ${finishSentence(notes.practice)}` : "",
    notes.focus ? `My work explores ${finishSentence(notes.focus).replace(/\.$/, "")}.` : "",
    notes.based ? `Based in ${finishSentence(notes.based)}` : "",
    notes.openTo ? `Open to ${finishSentence(notes.openTo)}` : "",
  ].filter(Boolean).join(" ").slice(0, 600);
}

function getAuth(): { token: string; email: string } | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const data = JSON.parse(raw) as { token?: string; email?: string; expiresAt?: string };
    if (!data.token || !data.email) return null;
    if (data.expiresAt && new Date(data.expiresAt) <= new Date()) return null;
    return { token: data.token, email: data.email };
  } catch {
    return null;
  }
}

const DEMO_ENTRY: FullEntry = {
  id: 0,
  name: "your artist name",
  kind: "artist",
  city: "Cape Town",
  country: "South Africa",
  status: "published",
  blurb: "independent producer + dj. melting leftfield club music with afro-futurist textures. based between cape town and berlin.",
  heroPhoto: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80",
  portfolioPhotos: [
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
    "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&q=80",
    "",
    "",
    "",
    "",
  ],
  url: "https://yourbandcamp.com",
  externalLinks: [
    { platform: "Bandcamp", url: "https://yourbandcamp.com" },
    { platform: "RA", url: "https://ra.co/dj/yourname" },
    { platform: "Instagram", url: "https://instagram.com/yourhandle" },
  ],
  experiences: [
    { url: "https://lu.ma/boilerroom-ct", title: "Boiler Room Cape Town" },
    { url: "https://dice.fm/event/nyege-nyege-2025", title: "Nyege Nyege Festival" },
  ],
  contactMethod: null,
  contactHandle: null,
  isHidden: false,
};

export default function Profile() {
  const [, navigate] = useLocation();
  const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";
  const auth = isDemo ? null : getAuth();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [entry, setEntry] = useState<FullEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [showBioBuilder, setShowBioBuilder] = useState(false);
  const [bioBuilderNotes, setBioBuilderNotes] = useState<BioBuilderNotes>({ practice: "", focus: "", based: "", openTo: "" });
  const [bioBuilderError, setBioBuilderError] = useState("");
  const [heroPhoto, setHeroPhoto] = useState("");
  const [heroPhotoPreview, setHeroPhotoPreview] = useState<string | null>(null);
  const [heroPhotoUploading, setHeroPhotoUploading] = useState(false);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(["", "", "", "", "", ""]);
  // portfolioPhotos now stores post URLs (instagram, bandcamp, soundcloud, etc.) - not uploaded images
  const [shopUrl, setShopUrl] = useState("");
  const [offerings, setOfferings] = useState("");
  const [basedIn, setBasedIn] = useState<string[]>([]);
  const [basedInInput, setBasedInInput] = useState("");

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [url, setUrl] = useState("");
  const [externalLinks, setExternalLinks] = useState<{ platform: string; url: string }[]>([{ platform: "Bandcamp", url: "" }]);
  const [experiences, setExperiences] = useState<{ url: string; title: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "submissions">("profile");
  const [showPreview, setShowPreview] = useState(false);
  const [pinHidden, setPinHidden] = useState(false);
  const [pinToggling, setPinToggling] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (heroPhotoPreview) URL.revokeObjectURL(heroPhotoPreview);
    };
  }, [heroPhotoPreview]);

  // ── Dirty-state tracking ──────────────────────────────────────────────────
  const loadedRef = useRef<string>("");
  /** Capture the profile URL at mount-time so the popstate guard can restore it
   *  (window.location.href has already changed by the time popstate fires). */
  const profileUrlRef = useRef(window.location.href);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavFn, setPendingNavFn] = useState<(() => void) | null>(null);

  /**
   * Canonical snapshot: a stable JSON string of all editable fields.
   * Used for the loaded-state ref AND for the isDirty comparison so
   * normalization is always identical and false-positives are impossible.
   *
   * Rules:
   *  - all string fields are trimmed
   *  - portfolioPhotos empty slots are dropped (filter Boolean)
   *  - externalLinks rows with an empty URL are dropped
   *  - experiences rows with an empty URL are dropped
   */
  const snap = (fields: {
    name: string; blurb: string; heroPhoto: string; portfolioPhotos: string[];
    url: string; externalLinks: { platform: string; url: string }[];
    experiences: { url: string; title: string }[];
     contactMethod: string; contactHandle: string; openTo: string[];
      shopUrl: string; offerings: string; basedIn: string[];
  }) =>
    JSON.stringify({
      name: fields.name.trim(),
      blurb: fields.blurb.trim(),
      heroPhoto: fields.heroPhoto.trim(),
      portfolioPhotos: fields.portfolioPhotos.map((p) => p.trim()).filter(Boolean),
      url: fields.url.trim(),
       externalLinks: cleanLinks(fields.externalLinks),
      experiences: fields.experiences.filter((e) => e.url.trim()),
      contactMethod: fields.contactMethod,
      contactHandle: fields.contactHandle.trim(),
      openTo: fields.openTo,
       shopUrl: fields.shopUrl.trim(),
       offerings: fields.offerings.trim(),
       basedIn: fields.basedIn,
    });

  // NOTE: intentionally NOT useMemo - loadedRef.current is a ref (not state), so
  // a memo would return a stale cached `true` after save because its deps (the
  // form fields) haven't changed even though loadedRef was just updated.
  // Plain expression re-evaluates on every render, which is what we need.
  const isDirty =
    !!loadedRef.current &&
    snap({ name, blurb, heroPhoto, portfolioPhotos, url, externalLinks, experiences, contactMethod, contactHandle, openTo, shopUrl, offerings, basedIn }) !==
      loadedRef.current;

  // Keep a ref in sync so event handlers can read the latest value without
  // needing to re-register on every field change.
  const isDirtyRef = useRef(false);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  /** Guard browser close / refresh while dirty. */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /**
   * Guard browser Back/Forward (popstate) while dirty.
   *
   * When Back is pressed the browser has already moved to the previous URL
   * before popstate fires, so window.location.href is the *destination*.
   * We pushState the saved profile URL to restore the history stack, then
   * show the dialog.  "Leave anyway" calls history.back() - which now pops
   * that restored entry and lands on the original destination.
   *
   * bypassNextPopstateRef prevents the guard from re-firing for the
   * history.back() call that "leave anyway" itself triggers.
   */
  const bypassNextPopstateRef = useRef(false);
  useEffect(() => {
    const handler = () => {
      if (bypassNextPopstateRef.current) { bypassNextPopstateRef.current = false; return; }
      if (!isDirtyRef.current) return;
      // Restore profile page in the history stack (undo the back-navigation).
      window.history.pushState(null, "", profileUrlRef.current);
      // "Leave anyway" must bypass our guard for this one call.
      setPendingNavFn(() => () => { bypassNextPopstateRef.current = true; window.history.back(); });
      setShowLeaveDialog(true);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []); // mount-once; reads refs only

  /** Wrap any navigation action: show dialog if dirty, else run immediately. */
  const confirmNavigation = (fn: () => void) => {
    if (isDirty) {
      setPendingNavFn(() => fn);
      setShowLeaveDialog(true);
    } else {
      fn();
    }
  };

  useEffect(() => {
    if (isDemo) {
      setMe({ email: "demo@countercultcreatives.com", isApproved: true, entryId: 0, entries: [{ id: 0, name: DEMO_ENTRY.name, kind: DEMO_ENTRY.kind, city: DEMO_ENTRY.city, country: DEMO_ENTRY.country, status: "published" }] });
      setSelectedEntryId(0);
      setEntry(DEMO_ENTRY);
      const demoName = DEMO_ENTRY.name;
      const demoBlurb = DEMO_ENTRY.blurb ?? "";
      const demoHero = DEMO_ENTRY.heroPhoto ?? "";
      const demoUrl = DEMO_ENTRY.url ?? "";
      const demoPhotos = [...DEMO_ENTRY.portfolioPhotos.slice(0, 6), ...Array(6).fill("")].slice(0, 6);
      const demoLinks = DEMO_ENTRY.externalLinks;
      const demoEvs = DEMO_ENTRY.experiences.filter((e) => e.url).map((e) => ({ url: e.url!, title: e.title ?? "" }));
      setName(demoName);
      setBlurb(demoBlurb);
      setHeroPhoto(demoHero);
      setUrl(demoUrl);
      setPortfolioPhotos(demoPhotos);
      setExternalLinks(demoLinks);
      setExperiences(demoEvs);
      setShopUrl(DEMO_ENTRY.shopUrl ?? "");
      setOfferings(DEMO_ENTRY.offerings ?? "");
      setBasedIn(DEMO_ENTRY.basedIn ?? []);
      setBasedInInput((DEMO_ENTRY.basedIn ?? []).join(", "));
      loadedRef.current = snap({ name: demoName, blurb: demoBlurb, heroPhoto: demoHero, portfolioPhotos: demoPhotos, url: demoUrl, externalLinks: demoLinks, experiences: demoEvs, contactMethod: "", contactHandle: "", openTo: [], shopUrl: DEMO_ENTRY.shopUrl ?? "", offerings: DEMO_ENTRY.offerings ?? "", basedIn: DEMO_ENTRY.basedIn ?? [] });
      setLoading(false);
      return;
    }
    if (!auth) {
      navigate("/");
      window.dispatchEvent(new CustomEvent("cc:open-signin"));
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: MeResponse) => {
        setMe(data);
        const firstPublished = data.entries.find((e) => e.status === "published") ?? data.entries[0] ?? null;
        if (firstPublished) setSelectedEntryId(firstPublished.id);
      })
      .catch(() => {
        localStorage.removeItem("cc_auth");
        window.dispatchEvent(new CustomEvent("cc:session-change"));
        navigate("/");
        window.dispatchEvent(new CustomEvent("cc:open-signin"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEntryId === null || !auth) return;
    fetch(`/api/entries/${selectedEntryId}/profile`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: FullEntry) => {
        setEntry(data);
        setName(data.name ?? "");
        setBlurb(data.blurb ?? "");
        setHeroPhoto(data.heroPhoto ?? "");
        setShopUrl(data.shopUrl ?? "");
        setOfferings(data.offerings ?? "");
        setBasedIn(data.basedIn ?? []);
        setBasedInInput((data.basedIn ?? []).join(", "));
        setUrl(data.url ?? "");
        const photos = [...(data.portfolioPhotos ?? [])];
        while (photos.length < 6) photos.push("");
        setPortfolioPhotos(photos);
        setExternalLinks(
          data.externalLinks?.length
            ? cleanLinks(data.externalLinks)
            : [{ platform: "Bandcamp", url: "" }]
        );
        setExperiences(
          (data.experiences ?? []).filter((e) => e.url).map((e) => ({ url: e.url!, title: e.title ?? "" }))
        );
        const sContactMethod = data.contactMethod ?? "";
        const sContactHandle = data.contactHandle ?? "";
        const sOpenTo = (data as unknown as { openTo?: string[] }).openTo ?? [];
        setContactMethod(sContactMethod);
        setContactHandle(sContactHandle);
        setOpenTo(sOpenTo);
        setPinHidden((data as unknown as { isHidden?: boolean }).isHidden ?? false);
        // Capture snapshot of freshly-loaded values so isDirty starts false
        loadedRef.current = snap({
          name: data.name ?? "",
          blurb: data.blurb ?? "",
          heroPhoto: data.heroPhoto ?? "",
          portfolioPhotos: data.portfolioPhotos ?? [],
          url: data.url ?? "",
           externalLinks: cleanLinks(data.externalLinks ?? []),
          experiences: (data.experiences ?? []).filter((e) => e.url).map((e) => ({ url: e.url!, title: e.title ?? "" })),
          contactMethod: sContactMethod, contactHandle: sContactHandle, openTo: sOpenTo,
          shopUrl: data.shopUrl ?? "", offerings: data.offerings ?? "", basedIn: data.basedIn ?? [],
        });
      })
      .catch(() => setError("couldn't load entry"));
  }, [selectedEntryId]);

  useEffect(() => {
    if (isDemo || !auth || !me?.isApproved) return;
    let active = true;
    setReferralLoading(true);
    setReferralError("");
    fetch("/api/referrals/me", {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then(async (response) => {
        const data = await response.json() as { code?: string; error?: string };
        if (!response.ok || !data.code) throw new Error(data.error ?? "couldn't create invite link");
        return data;
      })
      .then((data) => {
        if (active) setReferralLink(`${window.location.origin}/?ref=${encodeURIComponent(data.code!)}`);
      })
      .catch((err) => {
        if (active) setReferralError(err instanceof Error ? err.message : "couldn't create invite link");
      })
      .finally(() => {
        if (active) setReferralLoading(false);
      });
    return () => { active = false; };
  }, [auth?.token, isDemo, me?.isApproved]);

  const shareReferral = async () => {
    if (!referralLink) return;
    const shareText = "thought you should be on Countercult - a curated network for independent artists and spaces.";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Countercult", text: shareText, url: referralLink });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${referralLink}`);
        setReferralCopied(true);
        window.setTimeout(() => setReferralCopied(false), 2500);
      }
    } catch {
      // Native share can be cancelled without an error state.
    }
  };

  /** Upload a file to object storage via presigned URL. Returns the serving path. */
  const uploadPhoto = async (file: File): Promise<string> => {
    const urlRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!urlRes.ok) throw new Error("could not get upload URL");
    const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
    const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!putRes.ok) throw new Error("upload failed");
    return `/api/storage${objectPath}`;
  };

  const handleHeroPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("photo must be under 2MB"); return; }
    setHeroPhotoUploading(true);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const url = await uploadPhoto(file);
      setHeroPhoto(url);
      setHeroPhotoPreview(previewUrl);
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError("photo upload failed - please try again");
    } finally {
      setHeroPhotoUploading(false);
      e.target.value = "";
    }
  };


  const changePassword = async () => {
    if (isDemo) { setPwError("this is a preview - sign in to change your password"); return; }
    if (!auth) return;
    if (pwNew !== pwConfirm) { setPwError("new passwords don't match"); return; }
    if (pwNew.length < 8) { setPwError("new password must be at least 8 characters"); return; }
    setPwSaving(true);
    setPwError(null);
    try {
      const r = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) throw new Error(data.error ?? "failed to change password");
      setPwSaved(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setShowChangePw(false);
      setTimeout(() => setPwSaved(false), 4000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const togglePin = async (hide: boolean) => {
    if (isDemo) { setError("this is a preview - sign in to change pin visibility"); return; }
    if (selectedEntryId === null || !auth) return;
    setPinToggling(true);
    setError(null);
    try {
      const r = await fetch(`/api/entries/${selectedEntryId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ hidden: hide }),
      });
      if (!r.ok) {
        const data = await r.json() as { error?: string };
        throw new Error(data.error ?? "failed to update pin visibility");
      }
      setPinHidden(hide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to update pin visibility");
    } finally {
      setPinToggling(false);
    }
  };

  const doSignOut = () => {
    try {
      const raw = localStorage.getItem("cc_auth");
      if (raw) {
        const s = JSON.parse(raw) as { token?: string };
        if (s.token) {
          fetch("/api/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${s.token}` },
          }).catch(() => {/* best-effort */});
        }
      }
    } catch { /* ignore */ }
    localStorage.removeItem("cc_auth");
    window.dispatchEvent(new CustomEvent("cc:session-change"));
    navigate("/");
  };

  const signOut = () => confirmNavigation(doSignOut);

  const save = async () => {
    if (isDemo) { setError("this is a preview - sign in to save real changes"); return; }
    if (selectedEntryId === null || !auth) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        blurb: blurb.trim(),
        heroPhoto: heroPhoto.trim() || undefined,
        portfolioPhotos: portfolioPhotos.map((p) => p.trim()).filter(Boolean),
        url: url.trim(),
        shopUrl: shopUrl.trim() || undefined,
        offerings: offerings.trim() || undefined,
        basedIn,
        externalLinks: cleanLinks(externalLinks),
        experiences: experiences.filter((e) => e.url.trim()),
        contactMethod: contactMethod || undefined,
        contactHandle: contactHandle.trim() || undefined,
        openTo,
      };
      const r = await fetch(`/api/entries/${selectedEntryId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json() as { error?: string };
        throw new Error(data.error ?? "save failed");
      }
      setSaved(true);
      // Update snapshot so isDirty resets to false (use same snap() helper)
      loadedRef.current = snap({
        name, blurb, heroPhoto, portfolioPhotos, url,
         externalLinks: cleanLinks(externalLinks), experiences,
         contactMethod, contactHandle, openTo, shopUrl, offerings, basedIn,
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  const draftBio = () => {
    const draft = buildBioDraft(bioBuilderNotes);
    if (!draft) {
      setBioBuilderError("add at least one note and we'll give you a starting point");
      return;
    }
    setBlurb(draft);
    setBioBuilderError("");
    setShowBioBuilder(false);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F9F9F6] font-mono flex items-center justify-center">
        <span className="text-black/30 text-xs uppercase tracking-widest">loading…</span>
      </div>
    );
  }

  if (!me) return null;

  const publishedEntries = me.entries.filter((e) => e.status === "published");

  const proposeNew = () => confirmNavigation(() => { window.location.href = "/explore?action=submit"; });

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] font-mono lowercase pb-24">
      <PageHeader title="my profile" />
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* top bar */}
        <div className="flex items-center justify-between mb-0 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-black/40">signed in as</p>
            <p className="text-sm font-bold text-black">{me.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 hover:border-black px-3 py-1.5 transition-colors"
          >
            sign out
          </button>
        </div>

        {!isDemo && me.isApproved && (
          <section className="mb-6 border-2 border-black bg-black px-4 py-4 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">grow the network</p>
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.12em]">invite someone who belongs here</h2>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">approved members only</span>
            </div>
            <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-white/65">
              Send this link to an artist, collective, or space you trust. Their application will arrive with your name attached for curation.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 border border-white/20 bg-white/5 px-3 py-2 font-mono text-[10px] text-white/55">
                {referralLoading ? "creating your invite link…" : referralLink || "invite link unavailable"}
              </div>
              <button
                onClick={() => void shareReferral()}
                disabled={!referralLink || referralLoading}
                className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {referralCopied ? "✓ copied" : "share invite →"}
              </button>
            </div>
            {referralError && <p className="mt-2 text-[10px] text-red-300">{referralError}</p>}
          </section>
        )}

        {/* tab bar */}
        <div className="flex border-b-2 border-black/10 mb-6 -mx-4 px-4 overflow-x-auto">
          <TabBtn active={activeTab === "profile"} onClick={() => confirmNavigation(() => setActiveTab("profile"))}>
            ◉ my artist page
          </TabBtn>
          <TabBtn active={activeTab === "submissions"} onClick={() => confirmNavigation(() => setActiveTab("submissions"))}>
            my submissions
          </TabBtn>
          <TabBtn active={false} onClick={proposeNew} lime>
            + propose new entry
          </TabBtn>
        </div>

        {/* ── SUBMISSIONS TAB ── */}
        {activeTab === "submissions" && (
          <div>
            {me.entries.length === 0 ? (
              <div className="border-2 border-black/10 p-8 text-center">
                <p className="text-sm text-black/40 mb-4">no submissions linked to this email yet.</p>
                <button
                  onClick={proposeNew}
                  className="bg-[#c6ff3d] text-black border-2 border-black px-5 py-2 text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors"
                >
                  + propose your first entry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {me.entries.map((e) => {
                  const isPending = e.status === "pending_review";
                  const isPublished = e.status === "published";
                  const isRejected = e.status === "rejected";
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 px-4 py-3 border transition-colors ${
                        isPublished
                          ? "border-black/20 hover:border-black cursor-pointer"
                          : "border-black/10 cursor-default"
                      }`}
                      onClick={() => {
                        if (isPublished) {
                          confirmNavigation(() => { setSelectedEntryId(e.id); setActiveTab("profile"); });
                        }
                      }}
                    >
                      <span className="text-xl shrink-0">{KIND_GLYPH[e.kind] ?? "◉"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{e.name}</p>
                        <p className="text-[10px] text-black/40 uppercase">{e.kind} · {e.city}, {e.country}</p>
                      </div>
                      <span className={`text-[9px] uppercase tracking-widest border px-2 py-1 shrink-0 font-bold ${
                        isPublished ? "border-[#c6ff3d] bg-[#c6ff3d] text-black" :
                        isPending ? "border-black/20 text-black/40" :
                        isRejected ? "border-red-200 text-red-400" : "border-black/20 text-black/40"
                      }`}>
                        {isPublished ? "live" : isPending ? "pending review" : e.status}
                      </span>
                      {isPublished && (
                        <span className="text-black/30 text-xs shrink-0">edit →</span>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={proposeNew}
                  className="mt-2 self-start text-[10px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 hover:border-black px-4 py-2 transition-colors"
                >
                  + propose another entry
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE EDITOR TAB ── */}
        {activeTab === "profile" && (
          <>
            {/* entry switcher (if multiple published) */}
            {publishedEntries.length > 1 && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {publishedEntries.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => confirmNavigation(() => setSelectedEntryId(e.id))}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border-2 font-bold transition-colors ${
                      selectedEntryId === e.id
                        ? "bg-black text-[#c6ff3d] border-black"
                        : "bg-transparent text-black border-black/30 hover:border-black"
                    }`}
                  >
                    {KIND_GLYPH[e.kind] ?? "◉"} {e.name}
                  </button>
                ))}
              </div>
            )}

            {entry?.kind === "space" && (
              <section className="mb-5 border-2 border-black p-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-black/45 mb-2">space classification</p>
                <p className="text-xs text-black/70 leading-relaxed">
                  Artist-run, nonprofit and community spaces keep a free public profile. Commercial billing and paid business tools are temporarily unavailable while Countercult reviews this service.
                </p>
              </section>
            )}

            {/* no published entries */}
            {publishedEntries.length === 0 && (
              <div className="border border-black/10 bg-[#f3efe7] p-5 mb-4">
                <p className="text-[10px] uppercase tracking-widest text-black/50 mb-1 font-bold">no live profile yet</p>
                <p className="text-xs text-black/50 leading-relaxed mb-3">
                  your submission is pending curator review. you'll receive a sign-in link by email once it's approved.
                </p>
                <button onClick={() => confirmNavigation(() => setActiveTab("submissions"))} className="text-[10px] uppercase tracking-widest text-black border border-black/30 hover:border-black px-3 py-1.5 transition-colors">
                  view my submissions →
                </button>
              </div>
            )}

            {/* entry editor */}
            {entry && selectedEntryId !== null && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{KIND_GLYPH[entry.kind] ?? "◉"}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-black/40">{entry.kind} · {entry.city}, {entry.country}</p>
                <a href={`/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:text-black/60 transition-colors">
                  {entry.name} ↗
                </a>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 uppercase tracking-widest">
                {error}
              </div>
            )}

            {/* pin visibility toggle */}
            <div className={`mb-5 flex items-center justify-between px-4 py-3 border-2 transition-colors ${pinHidden ? "border-black/30 bg-black/[0.03]" : "border-[#c6ff3d] bg-[#c6ff3d]/10"}`}>
              <div>
                <p className={`text-[11px] uppercase tracking-widest font-bold ${pinHidden ? "text-black/50" : "text-black"}`}>
                  {pinHidden ? "⏸ your pin is paused" : "◉ your pin is live"}
                </p>
                <p className="text-[9px] text-black/40 mt-0.5 leading-relaxed">
                  {pinHidden ? "your profile is hidden from the map - only you can see it." : "your profile is visible on the culture map."}
                </p>
              </div>
              <button
                onClick={() => void togglePin(!pinHidden)}
                disabled={pinToggling || isDemo}
                className={`text-[10px] uppercase tracking-widest font-bold border-2 px-3 py-1.5 transition-colors disabled:opacity-40 ${
                  pinHidden
                    ? "bg-[#c6ff3d] border-black text-black hover:bg-black hover:text-[#c6ff3d]"
                    : "bg-transparent border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                {pinToggling ? "…" : pinHidden ? "go live" : "pause pin"}
              </button>
            </div>

            {/* display name */}
            <Field label="display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                placeholder="your name / collective name"
              />
            </Field>

            {/* bio */}
            <Field label="bio / blurb">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[9px] text-black/40 leading-relaxed">
                  2–4 clear sentences helps people know why to reach out.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowBioBuilder((open) => !open); setBioBuilderError(""); }}
                  className="shrink-0 border border-black/30 px-2 py-1 text-[9px] font-bold uppercase tracking-widest hover:border-black hover:bg-[#c6ff3d] transition-colors"
                >
                  {showBioBuilder ? "close helper" : "help me write it"}
                </button>
              </div>
              {showBioBuilder && (
                <div className="mb-3 border-2 border-black bg-[#c6ff3d]/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest">bio builder</p>
                  <p className="mt-1 mb-3 text-[10px] leading-relaxed text-black/55">
                    Add rough notes - not polished copy. We’ll turn them into a concise starting point. Nothing is saved until you save your profile.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ["practice", "What do you make or run?", "artist, DJ, venue, label, collective…"],
                      ["focus", "What are you exploring?", "sound, public space, experimental film…"],
                      ["based", "Where are you based?", "Berlin, New York, between two cities…"],
                      ["openTo", "What are you open to?", "collaborators, paid work, residencies…"],
                    ] as const).map(([key, label, placeholder]) => (
                      <label key={key} className="text-[9px] uppercase tracking-widest font-bold">
                        {label}
                        <input
                          value={bioBuilderNotes[key]}
                          onChange={(e) => setBioBuilderNotes((notes) => ({ ...notes, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="mt-1 w-full bg-white border border-black/20 px-2.5 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:border-black"
                        />
                      </label>
                    ))}
                  </div>
                  {bioBuilderError && <p className="mt-2 text-[10px] text-red-700">{bioBuilderError}</p>}
                  <button
                    type="button"
                    onClick={draftBio}
                    className="mt-3 border-2 border-black bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] hover:bg-white hover:text-black transition-colors"
                  >
                    draft my bio →
                  </button>
                </div>
              )}
              <textarea
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                rows={4}
                maxLength={600}
                className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none resize-none transition-colors"
                placeholder="a short description - who you are, what you do…"
              />
              <p className={`text-[9px] mt-1 ${blurb.length > 0 ? "text-black/30" : "text-black/45"}`}>
                {blurb.length > 0 ? `${blurb.length}/600` : "no bio yet - use the helper or write your own"}
              </p>
            </Field>

            {/* website */}
            <Field label="website / link">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                placeholder="https://yoursite.com"
              />
            </Field>

             {/* additional locations */}
             <Field label="also based in">
               <p className="text-[9px] text-black/35 mb-2 leading-relaxed">
                 add other cities or places where you’re based, separated by commas. your main location remains the map pin.
               </p>
               <input
                 value={basedInInput}
                 onChange={(e) => {
                   const value = e.target.value;
                   setBasedInInput(value);
                   setBasedIn(value.split(",").map((location) => location.trim()).filter(Boolean).slice(0, 8));
                 }}
                 className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                 placeholder="Berlin, Cape Town, New York"
                 maxLength={600}
               />
             </Field>

              {/* Network offers */}
              <div className="mt-6 mb-2 border-t-2 border-black/10 pt-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-black/50 mb-1">What can you offer to the network?</p>
                <p className="text-[9px] text-black/30 mb-4 leading-relaxed">
                  Choose housing, tools, paid work, artist coworking, skill swaps, or another concrete resource you can provide.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {OFFERING_CHOICES.map((option) => {
                  const selected = selectedOfferingChoices(offerings);
                  const active = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? selected.filter((value) => value !== option)
                          : [...selected, option];
                        setOfferings(serializeOfferings(next, offeringDetails(offerings)));
                      }}
                      className={`text-[9px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                        active
                          ? "bg-black text-[#c6ff3d] border-black"
                          : "bg-white text-black/40 border-black/20 hover:border-black hover:text-black"
                      }`}
                    >
                      {active ? "✓ " : ""}{option}
                    </button>
                  );
                })}
              </div>

              {/* additional offer detail */}
              <Field label="offer details and terms (optional)">
               <p className="text-[9px] text-black/35 mb-2 leading-relaxed">
                    Add availability, access, terms, or details that help another member understand the offer.
               </p>
               <textarea
                  value={offeringDetails(offerings)}
                  onChange={(e) => setOfferings(serializeOfferings(selectedOfferingChoices(offerings), e.target.value))}
                 rows={4}
                 maxLength={1200}
                 className="w-full resize-none bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                  placeholder="Describe the room, tools, paid opportunity, coworking session, or skill swap you can offer."
               />
                <p className="text-[9px] mt-1 text-black/30 text-right">{offeringDetails(offerings).length}/1200</p>
             </Field>

             <Field label="shop / sales link (optional)">
               <p className="text-[9px] text-black/35 mb-2 leading-relaxed">
                 if you sell music, editions, objects, tickets, or anything else online, add the link here.
               </p>
               <input
                 type="url"
                 value={shopUrl}
                 onChange={(e) => setShopUrl(e.target.value)}
                 className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                 placeholder="https://your-shop.com"
                 maxLength={300}
               />
             </Field>

            {/* hero photo */}
            <Field label="profile / hero photo">
              {heroPhoto ? (
                <div className="relative group">
                  <div className="w-full border border-black/10 overflow-hidden bg-black/5" style={{ aspectRatio: "16/7" }}>
                    <img src={heroPhotoPreview ?? heroPhoto} alt="hero" className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-2 flex gap-3">
                    <label className="cursor-pointer text-[10px] uppercase tracking-widest text-black/50 hover:text-black transition-colors underline">
                      replace
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => void handleHeroPhotoChange(e)} disabled={heroPhotoUploading} />
                    </label>
                    <button type="button" onClick={() => { setHeroPhoto(""); setHeroPhotoPreview(null); }}
                      className="text-[10px] uppercase tracking-widest text-black/30 hover:text-black transition-colors">
                      remove ×
                    </button>
                  </div>
                </div>
              ) : (
                <label className={`flex items-center gap-3 border-2 border-dashed px-4 py-5 transition-colors cursor-pointer group ${heroPhotoUploading ? "border-black/20 opacity-50" : "border-black/20 hover:border-black"}`}>
                  <span className="text-2xl text-black/20 group-hover:text-black/40 transition-colors">◎</span>
                  <div>
                    <p className="text-[11px] text-black/60 group-hover:text-black transition-colors">
                      {heroPhotoUploading ? "uploading…" : "click to upload profile photo"}
                    </p>
                    <p className="text-[9px] text-black/30 mt-0.5">max 2MB · jpg, png, webp · 16:7 ratio looks best</p>
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => void handleHeroPhotoChange(e)} disabled={heroPhotoUploading} />
                </label>
              )}
            </Field>

            {/* portfolio links */}
            <Field label="portfolio links (up to 6)">
              <p className="text-[9px] text-black/30 mb-3 leading-relaxed">
                paste links to instagram posts, bandcamp releases, soundcloud sets, vimeo videos, etc. - they'll appear on your profile.
              </p>
              <div className="flex flex-col gap-2">
                {portfolioPhotos.slice(0, 6).map((link, i) => {
                  const pl = (() => {
                    if (!link) return null;
                    try {
                      const h = new URL(link).hostname.replace(/^www\./, "");
                      if (h.includes("instagram.com")) return "instagram";
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
                  return (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={link}
                        onChange={(e) => setPortfolioPhotos((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                        className="flex-1 bg-white border border-black/20 focus:border-black px-3 py-2 text-xs outline-none transition-colors font-mono"
                        placeholder={`post link ${i + 1}`}
                      />
                      {pl && (
                        <span className="text-[8px] uppercase tracking-widest text-black/40 shrink-0">{pl}</span>
                      )}
                      {link && (
                        <button
                          type="button"
                          onClick={() => setPortfolioPhotos((prev) => { const next = [...prev]; next[i] = ""; return next; })}
                          className="text-black/30 hover:text-black shrink-0 text-xs transition-colors"
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>

            {/* external links */}
            <Field label="links (bandcamp, ra, spotify…)">
              <div className="flex flex-col gap-2">
                {externalLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) => {
                        const next = [...externalLinks];
                        next[i] = { ...next[i]!, platform: e.target.value };
                        setExternalLinks(next);
                      }}
                      className="bg-white border border-black/20 focus:border-black px-2 py-1.5 text-xs outline-none shrink-0"
                    >
                      {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const next = [...externalLinks];
                        next[i] = { ...next[i]!, url: e.target.value };
                        setExternalLinks(next);
                      }}
                      onBlur={(e) => {
                        const normalized = normalizeProfileUrl(link.platform, e.target.value);
                        if (normalized !== e.target.value) {
                          const next = [...externalLinks];
                          next[i] = { ...next[i]!, url: normalized };
                          setExternalLinks(next);
                        }
                      }}
                      className="flex-1 bg-white border border-black/20 focus:border-black px-2 py-1.5 text-xs outline-none transition-colors"
                      placeholder="https://…"
                    />
                    <button
                      onClick={() => setExternalLinks(externalLinks.filter((_, j) => j !== i))}
                      className="text-black/30 hover:text-black px-2 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {externalLinks.length < 10 && (
                  <button
                    onClick={() => setExternalLinks([...externalLinks, { platform: "Bandcamp", url: "" }])}
                    className="self-start text-[10px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 hover:border-black px-3 py-1.5 transition-colors"
                  >
                    + add link
                  </button>
                )}
              </div>
            </Field>

            {/* upcoming events */}
            <Field label="upcoming events (luma, eventbrite, dice, ra…)">
              <p className="text-[10px] text-black/40 mb-3 leading-relaxed">
                paste a link from any event platform. luma events will embed automatically; others show as a card.
              </p>
              <div className="flex flex-col gap-2">
                {experiences.map((ev, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        value={ev.url}
                        onChange={(e) => {
                          const next = [...experiences];
                          next[i] = { ...next[i]!, url: e.target.value };
                          setExperiences(next);
                        }}
                        className="w-full bg-white border border-black/20 focus:border-black px-2 py-1.5 text-xs outline-none transition-colors"
                        placeholder="https://lu.ma/… or eventbrite.com/… or dice.fm/…"
                      />
                      <input
                        value={ev.title}
                        onChange={(e) => {
                          const next = [...experiences];
                          next[i] = { ...next[i]!, title: e.target.value };
                          setExperiences(next);
                        }}
                        className="w-full bg-white border border-black/20 focus:border-black px-2 py-1.5 text-xs outline-none transition-colors"
                        placeholder="optional label (e.g. 'Boiler Room Cape Town')"
                      />
                    </div>
                    <button
                      onClick={() => setExperiences(experiences.filter((_, j) => j !== i))}
                      className="mt-1.5 text-black/30 hover:text-black text-xs px-2 transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setExperiences([...experiences, { url: "", title: "" }])}
                  className="self-start text-[10px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 hover:border-black px-3 py-1.5 transition-colors"
                >
                  + add event
                </button>
              </div>
            </Field>

            {/* ── Room Swaps ── */}
            {entry.kind === "space" && entry.spaceOfferAvailable && (
              <div className="mt-8 border-t-2 border-black/10 pt-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-black/50 mb-2">
                  {entry.spaceOfferCategory === "housing"
                    ? "Housing / coliving"
                    : entry.spaceOfferCategory === "residency"
                      ? "Artist residency"
                      : "Space collaborations"}
                </p>
                <div className="border-2 border-[#c6ff3d] bg-[#c6ff3d]/10 px-4 py-5">
                  <p className="text-xs font-bold text-black mb-2">your space offer is shown on your public profile</p>
                  <p className="text-[10px] text-black/60 leading-relaxed mb-3">
                    artists can see that you are open to sharing your venue for the activities below. your linked listing appears on the spaces board after approval.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(entry.spaceOfferTypes ?? []).map((type) => (
                      <span key={type} className="text-[8px] uppercase tracking-widest bg-white text-black border border-black/15 px-2.5 py-1">
                        {type}
                      </span>
                    ))}
                  </div>
                  {entry.spaceOfferPricing && (
                    <p className="text-[9px] uppercase tracking-widest font-bold text-black mb-2">
                      {entry.spaceOfferPricing === "free"
                        ? "free for artists"
                        : entry.spaceOfferPricing === "paid"
                          ? "cost discussed with the venue"
                          : "terms decided per collaboration"}
                    </p>
                  )}
                  {entry.spaceOfferDetails && (
                    <p className="text-[10px] text-black/60 leading-relaxed mb-3">{entry.spaceOfferDetails}</p>
                  )}
                  <a
                    href="/residency?tab=venue_hosting"
                    className="inline-block text-[10px] uppercase tracking-widest font-bold border border-black/30 hover:border-black px-3 py-2 transition-colors"
                  >
                    manage your space listing →
                  </a>
                </div>
              </div>
            )}

            {/* ── Room Swaps ── */}
            <div className="mt-8 border-t-2 border-black/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/50 mb-2">Housing & Space Offers</p>
              <div className="border-2 border-black/10 bg-[#F9F9F6] px-4 py-5 flex flex-col gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#555] mb-1">member benefit</p>
                  <p className="text-xs text-black/60 leading-relaxed">
                    offer a room, apartment, studio, office, or other creative space directly to approved members. list what you control, with clear dates and terms; there is no request or waitlist board.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => confirmNavigation(() => { window.location.href = "/residency?tab=room_swap"; })}
                  className="self-start text-[11px] uppercase tracking-widest font-bold border-2 border-black px-5 py-2.5 bg-[#c6ff3d] text-black hover:bg-black hover:text-[#c6ff3d] transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                >
                  offer housing or space →
                </button>
              </div>
            </div>

            {/* ── Contact Preferences ── */}
            <div className="mt-6 mb-2 border-t-2 border-black/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/50 mb-5">Contact Preferences</p>
            </div>

            <Field label="preferred contact method">
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="">- not set -</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </Field>

            <Field label="contact handle / username">
              <input
                value={contactHandle}
                onChange={(e) => setContactHandle(e.target.value)}
                className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                placeholder="@yourhandle · +49… · your@email.com"
              />
            </Field>

            {/* ── Looking For ── */}
            <div className="mt-6 mb-2 border-t-2 border-black/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/50 mb-1">What are you open to?</p>
              <p className="text-[9px] text-black/30 mb-4">select what you are currently looking for through the network - visible on your pin</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {OPEN_TO_CHOICES.map((option) => {
                const active = option === "residencies"
                  ? openTo.some((value) => ["residencies", "hosting residencies", "residency opportunities", "artist residencies"].includes(value.toLowerCase()))
                  : openTo.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setOpenTo((prev) => {
                        const legacyResidencyValues = ["hosting residencies", "residencies", "residency opportunities", "artist residencies"];
                        if (option === "residencies") {
                          return active
                            ? prev.filter((value) => !legacyResidencyValues.includes(value.toLowerCase()))
                            : [...prev.filter((value) => !legacyResidencyValues.includes(value.toLowerCase())), option];
                        }
                        return active ? prev.filter((o) => o !== option) : [...prev, option];
                      })
                    }
                    className={`text-[9px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                      active
                        ? "bg-black text-[#c6ff3d] border-black"
                        : "bg-white text-black/40 border-black/20 hover:border-black hover:text-black"
                    }`}
                  >
                    {active ? "✓ " : ""}{option}
                  </button>
                );
              })}
            </div>

            {/* save */}
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <button
                onClick={save}
                disabled={saving}
                className="bg-[#c6ff3d] text-black border-2 border-black px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40"
              >
                {saving ? "saving…" : "save changes"}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="text-[10px] uppercase tracking-widest text-black/50 hover:text-black border border-black/20 hover:border-black px-4 py-3 transition-colors"
              >
                preview pin ↗
              </button>
              {saved && <span className="text-[10px] uppercase tracking-widest text-black/50">✓ saved</span>}
              {isDirty && !saved && (
                <span className="text-[10px] uppercase tracking-widest text-amber-600/70">● unsaved changes</span>
              )}
            </div>

            {/* Pin Preview Modal */}
            {showPreview && (
              <PinPreviewModal
                entry={{
                  id: entry.id,
                  name,
                  kind: entry.kind,
                  city: entry.city,
                  country: entry.country,
                  blurb,
                  heroPhoto,
                  portfolioPhotos: portfolioPhotos.filter(Boolean),
                  url,
                  externalLinks: externalLinks.filter((l) => l.url.trim()),
                  experiences: experiences.filter((e) => e.url.trim()),
                  offerings,
                  openTo,
                }}
                onClose={() => setShowPreview(false)}
              />
            )}

            {/* ── Change Password ── */}
            <div className="mt-10 border-t border-black/10 pt-6">
              <button
                type="button"
                onClick={() => { setShowChangePw((v) => !v); setPwError(null); }}
                className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                {showChangePw ? "↑ cancel" : "change password →"}
              </button>
              {pwSaved && !showChangePw && (
                <span className="ml-4 text-[10px] uppercase tracking-widest text-black/50">✓ password updated</span>
              )}
            </div>

            {showChangePw && (
              <div className="flex flex-col gap-3 mt-4 p-4 border border-black/10 bg-black/[0.02]">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-black/40 mb-1.5">current password</label>
                  <input
                    type="password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                    placeholder="your current password"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-black/40 mb-1.5">new password</label>
                  <input
                    type="password"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                    placeholder="at least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-black/40 mb-1.5">confirm new password</label>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full bg-white border border-black/20 focus:border-black px-3 py-2 text-sm outline-none transition-colors"
                    placeholder="repeat new password"
                    autoComplete="new-password"
                  />
                </div>
                {pwError && (
                  <p className="text-[10px] text-red-500 border border-red-200 bg-red-50 px-3 py-2">{pwError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void changePassword()}
                  disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                  className="self-start bg-black text-[#c6ff3d] border-2 border-black px-6 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c6ff3d] hover:text-black transition-colors disabled:opacity-40"
                >
                  {pwSaving ? "updating…" : "update password →"}
                </button>
                <p className="text-[9px] text-black/30 leading-relaxed">
                  forgot your current password?{" "}
                  <a href="mailto:countercultplatform@gmail.com" className="underline hover:text-black transition-colors">
                    countercultplatform@gmail.com
                  </a>
                </p>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>

      {/* ── Leave confirmation dialog ── */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#F9F9F6] border-2 border-black font-mono lowercase p-6 shadow-2xl">
            <p className="text-[10px] uppercase tracking-widest font-bold text-black mb-1">unsaved changes</p>
            <p className="text-sm text-black/60 leading-relaxed mb-6">
              you have unsaved changes to your profile. if you leave now they'll be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveDialog(false);
                  if (pendingNavFn) { pendingNavFn(); setPendingNavFn(null); }
                }}
                className="flex-1 bg-black text-[#c6ff3d] border-2 border-black px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c6ff3d] hover:text-black transition-colors"
              >
                leave anyway
              </button>
              <button
                onClick={() => { setShowLeaveDialog(false); setPendingNavFn(null); }}
                className="flex-1 bg-[#c6ff3d] text-black border-2 border-black px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors"
              >
                keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// End incoming Profile implementation.

// ── Pin Preview Modal ──────────────────────────────────────────────────────────

interface PreviewEntry {
  id: number;
  name: string;
  kind: string;
  city: string;
  country: string;
  blurb: string;
  heroPhoto: string;
  portfolioPhotos: string[];
  url: string;
  externalLinks: { platform: string; url: string }[];
  experiences: { url: string; title: string }[];
  offerings: string;
  openTo: string[];
}

function PinPreviewModal({ entry, onClose }: { entry: PreviewEntry; onClose: () => void }) {
  const heroPhoto = entry.heroPhoto || null;
  const parsedOfferings = parseOfferings(entry.offerings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-[#F9F9F6] font-mono lowercase shadow-2xl border-t-2 sm:border-2 border-black">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#F9F9F6] border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-black/40">pin preview</span>
            <span className="text-[9px] text-black/30">- how visitors see your pin</span>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 hover:border-black px-3 py-1 transition-colors"
          >
            close ×
          </button>
        </div>

        {/* Entry header - centered */}
        <div className="px-4 pt-6 pb-4 border-b border-black/10 flex flex-col items-center text-center">
          <div className="w-24 h-24 shrink-0 overflow-hidden bg-black mb-3">
            {heroPhoto ? (
              <img src={heroPhoto} alt={entry.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-[#c6ff3d] text-3xl font-bold font-mono leading-none">
                  {entry.name.trim()[0]?.toUpperCase() ?? "?"}
                </span>
                <span className="text-[#c6ff3d]/30 text-sm mt-1">
                  {KIND_GLYPH[entry.kind] ?? "◉"}
                </span>
              </div>
            )}
          </div>
          <p className="text-[9px] uppercase tracking-widest text-black/40 mb-1">
            {entry.kind} · {entry.city}, {entry.country}
          </p>
          <h2 className="text-xl font-bold text-black leading-tight">{entry.name || "your name"}</h2>
        </div>

        <div className="px-4 py-4">

          {/* Bio */}
          {entry.blurb && (
            <div className="mb-6">
              <p className="text-xs text-black/70 leading-relaxed">{entry.blurb}</p>
            </div>
          )}

          {/* Offers */}
          {(parsedOfferings.choices.length > 0 || parsedOfferings.details) && (
            <div className="mb-6">
              <p className="text-[9px] uppercase tracking-widest font-bold text-black/50 mb-2">what I can offer</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedOfferings.choices.map((item) => (
                  <span key={item} className="text-[8px] uppercase tracking-widest bg-[#c6ff3d]/30 text-black border border-black/10 px-2.5 py-1">
                    {item}
                  </span>
                ))}
              </div>
              {parsedOfferings.details && (
                <p className="mt-2 text-xs leading-relaxed text-black/70">{parsedOfferings.details}</p>
              )}
            </div>
          )}

          {/* Open To */}
          {entry.openTo.length > 0 && (
            <div className="mb-6">
              <p className="text-[9px] uppercase tracking-widest font-bold text-black/50 mb-2">open to</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.openTo.map((item) => (
                  <span key={item} className="text-[8px] uppercase tracking-widest bg-[#c6ff3d]/30 text-black border border-black/10 px-2.5 py-1">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          {entry.externalLinks.length > 0 && (
            <div className="mb-6">
              <p className="text-[9px] uppercase tracking-widest font-bold text-black/50 mb-3">find on</p>
              <div className="flex flex-wrap gap-2">
                {entry.externalLinks.map((link, i) => (
                  <span
                    key={i}
                    className="py-1 px-3 border border-black/20 text-[10px] uppercase tracking-widest font-bold text-black/70"
                  >
                    {link.platform} ↗
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Website */}
          {entry.url && (
            <div className="mb-6">
              <span className="py-1.5 px-4 bg-[#f3efe7] text-black border-2 border-black text-xs uppercase tracking-widest font-bold">
                see more ↗
              </span>
            </div>
          )}

          {/* Portfolio photos */}
          {entry.portfolioPhotos.length > 0 && (
            <div className="mb-6">
              <p className="text-[9px] uppercase tracking-widest font-bold text-black/50 mb-3">portfolio</p>
              <div className="grid grid-cols-3 gap-1.5">
                {entry.portfolioPhotos.slice(0, 6).map((photo, i) => (
                  <div key={i} className="bg-black/5 border border-black/10 overflow-hidden aspect-square">
                    <img src={photo} alt={`portfolio ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No content placeholder */}
          {!entry.blurb && entry.externalLinks.length === 0 && entry.portfolioPhotos.length === 0 && (
            <p className="text-xs text-black/30 text-center py-4">
              fill in bio, links, and photos above to see them here.
            </p>
          )}

        </div>

        {/* Footer note */}
        <div className="px-4 py-3 bg-black/[0.03] border-t border-black/10">
          <p className="text-[9px] text-black/30 text-center uppercase tracking-widest">
            this is a preview of your current unsaved changes
          </p>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children, lime }: { active: boolean; onClick: () => void; children: React.ReactNode; lime?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border-b-2 whitespace-nowrap transition-colors mr-1 ${
        lime
          ? "border-transparent text-[#7a9e00] hover:text-black hover:border-black/20"
          : active
          ? "border-black text-black"
          : "border-transparent text-black/40 hover:text-black hover:border-black/20"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] uppercase tracking-widest text-black/50 mb-1.5 font-bold">
        {label}
      </label>
      {children}
    </div>
  );
}
