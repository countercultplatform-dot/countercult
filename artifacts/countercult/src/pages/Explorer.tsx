import { lazy, Suspense, useState, useMemo, useEffect, useRef, Component } from "react";
import { normalizeEntryUrl, normalizeProfileUrl, cleanLinks } from "@/utils/normalizeProfileUrl";
import type { ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OPENSTREETMAP_ATTRIBUTION, OPENSTREETMAP_TILE_URL } from "@/lib/mapTiles";
import { ArrowRight, Building2, Handshake, Palette, Plus } from "lucide-react";
import { Marquee } from "@/components/Marquee";
import { ExchangeAnnouncementLink } from "@/components/GlobalExchangeAnnouncement";
import { CommunityVoicesStrip } from "@/components/CommunityVoicesStrip";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";
import { getAdditionalBaseCities, matchesBaseCitySearch } from "@/lib/entryLocations";
import { PROFILE_TAG_SUGGESTIONS, addProfileTags, parseProfileTags, toggleProfileTag } from "@/lib/profileTags";
import {
  getSignupAttributionDraft,
  getSignupAttributionFields,
  restoreSignupAttribution,
  SIGNUP_DISCOVERY_SOURCES,
} from "@/lib/signup-attribution";

import { toast } from "sonner";
import { useIsMobile as useMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "wouter";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta } from "@/lib/seo";
import {
  getListEntriesQueryKey,
  getListEntryPinsQueryKey,
  getListPublicArtistCardsQueryKey,
  getGetEntryQueryKey,
  useListEntryPins,
  useListEntries,
  useListPublicArtistCards,
  useGetEntry,
  useRegisterAccount,
  validateSignupLocation,
  type EntryPin,
  type EntrySummary,
  type EntryKind,
} from "@workspace/api-client-react";
import {
  OFFERING_CHOICES,
  OPEN_TO_CHOICES,
  getPublicOpenTo,
  isOfferingChoice,
  normalizeOfferingChoice,
} from "@/data/profileChoices";
import { useServerValidatedSession } from "@/hooks/useServerValidatedSession";

const Globe = lazy(() => import("react-globe.gl"));
const preloadEntryDetail = () => { void import("@/pages/EntryDetail"); };

const KIND_GLYPH: Record<string, string> = {
  artist: "◉",
  collective: "◈",
  space: "▣",
  artifact: "◬",
};

// Scene/vibe tags shown as chips on the mobile web view - mirrors the native app
const MOBILE_SCENE_TAGS = [
  "artist-run", "independent music", "local makers", "living traditions",
  "gallery", "studio", "collective", "venue",
  "nightlife", "experimental", "rave", "residency",
];

const MAX_PROFILE_PHOTO_BYTES = 4 * 1024 * 1024;
const PROFILE_PHOTO_COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;
const MAX_PROFILE_PHOTO_DIMENSION = 1600;

async function prepareProfilePhoto(file: File): Promise<File> {
  if (file.size <= PROFILE_PHOTO_COMPRESS_THRESHOLD) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("could not read image"));
      element.src = objectUrl;
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, MAX_PROFILE_PHOTO_DIMENSION / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "profile-photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isSingleHttpWorkLink(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate) || (candidate.match(/https?:\/\//gi)?.length ?? 0) !== 1) {
    return false;
  }
  try {
    const parsed = new URL(candidate);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

const PLATFORM_SHORT: Record<string, string> = {
  instagram: "ig",
  bandcamp: "bc",
  soundcloud: "sc",
  spotify: "spot",
  "resident advisor": "ra",
  ra: "ra",
  youtube: "yt",
  facebook: "fb",
  twitter: "tw",
  x: "x",
  discogs: "discogs",
  mixcloud: "mix",
  beatport: "beat",
  vimeo: "vimeo",
  tiktok: "tiktok",
  substack: "sub",
  "events-ra": "ra events",
  "events-dice": "dice",
  "events-eventbrite": "eventbrite",
  shopify: "shop",
  etsy: "etsy",
  bigcartel: "bigcartel",
  website: "web",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div style="width:36px;height:36px;background:#c6ff3d;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-family:monospace;font-weight:700;font-size:12px;color:#000;box-shadow:3px 3px 0 #000;">${count}</div>`,
    className: "",
    iconSize: L.point(36, 36, true),
  });
}

function createPinIcon(kind: EntryKind, isActive: boolean) {
  const fill = isActive ? "#c6ff3d" : "#000";
  const stroke = isActive ? "#000" : "#fff";
  const sz = 20;

  let svgShape = "";
  if (kind === "artist") {
    svgShape = `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
      <circle cx="12" cy="12" r="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    </svg>`;
  } else if (kind === "space") {
    svgShape = `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
      <rect x="3" y="3" width="18" height="18" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    </svg>`;
  } else {
    svgShape = `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
      <polygon points="12,3 22,21 2,21" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    </svg>`;
  }

  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px">${svgShape}</div>`,
    className: "custom-pin",
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -sz / 2],
  });
}


function MapController({ center, zoom, useCurrentZoom }: { center: [number, number] | null; zoom: number; useCurrentZoom?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const z = useCurrentZoom ? Math.max(map.getZoom(), zoom) : zoom;
      map.setView(center, z, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, useCurrentZoom, map]);
  return null;
}

function PinDropHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── WebGL error boundary ──
class GlobeErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// ── Globe clustering ──
type GlobePoint = {
  lat: number;
  lng: number;
  count: number;
  pins: EnrichedPin[];
};

function clusterGlobePins(pins: EnrichedPin[], radiusDeg: number): GlobePoint[] {
  const buckets = new Map<string, EnrichedPin[]>();
  const cellKey = (lat: number, lng: number) =>
    `${Math.floor(lat / radiusDeg)}:${Math.floor(lng / radiusDeg)}`;

  for (const pin of pins) {
    if (pin.lat == null || pin.lng == null) continue;
    const key = cellKey(pin.lat, pin.lng);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(pin);
    else buckets.set(key, [pin]);
  }

  const used = new Set<number>();
  const result: GlobePoint[] = [];
  for (const pin of pins) {
    if (pin.lat == null || pin.lng == null) continue;
    if (used.has(pin.id)) continue;
    used.add(pin.id);
    const group: EnrichedPin[] = [pin];
    const latCell = Math.floor(pin.lat / radiusDeg);
    const lngCell = Math.floor(pin.lng / radiusDeg);

    for (let latOffset = -1; latOffset <= 1; latOffset += 1) {
      for (let lngOffset = -1; lngOffset <= 1; lngOffset += 1) {
        const candidates = buckets.get(`${latCell + latOffset}:${lngCell + lngOffset}`) ?? [];
        for (const other of candidates) {
          if (used.has(other.id)) continue;
          if (
            Math.abs(other.lat! - pin.lat) < radiusDeg &&
            Math.abs(other.lng! - pin.lng) < radiusDeg
          ) {
            used.add(other.id);
            group.push(other);
          }
        }
      }
    }
    const lat = group.reduce((s, p) => s + p.lat!, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng!, 0) / group.length;
    result.push({ lat, lng, count: group.length, pins: group });
  }
  return result;
}

