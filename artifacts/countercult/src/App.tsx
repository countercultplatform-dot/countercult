import { Component, lazy, Suspense, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import CookieBanner from "@/components/CookieBanner";
import FixedPatronPostSticker from "@/components/FixedPatronPostSticker";
import { AnonymousQuestionSticker } from "@/components/AnonymousQuestionSticker";
import { chooseStickerPosition, getOppositeStickerPosition } from "@/components/sticker-position";
import MainSiteMenu from "@/components/MainSiteMenu";
import { TermsModal } from "@/components/TermsModal";
import { WorkWithUsStickers } from "@/components/WorkWithUsStickers";

const Explorer = lazy(() => import("@/pages/Explorer"));
const Home = lazy(() => import("@/pages/home"));
const SnailMailLanding = lazy(() => import("@/pages/SnailMailLanding"));
const PatronPostQuestionSent = lazy(() => import("@/pages/PatronPostQuestionSent"));
const Admin = lazy(() => import("@/pages/Admin"));
const EntryDetail = lazy(() => import("@/pages/EntryDetail"));
const SubmitChat = lazy(() => import("@/pages/SubmitChat").then((module) => ({ default: module.SubmitChat })));
const ArtHouses = lazy(() => import("@/pages/ArtHouses"));

function SubmitEntryPage() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialKind = params.get("kind") === "space" ? "space" : undefined;
  const returnTo = params.get("returnTo") === "/member-home" ? "/member-home" : "/explore";
  const returnToPage = () => setLocation(returnTo);
  return (
    <SubmitChat
      initialKind={initialKind}
      onClose={returnToPage}
      onSuccess={returnToPage}
    />
  );
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-[#F9F9F6] font-mono text-black gap-4 px-6 text-center">
          <div className="text-2xl font-bold uppercase tracking-widest">something went wrong</div>
          <p className="text-[11px] text-black/50 uppercase tracking-widest">this voice couldn't load - it may have been removed or contain unsupported data.</p>
          <a href="/explore" className="text-[10px] uppercase tracking-widest font-bold bg-black text-[#c6ff3d] px-4 py-2 hover:bg-[#c6ff3d] hover:text-black transition-colors">← search for culture</a>
        </div>
      );
    }
    return this.props.children;
  }
}

function RatLoadingScreen({ label = "opening countercult…" }: { label?: string }) {
  return (
    <main
      className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-4 bg-black font-mono text-[10px] uppercase tracking-[0.16em] text-[#c6ff3d]"
      aria-live="polite"
      aria-label={label}
    >
      <img src="/cult-rat.gif" alt="" aria-hidden="true" className="cc-intro-rat h-24 w-auto sm:h-36" />
      <span>{label}</span>
    </main>
  );
}

function NavigationRatBuffer({ location }: { location: string }) {
  const previousLocation = useRef(location);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (previousLocation.current === location) return;

    previousLocation.current = location;
    if (location.split("?")[0].startsWith("/entries/")) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timer = window.setTimeout(() => setIsVisible(false), 200);

    return () => window.clearTimeout(timer);
  }, [location]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <RatLoadingScreen key={location} label="moving through the network…" />
    </div>
  );
}

