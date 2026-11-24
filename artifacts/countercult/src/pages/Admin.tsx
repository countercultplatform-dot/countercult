import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OPENSTREETMAP_ATTRIBUTION, OPENSTREETMAP_TILE_URL } from "@/lib/mapTiles";
import {
  useCheckAdminAuth,
  getListEntryPinsQueryKey,
  getListEntriesQueryKey,
  getListHomepageExchangePicksQueryKey,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { buildCuratorOutreachEmail } from "@/lib/curatorOutreachEmail";
import {
  adminHeaders,
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/admin-auth";

type AdminObjectImageProps = {
  src: string;
  alt: string;
  className: string;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  linked?: boolean;
};

function adminObjectPath(source: string): string | null {
  try {
    const url = new URL(source, window.location.origin);
    if (url.pathname.startsWith("/api/storage/objects/")) {
      return url.pathname.slice("/api/storage".length);
    }
    if (url.pathname.startsWith("/objects/")) return url.pathname;
    if (
      url.hostname === "storage.googleapis.com"
      || url.hostname.endsWith(".storage.googleapis.com")
    ) {
      return source;
    }
  } catch {
    return null;
  }
  return null;
}

function AdminObjectImage({
  src,
  alt,
  className,
  onError,
  linked = false,
}: AdminObjectImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    const objectPath = adminObjectPath(src);
    if (!objectPath) {
      setResolvedSrc(src);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setResolvedSrc(null);
    fetch(`/api/admin/storage/preview?path=${encodeURIComponent(objectPath)}`, {
      headers: adminHeaders(),
    })
      .then(async (response) => response.ok ? response.blob() : null)
      .then((blob) => {
        if (!blob) return;
        const nextUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        objectUrl = nextUrl;
        setResolvedSrc(nextUrl);
      })
      .catch(() => {
        // Missing or inaccessible previews should not block moderation.
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!resolvedSrc) return null;
  const image = <img src={resolvedSrc} alt={alt} className={className} onError={onError} />;
  return linked
    ? <a href={resolvedSrc} target="_blank" rel="noopener noreferrer" className="block border border-black/20 bg-white">{image}</a>
    : image;
}

const PIN_ICON = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#c6ff3d;border:2px solid #000;border-radius:50%;box-shadow:0 0 0 1px #fff;"></div>`,
  className: "admin-pin",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function Admin() {
  const [pwd, setPwd] = useState<string | null>(() => getAdminPassword());

  if (!pwd) {
    return <PasswordGate onUnlock={(p) => setPwd(p)} />;
  }

  return (
    <Dashboard
      pwd={pwd}
      onLogout={() => {
        clearAdminPassword();
        setPwd(null);
      }}
    />
  );
}

// ---------- Password Gate ----------
function PasswordGate({ onUnlock }: { onUnlock: (pwd: string) => void }) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/check", {
        headers: { "x-admin-password": value },
      });
      if (!res.ok) {
        setError("incorrect password");
        return;
      }
      setAdminPassword(value);
      onUnlock(value);
    } catch (err: any) {
      setError(err?.message || "request failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-white text-black font-mono lowercase flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border-2 border-black bg-white p-6 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold uppercase tracking-widest">admin · login</h1>
          <Link href="/explore" className="text-xs text-black/60 hover:text-black">
            ← map
          </Link>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-2">
            admin password
          </label>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black py-2 text-sm focus:outline-none focus:border-[#c6ff3d]"
            placeholder="enter password"
          />
        </div>
        {error && (
          <div className="text-xs text-black bg-[#c6ff3d] border-2 border-black px-2 py-1">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors text-sm uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {pending ? "checking…" : "unlock"}
        </button>
      </form>
    </div>
  );
}

// ---------- Pending Entry Card (with inline pin-picker) ----------
type ApplicationField = {
  key: string;
  label: string;
  wide?: boolean;
};

const APPLICATION_SECTIONS: { title: string; fields: ApplicationField[] }[] = [
  {
    title: "identity & contact",
    fields: [
      { key: "id", label: "application id" },
      { key: "name", label: "name" },
      { key: "kind", label: "profile type" },
      { key: "secondaryKind", label: "discipline / space type" },
      { key: "contactEmail", label: "email" },
      { key: "contactMethod", label: "preferred contact method" },
      { key: "contactHandle", label: "contact handle" },
      { key: "submittedBy", label: "submitted by" },
      { key: "referredBy", label: "referred by" },
      { key: "curatedBy", label: "curator" },
    ],
  },
  {
    title: "profile & location",
    fields: [
      { key: "blurb", label: "about", wide: true },
      { key: "city", label: "city" },
      { key: "country", label: "country" },
      { key: "postal", label: "postal code" },
      { key: "address", label: "address" },
      { key: "basedIn", label: "also based in" },
      { key: "url", label: "website / social link", wide: true },
      { key: "shopUrl", label: "shop link", wide: true },
      { key: "tags", label: "tags" },
      { key: "openTo", label: "open to", wide: true },
      { key: "offerings", label: "what they can offer", wide: true },
    ],
  },
  {
    title: "discovery & next steps",
    fields: [
      { key: "discoverySource", label: "how they found Countercult", wide: true },
      { key: "networkNextSteps", label: "plans for sharing or reaching out", wide: true },
      { key: "joinReason", label: "legacy community-voice answer", wide: true },
      { key: "experiences", label: "experiences / selected work", wide: true },
      { key: "externalLinks", label: "external links", wide: true },
    ],
  },
  {
    title: "space, exchange & working terms",
    fields: [
      { key: "swapType", label: "swap type" },
      { key: "spacePrivacy", label: "space access / privacy" },
      { key: "financialStructure", label: "financial structure" },
      { key: "costDetails", label: "cost details", wide: true },
      { key: "durationTerms", label: "duration / terms", wide: true },
      { key: "vibeTags", label: "vibe" },
      { key: "dealbreakers", label: "dealbreakers", wide: true },
      { key: "noiseAndGuests", label: "noise / guests", wide: true },
      { key: "spaceOfferAvailable", label: "space offer available" },
      { key: "spaceOfferTypes", label: "space offer types" },
      { key: "spaceOfferCategory", label: "space offer category" },
      { key: "spaceOfferPricing", label: "space offer pricing" },
      { key: "spaceOfferDetails", label: "space offer details", wide: true },
    ],
  },
  {
    title: "space classification",
    fields: [
      { key: "organizationModel", label: "organization model" },
      { key: "intendedCommercialUse", label: "intended commercial use" },
      { key: "commercialUseDescription", label: "commercial use description", wide: true },
      { key: "declaredClassification", label: "declared classification" },
      { key: "derivedClassification", label: "derived classification" },
      { key: "reviewedClassification", label: "reviewed classification" },
    ],
  },
  {
    title: "consent & review record",
    fields: [
      { key: "visibility", label: "profile visibility" },
      { key: "profileVisibilityConsentVersion", label: "profile visibility consent" },
      { key: "profileVisibilityConsentAt", label: "profile visibility consent time" },
      { key: "publicProfileConsentVersion", label: "public profile consent" },
      { key: "publicProfileConsentAt", label: "public profile consent time" },
      { key: "archiveConsentVersion", label: "archive consent" },
      { key: "archiveConsentAt", label: "archive consent time" },
      { key: "scrapingConsent", label: "scraping consent" },
      { key: "mapEligible", label: "map eligible" },
      { key: "status", label: "status" },
      { key: "isApproved", label: "approved" },
      { key: "approvalEmailSent", label: "approval email sent" },
      { key: "isVoiceFeatured", label: "voice featured" },
      { key: "createdAt", label: "submitted at" },
      { key: "updatedAt", label: "last updated" },
    ],
  },
];

function applicationValueIsPresent(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function formatApplicationValue(value: unknown) {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return value.join(", ");
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

function ApplicationFieldValue({ field, value }: { field: ApplicationField; value: unknown }) {
  const formatted = formatApplicationValue(value);
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);
  const isJson = typeof value === "object" && value !== null;

  return (
    <div className={field.wide ? "sm:col-span-2" : ""}>
      <dt className="text-[8px] font-bold uppercase tracking-widest text-black/35">{field.label}</dt>
      <dd className={`mt-1 text-[11px] leading-relaxed text-black/80 whitespace-pre-wrap break-words ${isJson ? "font-mono text-[10px]" : ""}`}>
        {isUrl ? (
          <a href={value as string} target="_blank" rel="noopener noreferrer" className="underline decoration-black/20 underline-offset-2 hover:decoration-black">
            {value as string}
          </a>
        ) : formatted}
      </dd>
    </div>
  );
}

function FullApplication({ entry }: { entry: any }) {
  return (
    <section className="mt-3 border-2 border-black/15 bg-black/[0.02]">
      <div className="border-b border-black/15 px-3 py-2 flex items-center justify-between gap-3">
        <h3 className="text-[9px] font-bold uppercase tracking-widest">full application</h3>
        <span className="text-[8px] uppercase tracking-widest text-black/35">all submitted fields</span>
      </div>
      <div className="p-3 flex flex-col gap-4">
        {APPLICATION_SECTIONS.map((section) => {
          const fields = section.fields.filter((field) => applicationValueIsPresent(entry[field.key]));
          if (fields.length === 0) return null;
          return (
            <div key={section.title}>
              <h4 className="text-[8px] font-bold uppercase tracking-widest text-black/40 border-b border-black/10 pb-1 mb-2">
                {section.title}
              </h4>
              <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <ApplicationFieldValue key={field.key} field={field} value={entry[field.key]} />
                ))}
              </dl>
            </div>
          );
        })}
        {(entry.heroPhoto || entry.portfolioPhotos?.length > 0) && (
          <div>
            <h4 className="text-[8px] font-bold uppercase tracking-widest text-black/40 border-b border-black/10 pb-1 mb-2">
              submitted images
            </h4>
            <div className="flex flex-wrap gap-2">
              {[entry.heroPhoto, ...(entry.portfolioPhotos ?? [])].filter(Boolean).map((photo: string, index: number) => (
                <AdminObjectImage
                  key={`${photo}-${index}`}
                  src={photo}
                  alt={`submitted image ${index + 1}`}
                  className="h-20 w-20 object-cover"
                  linked
                  onError={(event) => { (event.target as HTMLImageElement).style.display = "none"; }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PendingEntryCard({ e, pwd, onDone }: { e: any; pwd: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [pickingPin, setPickingPin] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [acting, setActing] = useState(false);
  const approve = async () => {
    setActing(true);
    try {
      const r = await fetch(`/api/admin/entries/${e.id}/approve`, {
        method: "POST",
        headers: { "x-admin-password": pwd, "Content-Type": "application/json" },
        body: JSON.stringify(pin ? { lat: pin.lat, lng: pin.lng } : {}),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null) as { error?: string } | null;
        toast.error(data?.error ?? "approval failed");
        return;
      }
      const result = await r.json().catch(() => null) as { approvalEmailStatus?: string } | null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);
      const emailNote = result?.approvalEmailStatus === "sent"
        ? "approval email accepted by Resend"
        : result?.approvalEmailStatus === "failed"
          ? "approval email failed"
          : result?.approvalEmailStatus === "already_sent"
            ? "approval email was already sent"
            : "no contact email saved";
      if (result?.approvalEmailStatus === "failed") {
        toast.error(`approved, but ${emailNote}; approve again to retry`);
      } else {
        toast.success(`${pin ? "approved + pin placed" : "approved - no pin set yet"} · ${emailNote}`);
      }
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "approval failed");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!window.confirm(`delete "${e.name}" from the review queue?`)) return;
    setActing(true);
    try {
      const r = await fetch(`/api/admin/entries/${e.id}`, { method: "DELETE", headers: { "x-admin-password": pwd } });
      if (!r.ok) {
        const data = await r.json().catch(() => null) as { error?: string } | null;
        toast.error(data?.error ?? "delete failed");
        return;
      }
      toast.success("entry deleted");
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "delete failed");
    } finally {
      setActing(false);
    }
  };

  const markEmailed = async () => {
    setActing(true);
    try {
      const r = await fetch(`/api/admin/entries/${e.id}/mark-emailed`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) { toast.error("failed to mark as emailed"); return; }
      toast.success("moved to Pending Reply ✓");
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "failed to mark as emailed");
    } finally {
      setActing(false);
    }
  };

  const switchKind = async () => {
    if (e.kind !== "artist" && e.kind !== "space") return;
    const nextKind = e.kind === "artist" ? "space" : "artist";
    const currentSecondaryKind = typeof e.secondaryKind === "string" ? e.secondaryKind : null;
    const nextSecondaryKind = currentSecondaryKind === nextKind ? e.kind : currentSecondaryKind;
    setActing(true);
    try {
      const r = await fetch(`/api/admin/entries/${e.id}`, {
        method: "PATCH",
        headers: { "x-admin-password": pwd, "Content-Type": "application/json" },
        body: JSON.stringify({ kind: nextKind, secondaryKind: nextSecondaryKind }),
      });
      const data = await r.json().catch(() => null) as { error?: string } | null;
      if (!r.ok) {
        toast.error(data?.error ?? `could not switch listing to ${nextKind}`);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);
      toast.success(`listing type changed to ${nextKind}`);
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? `could not switch listing to ${nextKind}`);
    } finally {
      setActing(false);
    }
  };

  const markMaybeLater = async () => {
    setActing(true);
    try {
      const r = await fetch(`/api/admin/entries/${e.id}/mark-maybe-later`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      const data = await r.json().catch(() => null) as { error?: string } | null;
      if (!r.ok) { toast.error(data?.error ?? "could not defer submission"); return; }
      toast.success("moved to Maybe Later");
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "could not defer submission");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border-2 border-black p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest">{e.name}</div>
          <div className="text-[10px] text-black/60 uppercase tracking-wide">{e.kind} · {e.city}, {e.country}</div>
          {e.blurb && <div className="text-[10px] text-black/70 mt-1 line-clamp-2">{e.blurb}</div>}
          {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-black/50 mt-0.5 truncate block hover:underline">{e.url}</a>}
          {e.contactEmail && (
            <a href={`mailto:${e.contactEmail}`} className="text-[10px] text-black/60 mt-0.5 hover:text-black hover:underline block">
              ✉ {e.contactEmail}
            </a>
          )}
        </div>
        {e.heroPhoto && (
          <AdminObjectImage src={e.heroPhoto} alt="" className="w-16 h-16 object-cover border border-black shrink-0" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>
       <FullApplication entry={e} />

      {/* Pin placement */}
      <div className="border border-black/20 p-2 flex flex-col gap-1.5 bg-black/[0.02]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest text-black/50">
            {pin ? `📍 ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}` : "no pin set - click map to place"}
          </span>
          <button
            onClick={() => setPickingPin((v) => !v)}
            className="text-[9px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] px-2 py-1 hover:bg-[#c6ff3d] hover:text-black transition-colors"
          >
            {pickingPin ? "hide map" : "pick pin ◎"}
          </button>
        </div>
        {pickingPin && (
          <div className="h-[220px] border-2 border-black overflow-hidden">
            <MapContainer center={[20, 10]} zoom={2} className="cc-map-dark w-full h-full" zoomControl={true}>
              <TileLayer
                url={OPENSTREETMAP_TILE_URL}
                attribution={OPENSTREETMAP_ATTRIBUTION}
              />
              <MapClickHandler onPick={(lat, lng) => { setPin({ lat, lng }); setPickingPin(false); }} />
              {pin && <Marker position={[pin.lat, pin.lng]} />}
            </MapContainer>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          onClick={() => void approve()}
          disabled={acting}
          className="flex-1 py-2 text-[10px] uppercase tracking-widest font-bold bg-[#c6ff3d] border-2 border-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40"
        >
          {acting ? "…" : pin ? "✓ approve + place pin" : "✓ approve (no pin)"}
        </button>
        {e.kind === "artist" || e.kind === "space" ? (
          <button
            onClick={() => void switchKind()}
            disabled={acting}
            aria-label={`Switch ${e.name} from ${e.kind} to ${e.kind === "artist" ? "space" : "artist"}`}
            className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold bg-transparent border-2 border-black text-black hover:bg-[#c6ff3d] transition-colors disabled:opacity-40"
            data-testid={`button-switch-entry-kind-${e.id}`}
          >
            {acting ? "…" : `↔ switch to ${e.kind === "artist" ? "space" : "artist"}`}
          </button>
        ) : (
          <button
            onClick={() => void markEmailed()}
            disabled={acting}
            className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold bg-transparent border-2 border-[#f5a623] text-[#f5a623] hover:bg-[#f5a623] hover:text-black transition-colors disabled:opacity-40"
          >
            ✉ sent · pending reply
          </button>
        )}
        <button
          onClick={() => void markMaybeLater()}
          disabled={acting}
          className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold bg-transparent border-2 border-black/40 text-black/65 hover:bg-black hover:text-white transition-colors disabled:opacity-40"
        >
          maybe later
        </button>
        <button
          onClick={() => void reject()}
          disabled={acting}
          className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold bg-transparent border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
        >
          ✕ delete
        </button>
      </div>
    </div>
  );
}

// ---------- Pending Entries Panel ----------
function PendingEntriesPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/entries/pending", { headers: { "x-admin-password": pwd } });
      if (!r.ok) {
        toast.error(`pending entries request failed: ${r.status}`);
        return;
      }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(`failed to load pending entries: ${err?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.country?.toLowerCase().includes(q) ||
      e.kind?.toLowerCase().includes(q) ||
      e.contactEmail?.toLowerCase().includes(q) ||
      e.curatedBy?.toLowerCase().includes(q)
    );
  });

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Review Submissions {entries.length > 0 && `(${filtered.length}${search ? ` of ${entries.length}` : ""})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              nominated &amp; manually submitted entries - place pin, approve or reject
            </p>
          </div>
          <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">refresh</button>
        </div>
        <div className="px-4 py-3 border-b-2 border-black">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by name, city, kind, email…"
            className="w-full bg-transparent border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30"
          />
        </div>
        {loading && <div className="px-4 py-3 text-xs text-black/40 uppercase tracking-widest">loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-4 text-xs text-black/40 uppercase tracking-widest text-center">
            {search ? "no matches" : "no pending submissions."}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="p-4 flex flex-col gap-3">
              {filtered.map((e) => (
              <PendingEntryCard key={e.id} e={e} pwd={pwd} onDone={() => void load()} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Pledge Emails Panel ----------
function PledgeEmailsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/pledge-emails", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`pledge emails request failed: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setEmails(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(`failed to load pledges: ${err?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyAll = () => {
    const text = emails.map((e) => e.email).join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("copied all emails ✓")).catch(() => toast.error("copy failed"));
  };

  const downloadCsv = () => {
    const header = `"email","pledged_at"`;
    const rows = emails.map((e) =>
      `"${String(e.email).replace(/"/g, '""')}","${new Date(e.createdAt).toISOString()}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pledge-emails-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Support Pledges {emails.length > 0 && `(${emails.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              people who pledged to be contacted before we start charging
            </p>
          </div>
          <div className="flex items-center gap-3">
            {emails.length > 0 && (
              <>
                <button onClick={downloadCsv} className="text-xs uppercase tracking-widest text-[#c6ff3d] hover:text-white transition-colors">
                  ↓ csv
                </button>
                <button onClick={copyAll} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
                  copy all
                </button>
              </>
            )}
            <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">refresh</button>
          </div>
        </div>
        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && emails.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">no pledges yet.</div>
        )}
        {!loading && emails.length > 0 && (
          <div className="divide-y divide-black/5">
            {emails.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <span className="text-sm font-mono text-black">{e.email}</span>
                <span className="text-[9px] uppercase tracking-widest text-black/30 shrink-0">
                  {new Date(e.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Emailed Panel ----------
function EmailedPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/entries/emailed", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`emailed entries request failed: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(`failed to load emailed entries: ${err?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number, pin?: { lat: number; lng: number }) => {
    setActing(id);
    try {
      const r = await fetch(`/api/admin/entries/${id}/approve`, {
        method: "POST",
        headers: { "x-admin-password": pwd, "Content-Type": "application/json" },
        body: JSON.stringify(pin ?? {}),
      });
      if (!r.ok) { toast.error("approve failed"); return; }
      const result = await r.json().catch(() => null) as { approvalEmailStatus?: string } | null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);
      const emailNote = result?.approvalEmailStatus === "sent"
        ? "approval email accepted by Resend"
        : result?.approvalEmailStatus === "failed"
          ? "approval email failed"
          : result?.approvalEmailStatus === "already_sent"
            ? "approval email was already sent"
            : "no contact email saved";
      if (result?.approvalEmailStatus === "failed") {
        toast.error(`approved, but ${emailNote}; approve again to retry`);
      } else {
        toast.success(`approved & published live · ${emailNote}`);
      }
      load();
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: number) => {
    const entry = entries.find((item) => item.id === id);
    if (!window.confirm(`delete "${entry?.name ?? "this entry"}" from the reply queue?`)) return;
    setActing(id);
    try {
      const r = await fetch(`/api/admin/entries/${id}`, { method: "DELETE", headers: { "x-admin-password": pwd } });
      if (!r.ok) {
        const data = await r.json().catch(() => null) as { error?: string } | null;
        toast.error(data?.error ?? "delete failed");
        return;
      }
      toast.success("entry deleted");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "delete failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Pending Reply {entries.length > 0 && `(${entries.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              artists you've emailed - awaiting their reply to confirm
            </p>
          </div>
          <div className="flex items-center gap-3">
            {entries.length > 0 && (() => {
              const emails = entries.map((e) => e.contactEmail).filter(Boolean).join(",");
              return (
                <a
                  href={`mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent("Countercult - following up")}`}
                  className="text-[10px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black px-3 py-1.5 hover:bg-white transition-colors"
                >
                  ✉ email all ({entries.filter((e) => e.contactEmail).length})
                </a>
              );
            })()}
            <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">refresh</button>
          </div>
        </div>
        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no emailed entries yet - use "mark emailed" on any submission card.
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div className="p-4 flex flex-col gap-3">
            {entries.map((e) => (
              <div key={e.id} className="border-2 border-black p-3 flex flex-col gap-2">
                {/* amber "emailed" indicator strip */}
                <div className="border-l-4 border-[#f5a623] pl-2 mb-1">
                  <div className="text-[8px] uppercase tracking-widest text-[#f5a623] font-bold">
                    ✉ curation email sent - awaiting reply
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-widest">{e.name}</div>
                    <div className="text-[10px] text-black/60 uppercase tracking-wide">{e.kind} · {e.city}, {e.country}</div>
                    {e.blurb && <div className="text-[10px] text-black/70 mt-1 line-clamp-2">{e.blurb}</div>}
                    {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-black/50 mt-0.5 truncate block hover:underline">{e.url}</a>}
                    {e.contactEmail && (
                      <a href={`mailto:${e.contactEmail}`} className="text-[10px] text-black/60 mt-0.5 hover:text-black hover:underline block">
                        ✉ {e.contactEmail}
                      </a>
                    )}
                     <FullApplication entry={e} />
                  </div>
                  {e.heroPhoto && (
                    <AdminObjectImage src={e.heroPhoto} alt="" className="w-16 h-16 object-cover border border-black shrink-0" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => void approve(e.id)}
                    disabled={acting === e.id}
                    className="flex-1 py-2 text-[10px] uppercase tracking-widest font-bold bg-[#c6ff3d] border-2 border-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40"
                  >
                    {acting === e.id ? "…" : "✓ they replied - approve & publish"}
                  </button>
                  <button
                    onClick={() => void reject(e.id)}
                    disabled={acting === e.id}
                    className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold bg-transparent border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                  >
                    ✕ delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Maybe Later Panel ----------
function MaybeLaterPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/entries/maybe-later", {
        headers: { "x-admin-password": pwd },
      });
      if (!response.ok) {
        toast.error(`Maybe Later request failed: ${response.status}`);
        return;
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(err?.message ?? "could not load Maybe Later");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const returnToReview = async (id: number) => {
    setActing(id);
    try {
      const response = await fetch(`/api/admin/entries/${id}/return-to-review`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        toast.error(data?.error ?? "could not return submission to review");
        return;
      }
      toast.success("returned to Review Submissions");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "could not return submission to review");
    } finally {
      setActing(null);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Maybe Later {entries.length > 0 && `(${entries.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/45 mt-0.5">
              submissions set aside for a future review · not yet contacted
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>
        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no deferred submissions.
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div className="p-4 flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="border-2 border-black p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-widest">{entry.name}</div>
                    <div className="text-[10px] text-black/60 uppercase tracking-wide">{entry.kind} · {entry.city}, {entry.country}</div>
                    {entry.blurb && <div className="text-[10px] text-black/70 mt-1 line-clamp-2">{entry.blurb}</div>}
                    {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-black/50 mt-0.5 truncate block hover:underline">{entry.url}</a>}
                    {entry.contactEmail && (
                      <a href={`mailto:${entry.contactEmail}`} className="text-[10px] text-black/60 mt-0.5 hover:text-black hover:underline block">
                        ✉ {entry.contactEmail}
                      </a>
                    )}
                    <FullApplication entry={entry} />
                  </div>
                  {entry.heroPhoto && (
                    <AdminObjectImage src={entry.heroPhoto} alt="" className="w-16 h-16 object-cover border border-black shrink-0" onError={(event) => { (event.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => void returnToReview(entry.id)}
                    disabled={acting === entry.id}
                    className="py-2 px-3 text-[10px] uppercase tracking-widest font-bold border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                  >
                    {acting === entry.id ? "…" : "return to review"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Curator Codes Panel ----------
interface CuratorCodeRow {
  id: number;
  code: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function CuratorCodesPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [codes, setCodes] = useState<CuratorCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", displayName: "" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/curator-codes", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`failed to load curator codes: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data as CuratorCodeRow[] : [];
      setCodes(list);
      onCount?.(list.filter((code) => code.isActive).length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load curator codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.displayName.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/curator-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify(form),
      });
      const data = await r.json() as { error?: string };
      if (!r.ok) { toast.error(data.error ?? "failed to create curator code"); return; }
      toast.success("curator code created ✓");
      setForm({ code: "", displayName: "" });
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "failed to create curator code");
    } finally {
      setSaving(false);
    }
  };

  const toggleCode = async (code: CuratorCodeRow) => {
    setUpdatingId(code.id);
    try {
      const r = await fetch(`/api/admin/curator-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ isActive: !code.isActive }),
      });
      const data = await r.json() as { error?: string };
      if (!r.ok) { toast.error(data.error ?? "failed to update curator code"); return; }
      toast.success(code.isActive ? "curator code disabled" : "curator code enabled");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "failed to update curator code");
    } finally {
      setUpdatingId(null);
    }
  };

  const inputClass = "w-full bg-transparent border-b-2 border-black py-2 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30";
  const activeCount = codes.filter((code) => code.isActive).length;
  const curatorLimitReached = activeCount >= 50;

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Curator Codes {codes.length > 0 && `(${codes.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              {activeCount}/50 active · manage automatic approval invitations without a deploy
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        <form onSubmit={(e) => void createCode(e)} className="border-b-2 border-black p-4 flex flex-col gap-4">
          <div className="text-[10px] uppercase tracking-widest text-black/50 font-bold">new curator invitation</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-[10px] uppercase tracking-widest font-bold">
              code *
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputClass}
                placeholder="e.g. berlinfriend"
              />
              <span className="block mt-1 text-[9px] normal-case tracking-normal font-normal text-black/40">case-insensitive; spaces are ignored</span>
            </label>
            <label className="text-[10px] uppercase tracking-widest font-bold">
              curator name *
              <input
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className={inputClass}
                placeholder="e.g. Berlin Friends"
              />
              <span className="block mt-1 text-[9px] normal-case tracking-normal font-normal text-black/40">saved on every entry using this code</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={saving || curatorLimitReached || !form.code.trim() || !form.displayName.trim()}
            className="self-start py-2 px-4 text-[10px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors disabled:opacity-40"
          >
            {curatorLimitReached ? "50-code limit reached" : saving ? "creating…" : "+ create code"}
          </button>
          {curatorLimitReached && (
            <p className="text-[10px] uppercase tracking-widest text-red-600">
              disable an existing code before issuing another
            </p>
          )}
        </form>

        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && codes.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">no curator codes yet.</div>
        )}
        {!loading && codes.length > 0 && (
          <div className="p-4 flex flex-col gap-2">
            {codes.map((code) => (
              <div key={code.id} className="border-2 border-black p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{code.code}</span>
                    <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border font-bold ${
                      code.isActive
                        ? "bg-[#c6ff3d] border-black text-black"
                        : "bg-black/5 border-black/20 text-black/40"
                    }`}>
                      {code.isActive ? "active" : "disabled"}
                    </span>
                  </div>
                  <div className="text-[10px] text-black/60 mt-1">{code.displayName}</div>
                  <div className="text-[9px] text-black/35 uppercase tracking-widest mt-1">
                    added {new Date(code.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => void toggleCode(code)}
                  disabled={updatingId === code.id}
                  className={`text-[9px] uppercase tracking-widest font-bold border-2 px-3 py-1.5 transition-colors disabled:opacity-40 ${
                    code.isActive
                      ? "border-black text-black hover:bg-black hover:text-white"
                      : "border-[#c6ff3d] bg-[#c6ff3d] text-black hover:bg-black hover:text-[#c6ff3d]"
                  }`}
                >
                  {updatingId === code.id ? "…" : code.isActive ? "disable" : "enable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Curator Signups Panel ----------
interface CuratorLiveEntry {
  id: number;
  name: string;
  kind: string;
  city: string;
  country: string;
  contactEmail: string | null;
  heroPhoto: string | null;
  curatedBy: string | null;
  isApproved: boolean;
  status: string;
  isHidden: boolean;
  deletedAt: string | null;
  joinReason: string | null;
  isVoiceFeatured: boolean;
  createdAt: string;
  visibility?: string | null;
  profileVisibilityConsentVersion?: string | null;
  profileVisibilityConsentAt?: string | null;
  publicProfileConsentAt?: string | null;
  archiveConsentAt?: string | null;
  mapEligible?: boolean;
  archivedAt?: string | null;
  reviewedClassification?: string | null;
  derivedClassification?: string | null;
  discoverySource?: string | null;
  networkNextSteps?: string | null;
}

function SignupIntakeAnswers({
  discoverySource,
  networkNextSteps,
}: {
  discoverySource?: string | null;
  networkNextSteps?: string | null;
}) {
  const answers = [
    { label: "how they found Countercult", value: discoverySource },
    { label: "what they can share or offer the network", value: networkNextSteps },
  ].filter((answer) => answer.value?.trim());

  if (answers.length === 0) return null;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {answers.map((answer) => (
        <div key={answer.label} className="border-l-2 border-black/20 bg-black/[0.03] pl-2.5 pr-1.5 py-1.5">
          <div className="text-[8px] font-bold uppercase tracking-widest text-black/40">{answer.label}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-black/80">{answer.value}</p>
        </div>
      ))}
    </div>
  );
}

function CuratorLivePanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [entries, setEntries] = useState<CuratorLiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingVoiceFeatured, setTogglingVoiceFeatured] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/curator-live", {
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null) as { error?: string } | null;
        toast.error(data?.error ?? `failed to load curator signups: ${r.status}`);
        return;
      }
      const data = await r.json();
      const list = Array.isArray(data) ? data as CuratorLiveEntry[] : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load curator signups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = entries.filter((entry) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [entry.name, entry.city, entry.country, entry.contactEmail, entry.curatedBy, entry.joinReason, entry.discoverySource, entry.networkNextSteps]
      .some((value) => value?.toLowerCase().includes(query));
  });

  const stateLabel = (entry: CuratorLiveEntry) => {
    if (entry.deletedAt) return "deleted";
    if (entry.isHidden) return "paused";
    if (entry.isApproved && entry.status === "published") return "live";
    return entry.status.replace(/_/g, " ");
  };

  const handleToggleVoiceFeatured = async (entry: CuratorLiveEntry) => {
    if (!entry.joinReason?.trim()) return;
    setTogglingVoiceFeatured(entry.id);
    try {
      const r = await fetch(`/api/admin/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ isVoiceFeatured: !entry.isVoiceFeatured }),
      });
      if (!r.ok) {
        toast.error("answer update failed");
        return;
      }
      toast.success(entry.isVoiceFeatured ? "answer removed from homepage" : "answer featured on homepage");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "answer update failed");
    } finally {
      setTogglingVoiceFeatured(null);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Curator Signups {entries.length > 0 && `(${entries.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              voices admitted through an accepted curator code - live immediately
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        <div className="border-b-2 border-black p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black placeholder:text-black/30"
            placeholder="search name, city, email, or curator…"
            aria-label="search curator signups"
          />
        </div>

        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no curator-code signups yet.
          </div>
        )}
        {!loading && entries.length > 0 && filtered.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no matching curator signups.
          </div>
        )}
        {filtered.length > 0 && (
          <div className="p-4 flex flex-col gap-2">
            {filtered.map((entry) => (
              <div key={entry.id} className="border-2 border-black p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {entry.heroPhoto && (
                    <AdminObjectImage
                      src={entry.heroPhoto}
                      alt=""
                      className="w-12 h-12 object-cover border border-black shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm uppercase">{entry.name}</span>
                      <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border font-bold ${
                        stateLabel(entry) === "live"
                          ? "bg-[#c6ff3d] border-black text-black"
                          : "bg-black/5 border-black/20 text-black/50"
                      }`}>
                        {stateLabel(entry)}
                      </span>
                    </div>
                    <div className="text-[10px] text-black/60 uppercase tracking-wide">
                      {entry.kind} · {entry.city}{entry.country ? `, ${entry.country}` : ""}
                    </div>
                    {entry.contactEmail && (
                      <a href={`mailto:${entry.contactEmail}`} className="text-[10px] text-black/60 hover:text-black hover:underline block mt-0.5">
                        {entry.contactEmail}
                      </a>
                    )}
                    <div className="text-[9px] text-black/40 uppercase tracking-widest mt-1">
                      {entry.curatedBy ?? "accepted curator code"} · joined {new Date(entry.createdAt).toLocaleString()}
                    </div>
                     <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-bold uppercase tracking-widest">
                       <span className={`border px-1.5 py-0.5 ${entry.visibility === "public" ? "border-[#6b9f00] bg-[#c6ff3d]" : "border-black/20 bg-black/5 text-black/50"}`}>
                         visibility: {entry.visibility ?? "unset"}
                       </span>
                       <span className={`border px-1.5 py-0.5 ${entry.profileVisibilityConsentAt || (entry.visibility === "public" && entry.publicProfileConsentAt) ? "border-[#6b9f00] bg-[#c6ff3d]" : "border-red-300 bg-red-50 text-red-600"}`}>
                         visibility consent: {entry.profileVisibilityConsentAt || (entry.visibility === "public" && entry.publicProfileConsentAt) ? "recorded" : "missing"}
                       </span>
                       <span className="border border-black/20 px-1.5 py-0.5">
                         map: {entry.mapEligible === false ? "no" : "yes"}
                       </span>
                       {entry.archivedAt && <span className="border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-orange-700">archived</span>}
                     </div>
                      <SignupIntakeAnswers
                        discoverySource={entry.discoverySource}
                        networkNextSteps={entry.networkNextSteps}
                      />
                      {entry.joinReason ? (
                       <div className="mt-2 border-l-2 border-[#c6ff3d] bg-black/[0.03] pl-2.5 pr-1.5 py-1.5">
                         <div className="flex items-center justify-between gap-2">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-black/40">legacy community-voice answer</div>
                           {entry.isVoiceFeatured && (
                             <span className="shrink-0 bg-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-[#c6ff3d]">
                               homepage
                             </span>
                           )}
                         </div>
                         <p className="mt-1 text-[11px] leading-relaxed text-black/80">{entry.joinReason}</p>
                         <button
                           onClick={() => void handleToggleVoiceFeatured(entry)}
                           disabled={togglingVoiceFeatured === entry.id}
                           className={`mt-2 border px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
                             entry.isVoiceFeatured
                               ? "border-black bg-black text-[#c6ff3d] hover:bg-white hover:text-black"
                               : "border-black/30 bg-white text-black/60 hover:border-black hover:bg-[#c6ff3d] hover:text-black"
                           }`}
                         >
                           {togglingVoiceFeatured === entry.id ? "…" : entry.isVoiceFeatured ? "remove from homepage" : "feature answer"}
                         </button>
                       </div>
                     ) : (
                       <div className="mt-2 text-[9px] uppercase tracking-widest text-black/30">no written join reason recorded</div>
                     )}
                  </div>
                </div>
                <a
                  href={`/entries/${entry.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] uppercase tracking-widest text-black/50 hover:text-black border border-black/20 px-2 py-1 shrink-0"
                >
                  view →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SpaceClassificationPanel({ pwd }: { pwd: string }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const load = () => fetch("/api/admin/spaces", { headers: { "x-admin-password": pwd } }).then((r) => r.json()).then(setSpaces).catch(() => toast.error("could not load spaces"));
  useEffect(() => { load(); }, []);
  const review = async (id: number, classification: string) => {
    const response = await fetch(`/api/admin/spaces/${id}/classification`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pwd }, body: JSON.stringify({ classification }) });
    if (!response.ok) { toast.error("classification update failed"); return; }
    toast.success("classification reviewed"); load();
  };
  return <section className="max-w-4xl mx-auto p-6"><div className="border-2 border-black"><header className="bg-black p-4 text-[#c6ff3d]"><h2 className="text-sm uppercase tracking-widest font-bold">space classification</h2><p className="text-[9px] text-white/50 mt-1">review use, separately from cultural approval</p></header><div className="divide-y divide-black/10">{spaces.map((space) => <div key={space.id} className="p-4 flex flex-wrap gap-3 justify-between"><div><p className="font-bold text-sm">{space.name}</p><p className="text-[10px] text-black/55">{space.city} · declared: {space.declaredClassification ?? "—"} · derived: {space.derivedClassification} · reviewed: {space.reviewedClassification ?? "—"}</p><p className="text-[10px] text-black/50">{space.organizationModel ?? "no organisation model"} · commercial use: {String(space.intendedCommercialUse)}</p></div><div className="flex gap-2 items-start"><button onClick={() => void review(space.id, "independent")} className="border border-black px-2 py-1 text-[9px] uppercase">independent</button><button onClick={() => void review(space.id, "commercial")} className="bg-black text-[#c6ff3d] px-2 py-1 text-[9px] uppercase">commercial</button></div></div>)}{spaces.length === 0 && <p className="p-4 text-xs text-black/40">no spaces yet</p>}</div></div></section>;
}

type SignupAttributionRow = {
  id: number;
  displayName: string | null;
  accountRole: string;
  isApproved: boolean;
  createdAt: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrerDomain: string | null;
  landingPath: string | null;
  reportedSource: string | null;
};

function SignupSourcesPanel({ pwd }: { pwd: string }) {
  const [rows, setRows] = useState<SignupAttributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/signup-attribution", {
        headers: { "x-admin-password": pwd },
      });
      if (!response.ok) {
        toast.error(`could not load signup sources: ${response.status}`);
        return;
      }
      const result = await response.json() as SignupAttributionRow[];
      setRows(Array.isArray(result) ? result : []);
    } catch {
      toast.error("could not load signup sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((row) => [
    row.displayName,
    row.accountRole,
    row.source,
    row.medium,
    row.campaign,
    row.referrerDomain,
    row.landingPath,
    row.reportedSource,
  ].some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())));

  return (
    <section className="mx-auto max-w-5xl px-6 py-6">
      <div className="border-2 border-black bg-white">
        <header className="flex items-center justify-between gap-3 border-b-2 border-black bg-black px-4 py-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">Signup Sources</h2>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/45">
              recent account attribution · internal only
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/60 hover:text-[#c6ff3d]">
            refresh
          </button>
        </header>
        <div className="border-b border-black/10 p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-b-2 border-black/20 bg-transparent py-2 text-sm focus:border-black focus:outline-none"
            placeholder="search name, campaign, source, or page"
            aria-label="Search signup sources"
          />
          <p className="mt-2 text-[9px] leading-relaxed text-black/45">
            Campaign tags and referring domains are recorded when available. Older accounts and visits with no source details show as not captured.
          </p>
        </div>
        {loading && <p className="px-4 py-8 text-center text-xs uppercase tracking-widest text-black/40">loading…</p>}
        {!loading && rows.length === 0 && <p className="px-4 py-8 text-center text-xs uppercase tracking-widest text-black/40">no accounts yet</p>}
        {!loading && rows.length > 0 && filtered.length === 0 && <p className="px-4 py-8 text-center text-xs uppercase tracking-widest text-black/40">no matching signups</p>}
        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-black/10">
            {filtered.map((row) => {
              const trackedSource = row.source
                ? [row.source, row.medium, row.campaign].filter(Boolean).join(" / ")
                : row.referrerDomain ?? "Not captured";
              return (
                <article key={row.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div>
                    <h3 className="text-sm font-bold">{row.displayName || "Unnamed account"}</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-black/55">
                      {row.accountRole.replace(/_/g, " ")} · {row.isApproved ? "approved" : "pending"} · {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <dl className="grid gap-x-4 gap-y-2 text-[10px] sm:grid-cols-2">
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-black/40">campaign / referrer</dt>
                      <dd className="mt-0.5 break-words">{trackedSource}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-black/40">applicant’s answer</dt>
                      <dd className="mt-0.5 break-words">{row.reportedSource || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-black/40">landing page</dt>
                      <dd className="mt-0.5 break-all">{row.landingPath || "Not captured"}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-black/40">referring domain</dt>
                      <dd className="mt-0.5 break-words">{row.referrerDomain || "Not captured"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

type AdminTab = "pending" | "fund_applications" | "emailed" | "maybe_later" | "add" | "pins" | "editorial" | "board" | "exchange_matching" | "pledges" | "curator_codes" | "curator_live" | "signup_sources" | "spaces" | "privacy" | "deleted" | "account_cleanup";

type AdminNavGroupId = "submissions" | "network" | "programs" | "publishing" | "maintenance";

type AdminNavItem = {
  id: AdminTab;
  label: string;
  hint: string;
};

type AdminNavGroup = {
  id: AdminNavGroupId;
  label: string;
  items: AdminNavItem[];
};

const NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "submissions",
    label: "Submissions",
    items: [
      { id: "pending", label: "Review Submissions", hint: "nominated or submitted entries" },
      { id: "fund_applications", label: "Fund Applications", hint: "business leads" },
      { id: "emailed", label: "Pending Reply", hint: "emailed - awaiting their confirmation" },
      { id: "maybe_later", label: "Maybe Later", hint: "deferred for a future review" },
    ],
  },
  {
    id: "network",
    label: "Network",
    items: [
      { id: "add", label: "Add Entry", hint: "ai-powered pin creation tool" },
      { id: "pins", label: "Live Pins", hint: "all published entries on the map" },
      { id: "curator_codes", label: "Curator Codes", hint: "invite codes & attribution" },
      { id: "curator_live", label: "Curator Signups", hint: "instant-live voices" },
      { id: "signup_sources", label: "Signup Sources", hint: "campaign and referral attribution" },
      { id: "spaces", label: "Space Classification", hint: "reviewed use and commercial context" },
    ],
  },
  {
    id: "programs",
    label: "Programs",
    items: [
      { id: "board", label: "Swap Board", hint: "room swap & residency listings" },
      { id: "exchange_matching", label: "Residency Match", hint: "private shortlist & outreach" },
      { id: "pledges", label: "Support Pledges", hint: "emails pledged to support" },
    ],
  },
  {
    id: "publishing",
    label: "Publishing",
    items: [
      { id: "editorial", label: "Editorial", hint: "content & posts" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    items: [
      { id: "privacy", label: "Privacy Requests", hint: "access, hiding & deletion" },
      { id: "deleted", label: "Recently Deleted", hint: "trash - restore within 30 days" },
      { id: "account_cleanup", label: "Account Cleanup", hint: "remove a user's login and applications" },
    ],
  },
];

function Dashboard({ pwd, onLogout }: { pwd: string; onLogout: () => void }) {
  const adminRequest = useMemo(() => ({ headers: { "x-admin-password": pwd } }), [pwd]);
  const [activeTab, setActiveTab] = useState<AdminTab>("pending");
  const [expandedNavGroups, setExpandedNavGroups] = useState<Set<AdminNavGroupId>>(
    () => new Set(["submissions"]),
  );
  const [counts, setCounts] = useState<Record<AdminTab, number>>({
    pending: 0, fund_applications: 0, emailed: 0, maybe_later: 0, add: 0, pins: 0, editorial: 0, board: 0, exchange_matching: 0, pledges: 0, curator_codes: 0, curator_live: 0, signup_sources: 0, spaces: 0, privacy: 0, deleted: 0, account_cleanup: 0,
  });

  const auth = useCheckAdminAuth({
    query: { retry: false, refetchInterval: false, queryKey: ["/api/admin/auth/check", pwd] },
    request: adminRequest,
  });

  useEffect(() => {
    if (auth.error && (auth.error as any).status === 401) {
      toast.error("session expired");
      onLogout();
    }
  }, [auth.error, onLogout]);

  const setCount = (tab: AdminTab) => (n: number) =>
    setCounts((c) => ({ ...c, [tab]: n }));

  // Queue tabs (approve + pending + emailed) need attention badges
  const QUEUE_TABS: AdminTab[] = ["pending", "fund_applications", "emailed", "privacy"];

  return (
    <div className="min-h-[100dvh] bg-white text-black font-mono lowercase flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-black bg-black text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#c6ff3d]" />
          <h1 className="text-sm font-bold tracking-widest uppercase">countercult · admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="text-xs text-white/60 hover:text-[#c6ff3d] transition-colors">← map</Link>
          <button onClick={onLogout} className="text-xs text-white/60 hover:text-[#c6ff3d] transition-colors">log out</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-48 xl:w-56 shrink-0 border-r-2 border-black sticky top-[49px] self-start h-[calc(100dvh-49px)] overflow-y-auto flex flex-col bg-white">
          <nav aria-label="Admin navigation" className="divide-y-2 divide-black/10">
            {NAV_GROUPS.map((group) => {
              const isExpanded = expandedNavGroups.has(group.id);
              const activeItem = group.items.find((item) => item.id === activeTab);
              const attentionCount = group.items.reduce(
                (total, item) => total + (QUEUE_TABS.includes(item.id) ? counts[item.id] : 0),
                0,
              );
              return (
                <section key={group.id}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`admin-nav-${group.id}`}
                    data-testid={`button-admin-group-${group.id}`}
                    onClick={() => setExpandedNavGroups((expanded) => {
                      const next = new Set(expanded);
                      if (next.has(group.id)) next.delete(group.id);
                      else next.add(group.id);
                      return next;
                    })}
                    className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors ${
                      activeItem ? "bg-black/5" : "hover:bg-black/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-widest leading-tight">
                        {group.label}
                      </span>
                      <span className="block text-[8px] uppercase tracking-wide mt-0.5 leading-tight text-black/40">
                        {isExpanded
                          ? `${group.items.length} tools`
                          : activeItem?.label ?? `${group.items.length} tools`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {attentionCount > 0 && (
                        <span
                          aria-label={`${attentionCount} items need attention`}
                          className="text-[9px] font-bold px-1.5 py-0.5 bg-black text-[#c6ff3d]"
                        >
                          {attentionCount}
                        </span>
                      )}
                      <ChevronDown
                        aria-hidden="true"
                        size={14}
                        className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                      />
                    </span>
                  </button>
                  <div id={`admin-nav-${group.id}`} hidden={!isExpanded}>
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      const count = counts[item.id];
                      const needsAttention = QUEUE_TABS.includes(item.id) && count > 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-current={isActive ? "page" : undefined}
                          data-testid={`button-admin-tab-${item.id}`}
                          onClick={() => {
                            setActiveTab(item.id);
                            setExpandedNavGroups((expanded) => new Set(expanded).add(group.id));
                          }}
                          className={`w-full text-left pl-6 pr-4 py-3 border-t border-black/10 flex items-start justify-between gap-2 transition-colors group ${
                            isActive ? "bg-black text-white" : "hover:bg-black/5 text-black"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-widest leading-tight">
                              {item.label}
                            </span>
                            <span className={`block text-[8px] uppercase tracking-wide mt-0.5 leading-tight ${isActive ? "text-white/40" : "text-black/35"}`}>
                              {item.hint}
                            </span>
                          </span>
                          {count > 0 && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 shrink-0 mt-0.5 whitespace-nowrap ${
                              needsAttention
                                ? isActive ? "bg-[#c6ff3d] text-black" : "bg-black text-[#c6ff3d]"
                                : isActive ? "bg-white/20 text-white" : "bg-black/10 text-black/50"
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === "pending"      && <PendingEntriesPanel       pwd={pwd} onCount={setCount("pending")} />}
          {activeTab === "fund_applications" && <FundApplicationsPanel pwd={pwd} onCount={setCount("fund_applications")} />}
          {activeTab === "emailed"      && <EmailedPanel              pwd={pwd} onCount={setCount("emailed")} />}
          {activeTab === "maybe_later"  && <MaybeLaterPanel           pwd={pwd} onCount={setCount("maybe_later")} />}
          {activeTab === "pledges"      && <PledgeEmailsPanel         pwd={pwd} onCount={setCount("pledges")} />}
          {activeTab === "curator_codes" && <CuratorCodesPanel          pwd={pwd} onCount={setCount("curator_codes")} />}
          {activeTab === "curator_live" && <CuratorLivePanel             pwd={pwd} onCount={setCount("curator_live")} />}
          {activeTab === "signup_sources" && <SignupSourcesPanel pwd={pwd} />}
           {activeTab === "spaces"       && <SpaceClassificationPanel      pwd={pwd} />}
          {activeTab === "add"          && <AdminAddEntryPanel         pwd={pwd} />}
          {activeTab === "pins"         && <LivePinsPanel              pwd={pwd} onCount={setCount("pins")} />}
          {activeTab === "editorial"    && <EditorialPostsPanel        pwd={pwd} />}
          {activeTab === "board"        && <BoardListingsPanel         pwd={pwd} onCount={setCount("board")} />}
          {activeTab === "exchange_matching" && <ResidencyMatchingPanel pwd={pwd} onCount={setCount("exchange_matching")} />}
          {activeTab === "privacy"      && <PrivacyRequestsPanel pwd={pwd} onCount={setCount("privacy")} />}
          {activeTab === "deleted"      && <DeletedEntriesPanel        pwd={pwd} onCount={setCount("deleted")} />}
          {activeTab === "account_cleanup" && <AccountCleanupPanel pwd={pwd} />}
        </main>
      </div>
    </div>
  );
}

interface PrivacyRequestRow {
  id: number;
  email: string;
  requestType: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  details: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function PrivacyRequestsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [requests, setRequests] = useState<PrivacyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/privacy/requests", { headers: { "x-admin-password": pwd } });
      if (!response.ok) throw new Error(`failed: ${response.status}`);
      const rows = await response.json() as PrivacyRequestRow[];
      setRequests(Array.isArray(rows) ? rows : []);
      onCount?.(rows.filter((row) => row.status === "pending").length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "failed to load privacy requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: number, status: "in_progress" | "completed" | "rejected") => {
    setActingId(id);
    try {
      const response = await fetch(`/api/admin/privacy/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string; request?: PrivacyRequestRow };
      if (!response.ok || !data.request) throw new Error(data.error ?? "failed to update request");
      setRequests((current) => current.map((row) => row.id === id ? data.request! : row));
      onCount?.(requests.filter((row) => row.id !== id && row.status === "pending").length);
      toast.success(status === "completed" ? "privacy request completed" : `request marked ${status.replace("_", " ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "failed to update request");
    } finally {
      setActingId(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">Privacy requests</h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              scoped member requests, with deletion confirmation
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">refresh</button>
        </div>
        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest">loading…</div>}
        {!loading && requests.length === 0 && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">no privacy requests</div>}
        {!loading && requests.length > 0 && (
          <div className="divide-y divide-black/10">
            {requests.map((item) => (
              <div key={item.id} className="px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold">{item.requestType.replaceAll("_", " ")} <span className="font-normal text-black/40">#{item.id}</span></p>
                  <p className="mt-1 text-[10px] text-black/65 break-all">{item.email}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-black/35">
                    submitted {new Date(item.createdAt).toLocaleString()} · {item.status.replaceAll("_", " ")}
                  </p>
                  {item.details && <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-black/55">{item.details}</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {item.status === "pending" && (
                    <button disabled={actingId === item.id} onClick={() => void updateStatus(item.id, "in_progress")} className="border border-black/25 px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:border-black disabled:opacity-40">
                      start review
                    </button>
                  )}
                  {item.status !== "completed" && item.status !== "rejected" && (
                    <button disabled={actingId === item.id} onClick={() => void updateStatus(item.id, "completed")} className="border-2 border-black bg-black px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black disabled:opacity-40">
                      complete
                    </button>
                  )}
                  {item.status !== "completed" && item.status !== "rejected" && item.requestType !== "delete" && (
                    <button disabled={actingId === item.id} onClick={() => void updateStatus(item.id, "rejected")} className="border border-[#b42318]/40 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#b42318] hover:border-[#b42318] disabled:opacity-40">
                      reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AccountCleanupPanel({ pwd }: { pwd: string }) {
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const removeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmation !== "DELETE") return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ email: email.trim(), confirmation }),
      });
      const data = await response.json() as {
        ok?: boolean;
        error?: string;
        hiddenEntries?: number;
        deletedSessions?: number;
        deletedApplications?: number;
      };
      if (!response.ok || !data.ok) {
        setMessage({ ok: false, text: data.error ?? "account cleanup failed" });
        return;
      }
      setMessage({
        ok: true,
        text: `removed account and login data · ${data.hiddenEntries ?? 0} pin(s), ${data.deletedSessions ?? 0} session(s), ${data.deletedApplications ?? 0} application(s)`,
      });
      setEmail("");
      setConfirmation("");
    } catch {
      setMessage({ ok: false, text: "request failed - try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto p-6 md:p-10">
      <div className="border-2 border-black bg-white p-6">
        <p className="text-[10px] uppercase tracking-widest text-black/40 mb-3 font-bold">destructive action</p>
        <h2 className="text-xl font-bold uppercase tracking-tight mb-3">remove account data</h2>
        <p className="text-sm text-black/60 leading-relaxed mb-6">
          Permanently remove a user login, active sessions, and incoming application records. Any linked pin is moved to Recently Deleted so it cannot appear on the map.
        </p>
        <form onSubmit={(e) => void removeAccount(e)} className="flex flex-col gap-4">
          <label className="text-[10px] uppercase tracking-widest font-bold">
            email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border-b-2 border-black/20 py-2 text-sm font-mono focus:outline-none focus:border-black"
              placeholder="person@example.com"
            />
          </label>
          <label className="text-[10px] uppercase tracking-widest font-bold">
            type DELETE to confirm
            <input
              type="text"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="mt-2 w-full border-b-2 border-black/20 py-2 text-sm font-mono focus:outline-none focus:border-black"
              placeholder="DELETE"
            />
          </label>
          <button
            type="submit"
            disabled={loading || confirmation !== "DELETE"}
            className="self-start border-2 border-black bg-black text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c6ff3d] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "removing…" : "remove account data"}
          </button>
        </form>
        {message && (
          <p className={`mt-5 text-xs leading-relaxed ${message.ok ? "text-black" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}

// ---------- Fund Applications Panel ----------
interface FundApplicationRow {
  id: number;
  name: string;
  email: string;
  business: string;
  location: string;
  website: string;
  fundingRoute: string;
  products: string;
  amountPerSale: string;
  desiredCreativeWork: string;
  notes: string;
  status: string;
  createdAt: string;
  contactedAt: string | null;
}

function FundApplicationsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [applications, setApplications] = useState<FundApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/fund-applications", { headers: { "x-admin-password": pwd } });
      if (!response.ok) throw new Error(`failed: ${response.status}`);
      const rows = await response.json() as FundApplicationRow[];
      const list = Array.isArray(rows) ? rows : [];
      setApplications(list);
      onCount?.(list.filter((application) => application.status === "new").length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "failed to load Fund applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const markContacted = async (id: number) => {
    setActingId(id);
    try {
      const response = await fetch(`/api/admin/fund-applications/${id}`, {
        method: "PATCH",
        headers: { "x-admin-password": pwd },
      });
      if (!response.ok) throw new Error("failed to mark contacted");
      setApplications((current) => current.map((application) => (
        application.id === id
          ? { ...application, status: "contacted", contactedAt: new Date().toISOString() }
          : application
      )));
      onCount?.(applications.filter((application) => application.status === "new" && application.id !== id).length);
      toast.success("marked contacted ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "failed to update application");
    } finally {
      setActingId(null);
    }
  };

  const downloadCsv = () => {
    if (applications.length === 0) {
      toast.error("no Fund applications to export");
      return;
    }
    const fields: Array<keyof FundApplicationRow> = [
      "name", "email", "business", "location", "website", "fundingRoute", "products",
      "amountPerSale", "desiredCreativeWork", "notes", "status", "createdAt",
    ];
    const rows = [
      fields,
      ...applications.map((application) => fields.map((field) => String(application[field] ?? ""))),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `countercult-fund-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Fund Applications {applications.length > 0 && `(${applications.filter((application) => application.status === "new").length} new / ${applications.length} total)`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              business and brand enquiries for local cultural budgets
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {applications.length > 0 && (
              <button onClick={downloadCsv} className="text-[9px] uppercase tracking-widest font-bold border border-white/30 px-2 py-1 text-white hover:bg-white hover:text-black transition-colors">
                ↓ csv
              </button>
            )}
            <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
              refresh
            </button>
          </div>
        </div>
        {loading && <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && applications.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">no Fund applications yet.</div>
        )}
        {!loading && applications.length > 0 && (
          <div className="divide-y-2 divide-black">
            {applications.map((application) => (
              <article key={application.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{application.business}</h3>
                    <p className="mt-1 text-xs text-black/60">{application.name} · {application.email} · {application.location}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${application.status === "new" ? "border-black bg-[#c6ff3d]" : "border-black/20 text-black/45"}`}>
                      {application.status}
                    </span>
                    {application.status === "new" && (
                      <button
                        onClick={() => void markContacted(application.id)}
                        disabled={actingId === application.id}
                        className="border-2 border-black px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40"
                      >
                        {actingId === application.id ? "…" : "mark contacted"}
                      </button>
                    )}
                  </div>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-black/40">funding route</dt><dd className="mt-1">{application.fundingRoute === "client_programme_budget" ? "client or brand programme budget" : "Culture Euro from selected sales"}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-black/40">{application.fundingRoute === "client_programme_budget" ? "programme to support" : "sales to include"}</dt><dd className="mt-1 whitespace-pre-wrap">{application.products}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-black/40">{application.fundingRoute === "client_programme_budget" ? "proposed programme budget" : "proposed amount per sale"}</dt><dd className="mt-1">{application.amountPerSale}</dd></div>
                  {application.website && <div><dt className="text-[9px] font-bold uppercase tracking-widest text-black/40">website or social</dt><dd className="mt-1 break-all">{application.website}</dd></div>}
                  {application.desiredCreativeWork && <div><dt className="text-[9px] font-bold uppercase tracking-widest text-black/40">what the Fund should make possible</dt><dd className="mt-1 whitespace-pre-wrap">{application.desiredCreativeWork}</dd></div>}
                </dl>
                {application.notes && (
                  <p className="mt-4 border-l-2 border-black pl-3 text-sm whitespace-pre-wrap">{application.notes}</p>
                )}
                <p className="mt-5 text-[9px] uppercase tracking-widest text-black/35">
                  submitted {new Date(application.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Incoming Applications Panel ----------
interface ApplicationRow {
  id: number;
  email: string;
  createdAt: string;
}

function IncomingApplicationsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/applications", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`failed: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setApps(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markContacted = async (id: number, email: string) => {
    setClearing(id);
    try {
      const r = await fetch(`/api/admin/applications/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) { toast.error("failed to clear"); return; }
      toast.success(`marked contacted: ${email}`);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err?.message ?? "request failed");
    } finally {
      setClearing(null);
    }
  };

  const downloadCsv = () => {
    if (apps.length === 0) { toast.error("no applications to export"); return; }
    const rows = [
      ["email", "submitted_at"],
      ...apps.map((a) => [a.email, new Date(a.createdAt).toISOString()]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Applications {apps.length > 0 && `(${apps.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              email sign-ups - outreach &amp; dismiss when done
            </p>
          </div>
          <div className="flex items-center gap-3">
            {apps.length > 0 && (
              <button
                onClick={downloadCsv}
                className="text-[9px] uppercase tracking-widest font-bold border border-white/30 px-2 py-1 text-white hover:bg-white hover:text-black transition-colors whitespace-nowrap"
              >
                ↓ csv
              </button>
            )}
            <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
              refresh
            </button>
          </div>
        </div>
        {loading && (
          <div className="px-4 py-3 text-xs text-black/40 uppercase tracking-widest">loading…</div>
        )}
        {!loading && apps.length === 0 && (
          <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">
            no pending applications.
          </div>
        )}
        {!loading && apps.length > 0 && (
          <div className="divide-y-2 divide-black">
            {apps.map((app) => (
              <div key={app.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold truncate">{app.email}</span>
                  <span className="text-[9px] text-black/40 uppercase tracking-widest">
                    {new Date(app.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => void markContacted(app.id, app.email)}
                  disabled={clearing === app.id}
                  className="text-[9px] uppercase tracking-widest font-bold border-2 border-black px-3 py-1.5 bg-transparent hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  {clearing === app.id ? "…" : "dismiss ✓"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Map click handler ----------
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ---------- Admin Add Entry Panel (LLM-powered) ----------
type EnrichResult = {
  name?: string;
  kind?: string;
  city?: string;
  country?: string;
  blurb?: string;
  tags?: string[];
  url?: string;
  heroPhoto?: string;
};

function AdminAddEntryPanel({ pwd }: { pwd: string }) {
  const queryClient = useQueryClient();
  const [lookup, setLookup] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [form, setForm] = useState<{
    name: string; kind: string; city: string; country: string;
    blurb: string; tags: string; url: string; heroPhoto: string;
    lat: string; lng: string;
  } | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full bg-transparent border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30";

  const handleLookup = async () => {
    if (!lookup.trim()) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/entries/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lookup.trim() }),
      });
      const data = await res.json() as EnrichResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "enrich failed");
      setForm({
        name: data.name ?? "",
        kind: data.kind ?? "artist",
        city: data.city ?? "",
        country: data.country ?? "",
        blurb: data.blurb ?? "",
        tags: (data.tags ?? []).join(", "),
        url: data.url ?? lookup.trim(),
        heroPhoto: data.heroPhoto ?? "",
        lat: "",
        lng: "",
      });
      setPin(null);
      toast.success("voice looked up - check and edit before publishing");
    } catch (err: any) {
      toast.error(err.message ?? "lookup failed");
    } finally {
      setEnriching(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      // 1. Create the entry
      const createRes = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          kind: form.kind,
          city: form.city.trim(),
          country: form.country.trim(),
          blurb: form.blurb.trim() || null,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          url: form.url.trim() || null,
          heroPhoto: form.heroPhoto.trim() || null,
          lat: pin?.lat ?? (form.lat ? parseFloat(form.lat) : undefined),
          lng: pin?.lng ?? (form.lng ? parseFloat(form.lng) : undefined),
          _force: true,
        }),
      });
      const created = await createRes.json() as { id?: number; error?: string };
      if (!createRes.ok) throw new Error(created.error ?? "create failed");

      // 2. Approve it immediately (publish to map)
      if (created.id) {
        await fetch(`/api/admin/entries/${created.id}/approve`, {
          method: "POST",
          headers: { "x-admin-password": pwd },
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);

      toast.success(`${form.name} published to map ✓`);
      setForm(null);
      setLookup("");
      setPin(null);
    } catch (err: any) {
      toast.error(err.message ?? "publish failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">Add Entry to Map</h2>
          <p className="text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">paste a url, @handle, or bandcamp/ra/ig link - ai looks it up and pre-fills the form</p>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleLookup(); } }}
              className="flex-1 bg-transparent border-b-2 border-black py-2 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30"
              placeholder="https://ra.co/dj/… or @handle or bandcamp url…"
            />
            <button
              type="button"
              onClick={() => void handleLookup()}
              disabled={enriching || !lookup.trim()}
              className="text-[10px] uppercase tracking-widest font-bold border-2 border-black px-4 py-2 bg-black text-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black transition-colors disabled:opacity-40"
            >
              {enriching ? "looking up…" : "look up →"}
            </button>
          </div>

          {form && (
            <form onSubmit={(e) => void handlePublish(e)} className="flex flex-col gap-4 border-t-2 border-black pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">kind *</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full bg-white border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d]">
                    {["artist", "space", "artifact"].map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">city *</label>
                  <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">country *</label>
                  <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">blurb</label>
                <textarea rows={2} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} className="w-full bg-transparent border-2 border-black p-2 text-sm focus:outline-none focus:border-[#c6ff3d] resize-none text-black placeholder:text-black/30" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">tags (comma separated)</label>
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="techno, berlin, dj…" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">url</label>
                  <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} placeholder="https://…" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">hero photo url</label>
                <div className="flex gap-2 items-start">
                  <input type="url" value={form.heroPhoto} onChange={(e) => setForm({ ...form, heroPhoto: e.target.value })} className={inputClass} placeholder="https://…/photo.jpg" />
                  {form.heroPhoto && (
                    <AdminObjectImage src={form.heroPhoto} alt="" className="w-12 h-12 object-cover border border-black shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
              </div>

              {/* Map pin drop */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-widest text-black/60">map pin (drop to place on map)</label>
                  <button type="button" onClick={() => setShowMap((v) => !v)} className="text-[10px] uppercase tracking-widest font-bold text-black underline decoration-[#c6ff3d] decoration-2 hover:bg-[#c6ff3d] hover:px-1 transition-all">
                    {showMap ? "hide map" : pin ? "reposition" : "drop pin"}
                  </button>
                </div>
                {pin && (
                  <div className="text-[10px] text-black/60 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#c6ff3d] border border-black" />
                    {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    <button type="button" onClick={() => setPin(null)} className="text-black/40 hover:text-black ml-1">✕</button>
                  </div>
                )}
                {showMap && (
                  <div className="border-2 border-black overflow-hidden" style={{ height: 260 }}>
                    <MapContainer center={[20, 10]} zoom={2} className="cc-map-dark w-full h-full" style={{ cursor: "crosshair" }}>
                      <TileLayer
                        url={OPENSTREETMAP_TILE_URL}
                        attribution={OPENSTREETMAP_ATTRIBUTION}
                      />
                      <MapClickHandler onPick={(lat, lng) => setPin({ lat, lng })} />
                      {pin && <Marker position={[pin.lat, pin.lng]} icon={PIN_ICON} />}
                    </MapContainer>
                  </div>
                )}
                {!pin && !showMap && (
                  <div className="border-2 border-dashed border-black/20 text-center py-3 text-[10px] uppercase tracking-widest text-black/30">
                    optional - click "drop pin" to place on map
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1 border-t-2 border-black">
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors text-sm uppercase tracking-widest font-bold disabled:opacity-50">
                  {saving ? "publishing…" : "↑ publish to map"}
                </button>
                <button type="button" onClick={() => setForm(null)} className="px-4 py-3 border-2 border-black text-[10px] uppercase tracking-widest hover:bg-black/5 transition-colors">
                  clear
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function SpaceClaimInvitationsPanel({
  entries,
  pwd,
}: {
  entries: LiveEntry[];
  pwd: string;
}) {
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [verified, setVerified] = useState<Record<number, boolean>>({});
  const [sentTo, setSentTo] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);

  const spaces = entries.filter((entry) => (
    entry.kind === "space"
    && entry.isApproved
    && entry.status === "published"
    && (entry.visibility ?? "public") === "public"
    && !entry.isHidden
    && entry.mapEligible !== false
    && !entry.isClaimed
    && !entry.claimedEmail
    && !entry.deletedAt
  ));

  const sendInvitation = async (entry: LiveEntry) => {
    const email = emails[entry.id]?.trim().toLowerCase() ?? "";
    if (!email || !verified[entry.id]) return;
    setSendingId(entry.id);
    try {
      const response = await fetch(`/api/admin/entries/${entry.id}/claim-invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pwd,
        },
        body: JSON.stringify({ email, verificationConfirmed: true }),
      });
      const result = await response.json() as { email?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "could not send invitation");
      setSentTo((current) => ({ ...current, [entry.id]: email }));
      setVerified((current) => ({ ...current, [entry.id]: false }));
      toast.success(`claim invitation sent to ${email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "could not send invitation");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <details className="border-2 border-black bg-[#f5f5ef]">
      <summary className="cursor-pointer list-none px-4 py-3 border-b border-black/15 flex justify-between gap-3 items-center">
        <span className="text-[11px] font-bold uppercase tracking-widest">
          verified space claims <span className="text-black/45">({spaces.length} unclaimed)</span>
        </span>
        <span className="text-[9px] uppercase tracking-widest text-black/45">open</span>
      </summary>
      <div className="p-4 flex flex-col gap-4">
        <p className="text-[10px] leading-relaxed text-black/60">
          Only invite someone after manually verifying their authority to represent the space and the email address. Accepting the invitation claims the live listing and activates partner posting access on Exchange.
          Sending a replacement invitation invalidates any earlier unused invitation for that listing.
        </p>
        {spaces.length === 0 && (
          <p className="text-[10px] uppercase tracking-widest text-black/40">no unclaimed public spaces</p>
        )}
        {spaces.map((entry) => (
          <form
            key={entry.id}
            onSubmit={(event) => {
              event.preventDefault();
              void sendInvitation(entry);
            }}
            className="border-t border-black/15 pt-4 grid gap-3"
          >
            <div>
              <p className="text-sm font-bold">{entry.name}</p>
              <p className="text-[10px] text-black/55">{entry.city}, {entry.country}</p>
              {sentTo[entry.id] && (
                <p className="text-[10px] text-green-800 mt-1">
                  latest invitation sent to {sentTo[entry.id]}
                </p>
              )}
            </div>
            <label className="block">
              <span className="block text-[9px] uppercase tracking-widest text-black/50 mb-1">verified claimant email</span>
              <input
                type="email"
                required
                maxLength={320}
                value={emails[entry.id] ?? ""}
                onChange={(event) => setEmails((current) => ({ ...current, [entry.id]: event.target.value }))}
                className="w-full bg-white border border-black/25 px-3 py-2 text-xs focus:outline-none focus:border-black"
                placeholder="person@example.org"
              />
            </label>
            <label className="flex items-start gap-2 text-[10px] leading-relaxed text-black/70">
              <input
                type="checkbox"
                checked={verified[entry.id] ?? false}
                onChange={(event) => setVerified((current) => ({ ...current, [entry.id]: event.target.checked }))}
                className="mt-0.5 accent-black"
              />
              I have verified this person’s authority to represent this space and verified this email address.
            </label>
            <button
              type="submit"
              disabled={sendingId === entry.id || !verified[entry.id] || !emails[entry.id]?.trim()}
              className="justify-self-start border-2 border-black bg-black text-[#c6ff3d] px-3 py-2 text-[9px] font-bold uppercase tracking-widest disabled:opacity-40"
            >
              {sendingId === entry.id ? "sending…" : sentTo[entry.id] ? "send replacement invitation" : "send 72-hour invitation"}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

// ---------- Live Pins Panel ----------
interface LiveEntry {
  id: number;
  name: string;
  kind: string;
  secondaryKind: string | null;
  city: string;
  country: string;
  blurb: string | null;
  url: string | null;
  heroPhoto: string | null;
  tags: string[];
  lat: number | null;
  lng: number | null;
  isHidden: boolean;
  createdAt: string;
  contactEmail: string | null;
  submittedBy?: string | null;
  isCommunitySubmitted?: boolean;
  submissionRelationship?: string | null;
  curatedBy: string | null;
  joinReason: string | null;
  isVoiceFeatured: boolean;
  visibility?: string | null;
  status?: string | null;
  isApproved?: boolean;
  isClaimed?: boolean;
  claimedEmail?: string | null;
  deletedAt?: string | null;
  profileVisibilityConsentVersion?: string | null;
  profileVisibilityConsentAt?: string | null;
  publicProfileConsentAt?: string | null;
  archiveConsentAt?: string | null;
  mapEligible?: boolean;
  archivedAt?: string | null;
  reviewedClassification?: string | null;
  derivedClassification?: string | null;
  discoverySource?: string | null;
  networkNextSteps?: string | null;
}

function LivePinsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [entries, setEntries] = useState<LiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/entries", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`failed: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`delete "${name}" from the live map?`)) return;
    await fetch(`/api/admin/entries/${id}`, { method: "DELETE", headers: { "x-admin-password": pwd } });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
    ]);
    toast.success("deleted from map");
    load();
  };

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
     return e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.country.toLowerCase().includes(q) || e.kind.toLowerCase().includes(q) || e.submittedBy?.toLowerCase().includes(q) || e.submissionRelationship?.toLowerCase().includes(q) || e.curatedBy?.toLowerCase().includes(q) || e.joinReason?.toLowerCase().includes(q) || e.discoverySource?.toLowerCase().includes(q) || e.networkNextSteps?.toLowerCase().includes(q);
  });

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Live Pins {entries.length > 0 && `(${entries.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              all published entries - search, edit, revoke or delete
            </p>
          </div>
          <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        <div className="p-4 border-b-2 border-black">
          <SpaceClaimInvitationsPanel entries={entries} pwd={pwd} />
        </div>

        <div className="px-4 py-3 border-b-2 border-black">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by name, city, kind…"
            className="w-full bg-transparent border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30"
          />
        </div>

        <div className="p-4 flex flex-col gap-3">
          {loading && <div className="text-xs text-black/40 uppercase tracking-widest">loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-xs text-black/40 uppercase tracking-widest py-6 text-center">
              {search ? "no matches" : "no live entries"}
            </div>
          )}
          {filtered.map((entry) => (
            editingId === entry.id
              ? <LiveEntryEditForm
                  key={entry.id}
                  entry={entry}
                  pwd={pwd}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
                      queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
                    ]);
                    load();
                  }}
                />
              : <LiveEntryCard
                  key={entry.id}
                  entry={entry}
                  pwd={pwd}
                  onEdit={() => setEditingId(entry.id)}
                  onDelete={() => remove(entry.id, entry.name)}
                  onRevoke={() => {
                    queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
                    load();
                  }}
                />
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveEntryCard({ entry, pwd, onEdit, onDelete, onRevoke }: { entry: LiveEntry; pwd: string; onEdit: () => void; onDelete: () => void; onRevoke: () => void }) {
  const [revoking, setRevoking] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const ownerEmail = entry.contactEmail ?? null;
  const [showReset, setShowReset] = useState(false);
  const [resetPwd, setResetPwd] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [togglingVoiceFeatured, setTogglingVoiceFeatured] = useState(false);
  const [showOutreachPreview, setShowOutreachPreview] = useState(false);
  const outreachDraft = ownerEmail
    ? buildCuratorOutreachEmail({ id: entry.id, name: entry.name, contactEmail: ownerEmail })
    : null;
  const canPreviewOutreach = Boolean(
    outreachDraft &&
    entry.kind === "space" &&
    entry.isApproved &&
    entry.visibility === "public" &&
    !entry.isClaimed &&
    !entry.isHidden &&
    !entry.archivedAt &&
    !entry.deletedAt &&
    entry.mapEligible !== false
  );

  const handleGenerateLink = async () => {
    if (!ownerEmail) return;
    setLinkLoading(true);
    setResetLink(null);
    setResetMsg(null);
    try {
      const r = await fetch("/api/admin/users/generate-reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ email: ownerEmail }),
      });
      const data = await r.json() as { ok?: boolean; resetUrl?: string; error?: string };
      if (!r.ok || !data.ok || !data.resetUrl) {
        setResetMsg({ ok: false, text: data.error ?? "failed to generate link" });
      } else {
        setResetLink(data.resetUrl);
        try { await navigator.clipboard.writeText(data.resetUrl); setResetMsg({ ok: true, text: "link copied to clipboard - send it to the artist" }); }
        catch { setResetMsg({ ok: true, text: "link generated - copy it below" }); }
      }
    } catch (err: any) {
      setResetMsg({ ok: false, text: err?.message ?? "request failed" });
    } finally {
      setLinkLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!ownerEmail || !resetPwd.trim()) return;
    setResetLoading(true);
    setResetMsg(null);
    setResetLink(null);
    try {
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ email: ownerEmail, password: resetPwd.trim() }),
      });
      const data = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        setResetMsg({ ok: false, text: data.error ?? "failed" });
      } else {
        setResetMsg({ ok: true, text: `password updated for ${ownerEmail}` });
        setResetPwd("");
      }
    } catch (err: any) {
      setResetMsg({ ok: false, text: err?.message ?? "request failed" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleHidden = async () => {
    setTogglingHidden(true);
    try {
      const r = await fetch(`/api/admin/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ isHidden: !entry.isHidden }),
      });
      if (!r.ok) { toast.error("update failed"); return; }
      toast.success(entry.isHidden ? `"${entry.name}" unhidden - visible on map` : `"${entry.name}" hidden - removed from map`);
      onRevoke(); // reloads the list
    } catch (err: any) {
      toast.error(err?.message ?? "update failed");
    } finally {
      setTogglingHidden(false);
    }
  };

  const handleToggleVoiceFeatured = async () => {
    if (!entry.joinReason?.trim()) return;
    setTogglingVoiceFeatured(true);
    try {
      const r = await fetch(`/api/admin/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ isVoiceFeatured: !entry.isVoiceFeatured }),
      });
      if (!r.ok) { toast.error("answer update failed"); return; }
      toast.success(entry.isVoiceFeatured ? "answer removed from homepage" : "answer featured on homepage");
      onRevoke();
    } catch (err: any) {
      toast.error(err?.message ?? "answer update failed");
    } finally {
      setTogglingVoiceFeatured(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm(`revoke approval for "${entry.name}"? this will hide them from the map and sign them out immediately.`)) return;
    setRevoking(true);
    try {
      const r = await fetch(`/api/admin/entries/${entry.id}/revoke`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) { toast.error("revoke failed"); return; }
      toast.success(`"${entry.name}" revoked - removed from map, session killed`);
      onRevoke();
    } catch (err: any) {
      toast.error(err?.message ?? "revoke failed");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="border-2 border-black p-3 flex items-start justify-between gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[9px] uppercase tracking-widest bg-black text-[#c6ff3d] px-1.5 py-0.5 font-bold">{entry.kind}</span>
          {entry.secondaryKind && <span className="text-[9px] uppercase tracking-widest bg-black/10 text-black border border-black/30 px-1.5 py-0.5 font-bold">+ {entry.secondaryKind}</span>}
          {entry.isHidden && <span className="text-[9px] uppercase tracking-widest bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 font-bold">⏸ paused</span>}
          {entry.lat != null ? <span className="text-[9px] uppercase tracking-widest text-black/40 border border-black/20 px-1.5 py-0.5">◉ pinned</span> : <span className="text-[9px] uppercase tracking-widest text-black/30 border border-black/20 px-1.5 py-0.5">no pin</span>}
        </div>
        <div className="font-bold text-sm uppercase truncate">{entry.name}</div>
        <div className="text-[10px] text-black/60 uppercase tracking-wide">{entry.city}, {entry.country}</div>
        {entry.isCommunitySubmitted && (
          <div className="mt-1 border border-black/20 bg-[#c6ff3d]/30 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
            community suggestion · {entry.submissionRelationship === "represents" ? "submitter says they represent this space" : "community recommendation"}
          </div>
        )}
        {entry.isCommunitySubmitted && entry.submittedBy && (
          <a href={`mailto:${entry.submittedBy}`} className="text-[10px] text-black/60 hover:text-black hover:underline block mt-0.5">
            submitter email for review: {entry.submittedBy}
          </a>
        )}
        {entry.contactEmail && (
          <a href={`mailto:${entry.contactEmail}`} className="text-[10px] text-black/60 hover:text-black hover:underline block mt-0.5">
            {entry.contactEmail}
          </a>
        )}
        {canPreviewOutreach && (
          <button
            type="button"
            onClick={() => setShowOutreachPreview((visible) => !visible)}
            className="mt-2 border border-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-white"
          >
            {showOutreachPreview ? "hide email draft" : "preview curator email"}
          </button>
        )}
        {entry.blurb && <div className="text-[10px] text-black/50 mt-1 line-clamp-1">{entry.blurb}</div>}
        {entry.url && (
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-black underline decoration-[#c6ff3d] mt-0.5 block truncate">
            {entry.url.replace(/^https?:\/\//, "").slice(0, 50)}
          </a>
        )}
        {entry.tags.length > 0 && (
          <div className="text-[9px] text-black/40 mt-1">{entry.tags.slice(0, 5).join(", ")}</div>
        )}
        {entry.curatedBy && (
          <div className="text-[9px] text-black/60 mt-1 uppercase tracking-widest">
            <span className="text-black/30">curator</span> · {entry.curatedBy}
          </div>
        )}
         <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-bold uppercase tracking-widest">
           <span className="border border-black/20 px-1.5 py-0.5">status: {entry.status ?? "unknown"}</span>
           <span className={`border px-1.5 py-0.5 ${entry.isApproved ? "border-[#6b9f00] bg-[#c6ff3d]" : "border-red-300 bg-red-50 text-red-600"}`}>approval: {entry.isApproved ? "approved" : "not approved"}</span>
           <span className="border border-black/20 px-1.5 py-0.5">visibility: {entry.visibility ?? "unset"}</span>
           <span className={`border px-1.5 py-0.5 ${entry.profileVisibilityConsentAt || (entry.visibility === "public" && entry.publicProfileConsentAt) ? "border-[#6b9f00] bg-[#c6ff3d]" : "border-red-300 bg-red-50 text-red-600"}`}>visibility consent: {entry.profileVisibilityConsentAt || (entry.visibility === "public" && entry.publicProfileConsentAt) ? "recorded" : "missing"}</span>
           <span className="border border-black/20 px-1.5 py-0.5">map: {entry.mapEligible === false ? "no" : "yes"}</span>
           {entry.archivedAt && <span className="border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-orange-700">archived</span>}
           {entry.deletedAt && <span className="border border-red-300 bg-red-50 px-1.5 py-0.5 text-red-600">deleted</span>}
         </div>
         <SignupIntakeAnswers
           discoverySource={entry.discoverySource}
           networkNextSteps={entry.networkNextSteps}
         />
         {entry.joinReason && (
          <div className="mt-2 border-l-2 border-[#c6ff3d] bg-black/[0.03] pl-2.5 pr-1.5 py-1.5">
            <div className="flex items-center justify-between gap-2">
               <div className="text-[8px] font-bold uppercase tracking-widest text-black/40">legacy community-voice answer</div>
              {entry.isVoiceFeatured && (
                <span className="shrink-0 bg-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-[#c6ff3d]">
                  homepage
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-black/80">{entry.joinReason}</p>
            <button
              onClick={() => void handleToggleVoiceFeatured()}
              disabled={togglingVoiceFeatured}
              className={`mt-2 border px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
                entry.isVoiceFeatured
                  ? "border-black bg-black text-[#c6ff3d] hover:bg-white hover:text-black"
                  : "border-black/30 bg-white text-black/60 hover:border-black hover:bg-[#c6ff3d] hover:text-black"
              }`}
            >
              {togglingVoiceFeatured ? "…" : entry.isVoiceFeatured ? "remove from homepage" : "feature answer"}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {entry.heroPhoto && (
          <AdminObjectImage src={entry.heroPhoto} alt="" className="w-12 h-12 object-cover border border-black" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        <a href={`/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-1.5 py-0.5 text-center">
          view →
        </a>
        <button onClick={onEdit} className="text-[9px] uppercase tracking-widest font-bold bg-[#c6ff3d] border-2 border-black px-1.5 py-0.5 hover:bg-black hover:text-[#c6ff3d] transition-colors">
          edit
        </button>
        <button
          onClick={() => void handleToggleHidden()}
          disabled={togglingHidden}
          className={`text-[9px] uppercase tracking-widest font-bold border-2 px-1.5 py-0.5 transition-colors disabled:opacity-40 ${entry.isHidden ? "bg-orange-100 border-orange-400 text-orange-700 hover:bg-orange-200" : "text-black/50 border-black/30 hover:bg-black/5"}`}
        >
          {togglingHidden ? "…" : entry.isHidden ? "unhide" : "hide"}
        </button>
        <button
          onClick={() => void handleRevoke()}
          disabled={revoking}
          className="text-[9px] uppercase tracking-widest font-bold text-black border-2 border-black px-1.5 py-0.5 hover:bg-black hover:text-white transition-colors disabled:opacity-40"
        >
          {revoking ? "…" : "revoke"}
        </button>
        <button onClick={onDelete} className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-1.5 py-0.5 hover:bg-black/5 transition-colors">
          delete
        </button>
        {ownerEmail && (
          <button
            onClick={() => { setShowReset((v) => !v); setResetMsg(null); setResetPwd(""); }}
            className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-1.5 py-0.5 hover:bg-black/5 transition-colors"
          >
            {showReset ? "cancel" : "reset pwd"}
          </button>
        )}
      </div>
      {showOutreachPreview && canPreviewOutreach && outreachDraft && (
        <section className="w-full border border-black p-4 text-sm" aria-label={`Draft email preview for ${entry.name}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest">Draft preview · not sent</p>
              <p className="mt-1 text-xs"><strong>To:</strong> {outreachDraft.recipient}</p>
              <p className="mt-1 text-xs"><strong>Subject:</strong> {outreachDraft.subject}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`To: ${outreachDraft.recipient}\nSubject: ${outreachDraft.subject}\n\n${outreachDraft.text}`);
                  toast.success("email draft copied");
                } catch {
                  toast.error("could not copy email draft");
                }
              }}
              className="border border-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-white"
            >
              copy draft
            </button>
          </div>
          <div className="space-y-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: outreachDraft.html }} />
        </section>
      )}
      {showReset && ownerEmail && (
        <div className="w-full mt-2 border border-black/20 p-2 bg-black/[0.02] flex flex-col gap-2">
          <p className="text-[9px] uppercase tracking-widest text-black/40">password options for <span className="font-bold text-black">{ownerEmail}</span></p>

          {/* Generate a self-service reset link */}
          <div>
            <p className="text-[9px] text-black/40 mb-1">Generate a one-time link (1 hr) the artist can use to set their own password:</p>
            <button
              onClick={() => void handleGenerateLink()}
              disabled={linkLoading}
              className="text-[9px] uppercase tracking-widest font-bold bg-[#c6ff3d] border border-black px-2 py-1 hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40 w-full"
            >
              {linkLoading ? "generating…" : "generate reset link"}
            </button>
            {resetLink && (
              <div className="mt-1.5 flex gap-1">
                <input
                  readOnly
                  value={resetLink}
                  className="flex-1 bg-white border border-black/20 px-2 py-1 text-[10px] outline-none font-mono truncate"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => { void navigator.clipboard.writeText(resetLink); setResetMsg({ ok: true, text: "copied!" }); }}
                  className="text-[9px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] border border-black px-2 py-1 hover:bg-[#c6ff3d] hover:text-black transition-colors shrink-0"
                >
                  copy
                </button>
              </div>
            )}
          </div>

          {/* Or set a password directly */}
          <div className="border-t border-black/10 pt-2">
            <p className="text-[9px] text-black/40 mb-1">Or set a password directly (you'll need to tell them what it is):</p>
            <div className="flex gap-1.5">
              <input
                type="password"
                autoComplete="new-password"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                placeholder="new password"
                className="flex-1 bg-white border border-black/20 focus:border-black px-2 py-1 text-[11px] outline-none"
              />
              <button
                onClick={() => void handlePasswordReset()}
                disabled={resetLoading || !resetPwd.trim()}
                className="text-[9px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] border border-black px-2 py-1 hover:bg-[#c6ff3d] hover:text-black transition-colors disabled:opacity-40"
              >
                {resetLoading ? "…" : "save"}
              </button>
            </div>
          </div>

          {resetMsg && (
            <p className={`text-[9px] ${resetMsg.ok ? "text-black/60" : "text-red-600"}`}>{resetMsg.text}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Editorial Posts Panel ----------
interface PostRow {
  id: number;
  kind: string;
  title: string;
  body: string;
  authorName: string;
  heroImage: string | null;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
}

function EditorialPostsPanel({ pwd }: { pwd: string }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", heroImage: "", tags: "" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/posts?kind=editorial");
      if (!r.ok) { toast.error("failed to load posts"); return; }
      const data = await r.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("title and body are required");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({
          kind: "editorial",
          title: form.title.trim(),
          body: form.body.trim(),
          heroImage: form.heroImage.trim() || null,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d?.error || "failed to create post"); return; }
      toast.success("post published ✓");
      setForm({ title: "", body: "", heroImage: "", tags: "" });
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`delete post "${title}"?`)) return;
    const r = await fetch(`/api/posts/${id}`, { method: "DELETE", headers: { "x-admin-password": pwd } });
    if (r.ok || r.status === 204) { toast.success("deleted"); load(); }
    else toast.error("delete failed");
  };

  const inputClass = "w-full bg-transparent border-b-2 border-black py-2 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30";

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Editorial {posts.length > 0 && `(${posts.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              write &amp; publish editorial posts
            </p>
          </div>
          <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} className="border-b-2 border-black p-4 flex flex-col gap-4">
          <div className="text-[10px] uppercase tracking-widest text-black/50 font-bold">new editorial post</div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="e.g. Soundscapes of the Underground"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">body * (markdown supported)</label>
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full bg-transparent border-2 border-black p-2 text-sm focus:outline-none focus:border-[#c6ff3d] resize-y text-black placeholder:text-black/30 font-mono"
              placeholder={"Write your editorial here...\n\nMarkdown supported: **bold**, *italic*, ## headings, - lists"}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">hero image url</label>
              <input
                type="url"
                value={form.heroImage}
                onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                className={inputClass}
                placeholder="https://…/image.jpg"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className={inputClass}
                placeholder="techno, rave, Berlin, culture"
              />
            </div>
          </div>

          {form.heroImage && (
            <AdminObjectImage
              src={form.heroImage}
              alt="hero preview"
              className="w-full max-h-40 object-cover border-2 border-black"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors text-sm uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {saving ? "publishing…" : "↑ publish post"}
          </button>
        </form>

        {/* Posts list */}
        <div className="p-4 flex flex-col gap-3">
          {loading && <div className="text-xs text-black/40 uppercase tracking-widest">loading…</div>}
          {!loading && posts.length === 0 && (
            <div className="text-xs text-black/40 uppercase tracking-widest py-4 text-center">no editorial posts yet.</div>
          )}
          {posts.map((post) => (
            <div key={post.id} className="border-2 border-black p-3 flex items-start gap-3">
              {post.heroImage && (
                <AdminObjectImage
                  src={post.heroImage}
                  alt=""
                  className="w-16 h-16 object-cover border border-black shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm uppercase tracking-widest truncate">{post.title}</div>
                <div className="text-[10px] text-black/50 mt-0.5 uppercase tracking-wide">
                  {new Date(post.createdAt).toLocaleDateString()} · by {post.authorName}
                </div>
                {post.tags.length > 0 && (
                  <div className="text-[9px] text-black/40 mt-0.5">{post.tags.join(", ")}</div>
                )}
                <div className="text-[10px] text-black/60 mt-1 line-clamp-2">{post.body.slice(0, 120)}{post.body.length > 120 ? "…" : ""}</div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <a
                  href={`/media/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-1.5 py-0.5 text-center"
                >
                  view →
                </a>
                <button
                  onClick={() => handleDelete(post.id, post.title)}
                  className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-1.5 py-0.5 hover:bg-black/5 transition-colors"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveEntryEditForm({
  entry,
  pwd,
  onCancel,
  onSaved,
}: {
  entry: LiveEntry;
  pwd: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: entry.name,
    kind: entry.kind,
    secondaryKind: entry.secondaryKind ?? "",
    city: entry.city,
    country: entry.country,
    blurb: entry.blurb ?? "",
    url: entry.url ?? "",
    heroPhoto: entry.heroPhoto ?? "",
    tags: entry.tags.join(", "),
    lat: entry.lat != null ? String(entry.lat) : "",
    lng: entry.lng != null ? String(entry.lng) : "",
  });
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full bg-transparent border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        kind: form.kind,
        secondaryKind: form.secondaryKind || null,
        city: form.city.trim(),
        country: form.country.trim(),
        blurb: form.blurb.trim() || null,
        url: form.url.trim() || null,
        heroPhoto: form.heroPhoto.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (form.lat && form.lng) {
        body.lat = parseFloat(form.lat);
        body.lng = parseFloat(form.lng);
      }
      const r = await fetch(`/api/admin/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d?.error || "save failed"); return; }
      toast.success("saved ✓");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="border-2 border-[#c6ff3d] p-4 flex flex-col gap-4 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-widest">editing: {entry.name}</span>
        <button type="button" onClick={onCancel} className="text-black/40 hover:text-black text-sm font-bold">✕ cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">kind</label>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full bg-white border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d]">
            {["artist", "space", "artifact"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">also a (secondary kind)</label>
          <select value={form.secondaryKind} onChange={(e) => setForm({ ...form, secondaryKind: e.target.value })} className="w-full bg-white border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d]">
            <option value="">- none -</option>
            {["artist", "space", "artifact"].filter((k) => k !== form.kind).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">city</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">country</label>
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} required />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">blurb</label>
        <textarea rows={2} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} className="w-full bg-transparent border-2 border-black p-2 text-sm focus:outline-none focus:border-[#c6ff3d] resize-none text-black placeholder:text-black/30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">url</label>
          <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} placeholder="https://…" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">hero photo url</label>
          <input type="url" value={form.heroPhoto} onChange={(e) => setForm({ ...form, heroPhoto: e.target.value })} className={inputClass} placeholder="https://…/photo.jpg" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">tags (comma separated)</label>
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="techno, berlin, dj…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">lat</label>
          <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className={inputClass} placeholder="e.g. 52.5200" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/60 mb-1">lng</label>
          <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className={inputClass} placeholder="e.g. 13.4050" />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2 text-[10px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors disabled:opacity-40">
          {saving ? "saving…" : "save changes"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border-2 border-black hover:bg-black/5 transition-colors">
          cancel
        </button>
      </div>
    </form>
  );
}

// ---------- Recently Deleted Panel ----------
interface DeletedEntry {
  id: number;
  name: string;
  kind: string;
  city: string;
  country: string;
  blurb: string | null;
  status: string;
  isApproved: boolean;
  deletedAt: string;
  createdAt: string;
}

function DeletedEntriesPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [entries, setEntries] = useState<DeletedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/entries/deleted", { headers: { "x-admin-password": pwd } });
      if (!r.ok) { toast.error(`failed: ${r.status}`); return; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setEntries(list);
      onCount?.(list.length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load deleted entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const restore = async (id: number, name: string) => {
    setRestoring(id);
    try {
      const r = await fetch(`/api/admin/entries/${id}/restore`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) { toast.error("restore failed"); return; }
      toast.success(`"${name}" restored ✓`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const daysUntilPurge = (deletedAt: string) => {
    const deleted = new Date(deletedAt).getTime();
    const purgeAt = deleted + 30 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((purgeAt - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Recently Deleted {entries.length > 0 && `(${entries.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              entries in the trash - auto-purged after 30 days · restore to bring them back
            </p>
          </div>
          <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">refresh</button>
        </div>

        {loading && <div className="px-4 py-6 text-xs text-black/40 uppercase tracking-widest text-center">loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no recently deleted entries.
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div className="p-4 flex flex-col gap-2">
            {entries.map((e) => {
              const days = daysUntilPurge(e.deletedAt);
              const urgent = days <= 3;
              return (
                <div key={e.id} className="border-2 border-black/20 p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] uppercase tracking-widest bg-black/10 text-black px-1.5 py-0.5 font-bold">{e.kind}</span>
                      <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-bold border ${urgent ? "bg-red-50 text-red-600 border-red-300" : "bg-black/5 text-black/50 border-black/20"}`}>
                        {days === 0 ? "purging soon" : `${days}d left`}
                      </span>
                      {e.isApproved && <span className="text-[9px] uppercase tracking-widest text-black/40 border border-black/20 px-1.5 py-0.5">was live</span>}
                    </div>
                    <div className="font-bold text-sm uppercase truncate">{e.name}</div>
                    <div className="text-[10px] text-black/60 uppercase tracking-wide">{e.city}, {e.country}</div>
                    {e.blurb && <div className="text-[10px] text-black/40 mt-1 line-clamp-1">{e.blurb}</div>}
                    <div className="text-[9px] text-black/30 mt-1 uppercase tracking-widest">
                      deleted {new Date(e.deletedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => void restore(e.id, e.name)}
                    disabled={restoring === e.id}
                    className="text-[9px] uppercase tracking-widest font-bold bg-[#c6ff3d] border-2 border-black px-2 py-1.5 hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-40 shrink-0"
                  >
                    {restoring === e.id ? "…" : "↩ restore"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Board Listings Panel ----------
interface BoardOffer {
  id: number;
  entryId: number | null;
  posterEmail: string | null;
  posterAccountRole: string | null;
  posterCanPostPartnerOffers?: boolean;
  entryName: string;
  entryKind: string | null;
  hasLiveProfile?: boolean;
  kind: string;
  skillShareMode?: "swap" | "free_offer" | null;
  city: string;
  destination: string | null;
  description: string;
  availableFrom: string | null;
  availableTo: string | null;
  contact: string | null;
  cost: string | null;
  visibility: string | null;
  tags: string[] | null;
  photos: string[] | null;
  publicPhotos: string[] | null;
  homepageFeaturedOrder?: number | null;
  isActive: boolean;
  createdAt: string;
}

type HomepagePickCandidate = {
  id: number;
  city: string;
  description: string;
};

function HomepageExchangePicksAdminPanel({
  pwd,
  offers,
  onSaved,
}: {
  pwd: string;
  offers: BoardOffer[];
  onSaved: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [candidates, setCandidates] = useState<HomepagePickCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([""]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCandidates(true);
    fetch("/api/residency", { cache: "no-store", credentials: "omit" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`failed to load public-safe offers: ${response.status}`);
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("unexpected Exchange response");
        return data.filter((item): item is HomepagePickCandidate =>
          item && typeof item.id === "number"
          && typeof item.city === "string"
          && typeof item.description === "string",
        );
      })
      .then((items) => {
        if (!cancelled) {
          setCandidates(items);
          setCandidateError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCandidateError(error instanceof Error ? error.message : "failed to load public-safe offers");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const safeIds = new Set(candidates.map((candidate) => candidate.id));
    const newestIds = new Set(candidates.slice(0, 2).map((candidate) => candidate.id));
    const ordered = offers
      .filter((offer) => offer.homepageFeaturedOrder != null && safeIds.has(offer.id))
      .sort((a, b) => (a.homepageFeaturedOrder ?? 0) - (b.homepageFeaturedOrder ?? 0))
      .find((offer) => !newestIds.has(offer.id));
    setSelectedIds([ordered ? String(ordered.id) : ""]);
  }, [offers, candidates]);

  const savePicks = async () => {
    if (candidateError) {
      toast.error("refresh the public-safe offer list before saving");
      return;
    }
    const offerIds = selectedIds.filter(Boolean).map(Number);
    if (new Set(offerIds).size !== offerIds.length) {
      toast.error("each homepage position must use a different offer");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/residency/homepage-picks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ offerIds }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "homepage picks could not be saved");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: getListHomepageExchangePicksQueryKey() });
      toast.success(offerIds.length ? "homepage picks saved" : "homepage picks cleared");
      await onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "homepage picks could not be saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-2 border-black bg-[#f6f6f2] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest">Homepage Exchange picks</h3>
          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-black/55">
            The two newest active public-safe offers always appear first. Choose one older offer for the third card; private or unavailable offers cannot be selected.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedIds([""])}
          disabled={saving || selectedIds.every((id) => !id)}
          className="text-[9px] font-bold uppercase tracking-widest text-black/50 underline decoration-1 underline-offset-4 disabled:opacity-30"
        >
          clear selection
        </button>
      </div>

      {loadingCandidates ? (
        <p className="mt-4 text-[10px] uppercase tracking-widest text-black/40">loading eligible offers…</p>
      ) : candidateError ? (
        <p role="alert" className="mt-4 text-[10px] uppercase tracking-widest text-red-700">
          {candidateError}. Refresh the board to retry.
        </p>
      ) : candidates.length === 0 ? (
        <p className="mt-4 text-[10px] uppercase tracking-widest text-black/40">no active public-safe offers are available to feature</p>
      ) : (
        <label className="mt-4 block max-w-2xl min-w-0">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-black/45">
            optional third card
          </span>
          <select
            aria-label="Optional third Homepage Exchange card"
            value={selectedIds[0] ?? ""}
            onChange={(event) => setSelectedIds([event.target.value])}
            className="w-full min-h-10 border border-black/25 bg-white px-2 py-2 text-xs text-black focus:border-black focus:outline-none"
          >
            <option value="">No pick, use the next newest offer</option>
            {candidates.slice(2).map((candidate) => (
              <option key={candidate.id} value={String(candidate.id)}>
                {candidate.city} · {candidate.description.slice(0, 76)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[9px] uppercase tracking-widest text-black/40">
          If no third-card pick is set, the next newest offer fills the slot.
        </p>
        <button
          type="button"
          onClick={() => void savePicks()}
          disabled={saving || loadingCandidates || Boolean(candidateError)}
          className="shrink-0 border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d] disabled:opacity-40"
        >
          {saving ? "saving…" : "save homepage order"}
        </button>
      </div>
    </section>
  );
}

function BoardListingsPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState<"all" | "partner" | "campaign">("all");
  const [restoring, setRestoring] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/residency?includeInactive=true", {
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) { toast.error(`failed: ${r.status}`); return; }
      const data = await r.json();
      const list: BoardOffer[] = Array.isArray(data) ? data : [];
      setOffers(list);
      onCount?.(list.filter((offer) => offer.isActive).length);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load");
    } finally {
      setLoading(false);
    }
  };

  const restore = async (id: number, name: string) => {
    if (!window.confirm(`restore "${name}"'s listing? this will only reactivate this one listing.`)) return;
    setRestoring(id);
    try {
      const r = await fetch(`/api/admin/residency/${id}/restore`, {
        method: "POST",
        headers: { "x-admin-password": pwd },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        toast.error(data?.error ?? "restore failed");
        return;
      }
      toast.success("listing restored");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "restore failed");
    } finally {
      setRestoring(null);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`delete "${name}"'s listing from the board?`)) return;
    const r = await fetch(`/api/admin/residency/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": pwd },
    });
    if (!r.ok) { toast.error("delete failed"); return; }
    toast.success("removed from board");
    load();
  };

  const setResidentStatus = async (offer: BoardOffer, resident: boolean) => {
    setUpdatingStatus(offer.id);
    try {
      const r = await fetch(`/api/admin/residency/${offer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ resident }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) { toast.error(data?.error ?? "status update failed"); return; }
      toast.success(resident ? "marked as resident" : "returned to applicant");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "status update failed");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const KIND_LABELS: Record<string, string> = {
    host: "⌂ hosting", swap: "⇄ swap", looking: "? looking",
    workshop: "◉ workshop", collab: "⊕ collab", performance: "♪ performance", residency: "⌂ residency",
    free_space: "▣ free space", venue_offer: "▣ venue offer", partner_offer: "✦ partner offer",
  };

  const filtered = offers.filter((o) => {
    const isPartnerPost = o.posterCanPostPartnerOffers === true || o.posterAccountRole === "partner_poster";
    const isExchangeResidency = Boolean(o.tags?.some((tag) => tag.trim().toLowerCase() === "exchange residency"));
    if (exchangeFilter === "partner" && !isPartnerPost) return false;
    if (exchangeFilter === "campaign" && !isExchangeResidency) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.entryName ?? "").toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      o.kind.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.posterEmail ?? "").toLowerCase().includes(q) ||
      (o.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <section className="max-w-4xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Exchange + Partner Board {offers.length > 0 && `(${offers.length})`}
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
              active and inactive Exchange listings, partner offers, resources, and space posts
            </p>
          </div>
          <button onClick={load} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        <div className="px-4 py-3 border-b-2 border-black">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search by name, city, kind, description…"
            className="w-full bg-transparent border-b-2 border-black py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-black placeholder:text-black/30"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {([
              ["all", "all listings"],
              ["partner", "partner posts"],
              ["campaign", "February residency"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setExchangeFilter(value)} className={`text-[9px] uppercase tracking-widest border px-2 py-1 ${exchangeFilter === value ? "bg-black text-[#c6ff3d] border-black" : "text-black/50 border-black/20"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b-2 border-black p-4">
          <HomepageExchangePicksAdminPanel pwd={pwd} offers={offers} onSaved={load} />
        </div>

        <div className="p-4 flex flex-col gap-3">
          {loading && <div className="text-xs text-black/40 uppercase tracking-widest">loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-xs text-black/40 uppercase tracking-widest py-6 text-center">
              {search ? "no matches" : "no listings"}
            </div>
          )}
          {filtered.map((offer) => {
            const daysSince = Math.floor((Date.now() - new Date(offer.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const isExchangeResidency = Boolean(offer.tags?.some((tag) => tag.trim().toLowerCase() === "exchange residency"));
            const isResident = Boolean(offer.tags?.some((tag) => tag.trim().toLowerCase() === "exchange residency resident"));
            const isPartnerPost = offer.posterCanPostPartnerOffers === true || offer.posterAccountRole === "partner_poster";
            return (
              <div key={offer.id} className={`border p-4 flex flex-col gap-2 ${offer.isActive ? "border-black/10" : "border-orange-300/50 bg-orange-50/30"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-[10px] uppercase tracking-widest bg-[#c6ff3d] text-black px-2 py-0.5 font-bold shrink-0">
                      {KIND_LABELS[offer.kind] ?? offer.kind}
                    </span>
                    {!offer.isActive && (
                      <span className="text-[9px] uppercase tracking-widest text-orange-700 border border-orange-300 px-2 py-0.5 font-bold shrink-0">
                        inactive
                      </span>
                    )}
                    <span className="text-xs font-bold uppercase text-black truncate">{offer.entryName}</span>
                    {(offer.kind === "swap" || (offer.kind === "skill_share" && offer.skillShareMode === "swap")) && (
                      <span
                        className={`text-[9px] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${
                          offer.hasLiveProfile
                            ? "border-green-700/30 bg-green-50 text-green-800"
                            : "border-orange-300 bg-orange-50 text-orange-800"
                        }`}
                      >
                        {offer.hasLiveProfile ? "live profile" : "no live profile"}
                      </span>
                    )}
                    {offer.entryKind && (
                      <span className="text-[9px] text-black/30 uppercase tracking-widest border border-black/10 px-1 py-0.5 shrink-0">{offer.entryKind}</span>
                    )}
                    {isExchangeResidency && (
                      <span className="text-[9px] uppercase tracking-widest bg-[#c6ff3d] text-black border border-black px-2 py-0.5 font-bold shrink-0">
                        {isResident ? "exchange residency - resident" : "exchange residency - applicant"}
                      </span>
                    )}
                    {isPartnerPost && (
                      <span className="text-[9px] uppercase tracking-widest bg-black text-[#c6ff3d] border border-black px-2 py-0.5 font-bold shrink-0">
                        partner account
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExchangeResidency && (
                      <button
                        onClick={() => void setResidentStatus(offer, !isResident)}
                        disabled={updatingStatus === offer.id}
                        className="text-[9px] uppercase tracking-widest font-bold text-black border border-black/20 hover:bg-[#c6ff3d] px-2 py-0.5 transition-colors disabled:opacity-40"
                      >
                        {updatingStatus === offer.id ? "…" : isResident ? "return to applicant" : "mark resident"}
                      </button>
                    )}
                    {!offer.isActive && (
                      <button
                        onClick={() => void restore(offer.id, offer.entryName)}
                        disabled={restoring === offer.id}
                        className="text-[9px] uppercase tracking-widest font-bold text-black bg-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d] border border-black px-2 py-0.5 transition-colors disabled:opacity-40"
                      >
                        {restoring === offer.id ? "…" : "restore"}
                      </button>
                    )}
                    <button
                      onClick={() => remove(offer.id, offer.entryName)}
                      className="text-[9px] uppercase tracking-widest text-black/30 hover:text-red-600 border border-black/10 hover:border-red-300 px-2 py-0.5 transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40">
                  <span>{offer.city}</span>
                  {offer.destination && <><span>→</span><span>{offer.destination}</span></>}
                  {offer.availableFrom && <span className="border-l border-black/10 pl-2">from {offer.availableFrom}</span>}
                  {offer.availableTo && <span>→ {offer.availableTo}</span>}
                </div>
                <p className="text-xs text-black/50 leading-relaxed">{offer.description}</p>
                {offer.photos?.length ? (
                  <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
                    {offer.photos.map((photo, index) => {
                      const optedIn = offer.publicPhotos?.includes(photo) ?? false;
                      const publicNow = optedIn && offer.visibility === "public" && offer.isActive;
                      return (
                        <div key={`${offer.id}-${photo}-${index}`} className="min-w-0">
                          <AdminObjectImage
                            src={photo}
                            alt={`Exchange listing ${offer.id}, photo ${index + 1}`}
                            className="h-32 w-full object-cover"
                            linked
                          />
                          <div className="mt-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest text-black/45">
                            <span>photo {index + 1}</span>
                            <span className={publicNow ? "font-bold text-green-700" : ""}>
                              {publicNow ? "public" : optedIn ? "opted in · not public" : "private"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest text-black/20">
                  <span>posted {new Date(offer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {offer.isActive && daysSince > 30 && <span className="text-orange-400/70">may be expired ({daysSince}d)</span>}
                  {offer.contact && <span>contact: <span className="text-black/40">{offer.contact}</span></span>}
                  {isPartnerPost && offer.posterEmail && <span>account: <span className="text-black/40">{offer.posterEmail}</span></span>}
                  {offer.cost && <span>terms: <span className="text-black/40">{offer.cost}</span></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type MatchingOffer = {
  id: number;
  entryId: number | null;
  name: string;
  email: string | null;
  contact: string | null;
  city: string;
  destination: string | null;
  description: string;
  availableFrom: string | null;
  availableTo: string | null;
  photos: string[];
  isActive: boolean;
  isResident: boolean;
};

type ResidencyShortlist = {
  id: number;
  applicantOfferId: number;
  partnerOfferId: number;
  notes: string | null;
  status: "shortlisted" | "matched";
  applicantContactedAt: string | null;
  partnerContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: MatchingOffer;
  partner: MatchingOffer;
};

function ResidencyMatchingPanel({ pwd, onCount }: { pwd: string; onCount?: (n: number) => void }) {
  const [applicants, setApplicants] = useState<MatchingOffer[]>([]);
  const [shortlists, setShortlists] = useState<ResidencyShortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Record<number, string>>({});
  const [newNotes, setNewNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/residency/matching", {
        headers: { "x-admin-password": pwd },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "failed to load matching workspace");
        return;
      }
      setApplicants(Array.isArray(data?.applicants) ? data.applicants : []);
      setShortlists(Array.isArray(data?.shortlists) ? data.shortlists : []);
      onCount?.(Array.isArray(data?.applicants) ? data.applicants.length : 0);
    } catch (err: any) {
      toast.error(err?.message ?? "failed to load matching workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const addCandidate = async (applicant: MatchingOffer) => {
    const partnerOfferId = Number(selectedPartner[applicant.id]);
    if (!Number.isInteger(partnerOfferId)) {
      toast.error("choose a possible partner first");
      return;
    }
    setSaving(`add-${applicant.id}`);
    try {
      const response = await fetch(`/api/admin/residency/${applicant.id}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ partnerOfferId, notes: newNotes[applicant.id] ?? "" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "could not add candidate");
        return;
      }
      setSelectedPartner((current) => ({ ...current, [applicant.id]: "" }));
      setNewNotes((current) => ({ ...current, [applicant.id]: "" }));
      toast.success("private candidate added");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "could not add candidate");
    } finally {
      setSaving(null);
    }
  };

  const updateShortlist = async (shortlist: ResidencyShortlist, body: Record<string, unknown>) => {
    setSaving(`update-${shortlist.id}`);
    try {
      const response = await fetch(`/api/admin/residency/shortlist/${shortlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "could not update shortlist");
        return;
      }
      toast.success(body.status === "matched" ? "pair marked matched" : "private note saved");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "could not update shortlist");
    } finally {
      setSaving(null);
    }
  };

  const removeShortlist = async (shortlist: ResidencyShortlist) => {
    if (!window.confirm(`remove ${shortlist.partner.name} from ${shortlist.applicant.name}'s private shortlist?`)) return;
    setSaving(`remove-${shortlist.id}`);
    try {
      const response = await fetch(`/api/admin/residency/shortlist/${shortlist.id}`, {
        method: "DELETE",
        headers: { "x-admin-password": pwd },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "could not remove candidate");
        return;
      }
      toast.success("candidate removed");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "could not remove candidate");
    } finally {
      setSaving(null);
    }
  };

  const contactPerson = async (shortlist: ResidencyShortlist, target: "applicant" | "partner") => {
    const person = target === "applicant" ? shortlist.applicant : shortlist.partner;
    const contact = person.email ?? person.contact;
    if (!contact) {
      toast.error("no contact method recorded for this applicant");
      return;
    }
    if (!window.confirm(`open contact for ${person.name} and record that you chose to reach out?`)) return;
    setSaving(`contact-${shortlist.id}-${target}`);
    try {
      const response = await fetch(`/api/admin/residency/shortlist/${shortlist.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pwd },
        body: JSON.stringify({ target, confirm: true }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "could not record contact");
        return;
      }
      if (data.contact.includes("@")) {
        window.location.href = `mailto:${data.contact}`;
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.contact);
        toast.success("contact copied to clipboard");
      } else {
        toast.success("contact recorded");
      }
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "could not record contact");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-6">
      <div className="border-2 border-black bg-white">
        <div className="border-b-2 border-black bg-black px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#c6ff3d]">
              Exchange Residency · private matching
            </h2>
            <p className="text-[9px] uppercase tracking-widest text-white/50 mt-1 max-w-2xl">
              admin-only shortlist, notes, match status, and deliberate outreach · never shown on the public board
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs uppercase tracking-widest text-white/50 hover:text-[#c6ff3d] transition-colors">
            refresh
          </button>
        </div>

        <div className="px-4 py-3 border-b-2 border-black/10 bg-[#c6ff3d]/20 text-[10px] leading-relaxed uppercase tracking-wide">
          Keep 2–4 realistic options per applicant. Contact buttons require a second confirmation and record the outreach decision privately.
        </div>

        {loading && <div className="p-8 text-xs text-black/40 uppercase tracking-widest text-center">loading applicants…</div>}
        {!loading && applicants.length === 0 && (
          <div className="p-8 text-xs text-black/40 uppercase tracking-widest text-center">
            no Exchange Residency applicants yet.
          </div>
        )}
        {!loading && applicants.length > 0 && (
          <div className="p-4 flex flex-col gap-4">
            {applicants.map((applicant) => {
              const applicantShortlists = shortlists.filter((shortlist) => shortlist.applicantOfferId === applicant.id);
              const shortlistedIds = new Set(applicantShortlists.map((shortlist) => shortlist.partnerOfferId));
              const choices = applicants.filter((candidate) => candidate.id !== applicant.id && !shortlistedIds.has(candidate.id));
              const applicantContact = applicant.email ?? applicant.contact;
              return (
                <article key={applicant.id} className="border-2 border-black/20">
                  <div className="p-4 border-b border-black/10 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm uppercase">{applicant.name}</h3>
                        {applicant.isResident && (
                          <span className="text-[9px] uppercase tracking-widest bg-[#c6ff3d] border border-black px-1.5 py-0.5 font-bold">resident</span>
                        )}
                        {!applicant.isActive && (
                          <span className="text-[9px] uppercase tracking-widest border border-red-300 text-red-500 px-1.5 py-0.5 font-bold">inactive listing</span>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-black/50">
                        {applicant.city}{applicant.destination ? ` → ${applicant.destination}` : ""}
                        {applicant.availableFrom ? ` · ${applicant.availableFrom} → ${applicant.availableTo ?? "open"}` : ""}
                      </div>
                      {applicantContact && (
                        <div className="mt-2 text-[10px] text-black/50">
                          contact: <span className="text-black">{applicantContact}</span>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-black/60 leading-relaxed">{applicant.description}</p>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest border border-black/20 px-2 py-1 shrink-0">
                      {applicantShortlists.length}/4 shortlisted
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {applicantShortlists.map((shortlist) => (
                      <div key={shortlist.id} className={`border p-3 ${shortlist.status === "matched" ? "border-black bg-[#c6ff3d]/25" : "border-black/20"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] uppercase tracking-widest text-black/40">possible partner</span>
                              <strong className="text-sm uppercase">{shortlist.partner.name}</strong>
                              <span className="text-[9px] uppercase tracking-widest border border-black/30 px-1.5 py-0.5">
                                {shortlist.status}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest text-black/50">
                              {shortlist.partner.city}{shortlist.partner.destination ? ` → ${shortlist.partner.destination}` : ""}
                              {shortlist.partner.email ? ` · ${shortlist.partner.email}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => void contactPerson(shortlist, "applicant")}
                              disabled={saving === `contact-${shortlist.id}-applicant`}
                              className="text-[9px] uppercase tracking-widest border border-black/30 px-2 py-1 hover:bg-black hover:text-[#c6ff3d] disabled:opacity-40"
                            >
                              {shortlist.applicantContactedAt ? "contacted applicant" : "contact applicant"}
                            </button>
                            <button
                              onClick={() => void contactPerson(shortlist, "partner")}
                              disabled={saving === `contact-${shortlist.id}-partner`}
                              className="text-[9px] uppercase tracking-widest border border-black/30 px-2 py-1 hover:bg-black hover:text-[#c6ff3d] disabled:opacity-40"
                            >
                              {shortlist.partnerContactedAt ? "contacted partner" : "contact partner"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          <textarea
                            defaultValue={shortlist.notes ?? ""}
                            aria-label={`private notes for ${shortlist.partner.name}`}
                            placeholder="private matching notes…"
                            rows={2}
                            className="w-full border-b border-black/20 bg-transparent py-1.5 text-xs focus:outline-none focus:border-black"
                            onBlur={(event) => {
                              const nextNotes = event.currentTarget.value.trim() || null;
                              if (nextNotes !== shortlist.notes) void updateShortlist(shortlist, { notes: nextNotes });
                            }}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[9px] uppercase tracking-widest text-black/35">
                              {shortlist.applicantContactedAt ? "applicant outreach recorded" : "applicant not contacted"}
                              {" · "}
                              {shortlist.partnerContactedAt ? "partner outreach recorded" : "partner not contacted"}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => void updateShortlist(shortlist, { status: shortlist.status === "matched" ? "shortlisted" : "matched" })}
                                disabled={saving === `update-${shortlist.id}`}
                                className="text-[9px] uppercase tracking-widest font-bold border border-black px-2 py-1 hover:bg-black hover:text-[#c6ff3d] disabled:opacity-40"
                              >
                                {saving === `update-${shortlist.id}` ? "…" : shortlist.status === "matched" ? "unmatch" : "mark matched"}
                              </button>
                              <button
                                onClick={() => void removeShortlist(shortlist)}
                                disabled={saving === `remove-${shortlist.id}`}
                                className="text-[9px] uppercase tracking-widest text-black/40 border border-black/10 px-2 py-1 hover:text-red-600 hover:border-red-300 disabled:opacity-40"
                              >
                                remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {applicantShortlists.length < 4 && choices.length > 0 && (
                      <div className="border-t border-black/10 pt-3 flex flex-col gap-2">
                        <div className="text-[9px] uppercase tracking-widest text-black/40">add possible partner</div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedPartner[applicant.id] ?? ""}
                            onChange={(event) => setSelectedPartner((current) => ({ ...current, [applicant.id]: event.target.value }))}
                            className="flex-1 border-b border-black/30 bg-transparent py-2 text-xs focus:outline-none focus:border-black"
                          >
                            <option value="">choose an applicant…</option>
                            {choices.map((choice) => (
                              <option key={choice.id} value={choice.id}>
                                {choice.name} · {choice.city}
                              </option>
                            ))}
                          </select>
                          <input
                            value={newNotes[applicant.id] ?? ""}
                            onChange={(event) => setNewNotes((current) => ({ ...current, [applicant.id]: event.target.value }))}
                            placeholder="private note (optional)"
                            className="flex-1 border-b border-black/30 bg-transparent py-2 text-xs focus:outline-none focus:border-black"
                          />
                          <button
                            onClick={() => void addCandidate(applicant)}
                            disabled={saving === `add-${applicant.id}`}
                            className="bg-black text-[#c6ff3d] border-2 border-black px-3 py-2 text-[9px] uppercase tracking-widest font-bold hover:bg-[#c6ff3d] hover:text-black disabled:opacity-40"
                          >
                            {saving === `add-${applicant.id}` ? "…" : "shortlist"}
                          </button>
                        </div>
                      </div>
                    )}
                    {applicantShortlists.length >= 4 && (
                      <div className="text-[9px] uppercase tracking-widest text-black/35">shortlist limit reached · remove one to consider another partner</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