// ── 3D Animated Globe ──
function GlobeView({
  pins,
  onPinSelect,
  onClusterSelect,
  activeId,
  onFallback,
}: {
  pins: EnrichedPin[];
  onPinSelect: (pin: EnrichedPin) => void;
  onClusterSelect: (cluster: GlobePoint) => void;
  activeId: number | null;
  onFallback: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeEl = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [webglOk] = useState(() => checkWebGL());
  const [altitude, setAltitude] = useState(2.5);
  const [globeReady, setGlobeReady] = useState(false);

  // Sync altitude from globe camera so clusters recompute on user zoom/drag
  useEffect(() => {
    const id = setInterval(() => {
      if (globeEl.current?.pointOfView) {
        const pov = globeEl.current.pointOfView() as { altitude?: number };
        const a = pov?.altitude ?? 2.5;
        setAltitude((prev) => Math.abs(prev - a) > 0.05 ? a : prev);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!webglOk) { onFallback(); return; }

    const updateSize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setSize({ w: Math.round(width), h: Math.round(height) });
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const obs = new ResizeObserver(updateSize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglOk]);

  useEffect(() => {
    if (globeEl.current && size.w > 0) {
      const ctrl = globeEl.current.controls();
      ctrl.autoRotate = true;
      ctrl.autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, [size]);

  // Cluster radius shrinks as we zoom in (altitude decreases)
  const clusterRadius = Math.max(1.5, altitude * 7);
  const validPins = pins.filter((p) => p.lat != null && p.lng != null);
  const globePoints = useMemo(
    () => clusterGlobePins(validPins, clusterRadius),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins, clusterRadius]
  );

  if (!webglOk) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#a5f6fc] relative"
      onMouseEnter={() => { if (globeEl.current) globeEl.current.controls().autoRotate = false; }}
      onMouseLeave={() => { if (globeEl.current) globeEl.current.controls().autoRotate = true; }}
    >
      {/* Loading overlay - vanishes once globe texture is ready */}
      {!globeReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#a5f6fc]" style={{ pointerEvents: "none" }}>
          <img src="/cult-rat.gif" alt="" aria-hidden="true" title="why is there a rat? we also dont know." style={{ width: 90, filter: "invert(1)", mixBlendMode: "screen", opacity: 0.85 }} />
          <span className="mt-4 text-[#c6ff3d] font-mono text-[9px] uppercase tracking-widest opacity-50">loading the underground…</span>
        </div>
      )}
      <GlobeErrorBoundary onError={onFallback}>
        <Suspense fallback={null}>
          <Globe
            ref={globeEl}
            width={size.w}
            height={size.h}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor="#a5f6fc"
            showGraticules={false}
            atmosphereColor="#222"
            atmosphereAltitude={0.1}
            pointsData={globePoints}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pointLat={(d: any) => (d as GlobePoint).lat}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pointLng={(d: any) => (d as GlobePoint).lng}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pointColor={(d: any) => {
              const p = d as GlobePoint;
              if (p.count > 1) return "#c6ff3d";
              return activeId === p.pins[0]?.id ? "#ffffff" : "#c6ff3d";
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pointRadius={(d: any) => (d as GlobePoint).count > 1 ? 1.1 : 0.7}
            pointAltitude={0.01}
            onGlobeReady={() => setGlobeReady(true)}
            enablePointerInteraction={true}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pointLabel={(d: any) => {
              const p = d as GlobePoint;
              if (p.count > 1) {
                return `<div style="background:#c6ff3d;color:#000;padding:3px 10px;font-family:monospace;font-weight:700;font-size:12px;border:2px solid #000;white-space:nowrap">${p.count} entries - click to zoom</div>`;
              }
              const pin = p.pins[0];
              return `<div style="background:#000;color:#c6ff3d;padding:3px 8px;font-family:monospace;font-size:10px;border:1px solid #c6ff3d;white-space:nowrap">${pin?.name || pin?.kind || ""}</div>`;
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPointClick={(d: any) => {
              const p = d as GlobePoint;
              if (p.count > 1) {
                globeEl.current?.pointOfView({ lat: p.lat, lng: p.lng, altitude: 0.8 }, 900);
                setTimeout(() => onClusterSelect(p), 950);
              } else {
                onPinSelect(p.pins[0]);
              }
            }}
            onPointHover={(d: any) => {
              // keep hover enabled so raycasting stays active for onPointClick
              void d;
            }}
            // Fallback: clicking anywhere on the globe surface finds the nearest pin
            // This is more reliable than pure 3D raycasting on small point cylinders
            onGlobeClick={({ lat, lng }: { lat: number; lng: number }) => {
              if (!globePoints.length) return;
              // Threshold scales with altitude - wider when zoomed out
              const threshold = Math.max(3, altitude * 3);
              let nearest: GlobePoint | null = null;
              let minDist = threshold;
              for (const gp of globePoints) {
                const dlat = gp.lat - lat;
                const dlng = gp.lng - lng;
                const dist = Math.sqrt(dlat * dlat + dlng * dlng);
                if (dist < minDist) { minDist = dist; nearest = gp; }
              }
              if (!nearest) return;
              if (nearest.count > 1) {
                globeEl.current?.pointOfView({ lat: nearest.lat, lng: nearest.lng, altitude: 0.8 }, 900);
                setTimeout(() => onClusterSelect(nearest!), 950);
              } else {
                onPinSelect(nearest.pins[0]);
              }
            }}
          />
        </Suspense>
      </GlobeErrorBoundary>
    </div>
  );
}

// ── Sidebar entry list ──
function ScrollingTicker({
  entries,
  onCardClick,
  activeId,
  loading,
}: {
  entries: EntrySummary[];
  onCardClick: (entry: EntrySummary) => void;
  activeId: number | null;
  loading: boolean;
}) {
  if (!entries.length)
    return (
      <div className="flex flex-col items-center gap-2 p-5 text-center font-mono text-[10px] uppercase tracking-widest text-black/35">
        <img src="/cult-rat.gif" alt="" aria-hidden="true" className="h-10 w-auto opacity-60" />
        <span>{loading ? "loading public profiles…" : "no entries match this view"}</span>
      </div>
    );

  return (
    <div className="overflow-y-auto h-full">
      <div className="flex flex-col">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onCardClick(entry)}
            className={`w-full text-left px-3 py-2.5 border-b border-black/5 hover:bg-black/5 transition-colors text-black flex items-center gap-2 ${
              activeId === entry.id ? "bg-[#c6ff3d]/30" : ""
            }`}
          >
            <div className="w-8 h-8 shrink-0 bg-black/5 flex items-center justify-center text-[11px] text-black/35">
              {KIND_GLYPH[entry.kind as EntryKind] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[10px] uppercase tracking-wide truncate font-mono">
                {entry.name}
              </div>
              <div className="text-[9px] text-black/50 truncate font-sans">
                {entry.city}, {entry.country}
              </div>
              {getAdditionalBaseCities(entry).length > 0 && (
                <div className="text-[8px] text-black/40 truncate font-sans">
                  also based in {getAdditionalBaseCities(entry).join(" · ")}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type AddEntryStep = "closed";
type EnrichedPin = EntryPin & {
  name: string;
  city: string;
  country: string;
  tags: string[];
  heroPhoto: string | null;
  isProfilePreview: boolean;
};

type SignupDraftPayload = {
  screen: "identity" | "profile" | "details";
  kind: "artist" | "space";
  name: string;
  socialHandle: string;
  curatedBy: string;
  locationText: string;
  countryText: string;
  basedInInput: string;
  artistTypeInput: string;
  customProfileTagInput?: string;
  ruralSelected: boolean;
  shareChoices: string[];
  lookingFor: string[];
  openTo: string[];
  offerings: string;
  offeringDetails: string;
  shareOffer: string;
  spaceAccess: "" | "public" | "appointment_only" | "community_protected";
  spaceOfferAvailable: boolean | null;
  spaceOfferTypes: string[];
  spaceOfferCategory: string;
  spaceOfferPricing: string;
  spaceOfferDetails: string;
  profileVisibility: "public" | "network";
  newsletterOptIn: boolean;
  exchangeDigestOptIn: boolean;
};

const SHARE_CHOICES = OFFERING_CHOICES;
const LOOKING_FOR_CHOICES = OPEN_TO_CHOICES;

export default function CultureExplorer() {
  const [, setLocation] = useLocation();
  const initialUrlParams = new URLSearchParams(window.location.search);
  const [returnToExchangeAfterAuth] = useState(() => initialUrlParams.get("from") === "exchange");
  const [initialJoinPath] = useState<"member" | "partner">(
    initialUrlParams.get("partner") === "1" ? "partner" : "member",
  );
  const [search, setSearch] = useState(initialUrlParams.get("q") ?? "");
  const [ruralOnly, setRuralOnly] = useState(initialUrlParams.get("region") === "rural");
  // null = show all; set to a kind = exclusive filter
  const [activeFilter, setActiveFilter] = useState<EntryKind | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addEntryStep, setAddEntryStep] = useState<AddEntryStep>("closed"); // kept for legacy compat
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapFlyZoom, setMapFlyZoom] = useState(6);
  const [mapUseCurrentZoom, setMapUseCurrentZoom] = useState(false);

  useEffect(() => {
    const title = "Offbeat places, local culture and independent scenes | Countercult";
    const description =
      "Find artists, spaces, scenes, local practices and cultural places beyond the usual tourist route, from cities and towns to rural places and regions.";
    const canonicalUrl = `${SEO_ORIGIN}/explore`;
    document.title = title;
    setSeoMeta("name", "description", description);
    setSeoMeta("name", "robots", "index, follow");
    setSeoMeta("property", "og:title", title);
    setSeoMeta("property", "og:description", description);
    setSeoMeta("property", "og:url", canonicalUrl);
    setSeoMeta("property", "og:type", "website");
    setSeoMeta("name", "twitter:title", title);
    setSeoMeta("name", "twitter:description", description);
    setCanonical(canonicalUrl);
    const script = setJsonLd("countercult-explore-jsonld", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonicalUrl}#page`,
      name: title,
      description,
      url: canonicalUrl,
      isPartOf: { "@id": `${SEO_ORIGIN}/#website` },
      about: {
        "@type": "Thing",
        name: "offbeat cultural discovery",
        description: "Independent spaces, artists, scenes, local practices, and cultural places.",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${canonicalUrl}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
    return () => script.remove();
  }, []);
  const isMobile = useMobile();
  const [mobileShowMap, setMobileShowMap] = useState(false);
  const [showGlobe, setShowGlobe] = useState(() => checkWebGL());
  const [globeCard, setGlobeCard] = useState<EnrichedPin | null>(null);
  const [globeCluster, setGlobeCluster] = useState<GlobePoint | null>(null);
  const [shuffleSeed] = useState(() => (Date.now() % 999983) + 1);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<number | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinIntent, setJoinIntent] = useState<"network" | "exchange">("network");
  const { session, status: serverAuthStatus, isAuthenticated } = useServerValidatedSession();
  const isApprovedNetworkMember = isAuthenticated
    && session?.isApproved === true
    && session.accountRole !== "partner_poster";
  const requestOptions = isApprovedNetworkMember && session
    ? { headers: { Authorization: `Bearer ${session.token}` } }
    : undefined;
  const audienceKey = isApprovedNetworkMember ? "approved-network" : "public";
  const referralCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;
  const [resumeToken] = useState(() => initialUrlParams.get("resume") ?? undefined);

  // ── Pledge triggers ──────────────────────────────────────────────
  const profileClickCount = useRef(0);
  const pledgeFired = useRef(false);
  const countProfileClick = () => {
    if (pledgeFired.current || sessionStorage.getItem("cc_pledge_done")) return;
    profileClickCount.current += 1;
    if (profileClickCount.current >= 3) {
      pledgeFired.current = true;
      window.dispatchEvent(new CustomEvent("cc:show-pledge"));
    }
  };
  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem("cc_hint_dismissed"); } catch { return false; }
  });
  const dismissHint = () => { setShowHint(false); try { localStorage.setItem("cc_hint_dismissed", "1"); } catch {} };

  const handleSignOut = () => {
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
  };

  // Handle cross-page Explorer actions and URL parameters such as /explore?action=submit.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const qParam = params.get("q");
    if (qParam) {
      setSearch(qParam);
      window.history.replaceState({}, "", referralCode ? `/explore?ref=${encodeURIComponent(referralCode)}` : "/explore");
    }
    if (action === "submit") {
      setJoinIntent("network");
      setJoinOpen(true);
      window.history.replaceState({}, "", referralCode ? `/explore?ref=${encodeURIComponent(referralCode)}` : "/explore");
    } else if (action === "signin") {
      setSignInOpen(true);
      window.history.replaceState({}, "", referralCode ? `/explore?ref=${encodeURIComponent(referralCode)}` : "/explore");
    } else if (action === "search") {
      window.dispatchEvent(new CustomEvent("cc:open-site-search", {
        detail: { query: qParam ?? "" },
      }));
      window.history.replaceState({}, "", referralCode ? `/explore?ref=${encodeURIComponent(referralCode)}` : "/explore");
    } else if (action === "join" || params.get("join") === "1") {
      const intent = params.get("intent");
      setJoinIntent(
        intent === "exchange" || intent === "looking" || intent === "sharing"
          ? "exchange"
          : "network",
      );
      setJoinOpen(true);
      window.history.replaceState({}, "", referralCode ? `/explore?ref=${encodeURIComponent(referralCode)}` : "/explore");
    }

    const onOpenSubmit = () => {
      setJoinIntent("network");
      setJoinOpen(true);
    };
    const onOpenSignIn = () => setSignInOpen(true);
    const onOpenJoin = () => {
      setJoinIntent("network");
      setJoinOpen(true);
    };
    window.addEventListener("cc:open-submit", onOpenSubmit);
    window.addEventListener("cc:open-signin", onOpenSignIn);
    window.addEventListener("cc:open-join", onOpenJoin);
    return () => {
      window.removeEventListener("cc:open-submit", onOpenSubmit);
      window.removeEventListener("cc:open-signin", onOpenSignIn);
      window.removeEventListener("cc:open-join", onOpenJoin);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: pinResponse, isLoading: pinsLoading } = useListEntryPins({
    request: requestOptions,
    query: {
      queryKey: [...getListEntryPinsQueryKey(), audienceKey],
      enabled: serverAuthStatus !== "checking",
    },
  });
  const pins = Array.isArray(pinResponse) ? pinResponse : [];
  const { data: summaryResponse, isLoading: listLoading } = useListEntries({
    request: requestOptions,
    query: {
      queryKey: [...getListEntriesQueryKey(), audienceKey],
      enabled: serverAuthStatus !== "checking",
    },
  });
  const summaries = Array.isArray(summaryResponse) ? summaryResponse : [];
  const { data: publicArtistCardResponse = [], isLoading: publicArtistCardsLoading } = useListPublicArtistCards({
    query: {
      queryKey: [...getListPublicArtistCardsQueryKey(), audienceKey],
      enabled: serverAuthStatus !== "checking" && !isApprovedNetworkMember,
    },
  });
  const publicArtistCards = Array.isArray(publicArtistCardResponse) ? publicArtistCardResponse : [];
  const summaryEntries = useMemo<EntrySummary[]>(() => {
    if (isApprovedNetworkMember) return summaries;
    const publicArtistEntries: EntrySummary[] = publicArtistCards.map((artist) => ({
      id: artist.id,
      name: artist.name,
      kind: "artist",
      city: artist.city,
      country: artist.country,
      tags: artist.tags,
      basedIn: [],
      isClaimed: true,
      isCommunitySubmitted: false,
      hasContactEmail: false,
      heroPhoto: artist.heroPhoto,
    }));
    return [
      ...summaries.filter((entry) => entry.kind !== "artist"),
      ...publicArtistEntries,
    ];
  }, [summaries, publicArtistCards, isApprovedNetworkMember]);
  const sidebarListLoading = listLoading || (!isApprovedNetworkMember && publicArtistCardsLoading);

  const ruralEntryIds = useMemo(
    () => new Set(
      summaryEntries
        .filter((entry) => entry.tags.some((tag) => tag.trim().toLowerCase() === "rural"))
        .map((entry) => entry.id),
    ),
    [summaryEntries],
  );

  const filteredPins = useMemo(
    () => pins.filter((p) =>
      (activeFilter === null || p.kind === activeFilter || (p as any).secondaryKind === activeFilter) &&
      (!ruralOnly || ruralEntryIds.has(p.id) || p.tags?.some((tag) => tag.trim().toLowerCase() === "rural")) &&
      p.lat != null &&
      p.lng != null
    ),
    [pins, activeFilter, ruralOnly, ruralEntryIds]
  );

  const filteredSummaries = useMemo(() => {
    const filtered = summaryEntries.filter((e) => {
      if (activeFilter !== null && e.kind !== activeFilter && (e as any).secondaryKind !== activeFilter) return false;
      if (ruralOnly && !e.tags.some((tag) => tag.trim().toLowerCase() === "rural")) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          matchesBaseCitySearch(e, q) ||
          e.country.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          ((e as any).subcultures as string[] | undefined)?.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const ha = ((Math.sin(shuffleSeed * a.id + 1) * 43758.5453) % 1 + 1) % 1;
      const hb = ((Math.sin(shuffleSeed * b.id + 1) * 43758.5453) % 1 + 1) % 1;
      return ha - hb;
    });
  }, [summaryEntries, search, activeFilter, ruralOnly, shuffleSeed]);

  const handleFilterToggle = (kind: EntryKind) => {
    setActiveFilter((prev) => (prev === kind ? null : kind));
  };

  const openProfileSignIn = (entryId: number) => {
    setPendingProfileId(entryId);
    setSignInOpen(true);
  };

  const handleCardClick = (entry: EntrySummary) => {
    // Artist cards lead to the limited public preview; full details remain gated there.
    setLocation(`/entries/${entry.id}`);
  };

  const enrichedPins = useMemo<EnrichedPin[]>(() => {
    const summaryMap = new Map(summaries.map((s) => [s.id, s]));
    return filteredPins
      .filter((p) => p.lat != null && p.lng != null)
      .map((pin) => {
        const summary = summaryMap.get(pin.id);
        return {
          ...pin,
          name: pin.name ?? summary?.name ?? "Cultural entry",
          city: pin.city ?? summary?.city ?? "",
          country: pin.country ?? summary?.country ?? "",
          tags: pin.tags ?? summary?.tags ?? [],
          heroPhoto: pin.heroPhoto ?? summary?.heroPhoto ?? null,
          isProfilePreview: pin.isProfilePreview === true,
        };
      });
  }, [filteredPins, summaries]);

  const openAddEntry = () => {
    setJoinOpen(true);
  };

  return (
    <div className="w-screen h-screen h-[100dvh] overflow-hidden bg-white text-black font-sans lowercase selection:bg-[#c6ff3d] selection:text-black flex flex-col">
      <ExchangeAnnouncementLink location="/explore" placement="explore_page" />
      <CommunityVoicesStrip />

      {/* ═══ DESKTOP MASTHEAD STRIP ═══ */}
      <div className="hidden md:flex shrink-0 items-center justify-center bg-black px-4 py-3 border-b-2 border-black">
        <a href="/" className="font-mono font-bold clr-white hover-clr-lime uppercase tracking-[0.25em] text-xl leading-none transition-colors">countercult</a>
      </div>

      {/* ═══ DESKTOP: 3-column layout ═══ */}
      <div className="hidden md:flex flex-1 min-h-0">

        {/* Map/globe + results rail */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Map / Globe area */}
          <div className="flex-1 relative bg-[#a5f6fc] overflow-hidden">

            {/* First-time visitor hint */}
            {showHint && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[450] flex items-center gap-3 bg-black border-2 border-[#c6ff3d] px-4 py-3 shadow-lg whitespace-nowrap">
                <span className="text-[#c6ff3d] text-[10px] uppercase tracking-widest font-bold font-mono">tap any pin to explore</span>
                <button
                  onClick={dismissHint}
                  className="text-white/40 hover:text-[#c6ff3d] text-xs font-bold transition-colors"
                >
                  got it ✕
                </button>
              </div>
            )}

            <div className="absolute left-6 top-28 z-[350] max-w-[250px] border border-[#c6ff3d]/50 bg-black/85 p-4 shadow-[5px_5px_0_#c6ff3d] pointer-events-none">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d]">for the curious visitor</div>
              <p className="mt-3 font-mono text-xl font-black uppercase leading-[0.88] tracking-[-0.04em] text-white">
              find artists and cultural places.
              </p>
              <p className="mt-3 max-w-[210px] text-[11px] leading-relaxed text-white/60">
                Explore artists who choose a public profile, alongside the places and practices around them. {isApprovedNetworkMember
                  ? "Approved members can open full artist profiles."
                  : "Public cards show each artist's name, location, and selected interests. Full profiles are available to approved members. Joining is free for artists and small cultural spaces."}
              </p>
            </div>

            {/* Explore filters + map controls */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2">
              {(["artist", "space", "artifact"] as EntryKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleFilterToggle(kind)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full border-2 border-black text-[10px] uppercase tracking-wider font-bold transition-colors whitespace-nowrap bg-white text-black hover:bg-black hover:text-[#c6ff3d]"
                >
                  <span className="text-sm leading-none">{KIND_GLYPH[kind]}</span>
                  <span>{kind === "artist" ? "artists" : kind === "space" ? "spaces" : "artifacts"}</span>
                </button>
              ))}
              <button
                onClick={() => setRuralOnly((value) => !value)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-full border-2 border-black text-[10px] uppercase tracking-wider font-bold transition-colors whitespace-nowrap ${
                  ruralOnly ? "bg-[#c6ff3d] text-black" : "bg-white text-black hover:bg-black hover:text-[#c6ff3d]"
                }`}
              >
                {ruralOnly ? "✓ " : ""}rural
              </button>
              <button
                onClick={() => setShowGlobe((v) => !v)}
                title={showGlobe ? "switch to flat map" : "switch to 3D globe"}
                className="bg-black text-[#c6ff3d] border-2 border-black px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold rounded-full hover:bg-[#c6ff3d] hover:text-black transition-colors"
              >
                {showGlobe ? "⊞ map" : "⊕ globe"}
              </button>
            </div>

            {/* Globe or flat map */}
            {showGlobe ? (
              <GlobeView
                pins={enrichedPins}
                onPinSelect={(p) => { setGlobeCard(p); setActiveId(p.id); setGlobeCluster(null); }}
                onClusterSelect={(c) => { setGlobeCluster(c); setGlobeCard(null); }}
                activeId={activeId}
                onFallback={() => setShowGlobe(false)}
              />
            ) : (
              <MapContainer center={[30, 10]} zoom={2} className="cc-map-dark w-full h-full z-0" zoomControl={false}>
                <TileLayer
                  url={OPENSTREETMAP_TILE_URL}
                  attribution={OPENSTREETMAP_ATTRIBUTION}
                />
                <MapController center={mapCenter} zoom={mapFlyZoom} useCurrentZoom={mapUseCurrentZoom} />
                <MapKeyboardHandler />
                <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} spiderfyOnMaxZoom iconCreateFunction={createClusterIcon}>
                  {enrichedPins.map((pin) => (
                    <Marker
                      key={pin.id}
                      position={[pin.lat as number, pin.lng as number]}
                      icon={createPinIcon(pin.kind as EntryKind, activeId === pin.id)}
                      eventHandlers={{ click: () => {
                        setActiveId(pin.id);
                        trackEvent("public_profile_opened", { entry_kind: pin.kind as string, source: "map" });
                        countProfileClick();
                      } }}
                    >
                      <Popup className="brutalist-popup" closeButton={false} autoPan={false}><PinPopup pin={pin} onSignIn={() => openProfileSignIn(pin.id)} /></Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            )}
            {activeFilter === "artist" &&
              !pinsLoading &&
              !enrichedPins.some((pin) => pin.kind === "artist") && (
                <div
                  role="status"
                  className="absolute left-1/2 top-1/2 z-[405] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 border-2 border-[#c6ff3d] bg-black/95 p-5 text-white shadow-[5px_5px_0_#c6ff3d]"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d]">
                    no public artist pins are visible yet
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-white/70">
                    Public artist cards also appear in the list. Map pins appear when an artist has chosen a public profile and added a mappable location. Full profiles are available to approved network members.
                  </p>
                </div>
              )}
            {/* Globe - single pin detail panel */}
            {showGlobe && globeCard && !globeCluster && (
              <div className="absolute top-0 right-0 bottom-0 z-[403] w-[320px] bg-white border-l-2 border-black flex flex-col shadow-[-4px_0_0_#000] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black shrink-0">
                  <span className="font-mono font-bold text-[10px] uppercase tracking-widest text-black/40">voice</span>
                  <button onClick={() => setGlobeCard(null)} className="text-black/30 hover:text-black text-lg leading-none">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PinPopup pin={globeCard} onSignIn={() => openProfileSignIn(globeCard.id)} />
                </div>
              </div>
            )}

            {/* Globe - cluster list slide-in panel */}
            {showGlobe && globeCluster && (
              <div className="absolute top-0 right-0 bottom-0 z-[403] w-[280px] bg-white border-l-2 border-black flex flex-col shadow-[-4px_0_0_#000] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black shrink-0">
                  <div>
                    <div className="font-mono font-bold text-[11px] uppercase tracking-wider">
                      {globeCluster.pins[0]?.city || "this region"}
                    </div>
                    <div className="font-sans text-[10px] text-black/40 mt-0.5">
                      {globeCluster.pins.filter((p) => activeFilter === null || p.kind === activeFilter).length} entries
                    </div>
                  </div>
                  <button
                    onClick={() => setGlobeCluster(null)}
                    className="text-black/30 hover:text-black text-lg leading-none"
                  >✕</button>
                </div>
                {/* Entry list */}
                <div className="overflow-y-auto flex-1 divide-y divide-black/10">
                  {globeCluster.pins.filter((pin) => activeFilter === null || pin.kind === activeFilter).map((pin) => (
                    <button
                      type="button"
                      key={pin.id}
                      onClick={() => {
                        setGlobeCard(pin);
                        setActiveId(pin.id);
                        setGlobeCluster(null);
                        trackEvent("public_profile_opened", { entry_kind: pin.kind as string, source: "map_cluster" });
                        countProfileClick();
                      }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#c6ff3d] group transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-[11px] uppercase leading-tight group-hover:text-black">{pin.name || "untitled"}</div>
                        <div className="font-sans text-[10px] text-black/40 mt-0.5 group-hover:text-black/60">{pin.city}{pin.country ? `, ${pin.country}` : ""}</div>
                      </div>
                      <div className="font-sans text-[9px] uppercase text-black/30 group-hover:text-black/50 shrink-0 ml-2">
                        {pin.kind === "artist" ? "◉" : pin.kind === "space" ? "▣" : "◬"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-3 z-[400] text-[9px] text-white/20 font-mono pointer-events-none">
              © 2026 countercult creatives
            </div>
          </div>

        </div>

        {/* Right panel: scrolling entries (or static AI results) */}
        <div className="flex flex-col w-[220px] shrink-0 border-l border-black/20 bg-white">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-black/10 shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="border border-black bg-[#c6ff3d] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white"
            >
              add to the map
            </button>
            <div className="flex-1" />
            {session ? (
              <a href="/residency" className="font-mono text-[9px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] px-2 py-1 hover:bg-[#c6ff3d] hover:text-black transition-colors truncate max-w-[120px]">✓ {session.entryName || session.email || "member"}</a>
            ) : (
               <button onClick={() => setSignInOpen(true)} className="font-mono text-[10px] uppercase tracking-widest text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors whitespace-nowrap">sign in</button>
            )}
          </div>
          <div className="flex-1 overflow-hidden relative min-h-0">
            <ScrollingTicker
              entries={filteredSummaries}
              onCardClick={handleCardClick}
              activeId={activeId}
              loading={sidebarListLoading}
            />
          </div>
        </div>
      </div>

      {/* ═══ MOBILE LAYOUT ═══ */}
      {/* ═══ MOBILE - dark, matches native app aesthetic ═══ */}
      <div className="flex md:hidden flex-col flex-1 min-h-0" style={{ backgroundColor: '#0C0C14' }}>

        {/* ── Top header ── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#000000', borderBottom: '1px solid #1E1E2E' }}>
          <a href="/about" className="font-mono font-black text-[13px] uppercase" style={{ color: '#ffffff', letterSpacing: 3 }}>COUNTERCULT</a>
          <div className="flex items-center gap-4">
            <a href="/studios" onClick={() => trackEvent("studios_cta_clicked", { source_route: "/explore", placement: "header_studios" })} className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#6B6B85' }}>studios</a>
            <a href="/fund" className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#6B6B85' }}>fund</a>
            <a href="/news" className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#6B6B85' }}>news</a>
            {session ? (
              <button onClick={handleSignOut} className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#6B6B85' }}>sign out</button>
            ) : (
              <>
                 <button onClick={() => setSignInOpen(true)} className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border" style={{ color: '#c6ff3d', borderColor: '#c6ff3d' }}>sign in</button>
                  <button onClick={() => setJoinOpen(true)} className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: '#c6ff3d' }}>add to the map</button>
              </>
            )}
          </div>
        </div>

        {!isApprovedNetworkMember && !isAuthenticated && (
          <div className="shrink-0 px-4 py-2 font-mono text-[9px] leading-relaxed" style={{ color: '#a7a7bd', backgroundColor: '#10101a', borderBottom: '1px solid #1E1E2E' }}>
            Full artist profiles are available to approved network members. It is free for artists and small cultural spaces to join.
          </div>
        )}

        {!mobileShowMap ? (
          <>
            {/* Search-first discovery intro */}
            <div className="shrink-0 px-4 pt-5 pb-3" style={{ borderBottom: '1px solid #1E1E2E' }}>
               <div className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#c6ff3d' }}>for the curious visitor</div>
              <h1 className="mt-3 max-w-[18ch] font-mono font-black uppercase leading-[0.88] tracking-[-0.04em]" style={{ color: '#F5F3EF', fontSize: 28 }}>
                <span className="block">find local artists</span>
                <span className="block text-[#c6ff3d]">and underground culture.</span>
              </h1>
              <p className="mt-2 font-mono text-[10px] leading-relaxed" style={{ color: '#6B6B85' }}>
                search by place for artists, independent spaces, local scenes and cultural practices, beyond the top-ten list.
              </p>
            </div>

            {/* Scene / vibe chips */}
            <div className="shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #1E1E2E' }}>
              <div className="flex gap-2 px-4 py-2.5" style={{ width: 'max-content' }}>
                {MOBILE_SCENE_TAGS.map((tag) => {
                  const active = search.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => setSearch(active ? '' : tag)}
                      className="px-3.5 py-1.5 font-mono font-semibold text-[11px] shrink-0 transition-colors"
                      style={{
                        letterSpacing: '0.5px',
                        backgroundColor: active ? '#c6ff3d' : '#1A1A2E',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: active ? '#c6ff3d' : 'transparent',
                        color: active ? '#0C0C14' : '#F5F3EF',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kind filter chips */}
            <div className="shrink-0 flex gap-2 px-4 py-2.5 flex-wrap" style={{ borderBottom: '1px solid #1E1E2E' }}>
              {(["artist", "space", "artifact"] as EntryKind[]).map((k) => {
                const active = activeFilter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setActiveFilter(active ? null : k)}
                    className="px-3 py-1 font-mono font-bold text-[9px] uppercase transition-colors"
                    style={{
                      letterSpacing: '0.8px',
                      backgroundColor: active ? '#F5F3EF' : 'transparent',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: active ? '#F5F3EF' : '#2A2A3E',
                      color: active ? '#0C0C14' : '#6B6B85',
                    }}
                  >
                    {KIND_GLYPH[k]}{'  '}{k}s
                  </button>
                );
              })}
              <button
                onClick={() => setRuralOnly((value) => !value)}
                className="px-3 py-1 font-mono font-bold text-[9px] uppercase transition-colors"
                style={{
                  letterSpacing: '0.8px',
                  backgroundColor: ruralOnly ? '#c6ff3d' : 'transparent',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: ruralOnly ? '#c6ff3d' : '#2A2A3E',
                  color: ruralOnly ? '#0C0C14' : '#6B6B85',
                }}
              >
                {ruralOnly ? '✓ ' : ''}rural
              </button>
            </div>

            {/* Card list */}
            <div className="relative flex-1 min-h-0">
              <div className="h-full overflow-y-auto min-h-0 pb-14">
              <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid #1E1E2E' }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: '#6B6B85' }}>
                  {search ? `results for “${search}”` : 'public culture'}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: '#c6ff3d' }}>
                  {filteredSummaries.length} {filteredSummaries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              {filteredSummaries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
                  <>
                    <span className="text-3xl" style={{ color: '#2A2A3E' }}>◎</span>
                    <p className="font-mono text-xs uppercase tracking-widest font-bold" style={{ color: '#F5F3EF' }}>
                      {search ? `nothing matched "${search}"` : 'no entries yet'}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: '#6B6B85' }}>
                      {search ? 'try a different city or scene tag' : 'check back soon'}
                    </p>
                  </>
                </div>
              ) : (
                filteredSummaries.map((entry) => {
                  const location = [entry.city, entry.country].filter(Boolean).join(', ');
                  const additionalBases = getAdditionalBaseCities(entry);
                  const tags = (entry.tags ?? []).slice(0, 3);
                  return (
                    <Link
                      key={entry.id}
                      href={`/entries/${entry.id}`}
                      onMouseEnter={preloadEntryDetail}
                      onFocus={preloadEntryDetail}
                      className="flex flex-col px-5 py-3.5 no-underline"
                      style={{ borderBottom: '1px solid #1E1E2E', gap: 2 }}
                    >
                      <div className="flex items-center" style={{ gap: 6, marginBottom: 2 }}>
                        <span className="text-[12px]" style={{ color: '#c6ff3d', width: 16, textAlign: 'center', flexShrink: 0 }}>
                          {KIND_GLYPH[entry.kind] ?? '◉'}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase truncate" style={{ color: '#c6ff3d', letterSpacing: '1px', flex: 1 }}>
                          {location || '-'}
                        </span>
                        <span style={{ color: '#2A2A3E', fontSize: 14 }}>›</span>
                      </div>
                      <span className="font-mono font-extrabold uppercase truncate" style={{ color: '#F5F3EF', fontSize: 13, letterSpacing: '0.8px', paddingLeft: 22 }}>
                        {(entry.name ?? 'untitled').toUpperCase()}
                      </span>
                      {additionalBases.length > 0 && (
                        <span className="font-mono text-[9px] truncate" style={{ color: '#8A8AA0', letterSpacing: '0.3px', paddingLeft: 22 }}>
                          also based in {additionalBases.join(' · ')}
                        </span>
                      )}
                      {tags.length > 0 && (
                        <span className="font-mono text-[10px] truncate" style={{ color: '#6B6B85', letterSpacing: '0.3px', paddingLeft: 22 }}>
                          {tags.join(' · ')}
                        </span>
                      )}
                    </Link>
                  );
                })
              )}
                <div style={{ height: 16 }} />
              </div>
              <Link
                href="/submit"
                data-testid="explore-add-space-cta"
                className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 border-t px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest no-underline transition-colors hover:bg-[#c6ff3d] hover:text-black"
                style={{ borderColor: "#2A2A3E", color: "#c6ff3d", backgroundColor: "#10101a" }}
              >
                <span>know a spot? add it to the map.</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

          </>
        ) : (
          /* ── Map view ── */
          <div className="flex-1 relative bg-[#0a0a0a]">
            <MapContainer center={[30, 10]} zoom={2} className="cc-map-dark w-full h-full z-0" zoomControl={false}>
              <TileLayer
                url={OPENSTREETMAP_TILE_URL}
                attribution={OPENSTREETMAP_ATTRIBUTION}
              />
              <MapController center={mapCenter} zoom={mapFlyZoom} useCurrentZoom={mapUseCurrentZoom} />
              <MapKeyboardHandler />
              <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} spiderfyOnMaxZoom iconCreateFunction={createClusterIcon}>
                {enrichedPins.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat as number, pin.lng as number]}
                    icon={createPinIcon(pin.kind as EntryKind, activeId === pin.id)}
                    eventHandlers={{ click: () => {
                      setActiveId(pin.id);
                      trackEvent("public_profile_opened", { entry_kind: pin.kind as string, source: "map" });
                      countProfileClick();
                    } }}
                  >
                    <Popup className="brutalist-popup" closeButton={false}><PinPopup pin={pin} onSignIn={() => openProfileSignIn(pin.id)} /></Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[400]">
              <Marquee
                text="rural places and regions • this map collects artists, cultural spaces, and artifacts • joining is always free • keywords help discovery • free to join •"
                className="bg-[#c6ff3d] !text-black border-y-0 !py-1 text-xs"
                speed={80}
              />
            </div>
          </div>
        )}

        {/* ── Persistent bottom tab bar ── */}
        <div className="shrink-0 flex" style={{ borderTop: '1px solid #1E1E2E', backgroundColor: '#0C0C14' }}>
          <button
            onClick={() => setMobileShowMap(false)}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 font-mono font-bold uppercase transition-colors"
            style={{ fontSize: 9, letterSpacing: '1px', color: !mobileShowMap ? '#c6ff3d' : '#6B6B85' }}
          >
            <span style={{ fontSize: 16 }}>⊘</span>
            search
          </button>
          <button
            onClick={() => setMobileShowMap(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 font-mono font-bold uppercase transition-colors"
            style={{ fontSize: 9, letterSpacing: '1px', color: mobileShowMap ? '#c6ff3d' : '#6B6B85' }}
          >
            <span style={{ fontSize: 16 }}>⊕</span>
            map
          </button>
          <a
            href="/residency"
            className="flex-1 flex flex-col items-center gap-0.5 py-3 font-mono font-bold uppercase no-underline transition-colors"
            style={{ fontSize: 9, letterSpacing: '1px', color: '#6B6B85' }}
          >
            <span style={{ fontSize: 16 }}>⇄</span>
            swaps
          </a>
          <button
            onClick={() => openAddEntry()}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 font-mono font-bold uppercase transition-colors"
            style={{ fontSize: 9, letterSpacing: '1px', color: '#c6ff3d' }}
          >
            <span style={{ fontSize: 16 }}>+</span>
            join
          </button>
        </div>
      </div>

      {/* Sign-in dialog */}
      <Dialog open={signInOpen} onOpenChange={(open) => {
        setSignInOpen(open);
        if (!open) setPendingProfileId(null);
      }}>
        <DialogContent showClose={false} className="bg-[#F9F9F6] border-2 border-black text-black p-0 rounded-none max-w-sm w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto font-mono sm:rounded-none" aria-describedby={undefined}>
          <DialogTitle className="sr-only">sign in to countercult</DialogTitle>
          <SignInPanel
            onClose={() => { setSignInOpen(false); setPendingProfileId(null); }}
            onJoin={() => { setSignInOpen(false); setPendingProfileId(null); setJoinIntent("network"); setJoinOpen(true); }}
            onSignedIn={({ isApproved, accountRole, canPostPartnerOffers }) => {
              if (returnToExchangeAfterAuth && accountRole !== "partner_poster" && !canPostPartnerOffers) {
                window.location.href = "/residency?action=offer";
              } else if (canPostPartnerOffers || accountRole === "partner_poster") {
                window.location.href = "/partner-workspace?action=offer";
              } else if (isApproved && pendingProfileId !== null) {
                setLocation(`/entries/${pendingProfileId}`);
              } else {
                window.location.href = "/member-home";
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Join Cult - two-step self-registration */}
      <Dialog
        open={joinOpen}
        onOpenChange={(open) => {
          setJoinOpen(open);
          if (!open) setJoinIntent("network");
        }}
      >
          <DialogContent
            showClose={false}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent("cc:join-close-request"));
            }}
            onPointerDownOutside={(event) => {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent("cc:join-close-request"));
            }}
            className="bg-white border-2 border-[#c6ff3d] text-black p-0 rounded-none max-w-3xl w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-hidden font-sans shadow-[10px_10px_0_#c6ff3d] sm:rounded-none"
          >
          <DialogTitle className="sr-only">
            {joinIntent === "exchange"
              ? "Apply to join the free Countercult Network and Exchange"
              : initialJoinPath === "partner"
                ? "Create a Countercult partner account"
                : "Apply to join the curated Countercult Network"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {joinIntent === "exchange"
              ? "Free application, about two minutes. Public posts can be browsed without applying. Applications are reviewed manually; approval unlocks member-only Exchange listings and details."
              : initialJoinPath === "partner"
                ? "Create an account to share opportunities and resources with the Countercult network."
                : "Free application, about two minutes. Profiles are reviewed manually before appearing in the public Network; approval unlocks member-only Exchange access."}
          </DialogDescription>
          <JoinCultDrawer
            onClose={() => {
              setJoinOpen(false);
              setJoinIntent("network");
            }}
            referralCode={referralCode}
            resumeToken={resumeToken}
            initialJoinPath={initialJoinPath}
            intent={joinIntent}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ---------- Sign In Panel ----------
function SignInPanel({
  onClose,
  onJoin,
  onSignedIn,
}: {
  onClose: () => void;
  onJoin?: () => void;
  onSignedIn?: (result: { isApproved: boolean; accountRole: string; canPostPartnerOffers: boolean }) => void;
}) {
  const [view, setView] = useState<"login" | "forgot" | "sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setForgotError(data.error ?? (response.status === 429 ? "too many attempts - try again in 15 minutes" : "could not send reset link"));
        return;
      }
      setView("sent");
    } catch {
      setForgotError("something went wrong - try again");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await resp.json() as { ok?: boolean; token?: string; email?: string; isApproved?: boolean; canPostPartnerOffers?: boolean; accountRole?: string; displayName?: string | null; entryId?: number | null; expiresAt?: string; error?: string };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? (resp.status === 429 ? "too many attempts - try again in 15 minutes" : "invalid email or password"));
        return;
      }
      localStorage.setItem("cc_auth", JSON.stringify({
        token: data.token,
        email: data.email,
        entryId: data.entryId ?? null,
        entryName: data.displayName ?? "",
        accountRole: data.accountRole ?? "member",
        isApproved: data.isApproved ?? false,
        canPostPartnerOffers: data.canPostPartnerOffers ?? false,
        expiresAt: data.expiresAt,
      }));
      const signInResult = {
        isApproved: data.isApproved === true,
        accountRole: data.accountRole ?? "member",
        canPostPartnerOffers: data.canPostPartnerOffers === true,
      };
      if (onSignedIn) {
        onSignedIn(signInResult);
      } else {
        window.location.href = signInResult.canPostPartnerOffers || signInResult.accountRole === "partner_poster"
          ? "/partner-workspace?action=offer"
          : "/member-home";
      }
    } catch {
      setError("something went wrong - try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="p-4 border-b border-black/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/cult-rat.gif" alt="" aria-hidden="true" title="why is there a rat? we also dont know." style={{ height: 34, mixBlendMode: "multiply" }} />
          <h2 className="font-bold uppercase tracking-widest text-sm text-black">
            {view === "login" ? "sign in" : view === "forgot" ? "reset password" : "check your email"}
          </h2>
        </div>
         <button
           type="button"
           onClick={onClose}
           aria-label="close sign in"
           className="inline-flex min-h-11 min-w-11 items-center justify-center border-2 border-black/20 text-xl font-bold leading-none text-black/50 transition-colors hover:border-black hover:text-black"
         >
           ✕
         </button>
      </div>

      {/* ── Forgot: confirmation ── */}
      {view === "sent" && (
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[11px] text-black/70 leading-relaxed border border-black/10 bg-black/5 px-3 py-3">
            If that email has an account, we've sent a reset link. Check your inbox (and spam folder) - the link expires in 1 hour.
          </p>
          <button
            type="button"
            onClick={() => setView("login")}
            className="text-[10px] text-black/40 underline decoration-[#c6ff3d] hover:text-black transition-colors text-center"
          >
            ← back to sign in
          </button>
        </div>
      )}

      {/* ── Forgot: email form ── */}
      {view === "forgot" && (
        <form onSubmit={(e) => void handleForgot(e)} className="p-5 flex flex-col gap-4">
          <p className="text-[10px] text-black/50 leading-relaxed">
            Enter your email address and we'll send you a link to set a new password.
          </p>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">email address</label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
              placeholder="your@email.com"
              autoFocus
            />
          </div>
          {forgotError && (
            <div className="text-[10px] text-black/70 leading-relaxed border border-black/10 bg-black/5 px-3 py-2.5">
              {forgotError}
            </div>
          )}
          <button
            type="submit"
            disabled={forgotLoading}
            className="bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40"
          >
            {forgotLoading ? "sending…" : "send reset link →"}
          </button>
          <button
            type="button"
            onClick={() => setView("login")}
            className="text-[10px] text-black/40 underline decoration-[#c6ff3d] hover:text-black transition-colors text-center"
          >
            ← back to sign in
          </button>
        </form>
      )}

      {/* ── Login form ── */}
      {view === "login" && (
        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 flex flex-col gap-4">
          <div className="border border-black/20 bg-black/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60 leading-relaxed">
               sign in to manage your Countercult account and use the Exchange after approval. Your profile can be public or visible only to approved network members.
            </p>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
               autoComplete="username"
              className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
              placeholder="your@email.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
              placeholder="your password"
            />
          </div>

          {error && (
            <div className="text-[10px] text-black/70 leading-relaxed border border-black/10 bg-black/5 px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40"
          >
            {loading ? "signing in…" : "sign in →"}
          </button>

          <div className="border-2 border-black/15 bg-white p-3 text-center">
            <p className="text-[10px] leading-relaxed text-black/60">
              New here? Applications are free and reviewed by our team.
            </p>
            <button
              type="button"
              data-testid="button-signin-apply-join"
              onClick={() => { onClose(); onJoin?.(); }}
              className="mt-2 min-h-11 w-full border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#c6ff3d]"
            >
              Apply to join for free →
            </button>
          </div>

          <p className="text-[10px] text-black/40 text-center leading-relaxed border-t border-black/10 pt-3 mt-1">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="underline decoration-[#c6ff3d] hover:text-black transition-colors"
            >
              forgot your password?
            </button>
          </p>
        </form>
      )}

    </div>
  );
}

// ---------- Join Cult Drawer (two-step self-registration modal) ----------
function JoinCultDrawer({
  onClose,
  referralCode,
  initialJoinPath = "member",
  intent = "network",
  resumeToken,
}: {
  onClose: () => void;
  referralCode?: string;
  initialJoinPath?: "member" | "partner";
  intent?: "network" | "exchange";
  resumeToken?: string;
}) {
  const [mode, setMode] = useState<"join" | "artifact">("join");
  const [screen, setScreen] = useState<"category" | "space-path" | "identity" | "profile" | "details">("category");
  const [detailsStep, setDetailsStep] = useState<"practice" | "looking" | "disclaimer" | "submit">("looking");
  const [loading, setLoading] = useState(false);
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"photo" | "application" | null>(null);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [openToError, setOpenToError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const signupPanelRef = useRef<HTMLDivElement>(null);
  const registerAccountMutation = useRegisterAccount({
    request: { headers: { Authorization: "" } },
  });

  // Screen 1 - category
  const [kind, setKind] = useState<"artist" | "space">("artist");
  const [physicalSpaceConfirmed, setPhysicalSpaceConfirmed] = useState(false);
  const [joinPath, setJoinPath] = useState<"member" | "partner">(initialJoinPath);
  const [isCommunityRecommendation, setIsCommunityRecommendation] = useState(false);
  const [recommendationSubmitted, setRecommendationSubmitted] = useState(false);
  const [recommendationAttested, setRecommendationAttested] = useState(false);

  // Screen 2 - credentials + identity
  const [name, setName] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [curatedBy, setCuratedBy] = useState("");

  // Screen 3 - profile details
  const [locationText, setLocationText] = useState("");
  const [countryText, setCountryText] = useState("");
  const [basedInInput, setBasedInInput] = useState("");
  const [artistTypeInput, setArtistTypeInput] = useState("");
  const [customProfileTagInput, setCustomProfileTagInput] = useState("");
  const [blurb, setBlurb] = useState("");
  const [profileVisibility, setProfileVisibility] = useState<"public" | "network">("public");
  const [ruralSelected, setRuralSelected] = useState(false);
  const [heroPhotoFile, setHeroPhotoFile] = useState<File | null>(null);
  const [photoRightsConfirmed, setPhotoRightsConfirmed] = useState(false);
  const [heroPhotoPreview, setHeroPhotoPreview] = useState("");
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [shareChoices, setShareChoices] = useState<string[]>([]);
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [offerings, setOfferings] = useState("");
  const [shareOffer, setShareOffer] = useState("");
  const [legacyJoinReason, setLegacyJoinReason] = useState("");
  const [discoverySource, setDiscoverySource] = useState("");
  const [networkNextSteps, setNetworkNextSteps] = useState("");
  const [spaceOfferAvailable, setSpaceOfferAvailable] = useState<boolean | null>(null);
  const [spaceOfferTypes, setSpaceOfferTypes] = useState<string[]>([]);
  const [spaceOfferCategory, setSpaceOfferCategory] = useState("");
  const [spaceOfferPricing, setSpaceOfferPricing] = useState("");
  const [spaceOfferDetails, setSpaceOfferDetails] = useState("");
  const [organizationModel, setOrganizationModel] = useState("");
  const [intendedCommercialUse, setIntendedCommercialUse] = useState<boolean | null>(null);
  const [commercialUseDescription, setCommercialUseDescription] = useState("");
  const [consented, setConsented] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [officialEmailConfirmed, setOfficialEmailConfirmed] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [exchangeDigestOptIn, setExchangeDigestOptIn] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const isMemberApplication = joinPath === "member" && !isCommunityRecommendation;
  const memberConsentAccepted =
    adultConfirmed && dataProcessingConsent && officialEmailConfirmed && consented;
  const setMemberConsent = (accepted: boolean) => {
    setAdultConfirmed(accepted);
    setDataProcessingConsent(accepted);
    setOfficialEmailConfirmed(accepted);
    setConsented(accepted);
  };
  const resetVisibilityConsent = () => {
    if (isMemberApplication) setMemberConsent(false);
    else setConsented(false);
  };
  const requiredConfirmationsAccepted =
    isMemberApplication
      ? memberConsentAccepted
      : consented && dataProcessingConsent && adultConfirmed
        && (isCommunityRecommendation ? recommendationAttested : officialEmailConfirmed);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const profileTagValues = parseProfileTags(artistTypeInput);

  useEffect(() => {
    if (joinPath !== "member" || isCommunityRecommendation || kind !== "space" || screen !== "details") return;
    if (detailsStep === "looking") setDetailsStep("practice");
    if (detailsStep === "disclaimer") setDetailsStep("submit");
  }, [joinPath, isCommunityRecommendation, kind, screen, detailsStep]);

  useEffect(() => {
    if (signupPanelRef.current) signupPanelRef.current.scrollTop = 0;
  }, [mode, screen, detailsStep]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    if (!resumeToken) return;
    let cancelled = false;
    void fetch(`/api/signup-drafts/resume?token=${encodeURIComponent(resumeToken)}`)
      .then(async (response) => {
        const data = await response.json() as { email?: string; payload?: Record<string, unknown>; error?: string };
        if (!response.ok || !data.payload || cancelled) {
          if (!cancelled) setError(data.error ?? "saved application could not be loaded");
          return;
        }
        const payload = data.payload;
        setEmail(data.email ?? "");
        setKind(payload.kind === "space" ? "space" : "artist");
        setPhysicalSpaceConfirmed(Boolean(payload.physicalSpaceConfirmed));
        setName(String(payload.name ?? ""));
        setSocialHandle(String(payload.socialHandle ?? ""));
        setCuratedBy(String(payload.curatedBy ?? ""));
        setLocationText(String(payload.locationText ?? ""));
        setCountryText(String(payload.countryText ?? ""));
        setBasedInInput(String(payload.basedInInput ?? ""));
        // Older saved drafts called this field tagsInput.
        setArtistTypeInput(String(payload.artistTypeInput ?? payload.tagsInput ?? ""));
        setCustomProfileTagInput(String(payload.customProfileTagInput ?? ""));
        setBlurb(String(payload.blurb ?? ""));
        setProfileVisibility(payload.profileVisibility === "network" ? "network" : "public");
        setRuralSelected(Boolean(payload.ruralSelected));
        setShareChoices(Array.isArray(payload.shareChoices)
          ? [...new Set(
              payload.shareChoices
                .filter((item): item is string => typeof item === "string")
                .map(normalizeOfferingChoice)
                .filter(isOfferingChoice),
            )]
          : []);
        setOpenTo(Array.isArray(payload.lookingFor)
          ? payload.lookingFor.filter((item): item is string => typeof item === "string")
          : Array.isArray(payload.openTo)
            ? payload.openTo.filter((item): item is string => typeof item === "string")
            : []);
        setOfferings(String(payload.offerings ?? ""));
        setShareOffer(String(payload.shareOffer ?? ""));
        setLegacyJoinReason(String(payload.hopeToFind ?? ""));
        setDiscoverySource(String(payload.discoverySource ?? ""));
        restoreSignupAttribution(payload.signupAttribution);
        setNetworkNextSteps(String(payload.networkNextSteps ?? payload.shareOffer ?? ""));
        setSpaceOfferAvailable(typeof payload.spaceOfferAvailable === "boolean" ? payload.spaceOfferAvailable : null);
        setSpaceOfferTypes(Array.isArray(payload.spaceOfferTypes) ? payload.spaceOfferTypes.filter((item): item is string => typeof item === "string") : []);
        setSpaceOfferCategory(String(payload.spaceOfferCategory ?? ""));
        setSpaceOfferPricing(String(payload.spaceOfferPricing ?? ""));
        setSpaceOfferDetails(String(payload.spaceOfferDetails ?? ""));
        setExchangeDigestOptIn(Boolean(payload.exchangeDigestOptIn));
         setOrganizationModel(String(payload.organizationModel ?? ""));
         setIntendedCommercialUse(typeof payload.intendedCommercialUse === "boolean" ? payload.intendedCommercialUse : null);
         setCommercialUseDescription(String(payload.commercialUseDescription ?? ""));
        setJoinPath("member");
        setScreen(payload.screen === "details" ? "details" : payload.screen === "profile" ? "profile" : "identity");
        setDetailsStep(
          payload.detailsStep === "submit"
            ? "submit"
            : payload.detailsStep === "practice"
              ? "practice"
              : payload.detailsStep === "disclaimer"
                ? "disclaimer"
                : "looking",
        );
        setDraftNotice("saved application restored");
      })
      .catch(() => { if (!cancelled) setError("saved application could not be loaded"); });
    return () => { cancelled = true; };
  }, [resumeToken]);

  const draftPayload = () => ({
    screen: screen === "category" ? "identity" : screen,
    detailsStep,
    kind,
    physicalSpaceConfirmed,
    name,
    socialHandle,
    curatedBy,
    locationText,
    countryText,
    basedInInput,
    artistTypeInput,
    customProfileTagInput,
    blurb,
    profileVisibility,
    ruralSelected,
    shareChoices,
    lookingFor: openTo,
    openTo,
    offerings,
    shareOffer,
    hopeToFind: legacyJoinReason,
    discoverySource,
    signupAttribution: getSignupAttributionDraft(),
    networkNextSteps,
    spaceOfferAvailable,
    spaceOfferTypes,
    spaceOfferCategory,
    spaceOfferPricing,
    spaceOfferDetails,
     organizationModel,
     intendedCommercialUse,
     commercialUseDescription,
    exchangeDigestOptIn,
  });

  const saveDraftAndClose = async () => {
    if (mode !== "join" || joinPath !== "member" || isCommunityRecommendation) {
      onClose();
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setClosePromptOpen(false);
      setError("Add your email address before asking for a reminder.");
      return;
    }
    setSavingDraft(true);
    try {
      const response = await fetch("/api/signup-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), payload: draftPayload() }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "we could not save your application");
        return;
      }
      onClose();
    } catch {
      setError("we could not save your application");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCloseRequest = () => {
    if (mode === "join") setClosePromptOpen(true);
    else onClose();
  };

  useEffect(() => {
    const handleExternalCloseRequest = () => handleCloseRequest();
    window.addEventListener("cc:join-close-request", handleExternalCloseRequest);
    return () => window.removeEventListener("cc:join-close-request", handleExternalCloseRequest);
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoRightsConfirmed(false);
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setError("profile photo must be under 4MB - please choose a smaller file");
      e.target.value = "";
      return;
    }
    setError("");
    setCompressingPhoto(true);
    try {
      const preparedFile = await prepareProfilePhoto(file);
      setHeroPhotoFile(preparedFile);
      // Local preview only - never stored in DB
      const reader = new FileReader();
      reader.onload = (evt) => setHeroPhotoPreview((evt.target?.result as string) ?? "");
      reader.readAsDataURL(preparedFile);
    } catch {
      setError("could not read that image - please choose another photo");
      setHeroPhotoFile(null);
      setHeroPhotoPreview("");
    } finally {
      setCompressingPhoto(false);
      e.target.value = "";
    }
  };

  /** Upload file directly to GCS via presigned URL. Returns the serving path. */
  const uploadHeroPhoto = async (file: File): Promise<string> => {
    // Step 1: request presigned URL
    const urlRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!urlRes.ok) throw new Error("could not get upload URL");
    const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

    // Step 2: PUT file bytes directly to GCS
    const putRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error("photo upload failed");

    // Return the serving URL (objectPath already includes /objects/ prefix)
    return `/api/storage${objectPath}`;
  };

  const handleIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (kind === "space" && !physicalSpaceConfirmed && !isCommunityRecommendation) {
      setError("Choose whether you represent this space or are recommending it.");
      return;
    }
    if (!name.trim()) { setError(kind === "space" ? "space name is required" : "artist name is required"); return; }
    if (!socialHandle.trim()) { setError(kind === "space" ? "one link to this space's work or programme is required" : "one link to your work or practice is required"); return; }
    if (!isSingleHttpWorkLink(socialHandle)) {
      setError("Enter one valid website, portfolio, or social link beginning with https:// or http://.");
      return;
    }
    setScreen("profile");
  };

  const handlePartnerRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!name.trim()) { setError("business, funder, or corporate ally name is required"); return; }
    if (!email.trim() || !emailLooksValid) { setError("enter a valid email address"); return; }
    if (password.length < 8) { setError("password must be at least 8 characters"); return; }
    if (!officialEmailConfirmed) {
      setError("Please confirm that you are authorized to represent this organisation.");
      return;
    }
    if (!adultConfirmed) {
      setError("Please confirm that you are 18 or older.");
      return;
    }
    if (!dataProcessingConsent) {
      setError("Please consent to the collection and use of your application data as explained in the Privacy Notice.");
      return;
    }

    setLoading(true);
    setLoadingStage("application");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountRole: "partner_poster",
          email: email.trim(),
          officialEmailConfirmed,
          adultConfirmed,
          dataProcessingConsent,
          password,
          name: name.trim(),
          kind: "artist",
          discoverySource: discoverySource.trim(),
          ...getSignupAttributionFields(),
          openTo: [],
          offeringChoices: [],
          joinReason: "Partner account for sharing opportunities, resources, discounts, access, and space with artists.",
          newsletterOptIn,
          exchangeDigestOptIn,
          referralCode,
        }),
      });
      const data = await res.json() as {
        ok?: boolean; token?: string; email?: string; entryId?: number | null;
        isApproved?: boolean; accountRole?: string; expiresAt?: string; error?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        setError(data.error ?? "registration failed - please try again");
        return;
      }
      localStorage.setItem("cc_auth", JSON.stringify({
        token: data.token,
        email: data.email,
        entryId: null,
        entryName: name.trim(),
        accountRole: data.accountRole ?? "partner_poster",
        isApproved: false,
        expiresAt: data.expiresAt,
      }));
       window.location.href = "/partner-workspace?action=offer";
    } catch {
      setError("something went wrong - please try again");
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const handleProfileNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatingLocation) return;
    setError("");
    setLocationError("");
    if (!locationText.trim()) {
      setLocationError("City is required to position your map pin.");
      return;
    }
    if (!countryText.trim()) {
      setLocationError("Country is required so we can verify the right city.");
      return;
    }
    setValidatingLocation(true);
    void validateSignupLocation({
      city: locationText.trim(),
      country: countryText.trim(),
    })
      .then((location) => {
        setLocationText(location.city);
        setCountryText(location.country);
        setValidationAttempted(false);
      setDetailsStep(kind === "space" ? "practice" : "disclaimer");
        setScreen("details");
      })
      .catch((validationError: unknown) => {
        const responseData = (
          validationError as { data?: { error?: unknown } } | null
        )?.data;
        const message =
          typeof responseData?.error === "string"
            ? responseData.error
            : "We couldn't verify this location right now. Check the spelling and try again.";
        setLocationError(message);
      })
      .finally(() => setValidatingLocation(false));
  };

  const handleDetailsPracticeNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOpenToError("");
    setValidationAttempted(true);
    if (shareChoices.length === 0) {
      setOpenToError(kind === "space"
        ? "Choose at least one thing this space could share with the network."
        : "Choose at least one thing you can share with the network.");
      return;
    }
    setValidationAttempted(false);
    if (kind === "space") {
      setDetailsStep("submit");
      return;
    }
    setScreen("identity");
  };

  const handleDetailsLookingNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOpenToError("");
    setValidationAttempted(true);
    if (openTo.length === 0) {
      setOpenToError("Choose at least one thing you are looking for.");
      return;
    }
    setValidationAttempted(false);
    setDetailsStep("practice");
  };

  const getMissingProfileFields = () => {
    const missing: string[] = [];
    if (kind === "artist" && openTo.length === 0) missing.push("what you are looking for");
    if (shareChoices.length === 0) missing.push("what you can share with the network");
    if (!locationText.trim()) missing.push("city");
    if (!countryText.trim()) missing.push("country");
    if (blurb.trim().length < 50) missing.push("a short bio of at least a few lines");
    if (!isCommunityRecommendation) {
      if (!emailLooksValid) missing.push("valid official email address");
      if (password.length < 8) missing.push("password of at least 8 characters");
    }
    if (isMemberApplication) {
      if (!memberConsentAccepted) missing.push("required application and visibility confirmation");
    } else {
      if (!adultConfirmed) missing.push("18+ confirmation");
      if (!dataProcessingConsent) missing.push("consent to data collection and use");
      if (!consented) missing.push("profile visibility consent");
      if (isCommunityRecommendation && !recommendationAttested) missing.push("recommendation confirmation");
      if (!isCommunityRecommendation && !officialEmailConfirmed) missing.push("official email confirmation");
    }
    if (heroPhotoFile && !photoRightsConfirmed) missing.push("rights to share the selected photo");
    return missing;
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLocationError("");
    setOpenToError("");
    setValidationAttempted(true);
    const missingProfileFields = getMissingProfileFields();
    if (missingProfileFields.length > 0) {
      const firstMissing = missingProfileFields[0];
      if (firstMissing === "rights to share the selected photo") {
        setScreen("profile");
        setError("Confirm that you own the selected photo or have permission to share it.");
        return;
      }
      if (firstMissing === "city" || firstMissing === "country") {
        setScreen("profile");
        setLocationError(
          firstMissing === "city"
            ? "City is required to position your map pin."
            : "Country is required so we can verify the right city.",
        );
        return;
      }
      if (firstMissing === "what you can share with the network") {
        setScreen("details");
        setDetailsStep("practice");
        setValidationAttempted(true);
        setError("Complete your practice details before submitting.");
        setOpenToError(firstMissing === "what you can share with the network"
          ? kind === "space"
            ? "Choose at least one thing this space could share with the network."
            : "Choose at least one thing you can share with the network."
          : "");
        return;
      }
      if (firstMissing === "what you are looking for") {
        setScreen("details");
        setDetailsStep("looking");
        setValidationAttempted(true);
        setError("Complete this step before submitting.");
        setOpenToError(firstMissing === "what you are looking for"
          ? "Choose at least one thing you are looking for."
          : "");
        return;
      }
      if (firstMissing === "a short bio of at least a few lines") {
        setScreen("details");
        setDetailsStep("submit");
        setValidationAttempted(true);
        setError(kind === "space"
          ? "Add a short description of the space and its background."
          : "Add a short bio with a few lines about you and your background.");
        return;
      }
      if (firstMissing === "required application and visibility confirmation") {
        setScreen("details");
        setDetailsStep("submit");
        setError("Accept the required application and visibility confirmation before submitting.");
        return;
      }
      setError("Please fix the highlighted sections before submitting your profile.");
      setOpenToError(
        missingProfileFields.includes("what you can share with the network") || missingProfileFields.includes("what you are looking for")
          ? "Choose at least one answer in each highlighted choice section."
          : "",
      );
      return;
    }
    if (!locationText.trim()) {
      setLocationError("City is required to position your map pin.");
      return;
    }
    if (!countryText.trim()) {
      setLocationError("Country is required so we can verify the right city.");
      return;
    }
    if (customProfileTagInput.trim()) {
      setError("Add your custom profile tag or clear the field before submitting.");
      return;
    }
    const submittedTags = parseProfileTags(artistTypeInput);
    if (
      joinPath === "member" &&
      ruralSelected &&
      !submittedTags.some((tag) => tag.trim().toLowerCase() === "rural")
    ) {
      submittedTags.push("rural");
    }
    if (shareChoices.length === 0) {
      setOpenToError(kind === "space"
        ? "Choose at least one thing this space could share with the network."
        : "Choose at least one thing you can share with the network.");
      return;
    }
    if (kind === "artist" && openTo.length === 0) {
      setOpenToError("Choose at least one thing you are looking for.");
      return;
    }
    if (!isCommunityRecommendation) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address to save your application.");
        return;
      }
      if (password.length < 8) {
        setError("password must be at least 8 characters");
        return;
      }
      if (isMemberApplication && !memberConsentAccepted) {
        setError("Please accept the required application and profile-visibility confirmation.");
        return;
      }
      if (!isMemberApplication && !officialEmailConfirmed) {
        setError("Please confirm that this is the official contact email for the artist or space.");
        return;
      }
    } else if (!recommendationAttested) {
      setError("Confirm that you are recommending this space, not claiming it.");
      return;
    }
    if (!isMemberApplication) {
      if (!adultConfirmed) {
        setError("Please confirm that you are 18 or older.");
        return;
      }
      if (!dataProcessingConsent) {
        setError("Please consent to the collection and use of your application data as explained in the Privacy Notice.");
        return;
      }
      if (!consented) {
        setError(profileVisibility === "public"
          ? "Please confirm you understand your profile will be publicly visible if your application is approved."
          : "Please confirm you understand your profile will be visible to approved members if your application is approved.");
        return;
      }
    }
    setLoading(true);
    setLoadingStage(heroPhotoFile ? "photo" : "application");
    try {
      let heroPhotoUrl: string | undefined;
      if (heroPhotoFile) {
        try {
          heroPhotoUrl = await uploadHeroPhoto(heroPhotoFile);
          setLoadingStage("application");
        } catch {
          setError("photo upload failed - please try a smaller file");
          return;
        }
      }

      const additionalLocations = basedInInput
        .split(",")
        .map((location) => location.trim())
        .filter(Boolean)
        .filter((location, index, locations) => locations.findIndex((item) => item.toLowerCase() === location.toLowerCase()) === index)
        .slice(0, 8);
      const submittedTagsValue = submittedTags.join(", ");
      if (submittedTagsValue.length > 500) {
        setError("Please shorten your tags to 500 characters or fewer.");
        return;
      }
      const submittedSpaceOfferCategory = (["work", "housing", "residency"] as const)
        .find((value) => value === spaceOfferCategory);
      const submittedSpaceOfferPricing = (["free", "paid", "case_by_case"] as const)
        .find((value) => value === spaceOfferPricing);

      if (isCommunityRecommendation) {
        const response = await fetch("/api/entries/space-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            city: locationText.trim(),
            country: countryText.trim(),
            url: socialHandle.trim(),
            blurb: blurb.trim(),
            tags: submittedTags,
            offerings: offerings.trim(),
            offeringChoices: shareChoices,
            basedIn: additionalLocations,
            heroPhoto: heroPhotoUrl,
            networkNextSteps: networkNextSteps.trim(),
            discoverySource: discoverySource.trim(),
            profileVisibility,
            profileVisibilityConsent: consented,
            publicProfileConsent: profileVisibility === "public" && consented,
            spaceOfferAvailable: spaceOfferAvailable === true,
            spaceOfferTypes: spaceOfferAvailable ? spaceOfferTypes : [],
            spaceOfferCategory: spaceOfferAvailable ? submittedSpaceOfferCategory : undefined,
            spaceOfferPricing: spaceOfferAvailable ? submittedSpaceOfferPricing : undefined,
            spaceOfferDetails: spaceOfferAvailable ? spaceOfferDetails.trim() : undefined,
          }),
        });
        if (response.status === 409) {
          const duplicate = await response.json() as { existingName?: string };
          setError(`A likely match for “${duplicate.existingName ?? name}” is already on the map. Check it before recommending another pin.`);
          return;
        }
        if (!response.ok) {
          const result = await response.json().catch(() => null) as { error?: string } | null;
          setError(result?.error ?? "We could not send this recommendation for review.");
          return;
        }
        setRecommendationSubmitted(true);
        return;
      }

      const legacyJoinReasonValue = legacyJoinReason.trim();
      const submittedOrganizationModel = (
        ["artist_run", "nonprofit", "community", "independent", "commercial_operator", "hospitality", "agency", "institution", "other"] as const
      ).find((value) => value === organizationModel);

      const data = await registerAccountMutation.mutateAsync({
        data: {
          email: email.trim(),
           officialEmailConfirmed,
          adultConfirmed,
          dataProcessingConsent,
          password,
          kind,
          physicalSpaceConfirmed: kind === "space" && physicalSpaceConfirmed,
          name: name.trim(),
          socialHandle: socialHandle.trim(),
           tags: submittedTagsValue || undefined,
          blurb: blurb.trim() || undefined,
           profileVisibility,
          city: locationText.trim(),
          country: countryText.trim(),
          basedIn: additionalLocations,
          offerings: offerings.trim() || undefined,
          heroPhoto: heroPhotoUrl,
          openTo: kind === "space" ? [] : openTo,
          offeringChoices: shareChoices,
          discoverySource: discoverySource.trim(),
           ...getSignupAttributionFields(),
          networkNextSteps: shareOffer.trim(),
          joinReason: legacyJoinReasonValue || undefined,
           spaceOfferAvailable: kind === "space" && spaceOfferAvailable === true,
           spaceOfferTypes: kind === "space" && spaceOfferAvailable ? spaceOfferTypes : [],
            spaceOfferCategory: kind === "space" && spaceOfferAvailable ? submittedSpaceOfferCategory : undefined,
            spaceOfferPricing: kind === "space" && spaceOfferAvailable ? submittedSpaceOfferPricing : undefined,
           spaceOfferDetails: kind === "space" && spaceOfferAvailable ? spaceOfferDetails.trim() || undefined : undefined,
           organizationModel: undefined,
           intendedCommercialUse: undefined,
           commercialUseDescription: undefined,
          newsletterOptIn: isMemberApplication ? false : newsletterOptIn,
          exchangeDigestOptIn: isCommunityRecommendation ? false : exchangeDigestOptIn,
          curatedBy: curatedBy.trim() || undefined,
          referralCode,
          draftToken: resumeToken,
            profileVisibilityConsent: consented,
           publicProfileConsent: profileVisibility === "public" ? consented : false,
        },
      }).catch((error: unknown) => {
        const registrationError = (error as {
          data?: { error?: string; field?: string };
        } | null)?.data;
        if (registrationError?.field === "location") {
          const locationMessage = registrationError.error ?? "We couldn't verify that location.";
          setScreen("profile");
          setLocationError(locationMessage);
        } else if (registrationError?.field === "socialHandle" || registrationError?.field === "name") {
          setScreen("identity");
          setError(registrationError.error ?? "Please check your identity details.");
        } else if (registrationError?.field === "artistType" || registrationError?.field === "offerings") {
          setScreen("details");
          setDetailsStep("practice");
          setValidationAttempted(true);
          setError(registrationError.error ?? "Please check your practice details.");
        } else if (registrationError?.field === "networkNextSteps") {
          setScreen("details");
          setDetailsStep("practice");
          setValidationAttempted(true);
          setError(registrationError.error ?? "Please check what you can share.");
        } else if (
          registrationError?.field === "openTo" ||
          registrationError?.field === "joinReason" ||
          registrationError?.field === "discoverySource"
        ) {
          setScreen("details");
          setDetailsStep("looking");
          setValidationAttempted(true);
          setError(registrationError.error ?? "Please check your answers.");
        } else {
          setError(registrationError?.error ?? "registration failed - please try again");
        }
        return null;
      });
      if (!data) return;
      if (!data.ok) {
        setError("registration failed - please try again");
        return;
      }
      localStorage.setItem("cc_auth", JSON.stringify({
        token: data.token,
        email: data.email,
        entryId: data.entryId ?? null,
        isApproved: data.isApproved ?? false,
        expiresAt: data.expiresAt,
      }));
      const nextParams = new URLSearchParams();
      if (joinPath !== "member") nextParams.set("welcome", "1");
      if (data.curatorCodeMessage) nextParams.set("curator", "unrecognized");
      if (data.newsletterOptIn) nextParams.set("newsletter", "1");
      const nextQuery = nextParams.toString() ? `?${nextParams.toString()}` : "";
      window.location.href = joinPath === "member"
        ? "/application-received"
        : `/member-home${nextQuery}`;
    } catch {
      setError("something went wrong - please try again");
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const inputCls = "w-full bg-transparent border-b-2 border-[#333333]/25 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-[#999999] transition-colors";
  const labelCls = "block text-[12px] font-bold leading-tight text-black mb-2";
  const missingProfileFields = getMissingProfileFields();
  if (recommendationSubmitted) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center gap-5 bg-white px-6 py-10 text-center font-mono text-black">
        <p className="text-4xl" aria-hidden="true">▣</p>
        <h3 className="text-xl font-black uppercase tracking-widest">recommendation sent for review</h3>
        <p className="max-w-sm text-sm leading-relaxed text-black/75">
          This space is not public yet. If approved, it will appear on the map as an unclaimed profile. A verified representative can claim it later.
        </p>
        <button type="button" onClick={onClose} className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-black hover:text-[#c6ff3d]">
          back to Explore
        </button>
      </section>
    );
  }
  return (
    <div ref={signupPanelRef} className="flex flex-col max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] text-black [color-scheme:light]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Header */}
       <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/20 bg-white px-4 py-4 text-black sm:items-center sm:gap-4 sm:px-8 sm:py-5">
           <div className="flex min-w-0 items-center gap-2 sm:gap-3">
           <img src="/cult-rat.gif" alt="" aria-hidden="true" title="why is there a rat? we also dont know." className="h-9 w-auto object-contain mix-blend-multiply sm:h-10" />
             <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
             <h2 className="font-mono text-[clamp(0.9rem,4.4vw,1.125rem)] font-black uppercase leading-tight tracking-[-0.03em] text-black sm:text-2xl">
                {mode === "artifact" ? "submit a public artifact" : "apply to join Countercult"}
             </h2>
             {mode === "join" && (
                 <span className="shrink-0 whitespace-nowrap rotate-[3deg] border-2 border-black bg-[#c6ff3d] px-2 py-2 font-mono text-[10px] font-black uppercase tracking-[0.1em] text-black shadow-[3px_3px_0_#000] sm:px-3 sm:text-xs">
                   free · ~2 min to apply
               </span>
             )}
           </div>
         </div>
         <div className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={handleCloseRequest} aria-label="close signup" className="inline-flex h-9 w-9 items-center justify-center border border-black/30 text-2xl font-light leading-none text-black transition-colors hover:border-black hover:bg-black/5">
             ×
           </button>
         </div>
       </div>
       {draftNotice && <div className="mx-6 mt-3 border-l-4 border-[#c6ff3d] bg-[#c6ff3d]/20 px-3 py-2 text-[10px] uppercase tracking-widest">{draftNotice}</div>}
        {closePromptOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="relative w-full max-w-3xl border-2 border-black bg-white p-6 shadow-[8px_8px_0_#c6ff3d]">
           <button type="button" onClick={() => setClosePromptOpen(false)} aria-label="return to signup" className="absolute right-4 top-3 text-3xl leading-none text-black hover:text-black/50">×</button>
           <p className="text-[11px] font-bold uppercase tracking-widest">want a reminder to finish?</p>
           <p className="mt-2 text-[10px] leading-relaxed text-black/60">Your application is only partly complete. We can email you a private link to resume it later. Your password is never saved.</p>
           <label className="mt-3 block text-[9px] font-bold uppercase tracking-widest text-black/60">
             email for the reminder
             <input
               type="email"
               value={email}
               onChange={(event) => { setEmail(event.target.value); setError(""); }}
               autoComplete="email"
               placeholder="you@example.com"
               className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-[12px] normal-case tracking-normal text-black outline-none focus:bg-[#c6ff3d]/20"
             />
           </label>
           {error && <p role="alert" className="mt-2 text-[10px] font-bold text-red-600">{error}</p>}
           <div className="mt-3 flex flex-wrap gap-2">
             <button type="button" onClick={() => void saveDraftAndClose()} disabled={savingDraft} className="border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40">{savingDraft ? "sending…" : "remind me to finish"}</button>
             <button type="button" onClick={onClose} className="border-2 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest">leave without reminder</button>
             <button type="button" onClick={() => setClosePromptOpen(false)} className="px-2 py-2 text-[10px] uppercase tracking-widest text-black/50">keep editing</button>
           </div>
         </div>
          </div>
       )}
      {/* ── SCREEN 1: CATEGORY ── */}
       {mode === "join" && screen === "category" && (
             <div className="bg-white px-5 py-7 text-black sm:px-8 sm:py-9">
              {joinPath === "member" ? (
                   <section aria-labelledby="signup-value-title" className="mt-4 overflow-hidden border-2 border-black bg-[#f4f4f0] text-black">
                     <h3 id="signup-value-title" className="bg-black px-4 py-3 text-[clamp(0.75rem,2.2vw,1rem)] font-bold uppercase leading-relaxed tracking-[0.08em] text-[#f4f4f0]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                       FREE TO APPLY · CURATED NETWORK · 2-WEEK REVIEW
                     </h3>
                     <div className="px-4 py-4 sm:px-6 sm:py-5">
                       <p className="text-[clamp(0.95rem,1.8vw,1.15rem)] leading-relaxed" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                         we hand curate everyone who is in the network. we're not fiverr or a freelance marketplace. we're people doing things irl: artists, hackers, hosts, organizers, scene leaders, and diy spaces holding local culture together.
                       </p>
                       <p className="mt-3 text-[clamp(0.95rem,1.8vw,1.15rem)] leading-relaxed" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                         get in to pool rooms, studios, gear, and local knowledge, and connect with paid projects and countercult fund opportunities when there's a fit.
                       </p>
                       <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-dashed border-black/40 pt-3" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                         <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em]">Who we prioritize</p>
                         <p className="text-sm leading-relaxed">active artists, hackers, and leaders actually running spaces, collectives, or movements.</p>
                       </div>
                     </div>
                 </section>
              ) : (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/75">
                   Create a free partner account to share funding, space, discounts, free access, tools, and other resources with the Countercult Network. Partner accounts are reviewed before publishing.
                </p>
              )}
             <div className="mt-5 flex flex-col gap-4">
             {[
                    { number: "01", title: "person or collective", description: "For practicing artists, hackers, organizers, hosts, craftspeople, and scene leaders. Pool gear and join projects.", titleSize: "text-lg sm:text-2xl", surface: "bg-[#ff6b4a]", borderClass: "border-2", cardShadow: "shadow-[4px_4px_0_#000]", cardHeight: "min-h-48", icon: Palette, action: () => { setIsCommunityRecommendation(false); setMemberConsent(false); setJoinPath("member"); setKind("artist"); setPhysicalSpaceConfirmed(false); setDetailsStep("looking"); setScreen("details"); } },
                    { number: "02", title: "physical cultural space", description: "For DIY venues, punk bars, studios, cafés, residencies, and community spaces. Put your place on the map and share access or gear.", titleSize: "text-lg sm:text-2xl", surface: "bg-[#ffd600]", borderClass: "border-2", cardShadow: "shadow-[4px_4px_0_#000]", cardHeight: "min-h-48", icon: Building2, action: () => { setIsCommunityRecommendation(false); setMemberConsent(false); setJoinPath("member"); setKind("space"); setPhysicalSpaceConfirmed(false); setScreen("space-path"); } },
                     { number: "03", title: "business / funder / corporate ally", description: "Put budget behind local culture, or share unused space, gear, tools, discounts, or free access. Partner accounts are reviewed before publishing.", titleSize: "text-xs sm:text-lg", surface: "bg-white", borderClass: "border-[1.5px]", cardShadow: "shadow-[2px_2px_0_#000]", cardHeight: "min-h-44", icon: Handshake, action: () => { setJoinPath("partner"); setScreen("identity"); } },
               ]
                  .map(({ number, title, description, titleSize, surface, borderClass, cardShadow, cardHeight, icon: Icon, action }) => (
               <button
                 key={number}
                 type="button"
                  data-testid={`button-signup-category-${number}`}
                 onClick={action}
                     className={`group flex ${cardHeight} w-full flex-col justify-between gap-4 border-black ${borderClass} ${surface} ${cardShadow} p-5 text-left transition-[transform,box-shadow,background-color,color] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black`}
               >
                    <span className="flex w-full min-w-0 items-center justify-between gap-3">
                      <span className="inline-flex rounded-full border border-black bg-black px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#c6ff3d]">
                         free · ~2 min to apply
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                   </span>
                    <span className={`inline-flex w-full max-w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 font-black uppercase leading-tight tracking-[-0.02em] text-black ${titleSize}`} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                      <span className="min-w-0 whitespace-nowrap">{title}</span>
                    </span>
                    <span className="block text-[13px] leading-relaxed text-black/75 sm:text-sm">{description}</span>
               </button>
             ))}
           </div>
              <div className="mt-5 grid grid-cols-2 gap-[10px] border-t border-black/20 pt-4">
                 <button
                   type="button"
                    onClick={() => {
                      setJoinPath("member");
                      setKind("space");
                      setIsCommunityRecommendation(true);
                      setProfileVisibility("public");
                      setConsented(false);
                      setPhysicalSpaceConfirmed(false);
                      setError("");
                      setScreen("identity");
                    }}
                     className="flex min-w-0 items-start gap-2 border-[1.5px] border-black bg-[#eaeae4] p-2 text-left text-[9px] leading-relaxed text-black shadow-[2px_2px_0_#000] transition-[transform,box-shadow,background-color] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#000] hover:bg-[#ffd600]"
                 >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border-[1.5px] border-black bg-white"><Plus className="h-3.5 w-3.5" aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block font-bold uppercase leading-tight text-black">Nominate a space</span>
                      <span className="mt-1 block text-black/70">No account needed</span>
                    </span>
                 </button>
                  <button
                    type="button"
                    onClick={() => setMode("artifact")}
                    className="flex min-w-0 items-start gap-2 border-[1.5px] border-black bg-[#eaeae4] p-2 text-left text-[9px] leading-relaxed text-black shadow-[2px_2px_0_#000] transition-[transform,box-shadow,background-color] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#000] hover:bg-[#ff6b4a]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border-[1.5px] border-black bg-white"><Plus className="h-3.5 w-3.5" aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block font-bold uppercase leading-tight text-black">Share an artifact</span>
                      <span className="mt-1 block text-black/70">Flyer, zine, or receipt</span>
                    </span>
                  </button>
             </div>

             <p className="mt-7 text-center text-[11px] text-black/75">
             Already have an account?{" "}
               <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("cc:open-signin")); }} className="font-bold text-black underline underline-offset-4">
               Sign in
             </button>
           </p>
         </div>
       )}

      {mode === "join" && screen === "space-path" && (
        <section className="bg-white px-5 py-7 text-black sm:px-8 sm:py-9" aria-labelledby="space-path-title">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">space profile · choose one path</p>
          <h3 id="space-path-title" className="mt-3 text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
            How are you connected to this space?
          </h3>
          <div className="mt-6 grid gap-4">
            <button
              type="button"
              data-testid="button-space-path-represent"
              onClick={() => {
                setIsCommunityRecommendation(false);
                setPhysicalSpaceConfirmed(true);
                setError("");
                setScreen("identity");
              }}
              className="group border-2 border-black bg-white p-5 text-left shadow-[4px_5px_0_#000] transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d]"
            >
              <span className="block text-lg font-black uppercase">I represent this space</span>
              <span className="mt-2 block text-xs leading-relaxed text-black/65 group-hover:text-white/75">
                Apply to manage its profile. You’ll complete the space application and create your own account.
              </span>
            </button>
            <button
              type="button"
              data-testid="button-space-path-recommend"
              onClick={() => {
                setIsCommunityRecommendation(true);
                setProfileVisibility("public");
                setConsented(false);
                setPhysicalSpaceConfirmed(false);
                setError("");
                setScreen("identity");
              }}
              className="group border-2 border-black bg-[#c6ff3d] p-5 text-left shadow-[4px_5px_0_#000] transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <span className="block text-lg font-black uppercase">I’m recommending this space</span>
              <span className="mt-2 block text-xs leading-relaxed text-black/70 group-hover:text-white/75">
                No sign-in or email needed. Countercult reviews it before it appears, and we don’t contact the space.
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setScreen("category")}
            className="mt-6 border-2 border-black bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d]"
          >
            ← back
          </button>
        </section>
      )}

      {/* ── SCREEN 2: IDENTITY + ACCOUNT ── */}
      {mode === "join" && screen === "identity" && (
          <form noValidate onSubmit={joinPath === "partner" ? handlePartnerRegistration : handleIdentity} className="flex flex-col gap-5 bg-white px-6 py-5 text-black">
          {joinPath === "member" && (
            <div className="border-l-4 border-[#c6ff3d] bg-black/[0.03] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/45">
                  {kind === "space" ? "space details" : "your details"}
                </p>
            </div>
          )}
          <div>
            <label className={labelCls}>
               {joinPath === "partner" ? "Business, Funder, or Corporate Ally Name" : kind === "artist" ? "Artist, Collective, or Festival Name" : "Space or Business Name"} *
            </label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className={inputCls}
               placeholder={joinPath === "partner" ? "e.g. StickerApp, a foundation, a cultural sponsor…" : kind === "artist" ? "e.g. Maya Soto, Void Collective, Small Hours Festival…" : "e.g. Café OTO, Studio Bruut…"}
              autoFocus />
          </div>
           {joinPath === "member" && <div>
             <label className={labelCls}>{kind === "space" ? "One link to this space's work or programme *" : "One link to your work or practice *"}</label>
             <p className="mb-1 text-[10px] leading-relaxed text-black/55">
               {kind === "space"
                 ? "Use one full website or social profile URL for this space."
                 : "Use one full website, portfolio, or social profile URL."}
             </p>
             <input
               type="url"
               required
               maxLength={300}
               value={socialHandle}
               onChange={(e) => { setSocialHandle(e.target.value); if (error) setError(""); }}
               aria-invalid={Boolean(error && screen === "identity")}
               className={inputCls}
                placeholder={kind === "space" ? "https://spacesite.com" : "https://yoursite.com"}
             />
           </div>}
           {joinPath === "partner" && <label className="flex min-h-16 w-full items-start gap-3 cursor-pointer border border-black/15 bg-black/[0.03] p-3 transition-colors hover:border-black group">
            <input
              type="checkbox"
              checked={officialEmailConfirmed}
              onChange={(e) => setOfficialEmailConfirmed(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-black ${
                officialEmailConfirmed ? "border-black bg-black" : "border-black/30 group-hover:border-black"
              }`}
            >
              {officialEmailConfirmed && <span className="text-sm font-black leading-none text-[#c6ff3d]">✓</span>}
            </span>
            <span className="text-[11px] leading-relaxed text-black/70">
               I confirm that the email I enter below is the official contact email for the {joinPath === "partner" ? "business, funder, or corporate ally" : kind === "artist" ? "artist, collective, or festival" : "venue or space"} named in this application, and that I am authorized to represent this profile.
            </span>
           </label>}

           {joinPath === "partner" && <div>
            <label className={labelCls}>Official Email Address *</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="official@email.com"
            />
           </div>}
           {joinPath === "partner" && <div>
            <label className={labelCls}>Password * <span className="normal-case font-normal text-[#888888]">(min 8 characters)</span></label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-16`}
                placeholder="create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-1 text-[9px] font-bold uppercase tracking-widest text-black/45 hover:text-black"
                aria-label={showPassword ? "hide password" : "show password"}
              >
                {showPassword ? "hide" : "show"}
              </button>
            </div>
           </div>}
           {joinPath === "partner" && (
             <div>
               <label htmlFor="partner-signup-discovery-source" className={labelCls}>
                 How did you hear about Countercult? <span className="normal-case font-normal text-[#888888]">(optional)</span>
               </label>
               <select
                 id="partner-signup-discovery-source"
                 data-testid="signup-discovery-source"
                 value={discoverySource}
                 onChange={(event) => setDiscoverySource(event.target.value)}
                 className={inputCls}
               >
                 <option value="">Choose if you’d like</option>
                 {SIGNUP_DISCOVERY_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
               </select>
               <p className="mt-1 text-[10px] text-black/50">This answer is used internally to understand how people find us.</p>
             </div>
           )}
            {joinPath === "partner" && (
              <label className="flex items-start gap-3 text-[11px] leading-relaxed text-black/70">
                <input type="checkbox" checked={adultConfirmed} onChange={(e) => setAdultConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
                <span>I confirm that I am 18 or older.</span>
              </label>
            )}
            {joinPath === "partner" && (
              <div className="border-t border-black/10 pt-4">
                <p className="mb-2 text-[10px] leading-relaxed text-black/60">
                  Countercult will collect, store, and use the information you submit to review this application, create and manage your account, and provide partner features. The Privacy Notice explains retention, service providers, and your data rights. You may withdraw consent; we may then be unable to maintain the account, and some records may be retained where required for legal or safety reasons.
                </p>
                <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                  <input
                    type="checkbox"
                    data-testid="signup-data-processing-consent"
                    checked={dataProcessingConsent}
                    onChange={(e) => setDataProcessingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                  />
                  <span>
                    I consent to Countercult collecting, storing, and using the personal data I submit for these purposes, as described in the{" "}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">Privacy Notice</a>.
                  </span>
                </label>
              </div>
            )}
           {loading && (
             <div role="status" aria-live="polite" className="flex items-start gap-2 border-l-2 border-[#c6ff3d] bg-[#c6ff3d]/10 px-3 py-2.5 text-[10px] uppercase tracking-widest text-black/70">
               <span className="mt-0.5 animate-pulse text-[#6b9f00]" aria-hidden="true">●</span>
               <span>
                 {loadingStage === "photo" ? "uploading your photo…" : "submitting your application…"}
                 <span className="mt-1 block normal-case tracking-normal text-black/45">please keep this window open</span>
               </span>
             </div>
           )}
           {error && <div ref={errorRef} role="alert" className="text-[11px] font-semibold text-red-600 border border-red-300 bg-red-50 px-3 py-2.5">{error}</div>}
            <div className="flex gap-3">
            <button type="button" onClick={() => {
               if (isCommunityRecommendation) {
                 setScreen("space-path");
               } else if (joinPath === "member") {
                setScreen("details");
                  setDetailsStep("practice");
              } else {
                setScreen("category");
              }
              setError("");
            }}
              className="rounded-lg py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
              ← back
            </button>
            <button type="submit" disabled={loading} aria-busy={loading}
              className="flex-1 rounded-lg bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-50">
              {joinPath === "partner" ? (loading ? "submitting…" : "submit partner application →") : "continue →"}
            </button>
          </div>
        </form>
      )}

      {/* ── ARTIFACT MODE ── */}
      {mode === "artifact" && (
        <ArtifactSubmitForm onBack={() => { setMode("join"); setScreen("category"); }} onClose={onClose} inputCls={inputCls} />
      )}

      {/* ── SCREEN 3 + 4: PROFILE DETAILS ── */}
      {mode === "join" && (screen === "profile" || screen === "details") && (
         <form
           noValidate
           onSubmit={
             screen === "profile"
               ? handleProfileNext
               : detailsStep === "practice"
                 ? handleDetailsPracticeNext
                 : detailsStep === "looking"
                   ? handleDetailsLookingNext
                    : detailsStep === "disclaimer"
                      ? (e) => e.preventDefault()
                      : (e) => void handleProfile(e)
           }
            className={screen === "details" && detailsStep === "disclaimer"
              ? "flex flex-col bg-white text-black"
              : "flex flex-col gap-5 bg-white px-6 py-5 text-black"}
         >
          {screen === "profile" && error && (
            <div ref={errorRef} role="alert" className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-red-700">
              <p className="text-[11px] font-bold">Fix this before continuing:</p>
              <p className="mt-1 text-[11px] leading-relaxed">{error}</p>
            </div>
          )}
          {screen === "profile" && (
            <>
          <div className="border-l-4 border-[#c6ff3d] bg-black/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/45">
              {kind === "space" ? "space location" : "location"}
            </p>
             <p className="mt-1 text-[10px] text-black/55">
               {kind === "space" ? "This space's map pin stays private during review." : "Your pin stays private during review."}
             </p>
          </div>
          {/* Location - hinge-style prominent field */}
          <div>
            <label htmlFor="signup-city" className={labelCls}>City *</label>
            <input id="signup-city" required minLength={2} maxLength={120} value={locationText}
              onChange={(e) => { setLocationText(e.target.value); if (locationError) setLocationError(""); }}
              className={`w-full bg-transparent border-b-2 ${locationError ? "border-red-400" : "border-[#333333]/25"} py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-[#999999] transition-colors`}
              placeholder="e.g. Berlin, London, Medellín, Cape Town…"
              autoComplete="address-level2"
              aria-invalid={Boolean(locationError)}
              aria-describedby={locationError ? "signup-location-error" : undefined}
              autoFocus />
            <label htmlFor="signup-country" className={`${labelCls} mt-4`}>Country *</label>
            <input id="signup-country" required minLength={2} maxLength={120} value={countryText}
              onChange={(e) => { setCountryText(e.target.value); if (locationError) setLocationError(""); }}
              className={`w-full bg-transparent border-b-2 ${locationError ? "border-red-400" : "border-[#333333]/25"} py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-[#999999] transition-colors`}
              placeholder="e.g. Germany, United Kingdom, Colombia…"
              autoComplete="country-name"
              aria-invalid={Boolean(locationError)}
              aria-describedby={locationError ? "signup-location-error" : undefined} />
            {validatingLocation && <p role="status" aria-live="polite" className="mt-2 text-[10px] font-semibold text-black/60">Checking this location…</p>}
            {locationError && <p id="signup-location-error" role="alert" className="mt-2 text-[10px] font-semibold text-red-600">{locationError}</p>}
          </div>

          {joinPath === "member" && (
            <label
              htmlFor="signup-rural-location"
              className="flex cursor-pointer items-start gap-3 border border-black/15 bg-white p-3 transition-colors hover:border-black"
            >
              <input
                id="signup-rural-location"
                type="checkbox"
                data-testid="signup-rural-location"
                checked={ruralSelected}
                onChange={(event) => setRuralSelected(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-black"
              />
              <span className="text-[11px] leading-relaxed text-black/70">
                {kind === "space"
                  ? "This space is based in a rural place or region. Mark this profile for rural discovery."
                  : "My practice is based in a rural place or region. Mark this profile for rural discovery."}
              </span>
            </label>
          )}

          {joinPath === "member" && (
            <div className="rounded-lg border-2 border-black/15 bg-white p-4">
              <p className={labelCls}>{kind === "space" ? "Space profile image" : "Profile photo"} <span className="text-black/40">(recommended)</span></p>
              <p className="mb-3 text-[10px] leading-relaxed text-black/55">
                {kind === "space" ? "Optional. Add an image later if preferred. Max 4 MB." : "Optional. Add one later if you prefer. Max 4 MB."}
              </p>
              <div className="flex items-center gap-4">
                {heroPhotoPreview && (
                  <img
                    src={heroPhotoPreview}
                    alt="Selected profile photo preview"
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-black/15 object-cover"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="signup-profile-photo"
                    className={`inline-flex cursor-pointer items-center border-2 border-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      compressingPhoto ? "pointer-events-none bg-black/10 text-black/50" : "bg-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d]"
                    }`}
                  >
                    {compressingPhoto ? "preparing photo…" : heroPhotoPreview ? "change photo" : "choose photo"}
                  </label>
                  {heroPhotoFile && (
                    <button
                      type="button"
                      onClick={() => { setHeroPhotoFile(null); setHeroPhotoPreview(""); setPhotoRightsConfirmed(false); }}
                      className="border-2 border-black/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:border-black"
                    >
                      remove
                    </button>
                  )}
                  <input
                    id="signup-profile-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    disabled={compressingPhoto}
                    className="sr-only"
                  />
                </div>
              </div>
              {heroPhotoFile && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-black/65">
                  <input
                    type="checkbox"
                    checked={photoRightsConfirmed}
                    onChange={(event) => setPhotoRightsConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                  />
                  <span>I own this photo or have permission to share it on the Countercult profile.</span>
                </label>
              )}
            </div>
          )}

           <div className="flex gap-3">
               <button type="button" onClick={() => { setScreen("identity"); setError(""); setLocationError(""); setValidationAttempted(false); }}
               className="py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
               ← back
             </button>
              <button type="submit" disabled={validatingLocation || compressingPhoto}
                 aria-busy={validatingLocation || compressingPhoto}
               className="flex-1 rounded-lg bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors">
                 {compressingPhoto ? "preparing photo…" : validatingLocation ? "checking location…" : joinPath === "partner" ? "create partner account →" : "continue →"}
             </button>
            </div>
           </>
           )}

          {screen === "details" && (
           <>
           {(error || openToError) && detailsStep !== "submit" && (
             <div ref={errorRef} role="alert" className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-red-700">
               <p className="text-[11px] font-bold">Fix this before continuing:</p>
               <p className="mt-1 text-[11px] leading-relaxed">{error || openToError}</p>
             </div>
           )}
              {detailsStep !== "disclaimer" && <div className="border-l-4 border-[#c6ff3d] bg-black/[0.03] px-4 py-3">
               <p className="text-[10px] font-bold uppercase tracking-widest text-black/45">
                   {kind === "space"
                     ? detailsStep === "practice" ? "space contribution" : "application details"
                     : detailsStep === "looking" ? "what you're looking for" : detailsStep === "practice" ? "what you can share" : "application details"}
               </p>
            </div>}

            {detailsStep === "disclaimer" && (
              <section
                aria-labelledby="signup-disclaimer-title"
                className="flex min-h-[calc(100dvh-7rem)] flex-col px-6 py-6 normal-case text-black sm:px-8 sm:py-8"
              >
                <h3 id="signup-disclaimer-title" className="mb-5 border-l-4 border-[#d40000] pl-3 text-4xl font-black uppercase leading-none tracking-tight text-black sm:text-5xl">
                  DISCLAIMER
                </h3>
                <div className="flex-1 space-y-4 text-[15px] font-bold leading-[1.4] text-black sm:text-[17px]">
                  <p>A job title alone cannot show us the shape of your practice. Tell us what makes the work specific, how you make it, and what connects it to a local culture, scene, or community.</p>
                  <p>Maybe you trace obscure 1980s micro-press industrial zines and run a manual risograph collective. Maybe you hand-bind leather books, build physical sound installations from salvaged iron, or host a community radio broadcast that exists for one night.</p>
                  <p>That context helps us understand where you might connect with people, places, and opportunities across Countercult.</p>
                </div>
                <div className="mt-7 flex gap-3 border-t-2 border-black/20 pt-4">
                  <button
                    type="button"
                    onClick={() => { setScreen("profile"); setError(""); setLocationError(""); setValidationAttempted(false); }}
                    className="border-2 border-black px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d]"
                  >
                    ← back
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsStep("submit")}
                    className="flex-1 border-2 border-black bg-[#c6ff3d] py-3 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d]"
                  >
                    continue →
                  </button>
                </div>
              </section>
            )}

            {detailsStep === "practice" && (
            <>
           {/* What can be shared */}
            <div className={`rounded-lg border-2 p-4 shadow-[3px_3px_0_#000] ${
              validationAttempted && shareChoices.length === 0 ? "border-red-500 bg-red-50 shadow-[3px_3px_0_#ef4444]" : "border-black bg-white"
            }`}>
              <label className="mb-2 block text-3xl font-black leading-[0.98] tracking-tight text-black sm:text-4xl">
                {kind === "space" ? "What could this space share on Exchange? *" : "What could you share on Exchange? *"}
              </label>
                <p className="mb-3 text-[11px] leading-relaxed text-black/55">
                  {kind === "space"
                    ? "Select what the space could share with the network."
                    : "Select what you could share with the network."}
               </p>
             <div className="flex flex-wrap gap-2">
               {SHARE_CHOICES.map((option) => {
                 const active = shareChoices.includes(option);
                 return (
                   <button
                     key={option}
                     type="button"
                     aria-pressed={active}
                     onClick={() => {
                       setShareChoices((prev) => active ? prev.filter((item) => item !== option) : [...prev, option]);
                       if (openToError) setOpenToError("");
                     }}
                     className={`rounded-full border-2 border-black px-4 py-3 text-left text-[13px] font-bold uppercase leading-snug tracking-wide shadow-[2px_2px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#000] ${
                       active ? "bg-black text-[#c6ff3d]" : "bg-white text-black"
                     }`}
                   >
                     {active ? "✓ " : ""}{option}
                   </button>
                 );
               })}
             </div>
               <div className="mt-5 border-2 border-black bg-[#ff684f] px-4 py-3 text-sm font-bold leading-relaxed text-black">
                  {kind === "space"
                    ? "After applying, the space representative can post on the Exchange board so the network can see what the space offers. The post becomes visible once the profile is approved."
                    : "After you apply, you can post on the Exchange board so the network can see what you’re offering. Your post becomes visible once your profile is approved."}
               </div>
               {validationAttempted && shareChoices.length === 0 && (
                 <p role="alert" className="mt-3 text-[10px] font-semibold text-red-600">
                   {kind === "space"
                     ? "Choose at least one thing this space could share with the network."
                     : "Choose at least one thing you can share with the network."}
                 </p>
              )}
           </div>

          {/* Why join */}
           {false && kind === "space" && (
           <div className="border-2 border-black/15 bg-white px-4 py-5 flex flex-col gap-4">
             <div>
               <label className={labelCls}>Would you share your space with artists? *</label>
               <p className="text-[10px] leading-relaxed text-black/55">
                 We’ll show this on your profile and create a space-board listing after your venue is approved.
               </p>
             </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
               {[
                 { value: true, label: "yes - open to it" },
                 { value: false, label: "not right now" },
               ].map((option) => (
                 <button
                   key={String(option.value)}
                   type="button"
                   onClick={() => {
                     setSpaceOfferAvailable(option.value);
                     setError("");
                     if (!option.value) {
                       setSpaceOfferTypes([]);
                       setSpaceOfferCategory("");
                       setSpaceOfferPricing("");
                       setSpaceOfferDetails("");
                     }
                   }}
                   className={`border-2 px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                     spaceOfferAvailable === option.value
                       ? "border-black bg-black text-[#c6ff3d]"
                       : "border-black/20 bg-[#F9F9F6] text-black/50 hover:border-black hover:text-black"
                   }`}
                 >
                   {spaceOfferAvailable === option.value ? "✓ " : ""}{option.label}
                 </button>
               ))}
             </div>

             {spaceOfferAvailable && (
               <>
                 <div>
                   <label className={labelCls}>What kind of offer is this? *</label>
                   <p className="mb-2 text-[10px] leading-relaxed text-black/50">
                     choose housing for a coliving or artist residence stay; choose work for creative use of the space.
                   </p>
                   <div className="grid grid-cols-2 gap-2">
                     {[
                       { value: "work", label: "work / creative use" },
                       { value: "housing", label: "housing / coliving" },
                        { value: "residency", label: "residency / live + work" },
                     ].map((option) => (
                       <button
                         key={option.value}
                         type="button"
                         onClick={() => { setSpaceOfferCategory(option.value); setError(""); }}
                         className={`border-2 px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                           spaceOfferCategory === option.value
                             ? "border-black bg-black text-[#c6ff3d]"
                             : "border-black/20 bg-[#F9F9F6] text-black/50 hover:border-black hover:text-black"
                         }`}
                       >
                         {spaceOfferCategory === option.value ? "✓ " : ""}{option.label}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div>
                   <label className={labelCls}>What could artists use it for? *</label>
                   <div className="flex flex-wrap gap-2">
                     {[
                       "exhibitions",
                       "coworking / work sessions",
                       "small markets",
                       "shows / live collaborations",
                        "artist residencies",
                     ].map((option) => {
                       const active = spaceOfferTypes.includes(option);
                       return (
                         <button
                           key={option}
                           type="button"
                           onClick={() => {
                             setSpaceOfferTypes((prev) => active ? prev.filter((item) => item !== option) : [...prev, option]);
                             setError("");
                           }}
                           className={`text-[9px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                             active
                               ? "bg-[#c6ff3d] text-black border-black"
                               : "bg-white text-black/45 border-black/20 hover:border-black hover:text-black"
                           }`}
                         >
                           {active ? "✓ " : ""}{option}
                         </button>
                       );
                     })}
                   </div>
                 </div>
                 <div>
                   <label className={labelCls}>How would you price it? *</label>
                   <div className="flex flex-col gap-2">
                     {[
                       { value: "free", label: "free for artists" },
                       { value: "paid", label: "there is a cost" },
                       { value: "case_by_case", label: "depends on the collaboration" },
                     ].map((option) => (
                       <label key={option.value} className="flex items-center gap-2 text-[11px] text-black/70 cursor-pointer">
                         <input
                           type="radio"
                           name="space-offer-pricing"
                           value={option.value}
                           checked={spaceOfferPricing === option.value}
                           onChange={(event) => { setSpaceOfferPricing(event.target.value); setError(""); }}
                           className="accent-black"
                         />
                         {option.label}
                       </label>
                     ))}
                   </div>
                 </div>
                 <div>
                   <label className={labelCls}>Anything artists should know? <span className="normal-case font-normal text-[#888888]">(optional)</span></label>
                   <textarea
                     value={spaceOfferDetails}
                     onChange={(event) => setSpaceOfferDetails(event.target.value)}
                     maxLength={600}
                     rows={3}
                     className="w-full bg-transparent border-b-2 border-[#333333]/25 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-[#999999] transition-colors resize-none"
                     placeholder="Tell artists about the room, access, timing, or the kinds of collaborations you have in mind…"
                   />
                   <p className="mt-1 text-right text-[9px] uppercase tracking-widest text-black/35">{spaceOfferDetails.length}/600</p>
                 </div>
               </>
             )}
           </div>
           )}

             <div className="flex gap-3">
                <button type="button" onClick={() => {
                  if (kind === "space") setScreen("profile");
                 else setDetailsStep("looking");
                 setError("");
                 setOpenToError("");
                 setValidationAttempted(false);
               }}
                className="py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
                ← back
              </button>
              <button type="submit"
                className="flex-1 rounded-lg bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors">
                continue →
              </button>
            </div>
            </>
            )}

            {detailsStep === "looking" && (
            <>
            {/* What they are looking for */}
            <div className={validationAttempted && openTo.length === 0 ? "border-2 border-red-500 bg-red-50 p-3" : ""}>
              <label className="mb-2 block text-3xl font-black leading-[0.98] tracking-tight text-black sm:text-4xl">What are you looking for? *</label>
              <p className="mb-3 mt-2 text-[10px] text-black/55">Private to reviewers.</p>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_CHOICES.map((option) => {
                  const active = openTo.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setOpenTo((prev) => active ? prev.filter((item) => item !== option) : [...prev, option]);
                        if (openToError) setOpenToError("");
                      }}
                      className={`rounded-full border-2 border-black px-4 py-3 text-left text-[13px] font-bold uppercase leading-snug tracking-wide shadow-[2px_2px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#000] ${
                        active ? "bg-black text-[#c6ff3d]" : "bg-white text-black"
                      }`}
                    >
                      {active ? "✓ " : ""}{option}
                    </button>
                  );
                })}
              </div>
              {validationAttempted && openTo.length === 0 && (
                <p role="alert" className="mt-3 text-[10px] font-semibold text-red-600">Choose at least one thing you are looking for.</p>
              )}
           </div>

            {openToError && <p className="text-[10px] font-semibold text-red-500">{openToError}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setScreen("category"); setError(""); setOpenToError(""); setValidationAttempted(false); }}
                className="py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
                ← back
              </button>
              <button type="submit"
                className="flex-1 rounded-lg bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors">
                continue →
              </button>
            </div>
            </>
            )}

            {detailsStep === "submit" && (
            <>
          {joinPath === "member" && (
            <div className="mb-5 border-l-4 border-[#c6ff3d] bg-black/[0.04] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest">next: write an Exchange post</p>
              <p className="mt-1 text-[11px] leading-relaxed text-black/65">
                {kind === "space"
                  ? "This application is not a listing. After submission, the space representative can write a separate Exchange post so members can find what the space offers. The post stays private while the profile is under review."
                  : "Your application answers are not a listing. After you apply, we’ll take you to Exchange to write a separate post so members can find what you’re offering. It stays private while your profile is under review."}
              </p>
            </div>
          )}
          <div className="border-2 border-black/15 bg-white px-4 py-4">
            <label htmlFor="signup-offerings" className={labelCls}>
              {kind === "space"
                ? "What work, bookings, or experiences can people arrange through this space?"
                : "What work, bookings, or experiences can people hire you for?"}{" "}
              <span className="normal-case font-normal text-[#888888]">(optional)</span>
            </label>
            <p className="mb-1 text-[10px] leading-relaxed text-black/55">
              {kind === "space"
                ? "Give concrete examples of paid events, venue hire, programmes, or services the space offers."
                : "Give concrete examples of paid work, commissions, bookings, or events you offer."}
            </p>
            <textarea
              id="signup-offerings"
              data-testid="signup-offerings"
              value={offerings}
              onChange={(event) => setOfferings(event.target.value)}
              className="w-full resize-none border-b-2 border-[#333333]/25 bg-transparent py-2 text-sm text-black placeholder:text-[#999999] transition-colors focus:border-black focus:outline-none"
              rows={3}
              maxLength={600}
              placeholder={kind === "space"
                ? "For example: venue hire, exhibitions, live events, workshops, or a local programme…"
                : "For example: papier-mâché commissions, live music bookings or performances, workshops, private events, murals, curation, or event production…"}
            />
            <p className="mt-1 text-right text-[9px] uppercase tracking-widest text-black/35">{offerings.length}/600</p>
          </div>

          <div>
            <p className={labelCls}>Profile tags <span className="normal-case font-normal text-[#888888]">(optional)</span></p>
            <p className="mb-2 text-[10px] leading-relaxed text-black/55">
              {kind === "space"
                ? "Choose tags that help people discover this space. These describe the space, not an Exchange listing."
                : "Choose tags that help people discover your profile. These describe you, not an Exchange listing."}
            </p>
            <div role="group" aria-label="Suggested profile tags" className="flex flex-wrap gap-2">
              {PROFILE_TAG_SUGGESTIONS.map((tag) => {
                const selected = profileTagValues.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    data-testid={`profile-tag-${tag.replace(/[^a-z0-9]+/gi, "-")}`}
                    aria-pressed={selected}
                    onClick={() => setArtistTypeInput((current) => toggleProfileTag(current, tag))}
                    className={`border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                      selected ? "border-black bg-[#c6ff3d] text-black" : "border-black/20 text-black/55 hover:border-black"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                id="signup-custom-profile-tag"
                data-testid="signup-custom-profile-tag"
                type="text"
                value={customProfileTagInput}
                onChange={(event) => setCustomProfileTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setArtistTypeInput((current) => addProfileTags(current, customProfileTagInput));
                    setCustomProfileTagInput("");
                  }
                }}
                maxLength={120}
                className={inputCls}
                placeholder={kind === "space" ? "Add a tag for this space" : "Add your own tag"}
                aria-label="Custom profile tag"
              />
              <button
                type="button"
                data-testid="button-add-profile-tag"
                onClick={() => {
                  setArtistTypeInput((current) => addProfileTags(current, customProfileTagInput));
                  setCustomProfileTagInput("");
                }}
                className="shrink-0 border border-black/25 px-3 text-[9px] font-bold uppercase tracking-widest hover:border-black"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-right text-[9px] uppercase tracking-widest text-black/35">{artistTypeInput.length}/500</p>
          </div>

          <div>
            <label htmlFor="signup-short-bio" className={labelCls}>
              {kind === "space" ? "About this space and your role *" : "Your work and role in cultural life *"}
            </label>
            <p className="mb-1 text-[10px] leading-relaxed text-black/55">
              {kind === "space"
                ? "Tell us what happens here, what the space hosts or shares, and your role in running or programming it."
                : "Tell us what you make, host, organize, or build, who it connects with, and one specific example of your role."}
            </p>
            <textarea
              id="signup-short-bio"
              data-testid="signup-short-bio"
              value={blurb}
              onChange={(event) => setBlurb(event.target.value)}
              rows={3}
              maxLength={400}
              aria-invalid={validationAttempted && blurb.trim().length < 50}
              className={`w-full resize-none border-b-2 bg-transparent py-2 text-sm text-black placeholder:text-[#999999] transition-colors focus:border-black focus:outline-none ${
                validationAttempted && blurb.trim().length < 50 ? "border-red-500" : "border-[#333333]/25"
              }`}
              placeholder={kind === "space"
                ? "This space hosts… We share… My role is…"
                : "I make… I host or organize… This brings together… My role is…"}
            />
            <p className={`mt-1 text-right text-[9px] uppercase tracking-widest ${
              validationAttempted && blurb.trim().length < 50 ? "text-red-600" : "text-black/35"
            }`}>{blurb.length}/400{blurb.trim().length < 50 ? " · add a few lines" : ""}</p>
          </div>

          {error && <div ref={errorRef} role="alert" className="text-[11px] font-semibold text-red-600 border border-red-300 bg-red-50 px-3 py-2.5">{error}</div>}

           {/* Profile visibility */}
           <div className={`border-2 bg-white px-4 py-4 ${
             validationAttempted && !consented ? "border-red-500" : "border-black/15"
           }`}>
             <label className={labelCls}>Profile visibility *</label>
               <p className="mb-3 text-[10px] text-black/55">
                 {kind === "space" ? "Choose who can see this space's profile." : "Choose who can see your profile."}
               </p>
             <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Profile visibility">
               <button
                 type="button"
                 aria-pressed={profileVisibility === "public"}
                  onClick={() => { setProfileVisibility("public"); resetVisibilityConsent(); }}
                 className={`border-2 px-3 py-3 text-left transition-colors ${
                   profileVisibility === "public"
                     ? "border-black bg-black text-[#c6ff3d]"
                     : "border-black/20 bg-[#F9F9F6] text-black/55 hover:border-black hover:text-black"
                 }`}
               >
                 <span className="block text-[10px] font-black uppercase tracking-widest">
                   {profileVisibility === "public" ? "✓ " : ""}Public profile
                 </span>
                 <span className={`mt-1 block text-[10px] leading-relaxed ${profileVisibility === "public" ? "text-white/70" : "text-black/45"}`}>
                    Public map and web.
                 </span>
               </button>
              {!isCommunityRecommendation && <button
                 type="button"
                 aria-pressed={profileVisibility === "network"}
                  onClick={() => { setProfileVisibility("network"); resetVisibilityConsent(); }}
                 className={`border-2 px-3 py-3 text-left transition-colors ${
                   profileVisibility === "network"
                     ? "border-black bg-black text-[#c6ff3d]"
                     : "border-black/20 bg-[#F9F9F6] text-black/55 hover:border-black hover:text-black"
                 }`}
               >
                 <span className="block text-[10px] font-black uppercase tracking-widest">
                   {profileVisibility === "network" ? "✓ " : ""}Network-only profile
                 </span>
                 <span className={`mt-1 block text-[10px] leading-relaxed ${profileVisibility === "network" ? "text-white/70" : "text-black/45"}`}>
                    Approved members only.
                 </span>
                </button>}
             </div>
           </div>

            {!isCommunityRecommendation && (
              <div>
                <label htmlFor="member-signup-discovery-source" className={labelCls}>
                  How did you hear about Countercult? <span className="normal-case font-normal text-[#888888]">(optional)</span>
                </label>
                <select
                  id="member-signup-discovery-source"
                  data-testid="signup-discovery-source"
                  value={discoverySource}
                  onChange={(event) => setDiscoverySource(event.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose if you’d like</option>
                  {SIGNUP_DISCOVERY_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-black/50">This answer is used internally to understand how people find us.</p>
              </div>
            )}
            {!isCommunityRecommendation && <div className={`border-l-4 bg-black/[0.03] px-4 py-4 ${
               validationAttempted && (!emailLooksValid || password.length < 8)
                ? "border-red-500"
                : "border-[#c6ff3d]"
            }`}>
              <label htmlFor="member-signup-email" className={`${labelCls}`}>
                Official Email Address *
              </label>
              <input
                id="member-signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="official@email.com"
                aria-invalid={validationAttempted && !emailLooksValid}
              />
              {validationAttempted && !emailLooksValid && (
                <p role="alert" className="mt-2 text-[10px] font-semibold text-red-600">Enter a valid email address.</p>
              )}
              <label htmlFor="member-signup-password" className={`${labelCls} mt-4`}>
                Password * <span className="normal-case font-normal text-[#888888]">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="member-signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-16`}
                  placeholder="create a password"
                  aria-invalid={validationAttempted && password.length < 8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-1 text-[9px] font-bold uppercase tracking-widest text-black/45 hover:text-black"
                  aria-label={showPassword ? "hide password" : "show password"}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              {validationAttempted && password.length < 8 && (
                <p role="alert" className="mt-2 text-[10px] font-semibold text-red-600">Use a password with at least 8 characters.</p>
              )}
            </div>}

            {joinPath === "member" && !isCommunityRecommendation && (
              <div className="border-t border-black/10 pt-4">
                <label className={labelCls}>
                  Curator code <span className="normal-case font-normal text-[#888888]">(optional)</span>
                </label>
                <input
                  value={curatedBy}
                  onChange={(e) => setCuratedBy(e.target.value)}
                  className={inputCls}
                  placeholder="Name or code"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            )}

            {/* Member signup combines required confirmations; other flows keep their existing separate attestations. */}
            <section
              aria-labelledby="signup-required-confirmations-title"
              className={`border-t-2 pt-4 ${
                validationAttempted && !requiredConfirmationsAccepted ? "border-red-500 bg-red-50 p-3" : "border-black/15"
              }`}
            >
              <h3 id="signup-required-confirmations-title" className={labelCls}>Required confirmations</h3>
              <p className="mb-3 text-[10px] leading-relaxed text-black/60">
                {isMemberApplication
                  ? "Your free application takes about two minutes and is reviewed manually. Countercult uses your information to review applications, manage accounts, and run Network features. Your profile stays private during review; if approved, selected details follow your visibility choice. The "
                  : isCommunityRecommendation
                    ? "Countercult uses the information you submit to review this recommendation. The profile remains private during review. If approved, it becomes visible according to your selection. You can ask us to hide or remove it. "
                    : "Countercult collects, stores, and uses the information you submit to review your application, set up and manage your account, and provide Network features. Your location pin stays private during review. If approved, selected profile details are visible according to the choice above: publicly on the internet, or to approved members only. You can ask Countercult to hide or remove your profile. The "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">Privacy Notice</a>
                {" "}explains data use, retention, service providers, withdrawal, and your rights.
              </p>
              {isMemberApplication ? (
                <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                  <input
                    type="checkbox"
                    data-testid="signup-member-consent"
                    checked={memberConsentAccepted}
                    onChange={(event) => setMemberConsent(event.target.checked)}
                    aria-invalid={validationAttempted && !memberConsentAccepted}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                  />
                  <span>
                    I am at least 18. The email above is the official contact for this profile, and I am authorized to represent it. I consent to Countercult using my information to review my application, manage my account, and run Network features. If approved, my profile follows the visibility option I selected. I can withdraw consent or ask to hide or remove my profile.
                  </span>
                </label>
              ) : (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                    <input
                      type="checkbox"
                      data-testid="signup-age-confirmation"
                      checked={adultConfirmed}
                      onChange={(e) => setAdultConfirmed(e.target.checked)}
                      aria-invalid={validationAttempted && !adultConfirmed}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                    />
                    <span>I confirm that I am 18 or older.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                    <input
                      type="checkbox"
                      data-testid="signup-data-processing-consent"
                      checked={dataProcessingConsent}
                      onChange={(e) => setDataProcessingConsent(e.target.checked)}
                      aria-invalid={validationAttempted && !dataProcessingConsent}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                    />
                    <span>
                      {isCommunityRecommendation
                        ? "I consent to Countercult using the information I submit to review this recommendation, as described in the Privacy Notice."
                        : "I consent to Countercult collecting, storing, and using the personal data I submit to review my application, create and manage my account, and provide Network features, as described in the Privacy Notice. I understand that I can withdraw this consent."}
                    </span>
                  </label>
                  {isCommunityRecommendation ? (
                    <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                      <input
                        type="checkbox"
                        checked={recommendationAttested}
                        onChange={(e) => setRecommendationAttested(e.target.checked)}
                        aria-invalid={validationAttempted && !recommendationAttested}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                      />
                      <span>I’m recommending this space for review, not claiming or representing it. It will not appear publicly unless approved.</span>
                    </label>
                  ) : (
                    <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                      <input
                        type="checkbox"
                        data-testid="signup-authority-confirmation"
                        checked={officialEmailConfirmed}
                        onChange={(e) => setOfficialEmailConfirmed(e.target.checked)}
                        aria-invalid={validationAttempted && !officialEmailConfirmed}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                      />
                      <span>
                        I confirm that the email above is the official contact email for this profile and that I am authorized to represent the artist, collective, festival, space, or business named in this application.
                      </span>
                    </label>
                  )}
                  <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/75">
                    <input
                      type="checkbox"
                      data-testid="signup-visibility-consent"
                      checked={consented}
                      onChange={(e) => setConsented(e.target.checked)}
                      aria-invalid={validationAttempted && !consented}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                    />
                    <span>
                      {profileVisibility === "public"
                        ? "I agree to the selected profile information being published publicly if my application is approved. I understand I can ask for it to be hidden or removed."
                        : "I agree to the selected profile information being visible to approved Countercult members if my application is approved. I understand I can ask for it to be hidden or removed."}
                    </span>
                  </label>
                </div>
              )}
            </section>

            {!isCommunityRecommendation && <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/70">
              <input
                type="checkbox"
                data-testid="signup-exchange-digest-opt-in"
                checked={exchangeDigestOptIn}
                onChange={(event) => setExchangeDigestOptIn(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-black"
              />
              <span>Email me a weekly Exchange digest after my account is approved. Optional; unsubscribe anytime.</span>
            </label>}

            {/* Partner registration keeps its existing optional Substack checkbox. */}
            {joinPath === "partner" && !isCommunityRecommendation && <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-black/70">
              <input
                type="checkbox"
                data-testid="signup-newsletter-opt-in"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-black"
              />
              <span>Send me Countercult newsletter updates. I’ll confirm separately.</span>
            </label>}

           {validationAttempted && missingProfileFields.length > 0 && (
             <div ref={errorRef} role="alert" className="border-2 border-red-500 bg-red-50 px-4 py-3 text-red-700">
               <p className="text-[11px] font-bold">Fix these before submitting:</p>
               <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-relaxed">
                 {missingProfileFields.map((field) => <li key={field}>{field}</li>)}
               </ul>
             </div>
           )}

           <div className="flex gap-3">
              <button type="button" onClick={() => {
                setDetailsStep(kind === "space" ? "practice" : "disclaimer");
                setError("");
                setOpenToError("");
                setValidationAttempted(false);
              }}
              className="py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
              ← back
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                compressingPhoto
              }
              className="flex-1 rounded-lg bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40">
            {loading ? "submitting…" : isCommunityRecommendation ? "send recommendation for review →" : "submit application →"}
            </button>
          </div>

          <details className="border-t border-black/10 pt-3 pb-8 text-[10px] leading-relaxed text-black/55">
            <summary className="cursor-pointer font-bold uppercase tracking-widest">About using the Network</summary>
            <p className="mt-2">
              By registering, you understand that Countercult is an independent cultural network and notice board, not a housing provider, broker, booking service, property manager, insurer, or party to agreements between members. We do not guarantee the identity, ownership, permission to offer, safety, legality, or suitability of any listing. You are responsible for independently checking an arrangement and complying with applicable local law. Nothing in these terms excludes liability that cannot legally be excluded.
            </p>
          </details>
           </>
           )}
           </>
           )}
        </form>
      )}
    </div>
  );
}
// End incoming JoinCultDrawer implementation.

// ---------- Anonymous Artifact Submit Form (inside JoinCultDrawer) ----------
function ArtifactSubmitForm({ onBack, onClose, inputCls }: { onBack: () => void; onClose: () => void; inputCls: string }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [url, setUrl] = useState("");
  const [blurb, setBlurb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/entries/public-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || undefined,
          url: url.trim() || undefined,
          blurb: blurb.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "submission failed - please try again");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("something went wrong - please try again");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-6 py-10 flex flex-col gap-5 items-center text-center">
        <div className="text-4xl opacity-60">◈</div>
        <p className="font-bold text-sm uppercase tracking-widest">submitted.</p>
        <p className="text-[11px] text-black/50 leading-relaxed max-w-[260px]">
          our team will review and add it to the map if it meets our curation standards.
        </p>
        <button onClick={onClose}
          className="bg-[#c6ff3d] text-black py-2.5 px-6 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors">
          close ✕
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 flex flex-col gap-4">
      <p className="text-[11px] leading-relaxed text-black/60">
        Share an intangible cultural artifact worth preserving - a dying language, traditional practice, recipe, ritual, craft, or folk tradition. Not a place or person.
        No account needed.
      </p>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">artifact name *</label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          className={inputCls} placeholder="e.g. Haenyeo diving tradition, Waulking songs of the Hebrides…" autoFocus />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">location <span className="normal-case opacity-60">(optional)</span></label>
        <input value={city} onChange={(e) => setCity(e.target.value)}
          className={inputCls} placeholder="City, Neighborhood, or Country" />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">link <span className="normal-case opacity-60">(optional)</span></label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          className={inputCls} placeholder="https://…" />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">why it belongs on the map <span className="normal-case opacity-60">(optional)</span></label>
        <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={3}
          className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors resize-none"
          placeholder="What is it, where does it come from, and why does it deserve to be remembered?" />
      </div>
      {error && <div className="text-[11px] text-black/70 border border-black/10 bg-black/5 px-3 py-2.5">{error}</div>}
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="py-3 px-4 border-2 border-black/20 text-[11px] uppercase tracking-widest font-bold hover:border-black transition-colors">
          ← back
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40">
          {loading ? "submitting…" : "submit artifact →"}
        </button>
      </div>
      <p className="text-[10px] text-black/20 leading-relaxed">
        submissions are manually reviewed. artifact pins appear on the map after curation approval.
      </p>
    </form>
  );
}

// ---------- Early Access Modal (email capture for "+ ADD" / "submit culture" buttons) ----------
function EarlyAccessModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "something went wrong");
        return;
      }
      setSent(true);
    } catch {
      setError("something went wrong - please try again");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-[#c6ff3d] border-2 border-black flex items-center justify-center mx-auto mb-4 text-xl font-bold text-black">✓</div>
        <h2 className="font-bold uppercase tracking-widest text-base mb-2">received</h2>
        <p className="text-xs text-black/60 leading-relaxed mb-6">
          our team manually vets every applicant. if you're a fit, we'll be in touch.
        </p>
        <button onClick={onClose} className="py-2 px-6 border border-black/20 hover:border-black text-xs uppercase tracking-widest transition-colors">
          close
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-black/10 flex justify-between items-center bg-[#F9F9F6]">
        <h2 className="font-bold uppercase tracking-widest text-sm text-black">want to list your space or artist voice?</h2>
        <button onClick={onClose} className="text-black/40 hover:text-black font-bold">✕</button>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="p-5 flex flex-col gap-4 bg-[#F9F9F6]">
        <p className="text-[10px] text-black/60 leading-relaxed uppercase tracking-widest">
          enter your email below. our team manually vets every applicant before granting map access.
        </p>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-1.5">your email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30"
            placeholder="your@email.com"
            autoFocus
          />
        </div>
        {error && <div className="text-[10px] text-black/70 border border-black/10 bg-black/5 px-3 py-2.5">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-[#c6ff3d] text-black border-2 border-black hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest font-bold disabled:opacity-40"
        >
          {loading ? "sending…" : "submit →"}
        </button>
        <p className="text-[9px] text-black/30 text-center leading-relaxed">
          already have an account?{" "}
          <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("cc:open-signin")); }}
            className="underline decoration-[#c6ff3d] hover:text-black">sign in here</button>
        </p>
      </form>
    </div>
  );
}

// ---------- Nomination Modal ----------
function NominationModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "something went wrong");
        return;
      }
      setSent(true);
    } catch {
      setError("something went wrong - please try again");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-[#c6ff3d] border-2 border-black flex items-center justify-center mx-auto mb-4 text-xl font-bold text-black">✓</div>
        <h2 className="font-bold uppercase tracking-widest text-base mb-2">nomination received</h2>
        <p className="text-xs text-black/60 leading-relaxed mb-6">
          we'll review it and add it to the map. thank you for contributing to the culture.
        </p>
        <button onClick={onClose} className="py-2 px-6 border border-black/20 hover:border-black text-xs uppercase tracking-widest transition-colors">
          close
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-black/10 flex justify-between items-center bg-[#F9F9F6]">
        <h2 className="font-bold uppercase tracking-widest text-sm text-black">nominate a culture entry</h2>
        <button onClick={onClose} className="text-black/40 hover:text-black font-bold">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 bg-[#F9F9F6]">
        <p className="text-[10px] text-black/50 leading-relaxed uppercase tracking-widest">
          got someone or somewhere worth putting on the map? send us their email.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-1.5">their email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30" placeholder="artist@email.com" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-1.5">name (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30" placeholder="artist / space / collective name" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-1.5">link or notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-transparent border border-black/20 p-2 text-sm focus:outline-none focus:border-black resize-none text-black placeholder:text-black/30" placeholder="website, instagram, why they should be on the map…" />
          </div>
        </div>
        {error && <div className="text-[10px] text-black/70 border border-black/10 bg-black/5 px-3 py-2.5">{error}</div>}
        <button type="submit" disabled={loading} className="py-3 bg-[#c6ff3d] text-black border-2 border-black hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest font-bold disabled:opacity-40">
          {loading ? "sending…" : "nominate →"}
        </button>
      </form>
    </div>
  );
}

// ---------- Pin Popup ----------
function SidebarAvatar({ name, kind }: { name: string; kind: EntryKind }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const glyph = KIND_GLYPH[kind];
  const bg = kind === "artist" ? "bg-black" : kind === "space" ? "bg-[#c6ff3d]" : "bg-[#f3efe7]";
  const fg = kind === "artist" ? "text-[#c6ff3d]" : "text-black";
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center select-none ${bg}`}>
      <span className={`font-bold font-mono leading-none ${fg} text-base`}>{initial}</span>
      <span className={`leading-none opacity-25 ${fg} text-[8px]`}>{glyph}</span>
    </div>
  );
}

/** Closes the active Leaflet popup when ESC is pressed */
function MapKeyboardHandler() {
  const map = useMap();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") map.closePopup(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [map]);
  return null;
}

function PinPopup({ pin, onSignIn }: { pin: EnrichedPin; onSignIn: () => void }) {
  const { session, status, isAuthenticated } = useServerValidatedSession();
  const isApproved = isAuthenticated
    && session?.isApproved === true
    && session.accountRole !== "partner_poster";
  const isPublicPreview = pin.kind === "artist" && pin.isProfilePreview;
  const { data: entry, isLoading, isError } = useGetEntry(pin.id, {
    request: isApproved && session
      ? { headers: { Authorization: `Bearer ${session.token}` } }
      : undefined,
    query: {
      queryKey: [...getGetEntryQueryKey(pin.id), isApproved ? "approved-network" : "public"],
      enabled: status !== "checking" && !isPublicPreview,
    },
  });

  if (isPublicPreview) {
    return (
      <div className="w-full bg-white p-4 font-mono lowercase">
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 shrink-0 bg-black/5 flex items-center justify-center">
            <SidebarAvatar name={pin.name} kind="artist" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block bg-black px-2 py-1 text-[8px] uppercase tracking-widest text-[#c6ff3d]">
              artist · public preview
            </span>
            <h3 className="mt-2 text-base font-bold uppercase leading-tight">{pin.name}</h3>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-black/45">
              {pin.city}{pin.country ? `, ${pin.country}` : ""}
            </p>
          </div>
        </div>
        {pin.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {pin.tags.slice(0, 6).map((tag) => (
              <span key={tag} className="border border-black/10 bg-black/5 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-black/60">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-black/10 pt-3">
          <p className="text-[9px] leading-relaxed text-black/55">
            This is a public preview. Full profiles are available to approved Countercult Network members.
          </p>
           <Link
            href={`/entries/${pin.id}`}
             onMouseEnter={preloadEntryDetail}
             onFocus={preloadEntryDetail}
            className="mt-3 block w-full border-2 border-black px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white"
          >
            Open artist preview
           </Link>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-black hover:bg-black hover:text-white"
            >
              Sign in to view the full profile
            </button>
          )}
          {!isAuthenticated && (
            <a href="/explore?action=join&intent=network" className="mt-2 inline-block text-[8px] font-bold uppercase tracking-wider underline">
              Join free to apply for full access
            </a>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 font-mono lowercase w-full min-h-[300px] flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 bg-black/10 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-2 pt-1">
            <div className="h-3 bg-black/10 rounded w-3/4 animate-pulse" />
            <div className="h-2 bg-black/10 rounded w-1/2 animate-pulse" />
            <div className="h-2 bg-black/10 rounded w-2/3 animate-pulse" />
          </div>
        </div>
        <div className="h-2 bg-black/10 rounded w-full animate-pulse" />
        <div className="h-2 bg-black/10 rounded w-4/5 animate-pulse" />
        <div className="h-2 bg-black/10 rounded w-3/5 animate-pulse" />
        <div className="mt-2 h-8 bg-black/5 animate-pulse rounded-full" />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="p-5 font-mono text-[10px] leading-relaxed text-black/70">
        <p>This profile is available to approved Countercult network members.</p>
        <a href="/explore?action=join" className="mt-3 inline-block font-bold uppercase underline">
          Joining is free for artists and small cultural spaces
        </a>
      </div>
    );
  }

  const e = entry as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const locationLine = [entry.city, entry.country, e.postal].filter(Boolean).join(", ");
  const additionalBases = getAdditionalBaseCities({ city: entry.city, basedIn: e.basedIn });

  // Room swap attributes
  const roomSwapAttrs: { label: string; value: string }[] = [];
  if (e.swapType) roomSwapAttrs.push({ label: "type", value: e.swapType.replace(/_/g, " ") });
  if (e.spacePrivacy) roomSwapAttrs.push({ label: "privacy", value: e.spacePrivacy.replace(/_/g, " ") });
  if (e.financialStructure) roomSwapAttrs.push({ label: "terms", value: e.financialStructure.replace(/_/g, " ") });
  if (e.costDetails) roomSwapAttrs.push({ label: "cost", value: e.costDetails });
  if (e.durationTerms) roomSwapAttrs.push({ label: "duration", value: e.durationTerms });
  if (e.vibeTags) roomSwapAttrs.push({ label: "vibe", value: e.vibeTags });
  const spaceOfferTypes = Array.isArray(e.spaceOfferTypes) ? e.spaceOfferTypes as string[] : [];
  const hasSpaceOffer = entry.kind === "space" && e.spaceOfferAvailable === true;
  const spaceOfferPricingLabel = e.spaceOfferPricing === "free"
    ? "free for artists"
    : e.spaceOfferPricing === "paid"
      ? "paid work or fair cost"
      : e.spaceOfferPricing === "case_by_case"
        ? "case by case or skill exchange"
        : null;

  // Check for any contactable links
  const hasLinks = (e.externalLinks?.length > 0) || e.shopUrl || entry.url || e.contactHandle;
  const claimEmail = `mailto:countercultplatform@gmail.com?subject=${encodeURIComponent(`Claim request: ${entry.name}`)}&body=${encodeURIComponent(
    `Hello Countercult team,\n\nI represent ${entry.name} and would like to claim this space pin.\n\nLocation: ${[entry.city, entry.country].filter(Boolean).join(", ")}\nListing: ${window.location.origin}/entries/${entry.id}\n\nPlease let me know what verification you need.`,
  )}`;

  return (
    <div className="font-mono lowercase w-full bg-white">
      {/* Kind / claimed badges */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full text-[9px] uppercase tracking-widest bg-black text-[#c6ff3d] px-3 py-1">
            {entry.kind}
          </span>
          {e.secondaryKind && (
            <span className="rounded-full text-[9px] uppercase tracking-widest bg-black/10 text-black border border-black/20 px-3 py-1">
              {e.secondaryKind}
            </span>
          )}
          {e.isCommunitySubmitted === true && entry.isClaimed === false && (
            <span data-testid="community-unclaimed-badge" className="rounded-full text-[8px] uppercase tracking-widest bg-[#c6ff3d] text-black border border-black px-2 py-1">
              community submitted · unclaimed
            </span>
          )}
        </div>
      </div>

      {/* Name with consistent kind icon */}
      <div className="px-4 pb-3 flex items-start gap-3">
        <div className="w-14 h-14 shrink-0 bg-black/5 flex items-center justify-center">
          <SidebarAvatar name={entry.name} kind={entry.kind as EntryKind} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold uppercase leading-tight mb-1">{entry.name}</h3>
          {entry.blurb?.trim() ? (
            <p className="text-[11px] text-black/60 leading-relaxed mb-1.5 line-clamp-2">
              {entry.blurb.trim()}
            </p>
          ) : (
            <p className="text-[10px] text-black/35 italic leading-relaxed mb-1.5">
              bio coming soon
            </p>
          )}
          <p className="text-[10px] uppercase tracking-wide text-black/40 mb-1.5">{locationLine}</p>
          {additionalBases.length > 0 && (
            <p className="text-[9px] uppercase tracking-wide text-black/45 mb-1.5">
              also based in {additionalBases.join(" · ")}
            </p>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 5).map((tag, i) => (
                <span key={i} className="text-[8px] uppercase tracking-widest bg-black/5 text-black/50 px-1.5 py-0.5 border border-black/10">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open To tags */}
      {e.openTo && (e.openTo as string[]).length > 0 && (
        <div className="mx-4 mb-3">
          <p className="text-[8px] uppercase tracking-[0.15em] font-bold text-black/40 mb-1.5">open to</p>
          <div className="flex flex-wrap gap-1">
            {getPublicOpenTo(e.openTo as string[]).map((item: string) => (
              <span key={item} className="text-[8px] uppercase tracking-widest bg-[#c6ff3d]/30 text-black border border-black/10 px-2 py-0.5">
                {item === "residencies" || item === "residency opportunities" || item === "artist residencies" ? "hosting residencies" : item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Venue collaboration offer */}
      {hasSpaceOffer && (
        <div className="mx-4 mb-3 border-2 border-[#c6ff3d] bg-[#c6ff3d]/15 p-3">
          <p className="text-[8px] uppercase tracking-[0.15em] font-bold text-black/50 mb-1.5">space collaborations</p>
          <p className="text-[10px] text-black/75 leading-relaxed mb-2">
            open to sharing this space with artists for:
          </p>
          <div className="flex flex-wrap gap-1">
            {spaceOfferTypes.map((type) => (
              <span key={type} className="text-[8px] uppercase tracking-widest bg-white text-black border border-black/15 px-2 py-0.5">
                {type}
              </span>
            ))}
          </div>
          {spaceOfferPricingLabel && (
            <p className="mt-2 text-[9px] uppercase tracking-widest font-bold text-black">
              {spaceOfferPricingLabel}
            </p>
          )}
          {e.spaceOfferDetails && (
            <p className="mt-2 text-[10px] text-black/60 leading-relaxed">{e.spaceOfferDetails}</p>
          )}
        </div>
      )}

      {/* Room swap attributes (if any) */}
      {roomSwapAttrs.length > 0 && (
        <div className="mx-4 mb-3 border border-black/10 bg-black/[0.02] p-2.5 flex flex-col gap-1">
          <p className="text-[8px] uppercase tracking-[0.15em] font-bold text-black/40 mb-0.5">room / space config</p>
          {roomSwapAttrs.map(({ label, value }) => (
            <div key={label} className="flex gap-2 items-baseline">
              <span className="text-[8px] uppercase tracking-widest text-black/30 w-12 shrink-0">{label}</span>
              <span className="text-[10px] text-black/70 leading-tight">{value}</span>
            </div>
          ))}
          {e.dealbreakers && (
            <div className="flex gap-2 items-baseline">
              <span className="text-[8px] uppercase tracking-widest text-black/30 w-12 shrink-0">rules</span>
              <span className="text-[10px] text-black/70 leading-tight line-clamp-2">{e.dealbreakers}</span>
            </div>
          )}
          {e.noiseAndGuests && (
            <div className="flex gap-2 items-baseline">
              <span className="text-[8px] uppercase tracking-widest text-black/30 w-12 shrink-0">noise</span>
              <span className="text-[10px] text-black/70 leading-tight line-clamp-1">{e.noiseAndGuests}</span>
            </div>
          )}
        </div>
      )}

      {/* Maps link (always visible for spaces) */}
      {(entry.kind === "space" || entry.kind === "artifact") && (
        <div className="px-4 pb-2">
          <a
            href={
              e.lat != null && e.lng != null
                ? `https://www.google.com/maps?q=${e.lat},${e.lng}`
                : `https://www.google.com/maps/search/${encodeURIComponent([entry.name, entry.city, entry.country].filter(Boolean).join(", "))}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20 hover:bg-black hover:text-white transition-colors inline-block"
          >
            maps ↗
          </a>
        </div>
      )}

      {entry.kind === "space" && entry.isClaimed === false && (e.isCommunitySubmitted === true || e.hasContactEmail === false) && (
        <div className="mx-4 mb-3 border-2 border-black bg-[#F9F9F6] p-3" data-testid="unclaimed-space-contact">
          <p className="text-[9px] font-bold uppercase tracking-widest text-black">{e.isCommunitySubmitted ? "community suggestion · not owner-endorsed" : "is this your space?"}</p>
          <p className="mt-1 text-[9px] leading-relaxed text-black/60">
            {e.isCommunitySubmitted
              ? "This space was suggested by a community member and remains unclaimed. If you represent it, contact Countercult to request a claim. We verify every request before changing ownership or access."
              : "This pin has no contact email on file. If you represent this space, email Countercult to request a claim. We verify each request before updating the listing."}
          </p>
          <a
            href={claimEmail}
            data-testid="claim-space-email"
            className="mt-2 inline-block border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-black hover:bg-black hover:text-[#c6ff3d]"
          >
            claim this pin
          </a>
        </div>
      )}

      {/* ── Contact / links section - gated behind approval ── */}
      {hasLinks && (
        isApproved ? (
          <div className="px-4 pb-3">
            <p className="text-[8px] uppercase tracking-widest text-black/30 leading-relaxed mb-2 border-l-2 border-[#c6ff3d] pl-2">
              contacting this host is done entirely at your own discretion and risk under our zero-liability terms.
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {e.shopUrl && (
                <a href={e.shopUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-[#c6ff3d] text-black border border-black hover:bg-black hover:text-[#c6ff3d] transition-colors">
                  shop ↗
                </a>
              )}
              {cleanLinks((e.externalLinks as Array<{ platform: string; url: string }> | undefined) ?? []).map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20 hover:bg-black hover:text-white transition-colors">
                  {PLATFORM_SHORT[link.platform.toLowerCase()] ?? link.platform} ↗
                </a>
              ))}
              {e.contactHandle && (() => {
                const method: string = (e.contactMethod ?? "").toLowerCase();
                const handle: string = e.contactHandle ?? "";
                let href: string | null = null;
                if (method === "instagram") {
                  if (handle.startsWith("http")) { href = handle; }
                  else { href = `https://instagram.com/${handle.replace(/^@/, "")}`; }
                } else if (method === "whatsapp") {
                  href = `https://wa.me/${handle.replace(/[^0-9+]/g, "")}`;
                } else if (method === "email") {
                  href = `mailto:${handle}`;
                } else if (handle.startsWith("http")) {
                  href = handle;
                }
                return href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20 hover:bg-black hover:text-white transition-colors">
                    {method ? `${method}: ` : ""}{handle} ↗
                  </a>
                ) : (
                  <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20">
                    {method ? `${method}: ` : ""}{handle}
                  </span>
                );
              })()}
              {entry.url && (
                <a href={normalizeEntryUrl(entry.url)} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20 hover:bg-black hover:text-white transition-colors">
                  web ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-4 mb-3 relative overflow-hidden">
            {/* blurred preview */}
            <div className="blur-sm pointer-events-none select-none flex gap-1.5 flex-wrap p-2 border border-black/10 bg-black/[0.02]">
              <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20">ig ↗</span>
              <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20">contact@···</span>
              <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/5 text-black border border-black/20">web ↗</span>
            </div>
            {/* overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] p-2">
              <p className="text-[8px] uppercase tracking-widest text-black/50 text-center leading-relaxed">member-only contact info</p>
            </div>
          </div>
        )
      )}

      {/* Bottom CTA */}
      <div className="px-4 pb-4">
        <Link
          href={`/entries/${entry.id}`}
          onMouseEnter={preloadEntryDetail}
          onFocus={preloadEntryDetail}
          className="block w-full text-center py-2 bg-black clr-white rounded-full text-[11px] uppercase tracking-widest font-bold hover:bg-[#c6ff3d] hover:text-black transition-colors"
        >
          full voice →
        </Link>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------
type SidebarProps = {
  activeFilter: EntryKind | null;
  toggleFilter: (k: EntryKind) => void;
  entries: EntrySummary[];
  totalCount: number;
  isLoading: boolean;
  onCardClick: (e: EntrySummary) => void;
  activeId: number | null;
  onOpenSubmit: () => void;
  isMobile?: boolean;
};

function Sidebar({
  activeFilter,
  toggleFilter,
  entries,
  totalCount,
  isLoading,
  onCardClick,
  activeId,
  onOpenSubmit,
  isMobile = false,
}: SidebarProps) {
  return (
    <div
      className={`flex flex-col bg-white text-black ${
        isMobile
          ? "w-full h-full border-t border-black/10"
          : "w-[360px] h-full border-r border-black/10"
      } z-10`}
    >
      {/* Mobile-only: kind filter buttons */}
      {isMobile && (
        <div className="p-3 border-b border-black/10 shrink-0">
          <div className="flex gap-2">
            {(["artist", "space", "artifact"] as EntryKind[]).map((kind) => (
              <button
                key={kind}
                onClick={() => toggleFilter(kind)}
                className={`flex-1 py-1.5 text-xs rounded-full border-2 transition-colors uppercase tracking-wider font-bold ${
                  activeFilter === kind
                    ? "bg-black text-[#c6ff3d] border-black"
                    : activeFilter !== null
                    ? "border-black/10 text-black/20"
                    : "border-black/20 text-black/40 hover:border-black hover:text-black"
                }`}
              >
                <span className="mr-1">{KIND_GLYPH[kind]}</span>
                {kind}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-b border-black/10 shrink-0">
        <button
          onClick={onOpenSubmit}
          className="w-full py-2.5 bg-[#c6ff3d] rounded-full border-2 border-black text-black hover:bg-black hover:text-[#c6ff3d] transition-colors text-sm uppercase tracking-widest font-bold"
        >
          + add entry
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        <div className="text-[10px] uppercase tracking-widest text-black/30 mb-1 flex justify-between items-center">
          <span>{entries.length} / {totalCount}</span>
          {isLoading && <span className="animate-pulse text-black/40">loading…</span>}
        </div>

        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onCardClick(entry)}
            className={`group rounded-2xl border-2 border-black cursor-pointer transition-all duration-150 p-3 flex items-center gap-3 bg-white ${
              activeId === entry.id
                ? "bg-[#c6ff3d] -translate-x-0.5 -translate-y-0.5 shadow-[5px_5px_0px_rgba(0,0,0,1)]"
                : "shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]"
            }`}
          >
            {/* Consistent kind icon; profile images are reserved for profile pages. */}
            <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-black text-white">
              <span className="text-lg font-bold">
                {KIND_GLYPH[entry.kind as EntryKind]}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm uppercase truncate leading-tight text-black mb-0.5">
                {entry.name}
              </h4>
              <div className="text-[10px] font-semibold truncate text-black/70 mb-0.5">
                {entry.city}, {entry.country}
              </div>
              <div className="text-[10px] truncate text-black/40">
                <span className="uppercase tracking-wide">{entry.kind}{(entry as any).secondaryKind ? ` + ${(entry as any).secondaryKind}` : ""}</span>
                {entry.tags.length > 0 && <span> · {entry.tags.slice(0, 2).join(", ")}</span>}
              </div>
            </div>

            <span className="text-black/30 text-xs shrink-0">↗</span>
          </div>
        ))}

        {!isLoading && entries.length === 0 && (
          <div className="text-center text-black/20 text-sm py-10">no transmissions found.</div>
        )}
      </div>
    </div>
  );
}