const Residency = lazy(() => import("@/pages/Residency"));
const Adverts = lazy(() => import("@/pages/Adverts"));
const GuadalajaraResidency = lazy(() => import("@/pages/GuadalajaraResidency"));
const Faq = lazy(() => import("@/pages/Faq"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Browse = lazy(() => import("@/pages/Browse"));
const TagBrowse = lazy(() => import("@/pages/TagBrowse"));
const CityBrowse = lazy(() => import("@/pages/CityBrowse"));
const Media = lazy(() => import("@/pages/Media"));
const MediaPost = lazy(() => import("@/pages/MediaPost"));
const AuthVerify = lazy(() => import("@/pages/AuthVerify"));
const ClaimSpace = lazy(() => import("@/pages/ClaimSpace"));
const Profile = lazy(() => import("@/pages/Profile"));
const MemberHome = lazy(() => import("@/pages/MemberHome"));
const MemberApplicationConfirmation = lazy(() => import("@/pages/MemberApplicationConfirmation"));
const SetupPassword = lazy(() => import("@/pages/SetupPassword"));
const About = lazy(() => import("@/pages/About"));
const Press = lazy(() => import("@/pages/Press"));
const Partners = lazy(() => import("@/pages/Partners"));
const CollectiveFund = lazy(() => import("@/pages/CollectiveFund"));
const CollectiveFundThanks = lazy(() => import("@/pages/CollectiveFundThanks"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const News = lazy(() => import("@/pages/News"));
const StudiosSelector = lazy(() => import("@/pages/StudiosSelector"));
const Studios = lazy(() => import("@/pages/Studios"));
const StudiosForYou = lazy(() => import("@/pages/StudiosForYou"));
const StudiosPlaces = lazy(() => import("@/pages/StudiosPlaces"));
const StudiosTourism = lazy(() => import("@/pages/StudiosTourism"));
const StudiosEconomicDevelopment = lazy(() => import("@/pages/StudiosEconomicDevelopment"));
const StudiosPlaceIntelligence = lazy(() => import("@/pages/StudiosPlaceIntelligence"));
const ResidentWork = lazy(() => import("@/pages/ResidentWork"));
const TheFloor = lazy(() => import("@/pages/TheFloor"));
const CountercultFund = lazy(() => import("@/pages/CountercultFund"));
const FundPlaybook = lazy(() => import("@/pages/FundPlaybook"));
const Discover = lazy(() => import("@/pages/Discover"));
const JoinNetwork = lazy(() => import("@/pages/JoinNetwork"));
const KlunkerkranichEvent = lazy(() => import("@/pages/KlunkerkranichEvent"));
const SalonNight = lazy(() => import("@/pages/SalonNight"));
const SeoTopicHub = lazy(() => import("@/pages/SeoTopicHub"));
const BerlinArtistGuide = lazy(() => import("@/pages/BerlinArtistGuide"));
const Model = lazy(() => import("@/pages/Model"));
import { PledgeBanner } from "@/components/PledgeBanner";
import { PledgePopup } from "@/components/PledgePopup";
import MemberNetworkPrompt from "@/components/MemberNetworkPrompt";
import { GlobalIdentityMetadata } from "@/components/GlobalIdentityMetadata";
import { GlobalExchangeAnnouncement } from "@/components/GlobalExchangeAnnouncement";

const SEO_ORIGIN = "https://countercult.network";

function hasPartnerPosterSession(): boolean {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return false;
    const session = JSON.parse(raw) as { accountRole?: string; canPostPartnerOffers?: boolean; expiresAt?: string };
    return (session.accountRole === "partner_poster" || session.canPostPartnerOffers === true)
      && (!session.expiresAt || new Date(session.expiresAt) > new Date());
  } catch {
    return false;
  }
}

const PAGE_METADATA: Array<{ prefix: string; title: string; description: string }> = [
  {
    prefix: "/application-received",
    title: "Application Received | Countercult",
    description: "Countercult Network application status and next steps for a separate, private Exchange post.",
  },
  {
    prefix: "/art-houses",
    title: "Countercult Art Houses | Free Artist Residency at THE FLOOR",
    description: "Apply for a free artist residency at THE FLOOR in Berlin, 16–26 December 2026. Share documentation of your stay in a format you propose; utilities apply.",
  },
  {
    prefix: "/the-floor",
    title: "Berlin Artist Residency at THE FLOOR | Sketchy Shona",
    description: "THE FLOOR is a locally run FLINTA, queer and migrant art residency in Neukölln, with 100m² of live/work and indoor/outdoor studio space.",
  },
  {
    prefix: "/",
    title: "Countercult | Post-AI Data + Financial Infrastructure",
    description: "Countercult: post-AI data and financial infrastructure for local development. A 7,000+ member Network connects verified culture to city capital and paid work.",
  },
  {
    prefix: "/explore",
    title: "Find Local Artists and Culture by Place | Countercult",
    description: "Explore independent artists, spaces, local scenes and underground culture by city, town or region. Find people and places beyond the usual tourist route.",
  },
  {
    prefix: "/partner-workspace",
    title: "Partner Workspace | Countercult",
    description: "Offer paid work, resources, discounts, access, and artist-rate space through Countercult's partner workspace.",
  },
  {
    prefix: "/browse/artist",
    title: "Find Local Artists and Cultural Workers | Countercult",
    description: "Discover independent artists, collectives and cultural workers by city, practice and tag for collaboration, commissions and local discovery.",
  },
  {
    prefix: "/city",
    title: "Public Place Pages for Local Culture | Countercult",
    description: "Explore the artists, physical spaces, local operators, and cultural places already present in a city, town, or rural place.",
  },
  {
    prefix: "/place",
    title: "Find the Culture That Makes a Place Itself | Countercult",
    description: "Explore artists, spaces, local scenes, and cultural places connected to a city, town, village, rural area, or region.",
  },
  {
    prefix: "/browse/space",
    title: "Artist-Run Spaces + Cultural Infrastructure | Countercult",
    description: "Find artist-run spaces, studios, venues, clubs, galleries, and independent places for collaboration, programming, commissions, and local work.",
  },
  {
    prefix: "/browse/artifact",
    title: "Cultural Places, Practices + Local Knowledge | Countercult",
    description: "Explore public cultural places, practices, artifacts, and local knowledge that can inform artist-led programmes, commissions, and place development.",
  },
  {
    prefix: "/tag",
    title: "Artists, Spaces + Cultural Work by Tag | Countercult",
    description: "Browse independent artists, spaces, places, and cultural work by topic for discovery, collaboration, commissioning, and place-based projects.",
  },
  {
    prefix: "/entries",
    title: "Find Public Artist, Space + Cultural Operator Voices | Countercult",
    description: "Find public voices from independent artists, collectives, cultural spaces, and local operators; discover, invite, commission, or collaborate.",
  },
  {
    prefix: "/residency/guadalajara",
    title: "Guadalajara Pop-Up Art House | Artist Residency",
    description: "One-month Guadalajara art house and artist residency, 5 Jan to 5 Feb 2027. Patron Stay €2,000 with artist-led workshops for patrons in tech, design, and culture.",
  },
  {
    prefix: "/residency",
    title: "Artist Residency Exchange | Sketchy Shona + Countercult",
    description: "Sketchy Shona founded Countercult’s Exchange for artists to share rooms, spaces, residencies, skills, and opportunities. Members confirm terms directly.",
  },
  {
    prefix: "/media",
    title: "Countercult Media | Culture + Local Economies",
    description: "Features, interviews, field notes, and stories about economic development through culture, open infrastructure, local value, and independent cultural work.",
  },
  {
    prefix: "/news",
    title: "Countercult News | Independent Culture + Local Economies",
    description: "Notes on the people, places, resources, and ideas making independent culture happen, and how cultural work can support stronger local economies.",
  },
  {
    prefix: "/about",
    title: "About Countercult | Post-AI Local Infrastructure",
    description: "Countercult turns verified local cultural knowledge into B2B infrastructure connecting city-scale capital, paid creative work, and artist-led places.",
  },
  {
    prefix: "/press",
    title: "Countercult Press Kit | Facts, Records + Contact",
    description: "A journalist-ready Countercult press kit with confirmed facts, Fund mechanics, source articles, published project records, images, founder information, and contact.",
  },
  {
    prefix: "/partners",
    title: "Work With Countercult | Cultural + Economic Infrastructure",
    description: "Build with Countercult across local intelligence, cultural and economic infrastructure, technology, place partnerships, paid Studios projects, and the Countercult Fund.",
  },
  {
    prefix: "/collective-fund",
    title: "Support Countercult’s Collective Fund | Patron Post",
    description: "Patron Post supports Countercult’s free Network and resources. At 1,000 readers, it will fund local artists and builders documenting cultural spaces worldwide.",
  },
  {
    prefix: "/snail",
    title: "Become a Snail | Independent Culture by Post",
    description: "Join Sketchy Shona’s Patron Post for independent culture, studio work, and field notes delivered as real mail. Step away from the feed and take part in something tangible.",
  },
  {
    prefix: "/model",
    title: "Countercult Model | Data, Capital + Local Culture",
    description: "Countercult connects a 7,000+ member cultural network to city, tourism, employer, and brand capital, paid work, and artist-led places.",
  },
  {
    prefix: "/studios/for-you",
    title: "Countercult Studios | Events, People + Places",
    description: "Countercult brings artists, local people, events, and production together to make places people want to visit and return to.",
  },
  {
    prefix: "/studios/places",
    title: "Place-Based Economic Development Through Culture | Countercult Studios",
    description: "Represent a place, destination, institution, or development? Countercult builds the public place records, programmes, commissions, and relationships that connect local culture to economic opportunity.",
  },
  {
    prefix: "/studios/tourism",
    title: "Economic Development Through Culture for Places | Countercult",
    description: "Countercult brings cultural and economic infrastructure to destinations, tourism platforms, cities, towns, and rural places, using culture to connect local operators to visitors and long-term place value.",
  },
  {
    prefix: "/studios/economic-development",
    title: "Local Economic Development Through Local Culture | Countercult Studios",
    description: "Countercult builds cultural discovery infrastructure and marketing that connect a place's existing culture to the audiences, partners, commissions, and budgets local people want to reach.",
  },
  {
    prefix: "/studios/place-intelligence",
    title: "Economic Development Through Culture | Countercult Studios",
    description: "Countercult maps the people, spaces and practices shaping a place, connects local cultural value to existing demand and budgets, then delivers paid place work and leaves a public record and working network.",
  },
  {
    prefix: "/studios/resident-work",
    title: "Making Street Art Together in Berlin | Countercult Studios",
    description: "I planned a Berlin street-art session and artistic route with residents and visitors. Nash, a resident at THE FLOOR, photographed the day.",
  },
  {
    prefix: "/studios/brief",
    title: "Start a Countercult Studios Brief",
    description: "Tell Countercult Studios what you need for a technology, luxury, or experience-led brief, from product positioning and brand direction to customer experiences, curation, and production.",
  },
  {
    prefix: "/studios/services",
    title: "Countercult Studios | Strategy + Delivery for Tech, Luxury + Experiences",
    description: "Countercult Studios works with technology teams on product positioning and customer experience, luxury brands on brand direction and collaborations, and experience-led businesses on live concepts and production, from strategy to fabrication and launch.",
  },
  {
    prefix: "/studios/start",
    title: "Work With Countercult | Cultural + Economic Infrastructure",
    description: "Work with Countercult across cultural and economic infrastructure, technology, local knowledge, place partnerships, paid Studios projects, and the Countercult Fund.",
  },
  {
    prefix: "/studios",
    title: "Countercult Studios | Cultural Infrastructure Delivery",
    description: "Countercult Studios brings local cultural knowledge into paid projects, commissions, campaigns, experiences, and place partnerships, from research through delivery.",
  },
  {
    prefix: "/fund/playbook",
    title: "Countercult Fund Playbook | Sales-Linked Local Marketing",
    description: "A practical guide to using selected sales for local marketing, customer experiences, and cultural programmes, with reporting, settlement, costs, and delivery agreed with Countercult.",
  },
  {
    prefix: "/fund",
    title: "Countercult Studios Fund | Fintech for Local Culture",
    description: "The Countercult Fund currently uses client-held budgets. Clients pay commissioned artists and Countercult Studios separately; automated holding, routing, and payouts are future development.",
  },
  {
    prefix: "/faq",
    title: "Countercult FAQ | Artists, Cultural Work + Member Exchange",
    description: "Answers for artists and cultural workers about public voices, commissions, approvals, the map, spaces, and protected member exchange.",
  },
  {
    prefix: "/privacy",
    title: "Privacy + Data Rights | Countercult",
    description: "How Countercult handles public profiles, accounts, Exchange data, emails, analytics, and requests to access, correct, or delete personal data.",
  },
  {
    prefix: "/discover",
    title: "Discover Artists, Spaces + Local Culture | Countercult",
    description: "Find the people, places, and practices shaping local culture. Make a route to collaborate, commission, or work with them.",
  },
  {
    prefix: "/join",
    title: "Join Countercult | Free Network + Sharing Board",
    description: "Browse public posts, then apply to the free curated Network for artists, spaces, and cultural builders. Applications take about two minutes and are reviewed before member access.",
  },
  {
    prefix: "/events/klunkerkranich-2026",
    title: "Countercult x Klunkerkranich - Live Drawing, Jazz + DJs | 17 September 2026",
    description: "A Countercult + Klunkerkranich gathering in Berlin: open drawing, live jazz, jazzy house sets and DJs, with local creatives curated and paid.",
  },
  {
    prefix: "/events/berlin-salon-night",
    title: "Berlin Salon Night | Countercult x THE FLOOR x Berlin Pulse",
    description: "A Berlin Salon Night collaboration involving Countercult, THE FLOOR, Sketchy Shona and Berlin Pulse. Event logistics will be published when confirmed.",
  },
];

function setMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function artifactPath(pathname: string) {
  const currentPath = window.location.pathname;
  const routeMarker = ["/journal", "/media/countercult-free"].find((marker) => currentPath.includes(marker));
  const runtimeBase = routeMarker
    ? currentPath.slice(0, currentPath.indexOf(routeMarker))
    : (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  return `${runtimeBase}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function JournalRedirect({ articleSlug }: { articleSlug?: string }) {
  const destination = articleSlug
    ? artifactPath(`/journal/${articleSlug}/index.html`)
    : artifactPath("/journal/index.html");

  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#F9F9F6] font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
      opening journal…
    </main>
  );
}

function SharePageRedirect() {
  useEffect(() => {
    window.location.replace(artifactPath("/media/countercult-free/index.html"));
  }, []);

  return (
    <main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#F9F9F6] font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
      opening share page…
    </main>
  );
}

function AppRouteRedirect({ destination, label }: { destination: string; label: string }) {
  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#F9F9F6] font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
      {label}
    </main>
  );
}

function StudiosLandingRedirect() {
  return <AppRouteRedirect destination={artifactPath("/studios")} label="opening Countercult Studios…" />;
}

function SignupRedirect() {
  const referralCode = new URLSearchParams(window.location.search).get("ref");
  const destination = referralCode
    ? `/explore?action=join&ref=${encodeURIComponent(referralCode)}`
    : "/explore?action=join";
  return <AppRouteRedirect destination={destination} label="opening join form…" />;
}

function SigninRedirect() {
  return <AppRouteRedirect destination="/explore?action=signin" label="opening sign-in…" />;
}

function NotFoundPage() {
  useEffect(() => {
    document.title = "Page not found | Countercult";
    setMeta("description", "The requested Countercult page could not be found.");
    setMeta("robots", "noindex, nofollow");
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = new URL(window.location.pathname, SEO_ORIGIN).toString();
  }, []);

  return (
    <main className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-[#F9F9F6] px-6 text-center font-mono text-black">
      <p className="text-[10px] uppercase tracking-[0.16em] text-black/50">404 / not found</p>
      <h1 className="text-3xl font-bold uppercase tracking-widest">this page is elsewhere</h1>
      <a href={artifactPath("/explore")} className="bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d]">
        return to the network
      </a>
    </main>
  );
}

export default function App() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const pathname = location.split("?")[0].split("#")[0] || "/";
    const keepsTrailingSlash = pathname === "/journal/" || pathname.startsWith("/journal/") || pathname === "/media/countercult-free/";
    if (pathname.length > 1 && pathname.endsWith("/") && !keepsTrailingSlash) {
      navigate(`${pathname.replace(/\/+$/, "")}${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  const isLanding = location === "/";
  const isJoin = location === "/join" || location.startsWith("/join?");
  const isTheFloor = location === "/the-floor";
  const isGuadalajaraResidency = location.split("?")[0] === "/residency/guadalajara";
  const isEventRoute = location === "/events/klunkerkranich-2026" || location === "/events/berlin-salon-night";
  const isStudios = location === "/studios" || location.startsWith("/studios/") || location === "/fund" || location.startsWith("/fund/") || location === "/press" || location === "/partners";
  const isPartnerWorkspaceRoute = location === "/partner-workspace";
  const isAdminRoute = location === "/admin";
  const isPartnerDiscoveryRoute = (
    location === "/explore" ||
    location === "/discover" ||
    location === "/member-home" ||
    location === "/profile" ||
    location === "/browse" ||
    location.startsWith("/browse/") ||
    location.startsWith("/tag/") ||
    location.startsWith("/place/") ||
    location.startsWith("/city/") ||
    location.startsWith("/entries/")
  );
  const isPartnerSession = hasPartnerPosterSession();
  const pathname = location.split("?")[0].split("#")[0] || "/";
  const patronStickerPosition = useMemo(chooseStickerPosition, [pathname]);
  const questionStickerPosition = getOppositeStickerPosition(patronStickerPosition);
  const isCollectiveFund = pathname === "/collective-fund" || pathname === "/collective-fund/thanks";
  const isResidentWorkPage = pathname === "/studios/resident-work";
  const isSnailLanding = pathname === "/snail";
  const isArtHousesPage = pathname === "/art-houses";
  const isStudiosConversionPage = pathname === "/studios/start" || pathname === "/studios/place-intelligence";
  const isExchangeBoardRoute = pathname === "/residency";
  const isFundSalesPage = pathname === "/fund";
  const privateRoutePrefixes = [
    "/admin",
    "/application-received",
    "/profile",
    "/member-home",
    "/partner-workspace",
    "/setup-password",
    "/reset-password",
    "/auth/",
    "/register-vetted-artist",
  ];
  const isPrivateRoute = privateRoutePrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )) || (
    pathname === "/residency" &&
    new URLSearchParams(window.location.search).get("view") === "mine"
  );
  const isPatronPostQuestionSent = pathname === "/snail/question-sent";
  const showAnonymousQuestionSticker =
    !isPrivateRoute
    && !isPartnerSession
    && !isPartnerWorkspaceRoute
    && !isPatronPostQuestionSent
    && !isCollectiveFund
    && !isArtHousesPage
    && !isStudiosConversionPage;
  const showPublicFooter = !isPrivateRoute && !isPartnerSession && !isPartnerWorkspaceRoute && !isJoin && !isArtHousesPage;
  const showMainSiteMenu =
    !isAdminRoute &&
    !isPartnerWorkspaceRoute &&
    !isSnailLanding;
  const announcementPath = pathname.replace(/\/+$/, "") || "/";
  const showExchangeAnnouncement =
    showPublicFooter &&
    !isFundSalesPage &&
    announcementPath !== "/studios" &&
    announcementPath !== "/studios/start" &&
    announcementPath !== "/residency" &&
    announcementPath !== "/residency/guadalajara" &&
    announcementPath !== "/collective-fund" &&
    announcementPath !== "/collective-fund/thanks" &&
    announcementPath !== "/snail" &&
    announcementPath !== "/explore";

  useEffect(() => {
    const bodyClass = "gdl-page-active";
    if (isGuadalajaraResidency) document.body.classList.add(bodyClass);
    else document.body.classList.remove(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [isGuadalajaraResidency]);

  useEffect(() => {
    const bodyClass = "cc-collective-fund-page-active";
    if (isCollectiveFund) document.body.classList.add(bodyClass);
    else document.body.classList.remove(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [isCollectiveFund]);

  useEffect(() => {
    const metadata = PAGE_METADATA.find(({ prefix }) => (
      prefix === "/"
        ? pathname === "/"
        : pathname === prefix || pathname.startsWith(`${prefix}/`)
    ));
    if (!metadata) return;

    const isStudiosSalesPage = [
      "/studios",
      "/studios/services",
      "/studios/for-you",
    ].includes(pathname);
    const isFloorPage = pathname === "/the-floor" || pathname === "/the-floor/";
    const isArtHousesPage = pathname === "/art-houses" || pathname === "/art-houses/";
    const isGuadalajaraPage = pathname === "/residency/guadalajara" || pathname === "/residency/guadalajara/";
    const canonicalPath = isArtHousesPage
      ? "/art-houses/"
      : isFloorPage
      ? "/the-floor/"
      : isGuadalajaraPage
        ? "/residency/guadalajara/"
        : isStudiosSalesPage
          ? "/studios"
          : pathname;
    const canonicalUrl = new URL(canonicalPath, SEO_ORIGIN).toString();
    const privateRoutePrefixes = [
      "/admin",
      "/application-received",
      "/profile",
      "/member-home",
      "/partner-workspace",
      "/setup-password",
      "/reset-password",
      "/auth/",
      "/register-vetted-artist",
    ];
    const isPrivateRoute = privateRoutePrefixes.some((prefix) => (
      location === prefix || location.startsWith(`${prefix}/`)
    )) || (
      pathname === "/residency" &&
      new URLSearchParams(window.location.search).get("view") === "mine"
    );

    document.title = metadata.title;
    setMeta("description", metadata.description);
    const isStudiosSelector = pathname === "/studios/start";
    setMeta("robots", isPrivateRoute ? "noindex, nofollow" : isStudiosSelector ? "noindex, follow" : "index, follow");
    setMeta("og:title", metadata.title, "property");
    setMeta("og:description", metadata.description, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:site_name", "Countercult", "property");
    setMeta("og:locale", "en_GB", "property");
    const socialImage = isGuadalajaraPage
      ? `${SEO_ORIGIN}/images/guadalajara/house-courtyard.webp`
      : isArtHousesPage
        ? `${SEO_ORIGIN}/images/art-houses/open-call-poster.webp`
      : isStudiosSalesPage
        ? `${SEO_ORIGIN}/images/studios-local-context.webp`
        : `${SEO_ORIGIN}/images/cult-soap.png`;
    const socialImageAlt = isGuadalajaraPage
      ? "The plant-filled courtyard at the Guadalajara artist residency home"
      : isArtHousesPage
        ? "Free art residency and accommodation in Berlin, supported by Countercult Network members and Patron Post"
      : isStudiosSalesPage
        ? "Countercult Studios cultural strategy and production"
        : "Countercult cult soap";
    setMeta("og:image", socialImage, "property");
    setMeta("og:image:alt", socialImageAlt, "property");
    if (isGuadalajaraPage) {
      setMeta("og:image:width", "1450", "property");
      setMeta("og:image:height", "962", "property");
    } else if (isArtHousesPage) {
      setMeta("og:image:width", "900", "property");
      setMeta("og:image:height", "1136", "property");
    } else if (!isStudiosSalesPage) {
      setMeta("og:image:width", "551", "property");
      setMeta("og:image:height", "453", "property");
    }
    setMeta("twitter:title", metadata.title);
    setMeta("twitter:description", metadata.description);
    setMeta("twitter:url", canonicalUrl);
    setMeta("twitter:image", socialImage);
    setMeta("twitter:image:alt", socialImageAlt);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;
  }, [location]);

  const shouldRedirectPartner = isPartnerDiscoveryRoute && isPartnerSession;
  const shouldMovePartnerToWorkspace = location === "/residency" && isPartnerSession;
  const isSeoReadingRoute = [
    "/how-to-find-local-artists-berlin",
    "/how-to-find-local-artists-berlin/",
    "/berlin-culture",
    "/new-york-culture",
    "/philadelphia-culture",
    "/eu-us-cultural-production",
    "/rural-culture",
    "/rural-economic-development",
    "/creator-economy",
    "/web3-culture",
    "/culture-tech-startup",
    "/cultural-strategy",
    "/fund/creator-economy",
  ].includes(location);
  useEffect(() => {
    if (shouldRedirectPartner || shouldMovePartnerToWorkspace) {
      window.location.replace("/partner-workspace?action=offer");
    }
  }, [shouldMovePartnerToWorkspace, shouldRedirectPartner]);

  if (shouldRedirectPartner || shouldMovePartnerToWorkspace) {
    return <RatLoadingScreen label="opening partner workspace…" />;
  }

  return (
    <>
      <GlobalIdentityMetadata routePath={location} />
      {showAnonymousQuestionSticker && (
        <AnonymousQuestionSticker
          href={artifactPath("/snail#ask-anonymously")}
          position={questionStickerPosition}
        />
      )}
      {showPublicFooter && !isCollectiveFund && !isSnailLanding && !isResidentWorkPage && !isStudiosConversionPage && (
        <FixedPatronPostSticker key={pathname} position={patronStickerPosition} />
      )}
      {showMainSiteMenu && (
        <MainSiteMenu />
      )}
      <Suspense fallback={<RatLoadingScreen />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/snail/question-sent" component={PatronPostQuestionSent} />
          <Route path="/snail" component={SnailMailLanding} />
          <Route path="/explore" component={Explorer} />
          <Route path="/browse/:kind" component={Browse} />
          <Route path="/submit" component={SubmitEntryPage} />
          <Route path="/tag/:tag" component={TagBrowse} />
          <Route path="/place/:place" component={CityBrowse} />
          <Route path="/city/:city" component={CityBrowse} />
          <Route path="/entries/:id">{() => <PageErrorBoundary><EntryDetail /></PageErrorBoundary>}</Route>

          <Route path="/partner-workspace" component={Residency} />
          <Route path="/residency/guadalajara" component={GuadalajaraResidency} />
          <Route path="/residency" component={Residency} />
          <Route path="/adverts" component={Adverts} />
          <Route path="/art-houses" component={ArtHouses} />
          <Route path="/faq" component={Faq} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/admin" component={Admin} />
          <Route path="/media" component={Media} />
          <Route path="/media/countercult-free/">{() => <SharePageRedirect />}</Route>
          <Route path="/media/countercult-free">{() => <SharePageRedirect />}</Route>
          <Route path="/media/:id" component={MediaPost} />
          <Route path="/journal/">{() => <JournalRedirect />}</Route>
          <Route path="/journal">{() => <JournalRedirect />}</Route>
          <Route path="/journal/:slug">{(params) => <JournalRedirect articleSlug={params.slug} />}</Route>
          <Route path="/auth/verify" component={AuthVerify} />
          <Route path="/claim-space" component={ClaimSpace} />
          <Route path="/profile" component={Profile} />
          <Route path="/member-home" component={MemberHome} />
          <Route path="/application-received" component={MemberApplicationConfirmation} />
          <Route path="/setup-password" component={SetupPassword} />
          <Route path="/register" component={SignupRedirect} />
          <Route path="/login" component={SigninRedirect} />
          <Route path="/register-vetted-artist" component={SigninRedirect} />
          <Route path="/about" component={About} />
          <Route path="/press" component={Press} />
          <Route path="/partners" component={Partners} />
          <Route path="/collective-fund/thanks" component={CollectiveFundThanks} />
          <Route path="/collective-fund" component={CollectiveFund} />
          <Route path="/model" component={Model} />
          <Route path="/studios" component={StudiosForYou} />
          <Route path="/studios/start" component={StudiosSelector} />
          <Route path="/studios/services" component={StudiosLandingRedirect} />
          <Route path="/studios/brief" component={Studios} />
          <Route path="/studios/for-you" component={StudiosLandingRedirect} />
          <Route path="/studios/places" component={StudiosPlaces} />
          <Route path="/studios/economic-development" component={StudiosEconomicDevelopment} />
          <Route path="/studios/place-intelligence" component={StudiosPlaceIntelligence} />
          <Route path="/studios/resident-work" component={ResidentWork} />
          <Route path="/studios/tourism" component={StudiosTourism} />
          <Route path="/fund/playbook" component={FundPlaybook} />
          <Route path="/fund" component={CountercultFund} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/news" component={News} />
          <Route path="/discover" component={Discover} />
          <Route path="/join" component={JoinNetwork} />
          <Route path="/the-floor" component={TheFloor} />
          <Route path="/events/klunkerkranich-2026" component={KlunkerkranichEvent} />
          <Route path="/events/berlin-salon-night" component={SalonNight} />
          <Route path="/how-to-find-local-artists-berlin" component={BerlinArtistGuide} />
          <Route path="/how-to-find-local-artists-berlin/" component={BerlinArtistGuide} />
          <Route path="/berlin-culture" component={SeoTopicHub} />
          <Route path="/new-york-culture" component={SeoTopicHub} />
          <Route path="/philadelphia-culture" component={SeoTopicHub} />
          <Route path="/eu-us-cultural-production" component={SeoTopicHub} />
          <Route path="/rural-culture" component={SeoTopicHub} />
          <Route path="/rural-economic-development" component={SeoTopicHub} />
          <Route path="/creator-economy" component={SeoTopicHub} />
          <Route path="/web3-culture" component={SeoTopicHub} />
          <Route path="/culture-tech-startup" component={SeoTopicHub} />
          <Route path="/cultural-strategy" component={SeoTopicHub} />
          <Route path="/fund/creator-economy" component={SeoTopicHub} />
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
      <GlobalExchangeAnnouncement location={location} enabled={showExchangeAnnouncement} />
      <NavigationRatBuffer location={location} />
      {isStudios && !isFundSalesPage && pathname !== "/studios/start" && <WorkWithUsStickers hideSoap={pathname === "/studios"} />}
      {showPublicFooter && !isSnailLanding && <footer className="cc-brand-footer bg-white border-t-2 border-black px-6 font-mono relative overflow-hidden text-black">
        {/* Pledge strip */}
        <div className="-mx-6 border-b border-black/10 bg-black px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <PledgeBanner variant="compact" />
        </div>
        <a
          href={`${artifactPath("/join")}?utm_source=countercult&utm_medium=site-footer&utm_campaign=network-growth`}
          className="cc-brand-footer-link group block pt-14 sm:pt-20"
          aria-label="Join CULT, Countercult's network"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="cc-footer-statement text-[13px] font-bold uppercase tracking-[0.08em] text-black">CULTURE BUILDS ECONOMIES.</p>
              <p className="mt-4 max-w-sm text-[13px] leading-5 text-black/60">Join CULT to make your practice easier to find, find people and exchange useful opportunities.</p>
            </div>
            <span className="shrink-0 border border-black px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-black transition-colors group-hover:bg-black group-hover:text-white">join cult ↗</span>
          </div>
          <div className="cc-brand-wordmark mt-12 text-black transition-transform duration-300 group-hover:translate-x-2 sm:mt-16" aria-hidden="true">
            {Array.from("COUNTERCULT").map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
          </div>
        </a>
        <p className="relative z-10 pb-3 text-center text-[9px] uppercase tracking-widest text-black/45">
          Website designed and built by{" "}
          <a
            href="https://countercult.network/shona-neary-portfolio/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-black"
          >
            Shona Neary
          </a>
        </p>
        {/* Bottom bar */}
        <div className="relative z-10 py-4 flex items-center justify-between gap-4">
          <span className="text-[9px] uppercase tracking-widest text-black/45">© {new Date().getFullYear()} countercult</span>
          <img
            src="/cult-rat.gif"
            alt=""
            aria-hidden="true"
            title="countercult rat"
            style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", height: 38, filter: "none", mixBlendMode: "multiply", opacity: 0.55, pointerEvents: "auto" }}
          />
          <button
            onClick={() => { window.location.href = "/privacy"; }}
            className="text-[9px] uppercase tracking-widest text-black/45 hover:text-black transition-colors"
          >
            privacy
          </button>
        </div>
      </footer>}
      <TermsModal />
      {!isAdminRoute && !isLanding && !isJoin && !isExchangeBoardRoute && !isSnailLanding && !isPatronPostQuestionSent && <MemberNetworkPrompt />}
      <CookieBanner showIntro={isLanding || isTheFloor || isGuadalajaraResidency} showConsent={!isAdminRoute} />
      {!isAdminRoute && !isEventRoute && !isJoin && !isStudios && !isTheFloor && !isGuadalajaraResidency && !isPartnerSession && !isPartnerWorkspaceRoute && !isCollectiveFund && <PledgePopup location={location} />}
    </>
  );
}
