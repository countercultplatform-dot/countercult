import { Fragment, useState, useEffect, useRef } from "react";
import { useListResidencyOffers, useCreateResidencyOffer, useDeleteResidencyOffer, useUpdateResidencyOffer, setAuthTokenGetter, type ResidencyOffer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListResidencyOffersQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { ArrowUpRight, Building2, Briefcase, DoorOpen, Gift, House, Lightbulb, MapPin, Repeat2, Search, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { ExchangeExampleCard } from "@/components/ExchangeExampleCard";
import { compressExchangePhoto } from "@/lib/compressExchangePhoto";
import { ExchangeCommunitySticker } from "@/components/ExchangeCommunitySticker";
import { ExchangeBoardTabs } from "@/components/ExchangeBoardTabs";
import { OptionalPatronPostSupportStep } from "@/components/OptionalPatronPostSupportStep";
import { ExchangePhotoSlideshow, type ExchangePhoto } from "@/components/ExchangePhotoSlideshow";
import { EXCHANGE_EXAMPLES } from "@/data/exchangeExamples";
import { getExchangeComposerPrefill, type ExchangeComposerMode } from "@/lib/exchangeFlow";
import {
  toggleFreeExchangeFilter,
  getVisibleCountercultResidencies,
  isFreeExchangeOffer,
  type CountercultResidencyProgrammeId,
  type ExchangeBoardFilter,
} from "@/lib/exchangeFilters";
import {
  EXCHANGE_SUBFILTER_GROUPS,
  EXCHANGE_TAXONOMY_TAGS,
  getExchangeCategory,
  getExchangeCategories,
  getExchangeSubfilterLabel,
  getExchangeSubfilters,
  isPaidGigExchangeOffer,
  isExchangeTaxonomyTag,
  matchesExchangeFilter,
  matchesExchangeSubfilter,
  type ExchangeFilter,
  type ExchangeSubfilter,
} from "@/lib/exchangeCategories";
import { areSkillShareAnswersNearDuplicate } from "@/lib/skillShareText";

type BoardTab = "room_swap" | "venue_hosting" | "opportunities";
type BoardFilter = ExchangeBoardFilter;
type ExchangeIntent = "search" | "offer";
type ExchangeCostFilter = "all" | "free";
type ExchangeFeatureFilter = "photos" | "flexible" | "capacity";
type AuthStatus = "checking" | "anonymous" | "authenticated";

const TABS: { value: BoardTab; label: string; Icon: LucideIcon; description: string }[] = [
  { value: "room_swap", label: "rooms", Icon: House, description: "rooms and homes shared by approved members" },
  { value: "venue_hosting", label: "spaces", Icon: Building2, description: "places for work, shows, shoots, and events" },
  { value: "opportunities", label: "opportunities", Icon: Briefcase, description: "funded calls, partner offers, and collaborations" },
];

const EXCHANGE_VIBES: { value: BoardFilter; label: string; Icon: LucideIcon }[] = [
  { value: "all", label: "All", Icon: Sparkles },
  { value: "housing", label: "Housing", Icon: House },
  { value: "spaces", label: "Spaces", Icon: MapPin },
  { value: "skills", label: "Skills", Icon: Lightbulb },
  { value: "residency", label: "Residency", Icon: Sparkles },
  { value: "opportunities", label: "Opportunities", Icon: ArrowUpRight },
  { value: "paid_gigs", label: "Paid gigs", Icon: Briefcase },
  { value: "tools", label: "Tools", Icon: Wrench },
  { value: "swaps", label: "Swaps", Icon: Repeat2 },
];

const EXCHANGE_FILTER_OPTIONS = EXCHANGE_VIBES.filter(({ value }) => value !== "opportunities");

const EXCHANGE_CATEGORY_COLORS: Record<
  Exclude<BoardFilter, "all">,
  { backgroundColor: string; color: string }
> = {
  housing: { backgroundColor: "#c6ff3d", color: "#111" },
  spaces: { backgroundColor: "#ffc5a8", color: "#111" },
  skills: { backgroundColor: "#b8d8ff", color: "#111" },
  opportunities: { backgroundColor: "#e3c7ff", color: "#111" },
  residency: { backgroundColor: "#e3c7ff", color: "#111" },
  tools: { backgroundColor: "#b8e6d3", color: "#111" },
  swaps: { backgroundColor: "#ffcadd", color: "#111" },
  paid_gigs: { backgroundColor: "#c6ff3d", color: "#111" },
};

const SHARE_CHOICES: {
  value: "space" | "practice" | "partner_offer";
  label: string;
  Icon: LucideIcon;
  description: string;
}[] = [
  { value: "space", label: "Host an artist", Icon: Building2, description: "List a room, studio, venue, or workspace for artists. Choose whether it is free or paid." },
  { value: "practice", label: "Barter with an artist", Icon: Sparkles, description: "Offer a skill, item, or help and ask for a specific non-cash return. No money is allowed to be exchanged here." },
  { value: "partner_offer", label: "offer a resource or discount", Icon: Gift, description: "software, services, tickets, access, or a partner benefit" },
];

const SPACE_TYPES = [
  { value: "shared_room", label: "room in a shared space", description: "a private room with shared areas or facilities", Icon: DoorOpen },
  { value: "entire_apartment", label: "entire apartment / home", description: "a whole apartment, house, or self-contained place", Icon: House },
  { value: "entire_venue", label: "entire venue / workspace", description: "a whole studio, venue, office, or other working space", Icon: Building2 },
] as const;
type SpaceType = typeof SPACE_TYPES[number]["value"];
type HousingSubtype = "sublet" | "longterm" | "hosted";

const HOUSING_SUBTYPE_OPTIONS: { value: HousingSubtype; label: string; description: string }[] = [
  { value: "sublet", label: "Sublet", description: "temporary housing with clear rent and dates" },
  { value: "longterm", label: "Long-term housing", description: "a longer stay or ongoing housing arrangement" },
  { value: "hosted", label: "Hosted stay", description: "a free or short stay without a reciprocal swap" },
];
const HOUSING_SUBTYPE_TAGS: Record<HousingSubtype, string> = {
  sublet: EXCHANGE_TAXONOMY_TAGS.housingSublet,
  longterm: EXCHANGE_TAXONOMY_TAGS.housingLongTerm,
  hosted: EXCHANGE_TAXONOMY_TAGS.housingHosted,
};
const OFFER_FORM_MANAGED_TAXONOMY_TAGS = new Set<string>([
  EXCHANGE_TAXONOMY_TAGS.housingResidency,
  EXCHANGE_TAXONOMY_TAGS.housingSublet,
  EXCHANGE_TAXONOMY_TAGS.housingLongTerm,
  EXCHANGE_TAXONOMY_TAGS.housingHosted,
  EXCHANGE_TAXONOMY_TAGS.skillStayRequest,
  EXCHANGE_TAXONOMY_TAGS.includesWorkspace,
  EXCHANGE_TAXONOMY_TAGS.arrangementSwap,
]);

type OfferKind =
  | "host" | "swap" | "looking"
  | "workshop" | "concert" | "free_space" | "venue_offer"
  | "open_call" | "collab" | "gig" | "skill_share" | "partner_offer";
type SkillShareMode = "swap";
type AvailabilityMode = "dates" | "flexible";

function prioritizeHousingOffers(offers: ResidencyOffer[]): ResidencyOffer[] {
  const housing = offers.filter((offer) => offer.kind === "host");
  const swaps = offers.filter((offer) => offer.kind === "swap");
  const otherOffers = offers.filter((offer) => offer.kind !== "host" && offer.kind !== "swap");
  const ordered = housing.slice(0, 2);
  let housingIndex = 2;
  let swapIndex = 0;
  while (housingIndex < housing.length || swapIndex < swaps.length) {
    if (swapIndex < swaps.length) ordered.push(swaps[swapIndex++]);
    if (housingIndex < housing.length) ordered.push(housing[housingIndex++]);
  }
  return [...ordered, ...otherOffers];
}

const countercultFloorUrl = `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/the-floor`;
const artHousesBaseUrl = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
const ART_HOUSES_EXCHANGE_PHOTOS: ExchangePhoto[] = [
  {
    src: `${artHousesBaseUrl}images/art-houses/open-call-poster.webp`,
    alt: "Free art residency and accommodation in Berlin, supported by Countercult Network members and Patron Post.",
    position: "top",
  },
  {
    src: `${artHousesBaseUrl}images/art-houses/floor-staircase-room.webp`,
    alt: "A collage of the staircase and a bedroom at THE FLOOR.",
  },
  {
    src: `${artHousesBaseUrl}images/art-houses/artists-in-the-space.webp`,
    alt: "Artists talking among paintings at THE FLOOR.",
  },
];
const ART_HOUSES_EXCHANGE_DESCRIPTION =
  "A December residency at our secret art residency, THE FLOOR, for one artist or duo. Apply for any part of 16–26 December. Document your stay to share in a format you propose, such as a zine, journal, or mini-film/video. No rent or programme fee. Utilities are €75 for one artist or €150 total for a duo.";

const OFFER_KINDS: { value: OfferKind; label: string; glyph: string; tab: BoardTab; desc?: string }[] = [
  { value: "host", label: "offer housing", glyph: "⌂", tab: "room_swap", desc: "free hosting, sublet, rental, or short stay in a room or apartment" },
  { value: "swap", label: "swap", glyph: "⇄", tab: "room_swap", desc: "offer housing and consider a reciprocal arrangement" },
  { value: "workshop", label: "offer a workspace", glyph: "◈", tab: "venue_hosting", desc: "studio, office, warehouse, rehearsal room, home, or shoot" },
  { value: "concert", label: "offer an event space", glyph: "♪", tab: "venue_hosting", desc: "shop, bar, exhibition, screening, performance, or gathering" },
  { value: "free_space", label: "offer a free space", glyph: "★", tab: "venue_hosting", desc: "space for work, shoots, rehearsals, or gatherings at no cost" },
  { value: "venue_offer", label: "share your space with artists", glyph: "⊕", tab: "venue_hosting", desc: "exhibitions, coworking, small markets, shows, or collaborations" },
  { value: "open_call", label: "open call", glyph: "↗", tab: "opportunities" },
  { value: "collab", label: "collaboration", glyph: "⊕", tab: "opportunities" },
  { value: "skill_share", label: "Barter & Trade", glyph: "✦", tab: "opportunities", desc: "ask for a specific return; no money is allowed to be exchanged here" },
  { value: "partner_offer", label: "offer a resource or discount", glyph: "✺", tab: "opportunities", desc: "software, services, tickets, access, or a partner benefit" },
];

const PARTNER_SPACE_KINDS: OfferKind[] = ["workshop", "concert", "free_space", "venue_offer"];
const PARTNER_FUNDED_OPPORTUNITY_KINDS: OfferKind[] = ["open_call", "collab", "gig"];
const PARTNER_RESOURCE_OFFER_KINDS: OfferKind[] = ["partner_offer"];
const PARTNER_ALLOWED_POST_KINDS = [...PARTNER_SPACE_KINDS, ...PARTNER_FUNDED_OPPORTUNITY_KINDS, ...PARTNER_RESOURCE_OFFER_KINDS];

const THE_FLOOR_FEATURED_PHOTOS: ExchangePhoto[] = [
  "floor-1.webp",
  "floor-3.webp",
  "floor-2.webp",
  "floor-4.webp",
  "floor-5.webp",
].map((filename, index) => ({
  src: `${import.meta.env.BASE_URL}images/the-floor/${filename}`,
  alt: `The Floor artist residency space in Berlin, view ${index + 1}`,
}));
const DURATION_PRESET_LABELS: Record<string, string> = {
  shortterm: "short-term",
  midterm: "mid-term",
  longterm: "long-term",
};

const EXCHANGE_RESIDENCY_TAG = "exchange residency";
const EXCHANGE_RESIDENCY_RESIDENT_TAG = "exchange residency resident";
const EXCHANGE_RESIDENCY_COHORT = {
  from: "1 February 2027",
  to: "28 February 2027",
  label: "1–28 February 2027",
  slots: "up to 4 artists",
};

function isExchangeResidencyTag(tag: string) {
  return tag.trim().toLowerCase() === EXCHANGE_RESIDENCY_TAG;
}

function isExchangeResidencyResidentTag(tag: string) {
  return tag.trim().toLowerCase() === EXCHANGE_RESIDENCY_RESIDENT_TAG;
}

function ExchangeResidencyBanner({ onApply, compact = false }: { onApply?: () => void; compact?: boolean }) {
  return (
    <section className={`relative border-2 border-black bg-[#c6ff3d] text-black shadow-[6px_6px_0_#000] ${compact ? "mb-6 rotate-[0.25deg]" : "mt-7"}`}>
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-widest">exchange residency · {EXCHANGE_RESIDENCY_COHORT.slots}</div>
            <h3 className="text-lg font-black uppercase leading-none tracking-tight sm:text-xl">swap a room with an artist.</h3>
          </div>
          <span aria-hidden="true" className="shrink-0 text-xl leading-none">⌄</span>
        </summary>
        <div className="border-t-2 border-black/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] leading-relaxed">
                one month, {EXCHANGE_RESIDENCY_COHORT.label}. city and rural rooms welcome.
              </p>
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {onApply && (
                <button
                  type="button"
                  onClick={onApply}
                  className="w-full border-2 border-black bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-white hover:text-black sm:w-auto"
                >
                  apply for february →
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-black/20 pt-3 text-[10px] leading-relaxed">
            <p><strong>no rent.</strong> no programme fee. artists arrange the exchange directly.</p>
            <p><strong>what happens next.</strong> Countercult curates the match and supports the shared window.</p>
          </div>
          <details className="mt-3 border-t border-black/20 pt-2 text-[10px] leading-relaxed">
            <summary className="cursor-pointer font-bold uppercase tracking-widest">read the practical details</summary>
            <p className="mt-2 max-w-3xl text-black/70">
              accepted artists receive calls, mentors, a certificate, and a feature in Countercult media. Countercult does not provide funding, travel, visas,
              meals, insurance, or local living costs. participants are responsible for their own decisions, safety, and agreements.
            </p>
          </details>
          <p className="mt-3 border-t border-black/20 pt-3 text-[10px] leading-relaxed text-black/70">
            this is a free notice board, not a housing provider, broker, guarantor, insurer, emergency service, or party to your agreement.
            verify identity, permission, terms, safety, and local law yourself. if someone behaves abusively, fraudulently, dangerously, or otherwise does you dirty,
            <a href="mailto:countercultplatform@gmail.com?subject=Exchange safety report" className="font-bold underline underline-offset-2 hover:text-black"> report it to Countercult</a>.
            confirmed serious misconduct means permanent removal from the network.
          </p>
        </div>
      </details>
    </section>
  );
}

function FloorApplicationBanner() {
  return (
    <article className="exchange-listing-card exchange-floor-card" aria-labelledby="exchange-floor-title" data-testid="card-exchange-floor">
      <div
        className="exchange-listing-top flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
        style={EXCHANGE_CATEGORY_COLORS.housing}
      >
        <span className="exchange-floor-kicker-title">THE FLOOR</span>
        <span className="exchange-feature-label">featured listing</span>
      </div>
      <div className="exchange-listing-content exchange-floor-content">
        <h3 id="exchange-floor-title" className="exchange-listing-title">
          <span className="exchange-listing-place">Berlin</span>: housing + space
        </h3>
        <p className="exchange-listing-subtitle">Residency</p>
        <p className="exchange-listing-description">A Berlin residency space for artists who need focused time, want to live around other artists, and want to connect to the local creative network.</p>
      </div>
      <ExchangePhotoSlideshow
        className="exchange-floor-image"
        photos={THE_FLOOR_FEATURED_PHOTOS}
        label="The Floor residency space in Berlin"
        aspect="portrait"
        testId="image-exchange-floor-open-call"
      />
      <dl className="exchange-floor-facts">
        <div><dt>Availability</dt><dd>Rolling applications</dd></div>
        <div><dt>Length</dt><dd>Full calendar months</dd></div>
      </dl>
      <div className="exchange-floor-actions">
        <a href={countercultFloorUrl} data-testid="link-exchange-floor-details" className="exchange-apply-link">
          See more <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>
    </article>
  );
}

function ExchangeSafetyNotice() {
  return (
    <details className="mb-7 border border-black bg-white shadow-[4px_4px_0_#c6ff3d]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-black/75 transition-colors hover:bg-white hover:text-black [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-black/65">before you arrange anything</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">read the safety notice</span>
        </span>
        <span aria-hidden="true" className="text-lg leading-none">⌄</span>
      </summary>
      <div className="border-t border-black/15 p-4 sm:p-5" aria-labelledby="exchange-safety-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="max-w-3xl">
            <h2 id="exchange-safety-heading" className="text-sm font-black uppercase tracking-widest">the Exchange is a free notice board.</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-black/65">
              Countercult is not a housing provider, broker, guarantor, insurer, emergency service, or party to member agreements.
              Check identity, permission to offer the space, written terms, price, safety, insurance, and local law independently.
              We cannot guarantee physical safety or investigate every dispute.
            </p>
          </div>
          <a
            href="mailto:countercultplatform@gmail.com?subject=Exchange safety report"
            className="shrink-0 border border-black bg-[#c6ff3d] px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#c6ff3d]"
          >
            report a problem →
          </a>
        </div>
        <p className="mt-3 border-t border-black/10 pt-3 text-[10px] leading-relaxed text-black/55">
          abusive, fraudulent, dangerous, or otherwise harmful behaviour should be reported to{" "}
          <a href="mailto:countercultplatform@gmail.com?subject=Exchange safety report" className="font-bold text-black underline underline-offset-2">
            countercultplatform@gmail.com
          </a>
          . confirmed serious misconduct results in permanent removal from Countercult, with reinstatement only if we made a clear factual error.
        </p>
      </div>
    </details>
  );
}

function ExchangeExamplesSection({ expanded = false }: { expanded?: boolean }) {
  return (
    <section aria-labelledby="exchange-examples-heading" className="mb-7 -rotate-[0.15deg] border-2 border-black bg-white shadow-[4px_4px_0_#000]">
      <details open={expanded || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-black [&::-webkit-details-marker]:hidden">
          <span id="exchange-examples-heading" className="text-sm font-black uppercase tracking-[0.12em]">
            confused on how to share? here’s examples
          </span>
          <span aria-hidden="true" className="text-xl font-bold leading-none">+</span>
        </summary>
        <div className="border-t-2 border-black px-4 pb-5 pt-4">
          <p className="mb-4 text-sm leading-relaxed text-black">
            See how artists and cultural operators use the Exchange. Choose the closest path when you post.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {EXCHANGE_EXAMPLES.map((example) => (
              <ExchangeExampleCard key={`${example.kind}-${example.city}`} example={example} compact />
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

interface LocalSession {
  token: string;
  entryId: number | null;
  entryName: string;
  email: string;
  expiresAt: string;
  accountRole?: "member" | "partner_poster";
  isApproved?: boolean;
  canPostPartnerOffers?: boolean;
}

function loadSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const s = JSON.parse(raw) as LocalSession;
    if (new Date(s.expiresAt) < new Date()) {
      localStorage.removeItem("cc_auth");
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function safeExchangeLocation(value?: string | null) {
  const location = value?.trim() ?? "";
  if (!location) return "";
  const looksLikeAddress = /\d/.test(location) ||
    /\b(street|st\.|strasse|straße|road|rd\.|avenue|ave\.|boulevard|blvd\.|apt\.?|apartment|unit|postcode|postal code|zip)\b/i.test(location);
  return looksLikeAddress ? "location shared privately" : location;
}

export default function Residency() {
  const query = new URLSearchParams(window.location.search);
  const requestedAction = query.get("action");
  const isMineView = query.get("view") === "mine";
  const availableExchangeFilterOptions = isMineView
    ? EXCHANGE_FILTER_OPTIONS.filter(({ value }) => value !== "residency")
    : EXCHANGE_FILTER_OPTIONS;
  const requestedOfferKind = OFFER_KINDS.find((offerKind) => offerKind.value === query.get("kind"));
  const [activeFilter, setActiveFilter] = useState<BoardFilter>("all");
  const [costFilter, setCostFilter] = useState<ExchangeCostFilter>("all");
  const [activeSubfilter, setActiveSubfilter] = useState<ExchangeSubfilter | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<ExchangeFeatureFilter[]>([]);
  const [masonryGrid, setMasonryGrid] = useState<HTMLDivElement | null>(null);
  const [intent, setIntent] = useState<ExchangeIntent>(
    requestedAction === "offer" ? "offer" : "search",
  );
  const [session, setSession] = useState<LocalSession | null>(() => loadSession());
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => loadSession() ? "checking" : "anonymous");
  const isPartnerPoster = Boolean(session?.canPostPartnerOffers || session?.accountRole === "partner_poster");
  const isPartnerWorkspaceRoute = window.location.pathname === "/partner-workspace";
  const isPartnerContext = isPartnerPoster || isPartnerWorkspaceRoute;
  const isAuthenticated = authStatus === "authenticated" && Boolean(session);
  const visibleIntent: ExchangeIntent = isPartnerContext ? "offer" : intent;
  const [hasApprovedPin, setHasApprovedPin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [postChoiceOpen, setPostChoiceOpen] = useState(requestedAction === "offer" && !requestedOfferKind);
  const [spaceChoiceOpen, setSpaceChoiceOpen] = useState(false);
  const [postMode, setPostMode] = useState<BoardTab | null>(requestedOfferKind?.tab ?? null);
  const [postInitialKind, setPostInitialKind] = useState<OfferKind | undefined>(requestedOfferKind?.value);
  const [exchangeResidencyPrefill, setExchangeResidencyPrefill] = useState(false);
  const [cityFilter, setCityFilter] = useState(""); // used as general keyword search
  const [searchScrollRequested, setSearchScrollRequested] = useState(false);
  const [pendingOfferSubmitted, setPendingOfferSubmitted] = useState(false);

  const selectExchangeFilter = (filter: BoardFilter) => {
    setActiveFilter(filter);
    setActiveSubfilter(null);
    if (filter === "residency") {
      setCostFilter("all");
      setSelectedFeatures([]);
    }
  };

  const toggleFreeFilter = () => {
    const next = toggleFreeExchangeFilter({
      category: activeFilter,
      subfilter: activeSubfilter,
      cost: costFilter,
    });
    setCostFilter(next.cost);
    setActiveFilter(next.category);
    setActiveSubfilter(next.subfilter);
  };

  const resetExchangeFilters = () => {
    setActiveFilter("all");
    setCostFilter("all");
    setActiveSubfilter(null);
    setSelectedFeatures([]);
    setCityFilter("");
  };

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
    setSession(null);
    setAuthStatus("anonymous");
    setShowForm(false);
    setExchangeResidencyPrefill(false);
  };

  useEffect(() => {
    if (authStatus === "authenticated" && session) {
      setAuthTokenGetter(() => session.token);
    } else {
      setAuthTokenGetter(null);
    }
    return () => { setAuthTokenGetter(null); };
  }, [authStatus, session?.token]);

  useEffect(() => {
    const syncSession = () => {
      const nextSession = loadSession();
      setSession(nextSession);
      setAuthStatus(nextSession ? "checking" : "anonymous");
      if (!nextSession) {
        setHasApprovedPin(false);
        setIntent("search");
        setShowForm(false);
        setPostChoiceOpen(false);
        setSpaceChoiceOpen(false);
      }
    };
    window.addEventListener("cc:session-change", syncSession);
    return () => window.removeEventListener("cc:session-change", syncSession);
  }, []);

  useEffect(() => {
    if (!searchScrollRequested || visibleIntent !== "search") return;

    const frameId = window.requestAnimationFrame(() => {
      const searchTarget = document.getElementById("exchange-search");
      searchTarget?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
      setSearchScrollRequested(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [searchScrollRequested, visibleIntent]);

  const { data: offersData, isFetching, isLoading, isError, refetch } = useListResidencyOffers({
    query: {
      // Keep anonymous and authenticated results in separate caches. A
      // network-only post must appear immediately after a member signs in,
      // rather than waiting for the anonymous cache to go stale.
      queryKey: [
        ...getListResidencyOffersQueryKey(),
        authStatus === "authenticated"
          ? hasApprovedPin
            ? "approved-member"
            : "pending-member"
          : "public",
      ],
      // The board is public, but never send an expired local session as if it
      // were authenticated while the server session is being checked.
      enabled: authStatus !== "checking",
    },
  });
  const offers = Array.isArray(offersData) ? offersData : [];
  const locationOptions = [...new Set(offers.map((offer) => safeExchangeLocation(offer.city)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const searchSuggestions = [...new Set([
    ...locationOptions,
    ...EXCHANGE_FILTER_OPTIONS.filter(({ value }) => value !== "all").map(({ label }) => label.toLowerCase()),
    ...Object.values(EXCHANGE_SUBFILTER_GROUPS).flatMap((group) => group.map(({ label }) => label.toLowerCase())),
  ])].slice(0, 32);

  useEffect(() => {
    if (window.location.hash !== "#substack-signup" || authStatus === "checking" || isLoading || isFetching) return;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("substack-signup")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [authStatus, isFetching, isLoading]);

  useEffect(() => {
    let active = true;
    const sessionToken = session?.token;
    if (!sessionToken) {
      setHasApprovedPin(false);
      setAuthStatus("anonymous");
      return;
    }

    setAuthStatus("checking");
    fetch("/api/auth/me", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Cache-Control": "no-cache",
      },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ isApproved?: boolean; accountRole?: "member" | "partner_poster"; canPostPartnerOffers?: boolean; entries?: Array<{ status?: string }> }>;
      })
      .then((data) => {
        if (!active) return;
        if (!data) {
          localStorage.removeItem("cc_auth");
          setSession(null);
          setHasApprovedPin(false);
          setAuthStatus("anonymous");
          return;
        }
        setSession((current) => {
          if (!current || current.token !== sessionToken) return current;
          const nextSession = {
            ...current,
            isApproved: Boolean(data.isApproved),
            accountRole: data.accountRole ?? current.accountRole,
            canPostPartnerOffers: Boolean(data.canPostPartnerOffers),
          };
          localStorage.setItem("cc_auth", JSON.stringify(nextSession));
          return nextSession;
        });
        const approved = Boolean(data?.isApproved && data.entries?.some((entry) => entry.status === "published"));
        setHasApprovedPin(approved);
        setAuthStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("cc_auth");
        setSession(null);
        setHasApprovedPin(false);
        setAuthStatus("anonymous");
      });

    return () => { active = false; };
  }, [session?.token]);

  useEffect(() => {
    if (!isPartnerContext) return;
    setIntent("offer");
    setPostChoiceOpen(true);
    setSpaceChoiceOpen(false);
    setShowForm(false);
  }, [isPartnerContext]);

  useEffect(() => {
    if (!requestedOfferKind || requestedAction !== "offer" || isPartnerContext || authStatus !== "authenticated") return;
    setIntent("offer");
    setPostChoiceOpen(false);
    setSpaceChoiceOpen(false);
    setPostMode(requestedOfferKind.tab);
    setPostInitialKind(requestedOfferKind.value);
    setShowForm(true);
  }, [authStatus, hasApprovedPin, isPartnerContext, requestedAction, requestedOfferKind]);

  const tabKinds = OFFER_KINDS.map((k) => k.value);
  const filtered = offers.filter((o) => {
    if (!o.isPublicPreview && !tabKinds.includes(o.kind as OfferKind)) return false;
    return true;
  });
  const cityFiltered = cityFilter.trim()
    ? filtered.filter((o) => {
        const q = cityFilter.toLowerCase();
        return (
          o.city?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          o.entryName?.toLowerCase().includes(q) ||
          o.kind?.toLowerCase().includes(q) ||
          o.destination?.toLowerCase().includes(q) ||
          o.cost?.toLowerCase().includes(q)
        );
      })
    : filtered;
  const isCuratedResidencyView = activeFilter === "residency" && !isMineView && !isPartnerContext;
  const visibleResidencyProgrammeIds = isCuratedResidencyView
    ? getVisibleCountercultResidencies(cityFilter)
    : [];
  const categoryFiltered = activeFilter === "residency"
    ? cityFiltered.filter((offer) => matchesExchangeSubfilter(offer, "housing_residency"))
    : activeFilter === "paid_gigs"
      ? cityFiltered.filter(isPaidGigExchangeOffer)
    : cityFiltered.filter((offer) =>
        matchesExchangeFilter(offer, activeFilter as ExchangeFilter) &&
        (!activeSubfilter || matchesExchangeSubfilter(offer, activeSubfilter))
      );
  const costFiltered = costFilter === "free"
    ? categoryFiltered.filter(isFreeExchangeOffer)
    : categoryFiltered;
  const featureFiltered = selectedFeatures.reduce((result, feature) => result.filter((offer) => {
    if (feature === "photos") {
      const publicPhotoUrls = (offer as ResidencyOffer & { publicPhotoUrls?: string[] }).publicPhotoUrls ?? [];
      return offer.isPublicPreview
        ? publicPhotoUrls.length > 0
        : Boolean(offer.photos?.length || offer.publicPhotos?.length);
    }
    if (feature === "flexible") return offer.availabilityMode === "flexible";
    return Boolean(offer.capacity?.trim());
  }), costFiltered);
  const visibleOffers = isMineView
    ? featureFiltered.filter((offer) => offer.isOwn)
    : prioritizeHousingOffers(featureFiltered);
  const visibleResultCount = isCuratedResidencyView
    ? visibleResidencyProgrammeIds.length + visibleOffers.length
    : visibleOffers.length;
  const hasActiveListingFilters = Boolean(
    cityFilter.trim() ||
    activeFilter !== "all" ||
    activeSubfilter ||
    costFilter !== "all" ||
    selectedFeatures.length
  );
  const showPublicExamples = authStatus === "anonymous" && !isMineView && !isPartnerContext && !hasActiveListingFilters;
  const currentTab = { value: "all" as const, label: "all", glyph: "◉", description: "all offers shared by the network" };

  useEffect(() => {
    if (!masonryGrid) return;

    let frame = 0;
    let previousGridWidth = 0;
    const items = () =>
      Array.from(masonryGrid.querySelectorAll<HTMLElement>(":scope > .exchange-masonry-item"));

    const layout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const gridWidth = masonryGrid.clientWidth;
        if (!gridWidth) return;

        const styles = window.getComputedStyle(masonryGrid);
        const columnCount = Math.max(1, Number(styles.getPropertyValue("--exchange-masonry-columns")) || 1);
        const columnGap = Number.parseFloat(styles.columnGap) || 0;
        const rowGap = Number.parseFloat(styles.rowGap) || 0;
        const itemWidth = (gridWidth - columnGap * (columnCount - 1)) / columnCount;
        const columnHeights = Array<number>(columnCount).fill(0);

        for (const item of items()) {
          item.style.width = `${itemWidth}px`;
          const column = columnHeights.indexOf(Math.min(...columnHeights));
          item.style.left = `${column * (itemWidth + columnGap)}px`;
          item.style.top = `${columnHeights[column]}px`;
          columnHeights[column] += item.getBoundingClientRect().height + rowGap;
        }

        masonryGrid.style.height = `${Math.max(0, ...columnHeights) - (items().length ? rowGap : 0)}px`;
        previousGridWidth = gridWidth;
      });
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === masonryGrid && entry.contentRect.width !== previousGridWidth)) {
        layout();
        return;
      }
      if (entries.some((entry) => entry.target !== masonryGrid)) layout();
    });
    const observeItems = () => {
      for (const item of items()) resizeObserver.observe(item);
      layout();
    };
    const mutationObserver = new MutationObserver(observeItems);

    resizeObserver.observe(masonryGrid);
    mutationObserver.observe(masonryGrid, { childList: true });
    window.addEventListener("resize", layout);
    observeItems();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", layout);
    };
  }, [masonryGrid]);

  const closeComposer = () => {
    setShowForm(false);
    setPostChoiceOpen(false);
    setSpaceChoiceOpen(false);
    setPostMode(null);
    setPostInitialKind(undefined);
    setExchangeResidencyPrefill(false);
  };

  const choosePostMode = (
    mode: BoardTab,
    forExchangeResidency = false,
    initialKind?: OfferKind,
  ) => {
    setPostMode(mode);
    setPostInitialKind(initialKind);
    setExchangeResidencyPrefill(forExchangeResidency && mode === "room_swap");
    setPostChoiceOpen(false);
    setSpaceChoiceOpen(false);
    setShowForm(true);
  };

  const openSearch = () => {
    if (isPartnerContext) return;
    setActiveFilter("all");
    setIntent("search");
    closeComposer();
    setSearchScrollRequested(true);
  };

  const openOffer = (mode: ExchangeComposerMode = "standard") => {
    const prefill = getExchangeComposerPrefill(mode);
    setIntent("offer");
    setShowForm(false);
    setPostMode(null);
    setPostInitialKind(undefined);
    setSpaceChoiceOpen(false);
    setExchangeResidencyPrefill(prefill.exchangeResidency);
    setPostChoiceOpen(true);
  };

  if (isMineView && authStatus !== "authenticated") {
    return (
      <main className="min-h-[100dvh] bg-[#F9F9F6] px-5 py-10 text-black">
        <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col justify-center">
          <div className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_#000] sm:p-10">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-black/45">member workspace</p>
            <h1 className="mt-5 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">
              {authStatus === "checking" ? "checking your sign-in" : "sign in to edit your listings"}
            </h1>
            {authStatus === "anonymous" && (
              <a
                href="/explore?action=signin"
                className="mt-7 inline-flex border-2 border-black bg-[#c6ff3d] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                sign in →
              </a>
            )}
            <a href="/residency" className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-widest text-black/45 underline underline-offset-4 hover:text-black">
              back to the public resource board
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      className={`exchange-page min-h-[100dvh] bg-white text-black lowercase selection:bg-[#c6ff3d] selection:text-black ${
        visibleIntent === "offer" && !isPartnerContext ? "exchange-member-post-screen" : ""
      }`}
      style={{
        fontFamily: visibleIntent === "offer" && !isPartnerContext
          ? "Arial, Helvetica, sans-serif"
          : "var(--cc-body)",
      }}
      data-cc-editing={visibleIntent === "offer" ? "true" : undefined}
    >
      {visibleIntent === "offer" && !isPartnerContext && (
        <style>{`.exchange-member-post-screen, .exchange-member-post-screen * { font-family: Arial, Helvetica, sans-serif !important; }`}</style>
      )}
      {!isPartnerContext && <ExchangeBoardTabs active="exchange" />}

      <header className="exchange-header sticky top-0 z-20 border-b border-black/10">
        <div className="exchange-header-main mx-auto grid w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="exchange-brand flex min-w-0 items-center gap-3">
            <a href={isPartnerContext ? "/partner-workspace?action=offer" : "/explore"} className="shrink-0">
              <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            </a>
            {!isPartnerContext && visibleIntent !== "offer" ? (
              <span className="truncate text-xs font-bold uppercase leading-none tracking-widest text-black">exchange</span>
            ) : (
              <h1 className="truncate text-xs font-bold uppercase leading-none tracking-widest text-black">{isPartnerContext ? "partner workspace" : "share something"}</h1>
            )}
          </div>
          {!isPartnerContext && visibleIntent !== "offer" ? (
            <div className="exchange-header-tools">
              <h1 className="exchange-board-title">artists sharing with artists</h1>
              <div className="exchange-header-controls">
              <div id="exchange-search" data-testid="exchange-search" className="exchange-searchbox exchange-header-search flex min-w-0 items-center gap-2">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-black/50" />
                <label className="sr-only" htmlFor="exchange-search-input">Search Exchange listings</label>
                <input
                  id="exchange-search-input"
                  type="text"
                  list="exchange-location-options"
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  placeholder="try berlin, housing, a workspace..."
                  className="exchange-search-input min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-bold text-black placeholder:text-black/35 focus:outline-none"
                />
                <datalist id="exchange-location-options">
                  {searchSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
                </datalist>
                {cityFilter && (
                  <button
                    type="button"
                    onClick={() => setCityFilter("")}
                    aria-label="Clear Exchange search"
                    className="exchange-clear-search border-l border-black/15 px-2 text-[9px] font-black uppercase tracking-widest text-black/50 transition-colors hover:text-black"
                  >
                    clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("exchange-search-input")?.focus();
                  }}
                  aria-label="Search Exchange listings"
                  className="exchange-search-submit inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-black px-4 font-mono text-[9px] font-black uppercase tracking-wider text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black sm:px-5"
                >
                  search
                </button>
              </div>
              <button
                type="button"
                onClick={() => openOffer()}
                aria-label="Share something on the Exchange"
                data-testid="button-residency-share"
                className="exchange-share-button inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-black bg-[#c6ff3d] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-[#c6ff3d] sm:px-5 sm:text-[11px]"
              >
                share something
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
              </div>
            </div>
          ) : (
            <div className="exchange-header-search-placeholder" aria-hidden="true" />
          )}
          <div className="exchange-header-actions flex shrink-0 items-center justify-end gap-3">
            {isPartnerContext ? (
              <button type="button" onClick={handleSignOut} className="text-[10px] font-bold uppercase tracking-widest text-black/55 transition-colors hover:text-black">sign out</button>
            ) : visibleIntent === "offer" ? (
              <button
                type="button"
                onClick={openSearch}
                data-testid="button-residency-search"
                className="rounded-full border border-black/15 bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-black transition-colors hover:border-black hover:bg-[#f3f3ee] sm:px-5 sm:text-[10px]"
              >
                browse listings
              </button>
            ) : null}
            {!isPartnerContext && (
              <a href="/explore" className="hidden text-[9px] font-bold uppercase tracking-widest text-black/55 transition-colors hover:text-black sm:inline-block">map</a>
            )}
          </div>
        </div>
      </header>

      {!isPartnerContext && visibleIntent !== "offer" && (
        <div className="exchange-vibe-strip lg:hidden">
          <div role="group" aria-label="Filter Exchange listings" className="exchange-category-filters">
            {availableExchangeFilterOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={activeFilter === value}
                onClick={() => selectExchangeFilter(value)}
                className="exchange-category-filter"
              >
                <Icon aria-hidden="true" size={14} />
                <span>{label}</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={costFilter === "free"}
              aria-label="Show only free Exchange listings"
              onClick={toggleFreeFilter}
              className="exchange-category-filter"
            >
              <Gift aria-hidden="true" size={14} />
              <span>Free</span>
            </button>
          </div>
          {(activeFilter === "housing" || activeFilter === "spaces") && (
            <div
              role="group"
              aria-label={`Filter ${activeFilter} listings by type`}
              className="exchange-subfilters"
            >
              <button
                type="button"
                aria-pressed={activeSubfilter === null}
                onClick={() => setActiveSubfilter(null)}
                className="exchange-subfilter"
              >
                Any {activeFilter === "housing" ? "housing" : "space"}
              </button>
              {EXCHANGE_SUBFILTER_GROUPS[activeFilter].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={activeSubfilter === value}
                  onClick={() => setActiveSubfilter(value)}
                  className="exchange-subfilter"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-none px-4 py-4 sm:px-6 sm:py-5 lg:px-10 2xl:px-14">
        {isPartnerContext && (
          <div className="mb-6 border-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] leading-relaxed text-black">
            <strong className="uppercase tracking-widest">partner workspace</strong>
            <span className="ml-2">offer paid or funded work, artist-rate space, or useful resources and discounts. this account is for partner publishing only, with no cultural voice, map pin, or member directory.</span>
            <a href="/fund/playbook" className="mt-3 inline-block border border-black px-3 py-2 font-bold uppercase tracking-widest hover:bg-black hover:text-[#c6ff3d]">start a Countercult Fund →</a>
          </div>
        )}
        <>
            {visibleIntent === "offer" ? (
              <>
                {!isAuthenticated ? (
                  <>
                    {isPartnerContext ? (
                      <div className="mx-auto mb-6 w-full max-w-xl border-2 border-black bg-white p-8 text-center">
                        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-black">sign in to use the partner workspace</p>
                        <p className="mb-6 text-[11px] leading-relaxed text-black/50">publish resources, discounts, access, or space without creating a cultural profile.</p>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                          <a href="/explore?action=signin" className="border-2 border-black bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]">sign in →</a>
                          <a href="/explore?action=join&partner=1" className="border-2 border-black/25 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-black/65 transition-colors hover:border-black hover:text-black">apply as a partner</a>
                        </div>
                      </div>
                    ) : (
                      <section
                        className="relative z-[9450] mx-auto mb-7 w-full max-w-5xl"
                        aria-labelledby="exchange-post-choice-heading"
                        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                      >
                        <div className="mb-4 border-2 border-black bg-[#ffd7e8] px-5 py-4 shadow-[4px_4px_0_#000] sm:px-6">
                          <h2 id="exchange-post-choice-heading" className="text-2xl font-bold leading-tight sm:text-3xl">
                            What do you want to post?
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <article className="flex min-h-64 flex-col border-2 border-black bg-[#c6ff3d] p-5 shadow-[4px_4px_0_#000] sm:p-6">
                            <Building2 aria-hidden="true" className="h-7 w-7" strokeWidth={2} />
                            <h3 className="mt-4 text-xl font-bold">Host an artist</h3>
                            <p className="mt-2 text-sm leading-snug">List a room, studio, venue, or workspace for artists. Choose whether it is free or paid.</p>
                            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                              <a href="/explore?action=signin&from=exchange" className="border-2 border-black bg-black px-3 py-2.5 text-sm font-bold text-white hover:bg-white hover:text-black">Sign in</a>
                              <a href="/explore?action=join&from=exchange" className="border-2 border-black bg-white px-3 py-2.5 text-sm font-bold hover:bg-black hover:text-white">Join free</a>
                            </div>
                          </article>
                          <article className="flex min-h-64 flex-col border-2 border-black bg-[#c6ff3d] p-5 shadow-[4px_4px_0_#000] sm:p-6">
                            <Repeat2 aria-hidden="true" className="h-7 w-7" strokeWidth={2} />
                            <h3 className="mt-4 text-xl font-bold">Barter with an artist</h3>
                            <p className="mt-2 text-sm leading-snug">Offer a skill, item, or help and ask for a specific non-cash return. No money is allowed to be exchanged here.</p>
                            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                              <a href="/explore?action=signin&from=exchange" className="border-2 border-black bg-black px-3 py-2.5 text-sm font-bold text-white hover:bg-white hover:text-black">Sign in</a>
                              <a href="/explore?action=join&from=exchange" className="border-2 border-black bg-white px-3 py-2.5 text-sm font-bold hover:bg-black hover:text-white">Join free</a>
                            </div>
                          </article>
                          <article className="flex min-h-64 flex-col border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000] sm:p-6">
                            <Briefcase aria-hidden="true" className="h-7 w-7" strokeWidth={2} />
                            <h3 className="mt-4 text-xl font-bold">Adverts</h3>
                            <p className="mt-2 text-sm leading-snug">Paid gigs, jobs, and opportunities. No sign-in needed.</p>
                            <a href="/adverts?direction=hiring" className="mt-auto inline-flex w-fit items-center gap-2 border-2 border-black bg-black px-3 py-2.5 text-sm font-bold text-white hover:bg-white hover:text-black">
                              Post an advert
                              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                            </a>
                          </article>
                        </div>
                      </section>
                    )}
                    <ExchangeExamplesSection />
                  </>
                ) : isPartnerContext && session?.isApproved === false && !session.canPostPartnerOffers ? (
                  <div className="max-w-xl mx-auto border-2 border-black bg-[#c6ff3d] p-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-black mb-3">partner account under review</p>
                    <p className="text-[11px] text-black/65 leading-relaxed">
                      Countercult reviews institution, venue, funder, and business accounts before they can publish to the Exchange. Your account is saved, but nothing can be posted until approval.
                    </p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-6 text-[10px] uppercase tracking-widest font-bold border-2 border-black px-5 py-3 bg-white hover:bg-black hover:text-[#c6ff3d] transition-colors"
                    >
                      sign out
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-8 grid w-full max-w-3xl grid-cols-1 gap-4">
                      <div className="relative rotate-[-0.35deg] border-2 border-black bg-[#ffd7e8] p-5 shadow-[6px_6px_0_#000] sm:p-6">
                        <span className="absolute -right-2 -top-3 rotate-6 border-2 border-black bg-[#c6ff3d] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#000]">posting is separate from browsing</span>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/55">share something useful</p>
                          <h2 className="mt-3 max-w-xl text-3xl font-black uppercase leading-[0.88] tracking-[-0.05em] text-black sm:text-5xl">{isPartnerContext ? "what can you offer?" : "what would you like to share?"}</h2>
                        {isPartnerContext && (
                          <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-black">
                            publish work, resources, discounts, access, or space for artists.
                          </p>
                        )}
                      </div>
                    </div>
                    {pendingOfferSubmitted && !hasApprovedPin && !isPartnerContext && (
                      <div
                        role="status"
                        className="mx-auto mb-6 max-w-3xl border-2 border-black bg-[#c6ff3d] p-4 text-[11px] leading-relaxed text-black"
                      >
                        <strong className="font-black uppercase tracking-widest">your listing is saved.</strong>{" "}
                        It stays off the Exchange until our curators approve your profile, then goes live at the visibility you chose. You can edit it from Edit Listings while you wait.
                      </div>
                    )}
                    {isAuthenticated && postChoiceOpen && (
                      <div className="relative z-[9450] grid grid-cols-1 gap-5 mb-8 md:grid-cols-3" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                        {SHARE_CHOICES.filter((choice) => (
                          isPartnerContext ? choice.value !== "practice" : choice.value !== "partner_offer"
                        )).map((choice, choiceIndex) => {
                          const stickerClass = choice.value === "space"
                            ? "bg-[#ff684f] -rotate-1"
                            : choice.value === "practice"
                              ? "bg-[#c6ff3d] rotate-1"
                            : "bg-white rotate-1";
                          const choiceLabel = choice.label;
                          const choiceDescription = choice.description;
                          return (
                            <button
                              key={choice.value}
                              type="button"
                              onClick={() => {
                                if (choice.value === "space") {
                                  setPostChoiceOpen(false);
                                  setSpaceChoiceOpen(true);
                                  return;
                                }
                                choosePostMode(
                                  "opportunities",
                                  false,
                                  choice.value === "practice"
                                    ? "skill_share"
                                    : choice.value === "partner_offer"
                                      ? "partner_offer"
                                      : isPartnerContext
                                        ? "open_call"
                                        : "gig",
                                );
                              }}
                              className={`group relative min-h-[14rem] border-2 border-black p-5 text-left text-black shadow-[6px_6px_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:rotate-0 sm:p-7 ${stickerClass}`}
                            >
                              <span className="absolute right-4 top-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em]" aria-hidden="true">
                                <span>0{choiceIndex + 1}</span>
                                <span className="text-2xl leading-none transition-transform group-hover:rotate-12">↗</span>
                              </span>
                              <span className="mb-8 flex h-14 w-14 items-center justify-center border-2 border-black bg-white shadow-[3px_3px_0_#000] sm:h-16 sm:w-16">
                                <choice.Icon className="h-8 w-8 text-black sm:h-9 sm:w-9" strokeWidth={2.7} aria-hidden="true" />
                              </span>
                              <div className="max-w-[14rem] text-lg font-black uppercase leading-[0.95] tracking-[0.04em]">{choiceLabel}</div>
                              <div className="mt-3 max-w-[16rem] text-xs font-bold leading-relaxed text-black/80">{choiceDescription}</div>
                            </button>
                          );
                        })}
                        <a
                          href="/adverts?direction=hiring"
                          className="group relative flex min-h-[14rem] flex-col justify-between border-2 border-black bg-white p-5 text-black shadow-[6px_6px_0_#000] transition-transform duration-150 hover:-translate-y-1 sm:p-7"
                        >
                          <span className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em]">
                            <span>post on Adverts</span>
                            <ArrowUpRight aria-hidden="true" size={21} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                          </span>
                          <span>
                              <span className="block max-w-[14rem] text-lg font-black uppercase leading-[0.95] tracking-[0.04em]">share an opportunity</span>
                              <span className="mt-3 block max-w-[16rem] text-xs font-bold leading-relaxed text-black/80">Post paid gigs through Adverts. Hiring posts with a stated rate also appear in Exchange.</span>
                              <span className="mt-2 block max-w-[16rem] text-[10px] font-bold leading-relaxed text-black/70">Posting is free for now. In the future, we will ask for a donation to post.</span>
                          </span>
                        </a>
                      </div>
                    )}
                    {spaceChoiceOpen && (
                      <div className="mb-8">
                        <button
                          type="button"
                          onClick={() => { setSpaceChoiceOpen(false); setPostChoiceOpen(true); }}
                           className="mb-4 text-[9px] font-black uppercase tracking-widest text-black hover:underline"
                        >
                          ← sharing options
                        </button>
                        <div className="mb-5 flex flex-col gap-3 border-2 border-black bg-black p-4 text-white shadow-[4px_4px_0_#c6ff3d] sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[#c6ff3d] text-[#c6ff3d]" aria-hidden="true">✓</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c6ff3d]">you are signed in</p>
                              <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-white/75">
                                You can draft a housing or space listing while your profile is under review. It stays private to you until approval, then appears at the visibility you chose. Full Exchange browsing still requires approval.
                              </p>
                            </div>
                          </div>
                          {!hasApprovedPin && (
                            <a href="/profile" className="shrink-0 border-2 border-[#c6ff3d] px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">
                              check my pin →
                            </a>
                          )}
                        </div>
                        <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/45">Spaces Available · free or paid</div>
                        <p className="mb-4 max-w-2xl text-[11px] leading-relaxed text-black/65">List a room, home, studio, venue, or workspace. You will need to state whether it is free or give its price and terms.</p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                           {!isPartnerContext && <button
                             type="button"
                             onClick={() => choosePostMode("room_swap", false, "host")}
                              aria-label="Share a room or apartment"
                              className="group relative min-h-[12rem] border-2 border-black bg-[#c6ff3d] p-5 text-left text-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-1 hover:rotate-[-0.5deg]"
                           >
                              <div className="mb-5 flex items-start justify-between gap-3">
                                 <div className="text-2xl">⌂</div>
                              </div>
                              <div className="text-[11px] font-black uppercase tracking-widest">room swap / share a room/apartment</div>
                              <div className="mt-2 text-[10px] leading-relaxed text-black/70">
                                {hasApprovedPin
                                   ? "A room or home, offered free, paid, or as a reciprocal exchange."
                                   : "Draft it now; it stays private to you until your profile is approved."}
                             </div>
                           </button>}
                          <button
                            type="button"
                            onClick={() => choosePostMode("venue_hosting", false, "workshop")}
                               className="group relative min-h-[12rem] border-2 border-black bg-white p-5 text-left text-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-1 hover:rotate-[0.5deg] hover:bg-[#ffd7e8]"
                          >
                             <div className="mb-5 flex items-start justify-between gap-3">
                               <div className="text-2xl">▣</div>
                                <span className="border border-black bg-[#c6ff3d] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">submit now</span>
                             </div>
                             <div className="text-[11px] font-black uppercase tracking-widest">share a workspace or event space</div>
                              <div className="mt-2 text-[10px] leading-relaxed text-black/70">workspace, event space, shoot location, or place to gather</div>
                              <div className="mt-5 text-right text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">↗</div>
                          </button>
                        </div>
                      </div>
                    )}
                    {showForm && isAuthenticated && session && postMode && (
                      <NewOfferForm session={session} defaultTab={postMode} initialKind={postInitialKind} initialExchangeResidency={exchangeResidencyPrefill} onSubmitted={() => { if (!hasApprovedPin && !isPartnerContext) setPendingOfferSubmitted(true); }} onClose={() => { setShowForm(false); setPostChoiceOpen(true); setSpaceChoiceOpen(false); }} />
                    )}
                    <ExchangeExamplesSection />
                  </>
                )}
              </>
            ) : (
              <>
                {isAuthenticated && !hasApprovedPin && !isMineView ? (
                  <div
                    data-testid="pending-exchange-access"
                    className="mx-auto max-w-2xl border-2 border-black bg-[#c6ff3d] p-6 shadow-[6px_6px_0_#000] sm:p-8"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/55">profile under review</p>
                    <h3 className="mt-3 text-2xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-4xl">
                      share while your profile is reviewed
                    </h3>
                    <p className="mt-4 max-w-xl text-sm font-bold leading-relaxed text-black/75">
                      Draft housing, space, or skill-swap listings while your profile is under review. Other people cannot see them until a curator approves your profile. Paid opportunities go on Adverts, and full Exchange browsing opens after approval.
                    </p>
                    <button
                      type="button"
                      onClick={() => openOffer()}
                      className="mt-6 border-2 border-black bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
                    >
                      draft an Exchange listing →
                    </button>
                  </div>
                ) : (
                  <>
                    <section aria-labelledby="real-posts-heading">
                      <div className="exchange-list-heading mb-4 flex items-end justify-between gap-3 border-b border-black/15 pb-3">
                        <div>
                          <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-black/45">
                            {isCuratedResidencyView
                              ? "Countercult programmes"
                              : isMineView
                                ? (hasApprovedPin ? "your active listings" : "saved during profile review")
                                : "live from the network"}
                          </p>
                          <h2 id="real-posts-heading" className="text-2xl font-black leading-none tracking-[-0.05em] sm:text-3xl">
                            {isCuratedResidencyView
                              ? "residency programmes"
                              : isMineView
                                ? (hasApprovedPin ? "your listings" : "your saved listings")
                                : "current listings"}
                          </h2>
                          {isMineView && !hasApprovedPin && (
                            <p className="mt-2 max-w-xl font-mono text-[10px] leading-relaxed text-black/55">
                              These listings stay off the Exchange until your profile is approved.
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-black/50">
                          {visibleResultCount} {isCuratedResidencyView
                            ? visibleResultCount === 1 ? "programme" : "programmes"
                            : visibleResultCount === 1 ? "listing" : "listings"}
                        </span>
                      </div>
                      <div className="exchange-results-layout grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
                        {!isPartnerContext && (
                          <aside className="exchange-filter-sidebar hidden lg:block" aria-label="Exchange listing filters">
                            <h2 className="exchange-filter-sidebar-title">Filters</h2>
                            <div role="group" aria-label="Filter Exchange listings by category" className="exchange-sidebar-category-filters">
                              {availableExchangeFilterOptions.map(({ value, label, Icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={activeFilter === value}
                                  onClick={() => selectExchangeFilter(value)}
                                  className="exchange-category-filter"
                                >
                                  <Icon aria-hidden="true" size={14} />
                                  <span>{label}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                aria-pressed={costFilter === "free"}
                                aria-label="Show only free Exchange listings"
                                onClick={toggleFreeFilter}
                                className="exchange-category-filter"
                              >
                                <Gift aria-hidden="true" size={14} />
                                <span>Free</span>
                              </button>
                            </div>
                            {(activeFilter === "housing" || activeFilter === "spaces") && (
                              <div
                                role="group"
                                aria-label={`Filter ${activeFilter} listings by type`}
                                className="exchange-sidebar-subfilters"
                              >
                                <p className="exchange-sidebar-label">
                                  {activeFilter === "housing" ? "Housing type" : "Space type"}
                                </p>
                                <button
                                  type="button"
                                  aria-pressed={activeSubfilter === null}
                                  onClick={() => setActiveSubfilter(null)}
                                  className="exchange-subfilter"
                                >
                                  Any {activeFilter === "housing" ? "housing" : "space"}
                                </button>
                                {EXCHANGE_SUBFILTER_GROUPS[activeFilter].map(({ value, label }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    aria-pressed={activeSubfilter === value}
                                    onClick={() => setActiveSubfilter(value)}
                                    className="exchange-subfilter"
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {activeFilter !== "residency" && (
                              <>
                                <div role="group" aria-label="Filter by special features" className="exchange-sidebar-features">
                                  <p className="exchange-sidebar-label">Special features</p>
                                  {([
                                    ["photos", "Photos available"],
                                    ["flexible", "Flexible dates"],
                                    ["capacity", "Capacity listed"],
                                  ] as const).map(([feature, label]) => (
                                    <label key={feature} className="exchange-feature-option">
                                      <input
                                        type="checkbox"
                                        checked={selectedFeatures.includes(feature)}
                                        onChange={() => setSelectedFeatures((current) =>
                                          current.includes(feature)
                                            ? current.filter((item) => item !== feature)
                                            : [...current, feature]
                                        )}
                                      />
                                      <span>{label}</span>
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                          </aside>
                        )}
                        <div className="exchange-list-column min-w-0 w-full">
                          {isMineView && hasApprovedPin && (
                            <a href="/residency" className="mb-4 inline-flex border-b-2 border-black pb-1 text-[9px] font-black uppercase tracking-widest hover:text-black/55">
                              browse the full resource board →
                            </a>
                          )}
                          {isCuratedResidencyView ? (
                            visibleResidencyProgrammeIds.length > 0 || visibleOffers.length > 0 ? (
                              <div
                                ref={setMasonryGrid}
                                className="exchange-listing-grid exchange-masonry-grid"
                                data-testid="residency-filter-results"
                              >
                                {visibleResidencyProgrammeIds.map((programmeId: CountercultResidencyProgrammeId) => (
                                  <div className="exchange-masonry-item" key={programmeId}>
                                    <FloorApplicationBanner />
                                  </div>
                                ))}
                                {visibleOffers.map((offer) => (
                                  <div className="exchange-masonry-item" key={`residency-offer-${offer.id}`}>
                                    <OfferCard offer={offer} session={isAuthenticated ? session : null} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="exchange-empty-state" data-testid="residency-filter-empty">
                                <span className="exchange-empty-index">no Countercult programmes match</span>
                                <h3>no Countercult residencies match “{cityFilter}”.</h3>
                                <button
                                  type="button"
                                  onClick={() => setCityFilter("")}
                                  className="exchange-apply-link"
                                >
                                  clear search
                                </button>
                              </div>
                            )
                          ) : isError ? (
                            <>
                              <div className="exchange-state-card" role="alert">
                                <div>
                                  <p className="exchange-state-kicker">the board is taking a moment</p>
                                  <h3>Listings could not be loaded.</h3>
                                  <p>Try again in a little while. Your search will stay here.</p>
                                </div>
                                <button type="button" onClick={() => refetch()} className="exchange-apply-link">try again <ArrowUpRight size={15} aria-hidden="true" /></button>
                              </div>
                              {!isMineView && !hasActiveListingFilters && <div className="exchange-listing-grid mt-4"><FloorApplicationBanner /></div>}
                            </>
                          ) : isLoading ? (
                            <div className="exchange-listing-grid" aria-label="Loading Exchange listings" aria-live="polite">
                              {[0, 1, 2, 3].map((item) => <div className="exchange-listing-skeleton" key={item} />)}
                            </div>
                          ) : visibleOffers.length === 0 ? (
                            <>
                              <div className="exchange-empty-state">
                                <span className="exchange-empty-index">no listings yet</span>
                                <h3>
                                  {isMineView && !cityFilter
                                    ? hasApprovedPin ? "you have no active listings to edit yet." : "you have not saved any listings yet."
                                    : cityFilter
                                      ? `no listings in "${cityFilter}"`
                                      : costFilter === "free"
                                        ? "no free listings yet."
                                        : selectedFeatures.includes("photos")
                                            ? "no listings with photos yet."
                                            : selectedFeatures.includes("flexible")
                                              ? "no listings with flexible dates yet."
                                              : selectedFeatures.includes("capacity")
                                                ? "no listings with capacity listed yet."
                                                : activeFilter !== "all"
                                                  ? `no ${EXCHANGE_VIBES.find((filter) => filter.value === activeFilter)?.label.toLowerCase()} listings yet.`
                                                  : "nothing here yet. be the first to offer something."}
                                </h3>
                                {!isMineView && <button type="button" onClick={() => openOffer()} className="exchange-apply-link">share something <ArrowUpRight size={15} aria-hidden="true" /></button>}
                                {hasActiveListingFilters && (
                                  <button type="button" onClick={resetExchangeFilters} className="exchange-apply-link">
                                    clear filters
                                  </button>
                                )}
                              </div>
                              {!isMineView && !hasActiveListingFilters && <div className="exchange-listing-grid mt-4"><FloorApplicationBanner /></div>}
                            </>
                          ) : (
                            <div ref={setMasonryGrid} className="exchange-listing-grid exchange-masonry-grid">
                              {visibleOffers.map((offer, index) => {
                                const example = showPublicExamples &&
                                  (index + 1) % 2 === 0 &&
                                  index < visibleOffers.length - 1
                                  ? EXCHANGE_EXAMPLES[(Math.floor(index / 2)) % EXCHANGE_EXAMPLES.length]
                                  : null;
                                return (
                                  <Fragment key={offer.id}>
                                    <div className="exchange-masonry-item">
                                      <OfferCard
                                        offer={offer}
                                        session={isAuthenticated ? session : null}
                                      />
                                    </div>
                                    {!isMineView && !hasActiveListingFilters && index === Math.min(1, visibleOffers.length - 1) && <div className="exchange-masonry-item"><FloorApplicationBanner /></div>}
                                    {example && <div className="exchange-masonry-item"><ExchangeExampleCard example={example} compact /></div>}
                                  </Fragment>
                                );
                              })}
                            </div>
                          )}
                          {!isPartnerContext && !isMineView && (
                            <ExchangeCommunitySticker onStartSharing={() => openOffer()} />
                          )}
                          <ExchangeSafetyNotice />
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
        </>
      </div>
      <footer id="substack-signup" className="scroll-mt-24 border-t-2 border-black bg-[#08090b] px-4 py-7 pb-[calc(7rem+env(safe-area-inset-bottom))] text-white sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#c6ff3d]">countercult updates</p>
            <h2 className="mt-2 text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-3xl">stay close to the work.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">Get Countercult notes by email: stories, opportunities, and work from the network.</p>
          </div>
          <div className="min-h-[300px] w-full overflow-hidden border-2 border-black bg-white">
            <iframe
              src="https://countercultplatform.substack.com/embed"
              title="Subscribe to Countercult updates by email"
              loading="lazy"
              className="block h-[300px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

function OfferCard({
  offer,
  session,
}: {
  offer: ResidencyOffer;
  session: LocalSession | null;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const deleteMutation = useDeleteResidencyOffer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidencyOffersQueryKey() });
        toast.success("removed");
      },
      onError: () => toast.error("failed to remove"),
    },
  });

  const isOwn = Boolean(session && offer.isOwn);
  if (isEditing && isOwn && session) {
    return (
      <EditOfferForm
        offer={offer}
        session={session}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  const category = getExchangeCategory(offer);
  const listingCategories = getExchangeCategories(offer);
  const listingSubfilters = getExchangeSubfilters(offer);
  const isPaidGigCard = isPaidGigExchangeOffer(offer);
  const headerStyle = isPaidGigCard
    ? EXCHANGE_CATEGORY_COLORS.paid_gigs
    : category
      ? EXCHANGE_CATEGORY_COLORS[category]
      : { backgroundColor: "#eeeeea", color: "#111" };
  const isPublicPreview = offer.isPublicPreview === true || (!session?.email && !isPaidGigCard);
  const publicPreviewCategory = isPublicPreview ? getExchangeCategory(offer) : null;
  const publicCategories = (offer as ResidencyOffer & { publicCategories?: ExchangeFilter[] }).publicCategories;
  const publicTags = (offer as ResidencyOffer & { publicTags?: string[] }).publicTags ?? [];
  const isArtHousesOpenCall =
    offer.tags?.includes("countercult:art-houses:open-call") === true ||
    publicTags.includes("countercult:art-houses:open-call");
  const isNoCostExchange = isFreeExchangeOffer(offer);
  const publicPreviewCategoryLabel = EXCHANGE_VIBES
    .find((filter) => filter.value === publicPreviewCategory)
    ?.label.toLowerCase();
  const categoryLabel = listingCategories
    .map((listingCategory) => {
      if (listingCategory === "spaces") return "space";
      return EXCHANGE_VIBES.find((filter) => filter.value === listingCategory)?.label.toLowerCase() ?? listingCategory;
    })
    .join(" + ") || "exchange listing";
  const previewListingLabel = isPaidGigCard
    ? "Paid gig"
    : isArtHousesOpenCall
      ? "Countercult Art Houses"
      : listingCategories.map((listingCategory) => {
        if (listingCategory === "spaces") return "Space";
        if (listingCategory === "skills") return "Barter & Trade";
        if (listingCategory === "opportunities") return "Opportunity";
        return listingCategory.charAt(0).toUpperCase() + listingCategory.slice(1);
      }).join(" + ") || "Community listing";
  const listingSubtitle = isArtHousesOpenCall
    ? "Housing + Space · Berlin · 16–26 Dec"
    : [...new Set(listingSubfilters
      .filter((subfilter) => !(subfilter === "spaces_workspace" && listingCategories.includes("housing")))
      .map(getExchangeSubfilterLabel))].join(" · ");
  const displayCity = safeExchangeLocation(offer.city);
  const displayDestination = safeExchangeLocation(offer.destination);
  const publicPhotoUrls = (offer as ResidencyOffer & { publicPhotoUrls?: string[] }).publicPhotoUrls ?? [];
  const displayPhotoUrls = isArtHousesOpenCall
    ? ART_HOUSES_EXCHANGE_PHOTOS.map((photo) => photo.src)
    : isPublicPreview
      ? publicPhotoUrls
      : offer.photos ?? [];
  const displayDescription = isArtHousesOpenCall
    ? ART_HOUSES_EXCHANGE_DESCRIPTION
    : offer.description;
  const hasPhotos = displayPhotoUrls.length > 0;
  const kindMeta = isPublicPreview
    ? {
        value: "public",
        label: publicPreviewCategoryLabel
          ? `${publicPreviewCategoryLabel} preview`
          : "public exchange post",
        glyph: "•",
        tab: "opportunities" as const,
      }
      : isPaidGigCard
        ? { value: "gig", label: "paid gig", glyph: "$", tab: "opportunities" as const }
        : OFFER_KINDS.find((k) => k.value === offer.kind) ?? OFFER_KINDS[0];
  const isSkillShareCard =
    offer.kind === "skill_share" ||
    publicPreviewCategory === "skills" ||
    (isPublicPreview && publicCategories?.includes("skills") === true);
  const isNonCashSkillSwap = isSkillShareCard && offer.skillShareMode === "swap";
  const exchangeTag = offer.tags?.find(isExchangeResidencyTag);
  const residentTag = offer.tags?.find(isExchangeResidencyResidentTag);
  const exchangeLabel = !isPublicPreview && residentTag
    ? "exchange residency - resident"
    : !isPublicPreview && exchangeTag
      ? "exchange residency - applicant · 1–28 february 2027"
      : null;
  // Never trust the response shape alone for privacy. If the client has no
  // server-validated session, this card is always rendered as a preview.
  const openPreviewSignup = () => {
    window.location.href = "/explore?action=join&from=exchange";
  };
  const openArtHousesCall = () => {
    window.location.href = "/art-houses";
  };
  const openCard = isArtHousesOpenCall ? openArtHousesCall : openPreviewSignup;

  // Resolve contact link
  const contactRaw = offer.contact?.trim() ?? "";
  let contactHref: string | null = null;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactRaw)) contactHref = `mailto:${contactRaw}`;
  else if (contactRaw.startsWith("@")) contactHref = `https://instagram.com/${contactRaw.slice(1)}`;
  else if (/^\+?[0-9\s\-()]{7,}$/.test(contactRaw)) contactHref = `https://wa.me/${contactRaw.replace(/[^0-9]/g, "")}`;
  else if (contactRaw.startsWith("http")) contactHref = contactRaw;

  const arial: React.CSSProperties = { fontFamily: "Arial, Helvetica, sans-serif" };

  return (
    <div
      className={`exchange-listing-card exchange-offer-card ${hasPhotos ? "has-photos" : "no-photos"} ${exchangeLabel ? "has-status" : ""} group overflow-hidden bg-white transition-[transform,box-shadow] duration-200 ${isPublicPreview ? "cursor-pointer outline-offset-2 focus-visible:outline-2 focus-visible:outline-black" : ""}`}
      style={{ border: "2px solid #111", ...arial }}
      onClick={isPublicPreview ? openCard : undefined}
      onKeyDown={isPublicPreview ? (event) => {
        if (event.key === "Enter" || (!isArtHousesOpenCall && event.key === " ")) {
          event.preventDefault();
          openCard();
        }
      } : undefined}
      role={isPublicPreview ? (isArtHousesOpenCall ? "link" : "button") : undefined}
      tabIndex={isPublicPreview ? 0 : undefined}
      aria-label={isPublicPreview
        ? isArtHousesOpenCall
          ? "Open the Countercult Art Houses residency call"
          : "Apply free to request access to the full Exchange listing"
        : undefined}
    >
      {hasPhotos && (
        <ExchangePhotoSlideshow
          className={`exchange-offer-gallery ${isArtHousesOpenCall ? "exchange-offer-gallery-art-houses" : ""}`}
          photos={isArtHousesOpenCall
            ? ART_HOUSES_EXCHANGE_PHOTOS
            : displayPhotoUrls.map((src, index) => ({
              src,
              alt: `${displayCity ? `${displayCity} ` : ""}Exchange listing photo ${index + 1}`,
            }))}
          label={`${displayCity ? `${displayCity} ` : ""}Exchange listing photos`}
          accessToken={session?.token}
          linkImages
        />
      )}
      {/* Listing name first, then the listing type. */}
      <div className="exchange-listing-top exchange-offer-header"
        style={headerStyle}>
        <div className="exchange-owner-line">
        {offer.entryId && !isPublicPreview ? (
          <a
            href={`/entries/${offer.entryId}`}
            className="exchange-offer-owner"
            data-testid={`link-exchange-owner-${offer.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            {offer.entryName || "Countercult member"}
          </a>
        ) : (
          <span className="exchange-offer-owner" data-testid={`text-exchange-owner-${offer.id}`}>
            {isPublicPreview
              ? previewListingLabel
              : isArtHousesOpenCall
                ? "Countercult Art Houses"
                : offer.entryName || "Countercult member"}
          </span>
        )}
        {!isPublicPreview && offer.entryKind && (
          <span className="exchange-entry-kind-badge">{offer.entryKind}</span>
        )}
        </div>
        <div className="exchange-offer-header-meta">
          {isPaidGigCard ? (
            <span className="exchange-paid-sticker">paid gig</span>
          ) : isNonCashSkillSwap ? (
            <span className="exchange-free-sticker">free</span>
          ) : (isNoCostExchange ||
            (offer as ResidencyOffer & { publicFreeArrangement?: boolean }).publicFreeArrangement) && (
            <span className="exchange-free-sticker">free</span>
          )}
          <span className="exchange-type-label">
            {isPublicPreview ? "public preview" : `${kindMeta.glyph} ${kindMeta.label}`}
          </span>
          {isOwn && (
          <div className="exchange-offer-controls">
            <button
              onClick={(event) => { event.stopPropagation(); setIsEditing(true); }}
              data-testid={`button-edit-offer-${offer.id}`}
              style={{ fontSize: 10, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              className="hover:opacity-100 transition-opacity"
            >
              edit
            </button>
            <button
              onClick={(event) => { event.stopPropagation(); deleteMutation.mutate({ id: offer.id }); }}
              disabled={deleteMutation.isPending}
              data-testid={`button-remove-offer-${offer.id}`}
              style={{ fontSize: 10, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              className="hover:opacity-100 transition-opacity"
            >
              remove
            </button>
          </div>
          )}
        </div>
      </div>
      {exchangeLabel && (
        <div className="exchange-offer-status">
          {exchangeLabel}
        </div>
      )}

      {/* Body */}
      <div className="exchange-listing-content exchange-offer-content flex flex-1 flex-col" style={{ padding: "22px 22px 18px" }}>

        <h3 className="exchange-listing-title" data-testid={`text-exchange-type-${offer.id}`}>
          {displayCity && !isArtHousesOpenCall && (
            <>
              <span className="exchange-listing-place">{displayCity}</span>
              <span aria-hidden="true">: </span>
            </>
          )}
          {isArtHousesOpenCall ? "Free holiday art residency" : isPaidGigCard ? "paid gig" : categoryLabel}
        </h3>

        {listingSubtitle && (
          <p className="exchange-listing-subtitle">
            {listingSubtitle}
          </p>
        )}

        {displayDestination && !isPublicPreview && (
          <div className="exchange-listing-location">
            {displayDestination && !isPublicPreview && (
              <>
                <span aria-hidden="true">{offer.kind === "gig" ? "Hiring:" : "→"}</span>
                <span>{displayDestination}</span>
              </>
            )}
          </div>
        )}

        {/* Keep the offer and the requested return inside this single listing card. */}
        {isSkillShareCard ? (
          <div className="mt-4 border-t border-black/15 pt-3 text-[11px] leading-relaxed">
            <div>
              <p data-testid={`text-skill-offering-${offer.id}`} className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-black/55">Skill offered</p>
              <p className="exchange-listing-description">{offer.description || "Skill details not provided."}</p>
            </div>
            <div className="mt-3 border-t border-black/10 pt-3">
              <p data-testid={`text-skill-return-${offer.id}`} className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-black/55">
                {offer.skillShareMode === "swap" ? "Trade requested" : "Return"}
              </p>
              <p>{offer.skillShareMode === "free_offer"
                ? "No return expected."
                : offer.requestedReturn || "Return details not specified on this older post."}</p>
            </div>
            {offer.virtualAvailable === true && (
              <p className="mt-3 inline-flex border border-black bg-[#b8d8ff] px-2 py-1 text-[9px] font-black uppercase tracking-wider">
                Online exchange possible
              </p>
            )}
          </div>
        ) : isPublicPreview ? (
          <p className="exchange-listing-description exchange-offer-preview-description">
            {displayDescription || "apply free to request access to the full post, terms, availability, and contact details."}
          </p>
        ) : (
          <p className="exchange-listing-description">
            {displayDescription}
          </p>
        )}

        {/* Meta rows */}
        <div className="exchange-offer-facts" style={{ borderTop: "1px solid #e8e8e8", paddingTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>

          {!isPublicPreview && (isNoCostExchange || offer.cost) && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 60 }}>
                {offer.kind === "gig" ? "Rate" : "Cost"}
              </span>
              <span style={{ fontSize: 12, color: "#222", fontWeight: 500 }}>
                {isNonCashSkillSwap ? "non-cash trade" : isNoCostExchange ? "free" : offer.cost}
              </span>
            </div>
          )}

          {!isPublicPreview && offer.duration && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 60 }}>
                Duration
              </span>
              <span style={{ fontSize: 12, color: "#222", fontWeight: 500 }}>{offer.duration}</span>
            </div>
          )}

          {!isPublicPreview && offer.capacity && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 60 }}>
                Capacity
              </span>
              <span style={{ fontSize: 12, color: "#222", fontWeight: 500 }}>{offer.capacity}</span>
            </div>
          )}

          {!isPublicPreview && (offer.availabilityMode === "flexible" || offer.availableFrom || offer.availableTo) && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 60 }}>
                Available
              </span>
              <span style={{ fontSize: 12, color: "#222", fontWeight: 500 }}>
                {offer.availabilityMode === "flexible"
                  ? "Flexible timing"
                  : `${offer.availableFrom ?? ""}${offer.availableFrom && offer.availableTo ? " – " : ""}${offer.availableTo ?? ""}`}
              </span>
            </div>
          )}

          {!isPublicPreview && contactRaw && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 60 }}>
                Contact
              </span>
              {contactHref ? (
                <a href={contactHref} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#111", fontWeight: 600, textDecoration: "underline", textDecorationColor: headerStyle.backgroundColor === "#c6ff3d" ? "#c6ff3d" : "#bbb", textUnderlineOffset: 3 }}>
                  {contactRaw} ↗
                </a>
              ) : (
                <span style={{ fontSize: 12, color: "#333" }}>{contactRaw}</span>
              )}
            </div>
          )}

          {isPublicPreview && isArtHousesOpenCall ? (
            <a
              href="/art-houses"
              data-testid="link-art-houses-exchange-call"
              className="exchange-card-view-button inline-flex items-center justify-between gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              Read the open call <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          ) : isPublicPreview ? (
            <button
              type="button"
              className="exchange-card-view-button"
              onClick={(event) => {
                event.stopPropagation();
                openPreviewSignup();
              }}
            >
              Apply free to view full posts <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Free form for claimed artists
function NewOfferForm({ session, defaultTab, initialKind, onClose, onSubmitted, initialExchangeResidency = false }: { session: LocalSession; defaultTab: BoardTab; initialKind?: OfferKind; onClose: () => void; onSubmitted?: () => void; initialExchangeResidency?: boolean }) {
  const queryClient = useQueryClient();
  const isPartnerPoster = Boolean(session.canPostPartnerOffers || session.accountRole === "partner_poster");
  const isPracticeComposer = defaultTab === "opportunities" && initialKind === "skill_share";
  const isOpportunityComposer = defaultTab === "opportunities" && initialKind === "open_call";
  const isPaidGigComposer = defaultTab === "opportunities" && initialKind === "gig";
  const tabKinds = OFFER_KINDS.filter((k) =>
    k.tab === defaultTab &&
    !["gig", "open_call", "collab"].includes(k.value) &&
    k.value !== "looking" &&
    (isPartnerPoster || k.value !== "collab") &&
    (!isPracticeComposer || k.value === "skill_share") &&
    (!isOpportunityComposer || k.value === "open_call" || k.value === "gig" || (isPartnerPoster && k.value === "collab")) &&
    (!isPaidGigComposer || k.value === "gig") &&
    (isPartnerPoster
      ? PARTNER_ALLOWED_POST_KINDS.includes(k.value)
      : k.value !== "partner_offer" && k.value !== "open_call"),
  );
  const isRoomSwap = defaultTab === "room_swap";
  const isSpaceShare = defaultTab === "venue_hosting";
  const isOpportunity = defaultTab === "opportunities";
  const startsAsExchangeResidency = initialExchangeResidency && isRoomSwap;
  const durationPresets = ["shortterm", "midterm", "longterm"];
  const startingKind = initialKind && tabKinds.some((candidate) => candidate.value === initialKind)
    ? initialKind
    : tabKinds[0]?.value ?? "host";
  const [kind, setKind] = useState<OfferKind>(startsAsExchangeResidency ? "swap" : startingKind);
  const isPracticeShare = kind === "skill_share";
  const skillShareMode: SkillShareMode = "swap";
  const isPartnerFundedOpportunity = isPartnerPoster && PARTNER_FUNDED_OPPORTUNITY_KINDS.includes(kind);
  const requiresCapacity = isRoomSwap && (kind === "host" || kind === "swap");
  const [city, setCity] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [requestedReturn, setRequestedReturn] = useState("");
  const [virtualAvailable, setVirtualAvailable] = useState(false);
  const [skillStayRequest, setSkillStayRequest] = useState(false);
  const [availableFrom, setAvailableFrom] = useState(startsAsExchangeResidency ? EXCHANGE_RESIDENCY_COHORT.from : "");
  const [availableTo, setAvailableTo] = useState(startsAsExchangeResidency ? EXCHANGE_RESIDENCY_COHORT.to : "");
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>("dates");
  const [contact, setContact] = useState("");
  const [cost, setCost] = useState(startsAsExchangeResidency ? "free" : "");
  const [duration, setDuration] = useState(startsAsExchangeResidency ? "one month" : "");
  const [capacity, setCapacity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "network">("public");
  const [spaceType, setSpaceType] = useState<SpaceType | "">("");
  const [housingSubtype, setHousingSubtype] = useState<HousingSubtype | "">("");
  const [housingIncludesWorkspace, setHousingIncludesWorkspace] = useState(false);
  const [spaceSwapOpen, setSpaceSwapOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(startsAsExchangeResidency ? [EXCHANGE_RESIDENCY_TAG] : []);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [publicPhotos, setPublicPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  const photoPreviewUrls = useRef(new Set<string>());
  const [photoUploading, setPhotoUploading] = useState([false, false, false]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [exchangeResidency, setExchangeResidency] = useState(startsAsExchangeResidency);
  const [exchangeTermsAccepted, setExchangeTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [skillSwapTermsAccepted, setSkillSwapTermsAccepted] = useState(false);

  useEffect(() => {
    return () => {
      for (const previewUrl of photoPreviewUrls.current) {
        URL.revokeObjectURL(previewUrl);
      }
      photoPreviewUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    const noCostExchange = kind === "swap" || kind === "skill_share" || (isSpaceShare && spaceSwapOpen);
    if (noCostExchange) setCost("free");
  }, [kind, isSpaceShare, spaceSwapOpen]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.token}` } })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          entries?: Array<{ id: number; city?: string | null; status?: string }>;
        }>;
      })
      .then((me) => {
        if (!active) return;
        const entry = me?.entries?.find((candidate) => candidate.id === session.entryId)
          ?? me?.entries?.find((candidate) => candidate.status === "published")
          ?? me?.entries?.[0];
        if (entry?.city) setCity((current) => current || entry.city || "");
      })
      .catch(() => {
        // Profile prefilling is helpful but should never block posting.
      });
    return () => { active = false; };
  }, [session.entryId, session.token]);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setPhotoError("photo must be under 20 MB before compression"); return; }
    setPhotoUploading((p) => { const n = [...p]; n[idx] = true; return n; });
    setPhotoError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const compressedFile = await compressExchangePhoto(file);
      const url = await uploadPhoto(compressedFile);
      setPhotos((p) => { const n = [...p]; n[idx] = url; return n; });
      const previousPreview = photoPreviews[idx];
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
        photoPreviewUrls.current.delete(previousPreview);
      }
      photoPreviewUrls.current.add(previewUrl);
      setPhotoPreviews((p) => { const n = [...p]; n[idx] = previewUrl; return n; });
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setPhotoError(error instanceof Error ? error.message : "photo upload failed - try again");
    } finally {
      setPhotoUploading((p) => { const n = [...p]; n[idx] = false; return n; });
      e.target.value = "";
    }
  };

  const createMutation = useCreateResidencyOffer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidencyOffersQueryKey() });
        onSubmitted?.();
        onClose();
      },
      onError: (err: any) => {
        const status = err?.response?.status ?? err?.status;
        if (status === 401) {
          localStorage.removeItem("cc_auth");
          window.dispatchEvent(new CustomEvent("cc:session-change"));
          setSubmitError("session expired - please sign in again");
        } else setSubmitError(err?.message || "failed to post - try again");
      },
    },
  });
  type PendingOffer = Parameters<typeof createMutation.mutate>[0]["data"];
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const [supportStepOpen, setSupportStepOpen] = useState(false);
  const publishPendingOffer = () => {
    if (!pendingOffer) return;
    createMutation.mutate({ data: pendingOffer });
  };

  const inputClass = "w-full bg-transparent border-b border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30";
  const campaignPhotos = photos.filter((p): p is string => !!p);
  const campaignPublicPhotos = publicPhotos.filter((photo) => campaignPhotos.includes(photo));

  const enableExchangeResidency = () => {
    setKind("swap");
    setExchangeResidency(true);
    setHousingSubtype("");
    setAvailableFrom(EXCHANGE_RESIDENCY_COHORT.from);
    setAvailableTo(EXCHANGE_RESIDENCY_COHORT.to);
    setCost("free");
    setDuration("one month");
    setTags((current) => [
      ...current.filter(isExchangeTaxonomyTag),
      EXCHANGE_RESIDENCY_TAG,
    ]);
  };

  const disableExchangeResidency = () => {
    setExchangeResidency(false);
    setTags((current) => current.filter((tag) => !isExchangeResidencyTag(tag) && !isExchangeResidencyResidentTag(tag)));
  };

  return (
    <div className="border-2 border-black p-5 mb-8 bg-white" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {supportStepOpen && (
        <OptionalPatronPostSupportStep
          onPublishForFree={publishPendingOffer}
          onBack={() => {
            setSubmitError(null);
            setSupportStepOpen(false);
          }}
          isPublishing={createMutation.isPending}
          error={submitError ?? undefined}
        />
      )}
      <div
        className={`flex items-center justify-between mb-4 ${supportStepOpen ? "hidden" : ""}`}
        aria-hidden={supportStepOpen}
      >
       <h3 className="text-sm font-bold uppercase tracking-widest text-black">
           {isRoomSwap ? "share housing" : isPracticeShare ? "barter with an artist" : kind === "gig" ? "share a paid gig" : defaultTab === "opportunities" ? "share a partner opportunity" : "share a space"} - {session.entryName}
      </h3>
        <button onClick={onClose} className="text-black hover:text-black font-bold">✕</button>
      </div>
      {isRoomSwap && !supportStepOpen && (
        <p className="text-[10px] leading-relaxed text-black border-l-2 border-[#c6ff3d] pl-3 mb-4">
           housing is for something you can offer: free hosting, a sublet, a rental, a short stay, or a reciprocal exchange. studios, offices, workshops, events, and daytime-only space belong under spaces. there is no request or waitlist form.
        </p>
      )}
      <form
        hidden={supportStepOpen}
        aria-hidden={supportStepOpen}
        className={`flex flex-col gap-4 ${supportStepOpen ? "hidden" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (exchangeResidency && campaignPhotos.length === 0) {
            setSubmitError("add at least one photo of the room for Exchange Residency");
            return;
          }
          if (exchangeResidency && !exchangeTermsAccepted) {
            setSubmitError("please acknowledge the Exchange Residency terms");
            return;
          }
          if (isPracticeShare && !requestedReturn.trim()) {
            setSubmitError("name the specific non-cash thing you want in return");
            return;
          }
          if (isPracticeShare && !skillSwapTermsAccepted) {
            setSubmitError("confirm this is a real non-cash exchange, not service promotion");
            return;
          }
          if (isPracticeShare && areSkillShareAnswersNearDuplicate(description, requestedReturn)) {
            setSubmitError("describe a different, specific return; the offer and request cannot be the same");
            return;
          }
          if (isRoomSwap && !availabilityMode) {
            setSubmitError("choose a date window or flexible timing");
            return;
          }
          if (isSpaceShare && !spaceType) {
            setSubmitError("choose whether this is a room, apartment, or venue");
            return;
          }
          if (kind === "gig") {
            if (!destination.trim()) {
              setSubmitError("name the person or organisation hiring");
              return;
            }
            if (/\b(?:i can offer (?:my )?services?|i offer (?:my )?services?|i provide (?:my )?services?|offering my services|my services|available for hire|hire me)\b/i.test(description)) {
              setSubmitError("paid gigs must describe a job or commission, not advertise your services");
              return;
            }
            const amount = Number((cost.match(/\d+(?:[.,]\d+)?/)?.[0] ?? "").replace(",", "."));
            if (!Number.isFinite(amount) || amount < 50) {
              setSubmitError("paid gigs must include compensation of at least 50 in the stated currency");
              return;
            }
          }
          setSubmitError(null);
          const baseTags = tags.filter((tag) =>
            isExchangeTaxonomyTag(tag) || isExchangeResidencyTag(tag) || isExchangeResidencyResidentTag(tag)
          );
          const nextTags = [...new Set([
            ...baseTags,
            ...(exchangeResidency ? [EXCHANGE_RESIDENCY_TAG, EXCHANGE_TAXONOMY_TAGS.housingResidency] : []),
            ...(kind === "host" && housingSubtype && !exchangeResidency
              ? [HOUSING_SUBTYPE_TAGS[housingSubtype]]
              : []),
            ...(isRoomSwap && housingIncludesWorkspace ? [EXCHANGE_TAXONOMY_TAGS.includesWorkspace] : []),
            ...(isSpaceShare && spaceSwapOpen ? [EXCHANGE_TAXONOMY_TAGS.arrangementSwap] : []),
            ...(isPracticeShare && skillShareMode === "swap" && skillStayRequest
              ? [EXCHANGE_TAXONOMY_TAGS.skillStayRequest]
               : []),
          ])];
          const selectedSpaceType = SPACE_TYPES.find((option) => option.value === spaceType);
          const finalDescription = isSpaceShare && selectedSpaceType
            ? `space type: ${selectedSpaceType.label}\n\n${description.trim()}`
            : description.trim();
           setPendingOffer({
             kind,
             city: city.trim(),
             description: finalDescription,
             availableFrom: isRoomSwap && availabilityMode === "flexible" ? null : availableFrom.trim() || null,
             availableTo: isRoomSwap && availabilityMode === "flexible" ? null : availableTo.trim() || null,
             availabilityMode: isRoomSwap ? availabilityMode : null,
             skillShareMode: isPracticeShare ? "swap" : null,
             requestedReturn: isPracticeShare ? requestedReturn.trim() : null,
             virtualAvailable: isPracticeShare && virtualAvailable,
             contact: contact.trim() || null,
             destination: destination.trim() || null,
             cost: kind === "swap" || kind === "skill_share" || (isSpaceShare && spaceSwapOpen) ? "free" : cost.trim() || null,
             duration: duration.trim() || null,
             capacity: capacity.trim() || null,
             tags: nextTags,
             photos: campaignPhotos,
             publicPhotos: campaignPublicPhotos,
             visibility,
           });
           setSupportStepOpen(true);
         }}
      >
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black mb-2">type</label>
          <div className="flex flex-col gap-2">
            {tabKinds.map((k) => (
              <label key={k.value} className={`flex items-start gap-3 cursor-pointer p-3 border-2 transition-colors ${kind === k.value ? "bg-[#c6ff3d] text-black border-black" : "bg-transparent border-black text-black hover:bg-[#c6ff3d]/30"}`}>
                <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => {
                  setKind(k.value);
                  if (k.value !== "swap") {
                    disableExchangeResidency();
                  }
                }} className="sr-only" />
                <span className="text-base shrink-0 leading-none mt-0.5">{k.glyph}</span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider">{k.label}</div>
                  {k.desc && <div className="text-[9px] mt-0.5 text-black">{k.desc}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>
        {isPracticeShare && (
          <fieldset className="border-2 border-black bg-[#f9f9f6] p-4">
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest">Barter with an artist *</legend>
            <p className="mb-3 text-[10px] leading-relaxed text-black">
              This is a real exchange, not an advert for your services. Name a specific skill, item, equipment, or help you want in return. No money is allowed to be exchanged here.
            </p>
            {skillShareMode === "swap" && (
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest">
                what specific thing are you asking for in return? *
                <textarea data-testid="input-skill-share-return-create" required rows={2} maxLength={600} value={requestedReturn} onChange={(event) => setRequestedReturn(event.target.value)} className="mt-2 w-full resize-y border border-black/20 bg-white p-3 text-sm font-normal normal-case tracking-normal text-black" placeholder="For example: one hour of portrait photography for sewing repairs." />
              </label>
            )}
            {skillShareMode === "swap" && (
              <p data-testid="text-skill-share-return-help-create" className="mt-1 text-[10px] leading-relaxed text-black/60">
                “Exposure,” “follow me,” or “contact me” is not a return. Ask for something concrete.
              </p>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-black/15 pt-3 text-[10px] leading-relaxed">
              <input type="checkbox" required checked={skillSwapTermsAccepted} onChange={(event) => setSkillSwapTermsAccepted(event.target.checked)} className="mt-0.5 accent-black" />
              <span>I am asking for a specific non-cash return, not advertising my services.</span>
            </label>
            {skillShareMode === "swap" && areSkillShareAnswersNearDuplicate(description, requestedReturn) && (
              <p data-testid="status-skill-share-duplicate-warning-create" role="status" aria-live="polite" className="mt-2 border-l-2 border-[#d98d00] pl-3 text-[10px] leading-relaxed text-black">
                These answers look very similar. In the first box, describe the skill you can offer. In this box, describe what you want in exchange.
              </p>
            )}
            {skillShareMode === "swap" && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed">
                <input
                  type="checkbox"
                  checked={skillStayRequest}
                  onChange={(event) => setSkillStayRequest(event.target.checked)}
                  className="mt-0.5 accent-black"
                />
                <span>
                  <strong className="block uppercase tracking-widest">I’m looking for a free stay in exchange for this skill</strong>
                  This listing will also appear under Housing so hosts can find it. Include the city and dates in your request.
                </span>
              </label>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-black/15 pt-3 text-[10px] leading-relaxed">
              <input type="checkbox" checked={virtualAvailable} onChange={(event) => setVirtualAvailable(event.target.checked)} className="mt-0.5 accent-black" />
              <span><strong className="block uppercase tracking-widest">This exchange can happen online</strong>Choose this for a digital exchange, especially across countries. Leave unchecked if you must meet in person, and enter that city above.</span>
            </label>
            <p className="mt-2 text-[10px] leading-relaxed text-black/65">Agree comparable time or scope together. Countercult does not assign a cash value.</p>
          </fieldset>
        )}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black mb-2">who can see this?</label>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "network")} className={inputClass}>
            <option value="public">everyone · public post + city-area marker</option>
            <option value="network">approved members · network-only city marker</option>
          </select>
          <p className="mt-1 text-[10px] leading-relaxed text-black/55">Your audience setting also controls the approximate map marker. No street address or exact location is shown. Network posts and markers are limited to approved members and you.</p>
        </div>
        {isSpaceShare && (
          <fieldset className="border-2 border-black bg-[#f9f9f6] p-4">
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest">what kind of space is this? *</legend>
            <p className="mb-3 text-[11px] leading-relaxed text-black">Choose the closest fit so people know what they are being offered before they contact you.</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {SPACE_TYPES.map((option) => {
                const selected = spaceType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors ${selected ? "border-black bg-[#c6ff3d]" : "border-black bg-white hover:bg-[#c6ff3d]/30"}`}
                  >
                    <input
                      type="radio"
                      name="space-type"
                      value={option.value}
                      checked={selected}
                      onChange={() => setSpaceType(option.value)}
                      className="sr-only"
                    />
                    <option.Icon className="mt-0.5 h-5 w-5 shrink-0 text-black" strokeWidth={2} aria-hidden="true" />
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-black">{option.label}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-black">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {isRoomSwap && (
          <div className="grid gap-3 border-2 border-black bg-[#f9f9f6] p-4">
            {kind === "host" && (
              <>
                <label className="block text-[10px] font-black uppercase tracking-widest">
                  housing type
                  <select
                    value={housingSubtype}
                    onChange={(event) => setHousingSubtype(event.target.value as HousingSubtype | "")}
                    className={`${inputClass} mt-1`}
                  >
                    <option value="">not specified</option>
                    {HOUSING_SUBTYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {housingSubtype && (
                  <p className="text-[10px] leading-relaxed text-black/70">
                    {HOUSING_SUBTYPE_OPTIONS.find((option) => option.value === housingSubtype)?.description}
                  </p>
                )}
                <p className="text-[10px] leading-relaxed text-black/65">
                  Exchange Residency is a separate curated programme and is only labelled when you opt into it below.
                </p>
              </>
            )}
            <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed">
              <input
                type="checkbox"
                checked={housingIncludesWorkspace}
                onChange={(event) => setHousingIncludesWorkspace(event.target.checked)}
                className="mt-0.5 accent-black"
              />
              <span><strong className="block uppercase tracking-widest">this housing listing also includes a workspace</strong>It will appear under both Housing and Spaces.</span>
            </label>
          </div>
        )}
        {isSpaceShare && (
          <label className="flex cursor-pointer items-start gap-2 border-2 border-black bg-[#f9f9f6] p-4 text-[10px] leading-relaxed">
            <input
              type="checkbox"
              checked={spaceSwapOpen}
              onChange={(event) => setSpaceSwapOpen(event.target.checked)}
              className="mt-0.5 accent-black"
            />
            <span><strong className="block uppercase tracking-widest">open to a reciprocal workspace swap</strong>Swaps are free, reciprocal exchanges. If you charge money, post this as a space offer instead.</span>
          </label>
        )}
        {isRoomSwap && (
          <div className="border-2 border-black bg-[#c6ff3d] p-4">
            <div className="flex items-start gap-3">
              <input
                id="exchange-residency"
                type="checkbox"
                checked={exchangeResidency}
                onChange={(e) => e.target.checked ? enableExchangeResidency() : disableExchangeResidency()}
                className="mt-0.5 accent-black"
              />
              <label htmlFor="exchange-residency" className="cursor-pointer">
                <span className="block text-[10px] font-black uppercase tracking-widest">include this room in Exchange Residency</span>
                <span className="block text-[10px] leading-relaxed mt-1">
                  a curated one-month exchange between artists in different countries · {EXCHANGE_RESIDENCY_COHORT.label} · rural and urban welcome
                </span>
              </label>
            </div>
            {exchangeResidency && (
              <div className="mt-3 pt-3 border-t border-black/20 text-[10px] leading-relaxed">
                <strong>this is an experiment.</strong> Countercult offers the curated connection and virtual programming only.
                There is no rent, programme fee, or required financial equivalence. We do not fund or arrange travel, visas, meals, insurance, or local living costs,
                and are not responsible for the room exchange, accommodation, travel, or personal arrangements. You arrange and assess the exchange directly.
              </div>
            )}
          </div>
        )}
        {isRoomSwap && (
          <p className="text-[10px] leading-relaxed text-black border-l-2 border-[#c6ff3d] pl-3 -mt-1">
             {kind === "swap"
               ? "This is a free exchange. Add the dates, duration, and sleeping capacity below, then describe what each artist offers."
               : "Choose the kind of housing you can offer above, then add exact dates, cost, duration, and sleeping capacity below."}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">{isPracticeShare ? "your city or meeting city" : "your city"}</label>
            <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="e.g. Berlin" />
            {isPracticeShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">For in-person trades, use the city where you can meet. For online trades, use your city for the approximate map location.</p>}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">preferred contact</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} placeholder="email, @handle…" />
          </div>
        </div>
        {kind === "gig" && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">who is hiring or commissioning? *</label>
            <input required type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} placeholder="name the client, organisation, or project" />
            <p className="mt-1 text-[10px] leading-relaxed text-black/60">Paid work means someone is hiring an artist for a defined job. Do not use this for advertising your own services.</p>
          </div>
        )}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black mb-2">{isPracticeShare ? "what skill can you offer? *" : "description"}</label>
            <textarea data-testid={isPracticeShare ? "input-skill-share-offer-create" : undefined} required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border border-black/20 p-3 text-sm focus:outline-none focus:border-black resize-none text-black placeholder:text-black/30" placeholder={isRoomSwap ? "what room or apartment are you offering? include the arrangement, dates, cost, and house rules." : isPartnerFundedOpportunity ? "what is the opportunity, who is it for, and what should applicants do? include the fee or funding route." : isPracticeShare ? "Name the skill and what you can do for someone." : kind === "gig" ? "describe the specific role, commission, or deliverable and how to apply." : defaultTab === "opportunities" ? "what is the opportunity, who is it for, and how should people respond?" : "what space are you offering? include the room type, use, dates, cost, and access details."} />
            {isPracticeShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">Name a skill and what you can do for someone.</p>}
        </div>
          <div className="border-l-2 border-[#c6ff3d] pl-3 text-[10px] leading-relaxed text-black">
           <strong className="mr-2 uppercase tracking-widest text-black">public Exchange post</strong>
           everyone can discover the location and description. private contact and arrangement details remain protected.
         </div>
          <div className="border-l-2 border-black pl-3 text-[10px] leading-relaxed text-black">
            <strong className="mr-2 uppercase tracking-widest text-black">safety + reporting</strong>
            this is a notice board, not a housing provider, broker, guarantor, insurer, emergency service, or party to your agreement.
            verify everything yourself. if someone behaves abusively, fraudulently, dangerously, or otherwise does you dirty,{" "}
            <a href="mailto:countercultplatform@gmail.com?subject=Exchange safety report" className="font-bold text-black underline underline-offset-2">
              report it to Countercult
            </a>
            . confirmed serious misconduct means permanent removal from the network.
          </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black mb-2">photos - up to 3{exchangeResidency ? " · at least 1 required" : ""}</label>
          <p className="mb-2 text-[10px] leading-relaxed text-black/55">Photos are private by default. After upload, select any image to show publicly; it appears only while this listing is public. Photos are compressed before upload, with a 2 MB limit each.</p>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <label key={i} className="relative w-24 h-24 border border-black/20 flex items-center justify-center cursor-pointer hover:border-black/60 transition-colors overflow-hidden shrink-0 bg-[#f0f0ec]">
                {photos[i] ? (
                  <>
                    <img src={photoPreviews[i] ?? photos[i]!} className="w-full h-full object-cover" alt="" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const previewUrl = photoPreviews[i];
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                          photoPreviewUrls.current.delete(previewUrl);
                        }
                        setPhotoPreviews((p) => { const n = [...p]; n[i] = null; return n; });
                        setPublicPhotos((current) => current.filter((photo) => photo !== photos[i]));
                        setPhotos((p) => { const n = [...p]; n[i] = null; return n; });
                      }}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[9px] w-4 h-4 flex items-center justify-center hover:bg-black"
                    >✕</button>
                  </>
                ) : photoUploading[i] ? (
                  <span className="text-[9px] uppercase tracking-widest text-black/30 animate-pulse">…</span>
                ) : (
                  <span className="text-black/25 text-xl leading-none">+</span>
                )}
                {!photos[i] && !photoUploading[i] && (
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handlePhotoChange(e, i)} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {photos.map((photo, index) => photo && (
              <label key={photo} className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-black/70">
                <input type="checkbox" checked={publicPhotos.includes(photo)} onChange={(event) => setPublicPhotos((current) => event.target.checked ? [...new Set([...current, photo])] : current.filter((item) => item !== photo))} className="mt-0.5 accent-black" />
                <span>Show photo {index + 1} publicly. Only checked photos appear to visitors, and only while this listing is public.</span>
              </label>
            ))}
          </div>
          {photoError && <p className="text-[10px] text-red-500 mt-1">{photoError}</p>}
          {exchangeResidency && <p className="text-[10px] leading-relaxed text-black mt-1">show the sleeping space clearly. room photos are required for Exchange Residency applicants.</p>}
        </div>
        {isRoomSwap && (
          <fieldset className="border border-black/20 bg-[#f9f9f6] p-3">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-widest">when can this happen? *</legend>
            <div className="flex flex-wrap gap-4 text-[11px]">
              <label className="flex items-center gap-2"><input type="radio" name="availability-mode" checked={availabilityMode === "dates"} onChange={() => setAvailabilityMode("dates")} /> specific date window</label>
              <label className="flex items-center gap-2"><input type="radio" name="availability-mode" checked={availabilityMode === "flexible"} onChange={() => setAvailabilityMode("flexible")} /> flexible timing</label>
            </div>
          </fieldset>
        )}
        {(!isRoomSwap || availabilityMode === "dates") && <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">available from{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap && availabilityMode === "dates"} readOnly={exchangeResidency} type="text" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={`${inputClass} ${exchangeResidency ? "text-black/50 cursor-not-allowed" : ""}`} placeholder={isRoomSwap ? "e.g. June 2025" : "optional"} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">available to{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap && availabilityMode === "dates"} readOnly={exchangeResidency} type="text" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className={`${inputClass} ${exchangeResidency ? "text-black/50 cursor-not-allowed" : ""}`} placeholder={isRoomSwap ? "e.g. Aug 2025" : "optional"} />
          </div>
        </div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {isPracticeShare ? (
              <div className="border border-black/20 bg-black/[0.03] p-3">
                <label className="block text-[10px] uppercase tracking-widest text-black mb-1">exchange terms</label>
                <p className="text-[10px] leading-relaxed text-black">No money is allowed to be exchanged here. Name a specific return. Post paid work through Adverts. Hiring posts with a stated rate also appear in Exchange.</p>
              </div>
            ) : (
              <>
                <label className="block text-[10px] uppercase tracking-widest text-black mb-2">{isPartnerFundedOpportunity ? "fee / budget / funding *" : isOpportunity ? "compensation / exchange terms" : isSpaceShare ? "cost / access terms *" : `cost${isRoomSwap ? " *" : ""}`}</label>
                <input required={isRoomSwap || isPartnerFundedOpportunity || kind === "gig" || isSpaceShare} readOnly={kind === "swap" || exchangeResidency || (isSpaceShare && spaceSwapOpen)} type="text" value={cost} onChange={(e) => setCost(e.target.value)} className={`${inputClass} ${kind === "swap" || exchangeResidency || (isSpaceShare && spaceSwapOpen) ? "text-black/50 cursor-not-allowed" : ""}`} placeholder={isPartnerFundedOpportunity ? "e.g. €2,000 fee, €5,000 grant, funded by…" : kind === "gig" ? "e.g. €50, $100, 50 GBP" : isOpportunity ? "paid fee, free offer, or skill trade" : isSpaceShare ? "FREE, €40/hour, €300/day" : isRoomSwap ? "free, €500/mo, negotiable…" : "optional"} />
                {isSpaceShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">State FREE or give the price, currency, and basis. If negotiable, include an expected range.</p>}
                {isOpportunity && !isPartnerFundedOpportunity && (
                  <p className="mt-1 text-[10px] leading-relaxed text-black">{kind === "gig" ? "paid gigs must be at least 50 in the currency you state." : "open calls can be paid, free, or an exchange."}</p>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">duration / how long{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap} readOnly={exchangeResidency} type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className={`${inputClass} ${exchangeResidency ? "text-black/50 cursor-not-allowed" : ""}`} placeholder={isRoomSwap ? "e.g. min. 2 weeks" : "optional"} />
            {isRoomSwap && (
              <div className="flex flex-wrap gap-2 mt-2">
                {durationPresets.map((preset) => (
                  <button key={preset} type="button" onClick={() => setDuration(preset)} className={`text-[9px] uppercase tracking-widest px-2.5 py-1 border transition-colors ${duration === preset ? "bg-[#c6ff3d] border-[#c6ff3d] text-black" : "border-black/20 text-black/50 hover:border-black hover:text-black"}`}>
                    {DURATION_PRESET_LABELS[preset] ?? preset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isRoomSwap && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black mb-2">sleeping capacity{requiresCapacity ? " *" : ""}</label>
            <input required={requiresCapacity} type="text" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} placeholder="e.g. 1 person, couple ok, up to 3" />
          </div>
        )}
        {exchangeResidency && (
          <label className="flex items-start gap-2 text-[10px] leading-relaxed text-black/60">
            <input type="checkbox" checked={exchangeTermsAccepted} onChange={(e) => setExchangeTermsAccepted(e.target.checked)} className="mt-0.5 accent-black" />
            <span>I understand this is a self-arranged, unfunded experiment. Countercult only curates the connection and virtual programming; I am responsible for my own travel, safety, accommodation agreement, and costs.</span>
          </label>
        )}
        {submitError && (
          <div role="alert" className="border-l-2 border-red-500 bg-red-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-red-700">
            {submitError}
          </div>
        )}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] py-3 bg-[#c6ff3d] text-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-50"
        >
             {createMutation.isPending ? "sharing…" : isRoomSwap ? "share housing →" : isPracticeShare ? "post barter offer →" : kind === "gig" ? "share paid gig →" : defaultTab === "opportunities" ? "share partner opportunity →" : "share space →"}
        </button>
      </form>
    </div>
  );
}

// Edit form - shown inline in place of the card when owner clicks "edit"
function EditOfferForm({ offer, session, onClose }: { offer: ResidencyOffer; session: LocalSession; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [city, setCity] = useState(offer.city ?? "");
  const [destination, setDestination] = useState(offer.destination ?? "");
  const [description, setDescription] = useState(offer.description ?? "");
  const [requestedReturn, setRequestedReturn] = useState(offer.requestedReturn ?? "");
  const [virtualAvailable, setVirtualAvailable] = useState(offer.virtualAvailable === true);
  const [skillSwapTermsAccepted, setSkillSwapTermsAccepted] = useState(false);
  const [skillStayRequest, setSkillStayRequest] = useState(
    offer.tags?.some((tag) => tag.trim().toLowerCase() === EXCHANGE_TAXONOMY_TAGS.skillStayRequest) ?? false,
  );
  const [availableFrom, setAvailableFrom] = useState(offer.availableFrom ?? "");
  const [availableTo, setAvailableTo] = useState(offer.availableTo ?? "");
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode | "">(
    offer.availabilityMode === "dates" || offer.availabilityMode === "flexible"
      ? offer.availabilityMode
      : offer.availableFrom && offer.availableTo ? "dates" : "",
  );
  const [contact, setContact] = useState(offer.contact ?? "");
  const [cost, setCost] = useState(offer.kind === "skill_share" ? "free" : offer.cost ?? "");
  const [duration, setDuration] = useState(offer.duration ?? "");
  const [capacity, setCapacity] = useState(offer.capacity ?? "");
  const [visibility, setVisibility] = useState<"public" | "network" | "private">(
    offer.visibility === "network" ? "network" : offer.visibility === "private" ? "private" : "public",
  );
  const [tags, setTags] = useState<string[]>(offer.tags ?? []);
  const [housingSubtype, setHousingSubtype] = useState<HousingSubtype | "">(
    HOUSING_SUBTYPE_OPTIONS.find((option) => offer.tags?.includes(HOUSING_SUBTYPE_TAGS[option.value]))?.value ?? "",
  );
  const [housingIncludesWorkspace, setHousingIncludesWorkspace] = useState(
    Boolean(offer.tags?.includes(EXCHANGE_TAXONOMY_TAGS.includesWorkspace)),
  );
  const [spaceSwapOpen, setSpaceSwapOpen] = useState(
    Boolean(offer.tags?.includes(EXCHANGE_TAXONOMY_TAGS.arrangementSwap)),
  );
  const isCampaignListing = Boolean(offer.tags?.some(isExchangeResidencyTag));
  const [photos, setPhotos] = useState<(string | null)[]>([
    offer.photos?.[0] ?? null,
    offer.photos?.[1] ?? null,
    offer.photos?.[2] ?? null,
  ]);
  const [publicPhotos, setPublicPhotos] = useState<string[]>(offer.publicPhotos ?? []);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  const photoPreviewUrls = useRef(new Set<string>());
  const [photoUploading, setPhotoUploading] = useState([false, false, false]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const previewUrl of photoPreviewUrls.current) {
        URL.revokeObjectURL(previewUrl);
      }
      photoPreviewUrls.current.clear();
    };
  }, []);

  const kindMeta = OFFER_KINDS.find((k) => k.value === offer.kind) ?? OFFER_KINDS[0];
  const isRoomSwap = ["host", "swap", "looking"].includes(offer.kind);
  const isSpaceShare = ["workshop", "concert", "free_space", "venue_offer"].includes(offer.kind);
  const isPracticeShare = offer.kind === "skill_share";
  const skillShareMode: SkillShareMode = "swap";
  const isOpportunity = ["open_call", "collab", "gig", "skill_share", "partner_offer"].includes(offer.kind);
  const requiresCapacity = isRoomSwap;
  const durationPresets = ["shortterm", "midterm", "longterm"];

  useEffect(() => {
    const noCostExchange = offer.kind === "swap" || offer.kind === "skill_share" || (isSpaceShare && spaceSwapOpen);
    if (noCostExchange) setCost("free");
  }, [offer.kind, isSpaceShare, spaceSwapOpen]);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setPhotoError("photo must be under 20 MB before compression"); return; }
    setPhotoUploading((p) => { const n = [...p]; n[idx] = true; return n; });
    setPhotoError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const compressedFile = await compressExchangePhoto(file);
      const url = await uploadPhoto(compressedFile);
      setPhotos((p) => { const n = [...p]; n[idx] = url; return n; });
      const previousPreview = photoPreviews[idx];
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
        photoPreviewUrls.current.delete(previousPreview);
      }
      photoPreviewUrls.current.add(previewUrl);
      setPhotoPreviews((p) => { const n = [...p]; n[idx] = previewUrl; return n; });
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setPhotoError(error instanceof Error ? error.message : "photo upload failed - try again");
    } finally {
      setPhotoUploading((p) => { const n = [...p]; n[idx] = false; return n; });
      e.target.value = "";
    }
  };

  const updateMutation = useUpdateResidencyOffer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidencyOffersQueryKey() });
        toast.success("listing updated");
        onClose();
      },
      onError: (err: any) => {
        const status = err?.response?.status ?? err?.status;
        if (status === 401) {
          localStorage.removeItem("cc_auth");
          window.dispatchEvent(new CustomEvent("cc:session-change"));
          toast.error("session expired - please sign in again");
        } else if (status === 403) toast.error("you can only edit your own listings");
        else toast.error(err?.message || "failed to update - try again");
      },
    },
  });

  const inputClass = "w-full bg-transparent border-b border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30";

  return (
    <div className="border-2 border-[#c6ff3d] p-5 bg-[#F9F9F6]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-black">
            edit - {kindMeta.glyph} {kindMeta.label}
          </h3>
          <p className="text-[10px] text-black/40 uppercase tracking-widest mt-0.5">{session.entryName}</p>
        </div>
        <button onClick={onClose} className="text-black/30 hover:text-black font-bold">✕</button>
      </div>
      <div className="mb-4">
        <label className="block text-[10px] uppercase tracking-widest text-black/50 mb-2">who can see this?</label>
        <select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "network" | "private")} className={inputClass}>
          <option value="public">everyone · public post + city-area marker</option>
          <option value="network">approved members · network-only city marker</option>
          <option value="private">only you and Countercult admins</option>
        </select>
        <p className="mt-1 text-[10px] leading-relaxed text-black/55">Your audience setting controls who can see the approximate city marker. No street address or exact location is shown.</p>
      </div>
      {isPracticeShare && (
        <fieldset className="mb-4 border-2 border-black bg-[#f9f9f6] p-4">
           <legend className="px-1 text-[10px] font-black uppercase tracking-widest">Barter with an artist *</legend>
          <p className="mb-3 text-[10px] leading-relaxed text-black">
            This is a real exchange, not an advert for your services. Name a specific skill, item, equipment, or help you want in return. No money is allowed to be exchanged here.
          </p>
          {offer.skillShareMode === "free_offer" && (
            <p className="mb-3 border-l-2 border-[#d98d00] pl-3 text-[10px] leading-relaxed text-black">
              New skill listings require a specific non-cash return. Add what you want in exchange to keep this post live.
            </p>
          )}
          {skillShareMode === "swap" && (
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest">
              what specific thing are you asking for in return? *
              <textarea data-testid="input-skill-share-return-edit" required rows={2} maxLength={600} value={requestedReturn} onChange={(event) => setRequestedReturn(event.target.value)} className="mt-2 w-full resize-y border border-black/20 bg-white p-3 text-sm font-normal normal-case tracking-normal text-black" placeholder="For example: one hour of portrait photography for sewing repairs." />
            </label>
          )}
          {skillShareMode === "swap" && (
            <p data-testid="text-skill-share-return-help-edit" className="mt-1 text-[10px] leading-relaxed text-black/60">
              “Exposure,” “follow me,” or “contact me” is not a return. Ask for something concrete.
            </p>
          )}
          <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-black/15 pt-3 text-[10px] leading-relaxed">
            <input type="checkbox" required checked={skillSwapTermsAccepted} onChange={(event) => setSkillSwapTermsAccepted(event.target.checked)} className="mt-0.5 accent-black" />
            <span>I am asking for a specific non-cash return, not advertising my services.</span>
          </label>
          {skillShareMode === "swap" && areSkillShareAnswersNearDuplicate(description, requestedReturn) && (
            <p data-testid="status-skill-share-duplicate-warning-edit" role="status" aria-live="polite" className="mt-2 border-l-2 border-[#d98d00] pl-3 text-[10px] leading-relaxed text-black">
              These answers look very similar. In the first box, describe the skill you can offer. In this box, describe what you want in exchange.
            </p>
          )}
          {skillShareMode === "swap" && (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed">
              <input
                type="checkbox"
                checked={skillStayRequest}
                onChange={(event) => setSkillStayRequest(event.target.checked)}
                className="mt-0.5 accent-black"
              />
              <span>
                <strong className="block uppercase tracking-widest">I’m looking for a free stay in exchange for this skill</strong>
                This listing will also appear under Housing so hosts can find it. Include the city and dates in your request.
              </span>
            </label>
          )}
          <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-black/15 pt-3 text-[10px] leading-relaxed">
            <input type="checkbox" checked={virtualAvailable} onChange={(event) => setVirtualAvailable(event.target.checked)} className="mt-0.5 accent-black" />
            <span><strong className="block uppercase tracking-widest">This exchange can happen online</strong>Choose this for a digital exchange, especially across countries. Leave unchecked if you must meet in person, and enter that city above.</span>
          </label>
          <p className="mt-2 text-[10px] leading-relaxed text-black/65">Agree comparable time or scope together. Countercult does not assign a cash value.</p>
        </fieldset>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isPracticeShare && !requestedReturn.trim()) {
            toast.error("name the specific non-cash thing you want in return");
            return;
          }
          if (isPracticeShare && !skillSwapTermsAccepted) {
            toast.error("confirm this is a real non-cash exchange, not service promotion");
            return;
          }
          if (isPracticeShare && areSkillShareAnswersNearDuplicate(description, requestedReturn)) {
            toast.error("describe a different, specific return; the offer and request cannot be the same");
            return;
          }
          if (isRoomSwap && !availabilityMode) {
            toast.error("choose a date window or flexible timing");
            return;
          }
          if (offer.kind === "gig") {
            if (!destination.trim()) {
              toast.error("name the person or organisation hiring");
              return;
            }
            if (/\b(?:i can offer (?:my )?services?|i offer (?:my )?services?|i provide (?:my )?services?|offering my services|my services|available for hire|hire me)\b/i.test(description)) {
              toast.error("paid gigs must describe a job or commission, not advertise your services");
              return;
            }
            const amount = Number((cost.match(/\d+(?:[.,]\d+)?/)?.[0] ?? "").replace(",", "."));
            if (!Number.isFinite(amount) || amount < 50) {
              toast.error("paid gigs must include compensation of at least 50 in the stated currency");
              return;
            }
          }
          updateMutation.mutate({
            id: offer.id,
            data: {
              city: city.trim(),
              description: description.trim(),
              availableFrom: isRoomSwap && availabilityMode === "flexible" ? null : availableFrom.trim() || null,
              availableTo: isRoomSwap && availabilityMode === "flexible" ? null : availableTo.trim() || null,
              availabilityMode: isRoomSwap ? availabilityMode || null : null,
              skillShareMode: isPracticeShare ? "swap" : null,
              requestedReturn: isPracticeShare ? requestedReturn.trim() : null,
              virtualAvailable: isPracticeShare && virtualAvailable,
              contact: contact.trim() || null,
               destination: offer.kind === "looking" || offer.kind === "gig" ? (destination.trim() || null) : null,
              cost: isPracticeShare || offer.kind === "swap" || (isSpaceShare && spaceSwapOpen) ? "free" : cost.trim() || null,
              duration: duration.trim() || null,
              capacity: capacity.trim() || null,
               tags: [...new Set([
                 ...tags.filter((tag) => !OFFER_FORM_MANAGED_TAXONOMY_TAGS.has(tag.trim().toLowerCase())),
                ...(isCampaignListing
                  ? [EXCHANGE_RESIDENCY_TAG, EXCHANGE_TAXONOMY_TAGS.housingResidency]
                  : []),
                ...(offer.kind === "host" && housingSubtype && !isCampaignListing
                  ? [HOUSING_SUBTYPE_TAGS[housingSubtype]]
                  : []),
                ...(isRoomSwap && housingIncludesWorkspace
                  ? [EXCHANGE_TAXONOMY_TAGS.includesWorkspace]
                  : []),
                ...(isSpaceShare && spaceSwapOpen
                  ? [EXCHANGE_TAXONOMY_TAGS.arrangementSwap]
                  : []),
                ...(isPracticeShare && skillShareMode === "swap" && skillStayRequest
                  ? [EXCHANGE_TAXONOMY_TAGS.skillStayRequest]
                   : []),
               ])],
              photos: photos.filter((p): p is string => !!p),
              publicPhotos: publicPhotos.filter((photo) => photos.includes(photo)),
              visibility,
            },
          });
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">{isPracticeShare ? "your city or meeting city" : "your city"}</label>
            <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="e.g. Berlin" />
            {isPracticeShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">For in-person trades, use the city where you can meet. For online trades, use your city for the approximate map location.</p>}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">preferred contact</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} placeholder="email, @handle…" />
          </div>
        </div>
        {(offer.kind === "looking" || offer.kind === "gig") && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">{offer.kind === "gig" ? "who is hiring or commissioning? *" : "looking to go to"}</label>
            <input required={offer.kind === "gig"} type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} placeholder={offer.kind === "gig" ? "name the client, organisation, or project" : "e.g. Tokyo, Mexico City…"} />
          </div>
        )}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">{isPracticeShare ? "what skill can you offer? *" : "description"}</label>
          <textarea data-testid={isPracticeShare ? "input-skill-share-offer-edit" : undefined} required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border border-black/20 p-3 text-sm focus:outline-none focus:border-black resize-none text-black placeholder:text-black/30" placeholder={isPracticeShare ? "Name the skill and what you can do for someone." : "what are you offering?"} />
          {isPracticeShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">Name a skill and what you can do for someone.</p>}
        </div>
        {isRoomSwap && (
          <div className="grid gap-3 border border-black/20 bg-white p-3">
            {offer.kind === "host" && (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/50">
                  housing type
                  <select
                    value={housingSubtype}
                    disabled={isCampaignListing}
                    onChange={(event) => setHousingSubtype(event.target.value as HousingSubtype | "")}
                    className={`${inputClass} mt-1 disabled:opacity-50`}
                  >
                    <option value="">not specified</option>
                    {HOUSING_SUBTYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {isCampaignListing && (
                  <p className="text-[10px] leading-relaxed text-black/60">Exchange Residency is managed as a separate curated programme.</p>
                )}
              </>
            )}
            <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-black/70">
              <input
                type="checkbox"
                checked={housingIncludesWorkspace}
                onChange={(event) => setHousingIncludesWorkspace(event.target.checked)}
                className="mt-0.5 accent-black"
              />
              <span><strong className="block uppercase tracking-widest text-black">this housing listing also includes a workspace</strong>It will appear under both Housing and Spaces.</span>
            </label>
          </div>
        )}
        {isSpaceShare && (
          <label className="flex cursor-pointer items-start gap-2 border border-black/20 bg-white p-3 text-[10px] leading-relaxed text-black/70">
            <input
              type="checkbox"
              checked={spaceSwapOpen}
              onChange={(event) => setSpaceSwapOpen(event.target.checked)}
              className="mt-0.5 accent-black"
            />
            <span><strong className="block uppercase tracking-widest text-black">open to a reciprocal workspace swap</strong>Swaps are free, reciprocal exchanges. If you charge money, post this as a space offer instead.</span>
          </label>
        )}
         <div className="border-l-2 border-[#c6ff3d] pl-3 text-[10px] leading-relaxed text-black/50">
           <strong className="mr-2 uppercase tracking-widest text-black">public Exchange post</strong>
           everyone can discover the location and description. private contact and arrangement details remain protected.
         </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">photos - up to 3</label>
          <p className="mb-2 text-[10px] leading-relaxed text-black/55">Photos are private by default. Select any image to show publicly; it appears only while this listing is public. Photos are compressed before upload, with a 2 MB limit each.</p>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <label key={i} className="relative w-24 h-24 border border-black/20 flex items-center justify-center cursor-pointer hover:border-black/60 transition-colors overflow-hidden shrink-0 bg-[#f0f0ec]">
                {photos[i] ? (
                  <>
                    <img src={photoPreviews[i] ?? photos[i]!} className="w-full h-full object-cover" alt="" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const previewUrl = photoPreviews[i];
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                          photoPreviewUrls.current.delete(previewUrl);
                        }
                        setPhotoPreviews((p) => { const n = [...p]; n[i] = null; return n; });
                        setPublicPhotos((current) => current.filter((photo) => photo !== photos[i]));
                        setPhotos((p) => { const n = [...p]; n[i] = null; return n; });
                      }}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[9px] w-4 h-4 flex items-center justify-center hover:bg-black"
                    >✕</button>
                  </>
                ) : photoUploading[i] ? (
                  <span className="text-[9px] uppercase tracking-widest text-black/30 animate-pulse">…</span>
                ) : (
                  <span className="text-black/25 text-xl leading-none">+</span>
                )}
                {!photos[i] && !photoUploading[i] && (
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handlePhotoChange(e, i)} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {photos.map((photo, index) => photo && (
              <label key={photo} className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-black/70">
                <input type="checkbox" checked={publicPhotos.includes(photo)} onChange={(event) => setPublicPhotos((current) => event.target.checked ? [...new Set([...current, photo])] : current.filter((item) => item !== photo))} className="mt-0.5 accent-black" />
                <span>Show photo {index + 1} publicly. Only checked photos appear to visitors, and only while this listing is public.</span>
              </label>
            ))}
          </div>
          {photoError && <p className="text-[10px] text-red-500 mt-1">{photoError}</p>}
        </div>
        {isRoomSwap && (
          <fieldset className="border border-black/20 bg-[#f9f9f6] p-3">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-widest">when can this happen? *</legend>
            <div className="flex flex-wrap gap-4 text-[11px]">
              <label className="flex items-center gap-2"><input type="radio" name={`availability-mode-${offer.id}`} checked={availabilityMode === "dates"} onChange={() => setAvailabilityMode("dates")} /> specific date window</label>
              <label className="flex items-center gap-2"><input type="radio" name={`availability-mode-${offer.id}`} checked={availabilityMode === "flexible"} onChange={() => setAvailabilityMode("flexible")} /> flexible timing</label>
            </div>
          </fieldset>
        )}
        {(!isRoomSwap || availabilityMode === "dates") && <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">available from{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap && availabilityMode === "dates"} type="text" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} placeholder={isRoomSwap ? "e.g. June 2025" : "optional"} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">available to{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap && availabilityMode === "dates"} type="text" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className={inputClass} placeholder={isRoomSwap ? "e.g. Aug 2025" : "optional"} />
          </div>
        </div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {isPracticeShare ? (
              <div className="border border-black/20 bg-black/[0.03] p-3">
                <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-1">exchange terms</label>
                <p className="text-[10px] leading-relaxed text-black/65">No money is allowed to be exchanged here. Name a specific return. Post paid work through Adverts. Hiring posts with a stated rate also appear in Exchange.</p>
              </div>
            ) : (
              <>
                <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">{isOpportunity ? "compensation / exchange terms" : isSpaceShare ? "cost / access terms *" : `cost${isRoomSwap ? " *" : ""}`}</label>
                <input required={isRoomSwap || isSpaceShare} readOnly={offer.kind === "swap" || (isSpaceShare && spaceSwapOpen)} type="text" value={cost} onChange={(e) => setCost(e.target.value)} className={`${inputClass} ${offer.kind === "swap" || (isSpaceShare && spaceSwapOpen) ? "text-black/50 cursor-not-allowed" : ""}`} placeholder={isOpportunity ? "paid fee, free offer, or skill trade" : isSpaceShare ? "FREE, €40/hour, €300/day" : isRoomSwap ? "free, €500/mo, negotiable…" : "optional"} />
                {isSpaceShare && <p className="mt-1 text-[10px] leading-relaxed text-black/60">State FREE or give the price, currency, and basis. If negotiable, include an expected range.</p>}
                {isOpportunity && (
                  <p className="mt-1 text-[10px] leading-relaxed text-black/45">say whether the artist is paid, this is free, or the exchange is a trade.</p>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">duration / how long{isRoomSwap ? " *" : ""}</label>
            <input required={isRoomSwap} type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} placeholder={isRoomSwap ? "e.g. min. 2 weeks" : "optional"} />
            {isRoomSwap && (
              <div className="flex flex-wrap gap-2 mt-2">
                {durationPresets.map((preset) => (
                  <button key={preset} type="button" onClick={() => setDuration(preset)} className={`text-[9px] uppercase tracking-widest px-2.5 py-1 border transition-colors ${duration === preset ? "bg-[#c6ff3d] border-[#c6ff3d] text-black" : "border-black/20 text-black/50 hover:border-black hover:text-black"}`}>
                    {DURATION_PRESET_LABELS[preset] ?? preset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isRoomSwap && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">sleeping capacity *</label>
            <input required={requiresCapacity} type="text" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} placeholder="e.g. 1 person, couple ok, up to 3" />
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] py-3 bg-[#c6ff3d] text-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? "saving…" : "save changes →"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] uppercase tracking-widest font-bold border border-black/20 px-5 py-3 text-black/50 hover:border-black hover:text-black transition-colors"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Paid post form - shown after returning from Stripe
function PaidPostForm({ stripeSessionId, defaultTab, onClose }: { stripeSessionId: string; defaultTab: BoardTab; onClose: () => void }) {
  const queryClient = useQueryClient();
  const tabKinds = OFFER_KINDS.filter((k) => k.tab === defaultTab && k.tab !== "room_swap");
  const allPaidKinds = OFFER_KINDS.filter((k) => k.tab !== "room_swap");
  const startKinds = tabKinds.length > 0 ? tabKinds : allPaidKinds;

  const [kind, setKind] = useState<OfferKind>(startKinds[0]?.value ?? "workshop");
  const [posterName, setPosterName] = useState("");
  const [posterEmail, setPosterEmail] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [contact, setContact] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputClass = "w-full bg-transparent border-b border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/residency/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeSessionId, posterName: posterName.trim(), posterEmail: posterEmail.trim() || undefined, kind, city: city.trim(), description: description.trim(), availableFrom: availableFrom.trim() || undefined, availableTo: availableTo.trim() || undefined, contact: contact.trim() || undefined, cost: cost.trim() || undefined, duration: duration.trim() || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed to post");
      queryClient.invalidateQueries({ queryKey: getListResidencyOffersQueryKey() });
      onClose();
    } catch (err: any) {
      setSubmitError(err.message ?? "failed to post");
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-black/10 p-5 mb-8 bg-[#F9F9F6]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold uppercase tracking-widest text-black">✓ payment confirmed - fill in your listing</h3>
        <button onClick={onClose} className="text-black/30 hover:text-black font-bold">✕</button>
      </div>
      <p className="text-[10px] text-black/40 uppercase tracking-widest mb-5">your listing will go live for 30 days</p>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">listing type</label>
          <div className="flex flex-col gap-2">
            {allPaidKinds.map((k) => (
              <label key={k.value} className={`flex items-start gap-3 cursor-pointer p-3 border transition-colors ${kind === k.value ? "bg-[#c6ff3d] text-black border-[#c6ff3d]" : "bg-transparent border-black/10 text-black hover:border-black/40"}`}>
                <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="sr-only" />
                <span className="text-base shrink-0 leading-none mt-0.5">{k.glyph}</span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider">{k.label}</div>
                  <div className={`text-[9px] mt-0.5 ${kind === k.value ? "text-black/60" : "text-black/30"}`}>{TABS.find((t) => t.value === k.tab)?.label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">your name / org *</label>
            <input required type="text" value={posterName} onChange={(e) => setPosterName(e.target.value)} className={inputClass} placeholder="e.g. Soma Records" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">email (optional)</label>
            <input type="email" value={posterEmail} onChange={(e) => setPosterEmail(e.target.value)} className={inputClass} placeholder="for receipt reference" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">city *</label>
            <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="e.g. Glasgow" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">preferred contact</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} placeholder="email, website, @handle…" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">description *</label>
          <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border border-black/20 p-3 text-sm focus:outline-none focus:border-black resize-none text-black placeholder:text-black/30" placeholder="describe your offer, open call, opportunity, or space…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">dates from</label>
            <input type="text" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} placeholder="e.g. Sep 2025" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">dates to</label>
            <input type="text" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className={inputClass} placeholder="e.g. Dec 2025" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">cost</label>
            <input type="text" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} placeholder="free, €500/mo, negotiable…" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">duration</label>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} placeholder="e.g. 2 weeks min" />
          </div>
        </div>
        {submitError && (
          <div role="alert" className="border-l-2 border-red-500 bg-red-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-red-700">
            {submitError}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] py-3 bg-[#c6ff3d] text-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-50"
        >
          {submitting ? "posting…" : "publish listing →"}
        </button>
      </form>
    </div>
  );
}
