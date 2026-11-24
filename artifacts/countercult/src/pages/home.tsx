import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, ArrowUpRight, Briefcase, CircleDollarSign, Globe2, House, MapPinned, Repeat2, UsersRound } from "lucide-react";
import { Marquee } from "@/components/Marquee";
import { getListEntriesQueryKey, getListEntryPinsQueryKey, getListPublicArtistCardsQueryKey, useListEntries, useListEntryPins, useListPublicArtistCards, useListHomepageExchangePicks, type EntrySummary, type ResidencyOffer } from "@workspace/api-client-react";
import { openTermsModal } from "@/components/TermsModal";
import { showPledgePopup } from "@/components/PledgePopup";
import CuratorInvite from "@/components/CuratorInvite";
import { trackEvent } from "@/lib/analytics";
import { ExchangeBoardSticker } from "@/components/ExchangeBoardSticker";
import { PatronPostCutoffCountdown } from "@/components/PatronPostCutoffCountdown";

const actions = [
  {
    number: "01",
    icon: MapPinned,
    title: "discover",
    copy: "Find real culture and the people and places making it.",
  },
  {
    number: "02",
    icon: Archive,
    title: "preserve",
    copy: "Keep the good stuff from disappearing.",
  },
  {
    number: "03",
    icon: Repeat2,
    title: "offer",
    copy: "Share rooms, spaces, practices, and opportunities with the network.",
  },
];

const exchangeResidencyLocations = "berlin · rural spain · paris · new york · cape town · hong kong · mexico city · austin · tbilisi · prague · barcelona · and anywhere else";

function appRoute(path: string) {
  const baseSegments = (import.meta.env.BASE_URL || "/").replace(/^\/+|\/+$/g, "");
  const basePath = baseSegments ? `/${baseSegments}` : "";
  const routePath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${routePath}`;
}

const modelLayers = [
  {
    number: "01",
    icon: MapPinned,
    title: "The Network",
    copy: "A maintained record of the artists, spaces, and local operators who read a place from the inside and make it distinctive.",
    href: "/explore",
    cta: "Explore the Network",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "Exchange",
    copy: "Protected member participation for sharing rooms, spaces, opportunities, skills, and local knowledge.",
    href: "/residency",
    cta: "Explore the Exchange",
  },
  {
    number: "03",
    icon: Briefcase,
    title: "Studios",
      copy: "A distinct B2B service operation for research, curation, commissions, programmes, experiences, and place partnerships.",
    href: "/studios",
    cta: "Work with Studios",
  },
  {
    number: "04",
    icon: CircleDollarSign,
      title: "Countercult Studios Fund",
      copy: "A client-held budget linked to selected sales or a defined programme. Artists and Countercult Studios invoice the client separately.",
    href: "/fund",
    cta: "See the Fund infrastructure",
  },
];

function CircularEconomicsSection() {
  return (
    <section className="overflow-hidden border-b-2 border-black bg-black text-[#F9F9F6]" aria-labelledby="circular-economics-heading">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
             <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">economic development through culture</p>
            <h2 id="circular-economics-heading" className="max-w-xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-7xl">
                reverse-engineering gentrification.
            </h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
                 Countercult is reverse-engineering gentrification. We build open-source digital infrastructure that connects a place’s artists, cultural workers, builders, spaces, and local knowledge to the systems that shape its economy and physical future. Our Network, protected Exchange, paid Studios work, and client-held Fund connect that knowledge to tourism, municipalities and public institutions, hospitality, retail and brands, education, and property. The strategy includes investing in cultural property across markets around the world, so the people creating a place’s value can help shape what comes next. We are building toward our first property investment; Countercult does not yet hold a property portfolio. Fund budgets remain client-held, and automated holding or routing is not live.
             </p>
            <p className="mt-6 max-w-md border-l-2 border-[#c6ff3d] pl-4 text-lg font-bold leading-tight text-[#c6ff3d]">
              Local culture creates value. Countercult is building the infrastructure to change where it goes.
            </p>
            <a
              href="/model"
              className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] underline decoration-1 underline-offset-4 transition-colors hover:text-white"
            >
              read the full model
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-px border border-white/25 bg-white/25 sm:grid-cols-2">
            {modelLayers.map(({ number, icon: Icon, title, copy, href, cta }) => (
              <div key={number} className="bg-black p-5 sm:p-6">
                <div className="mb-10 flex items-center justify-between text-[#c6ff3d]">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                  <span className="font-mono text-[10px]">{number}</span>
                </div>
                <h3 className="mb-3 text-2xl font-black uppercase leading-none tracking-[-0.03em]">{title}</h3>
                <p className="max-w-xs text-[12px] leading-relaxed text-white/60">{copy}</p>
                <a
                  href={href}
                  className="mt-6 inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#c6ff3d] underline decoration-1 underline-offset-4 transition-colors hover:text-white"
                >
                  {cta}
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageMapFeature() {
  const mapHref = appRoute("/explore");
  const trackMapOpen = () =>
    trackEvent("explore_section_clicked", { placement: "homepage_map_feature" });

  return (
    <section
      aria-labelledby="homepage-map-feature-heading"
      className="border-b-2 border-black bg-[#F9F9F6]"
      data-testid="section-home-map-feature"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
        <a
          href={mapHref}
          aria-label="Open the live Countercult map"
          data-testid="link-home-map-feature-image"
          onClick={trackMapOpen}
          className="group relative order-1 block aspect-[4/3] overflow-hidden border-2 border-black bg-[#a5f6fc] shadow-[7px_7px_0_#c6ff3d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black lg:order-2"
        >
          <img
            src={appRoute("/images/landing-map-preview-cyan.webp")}
            alt="Preview of the Countercult 3D map, with artists and cultural places marked on a night-view globe."
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 border-2 border-black bg-[#c6ff3d] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-black">
            open the live map
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </a>

        <div className="order-2 max-w-xl lg:order-1">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
            the Countercult Network
          </p>
          <h2
            id="homepage-map-feature-heading"
            className="max-w-lg text-5xl font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-7xl"
          >
            THE MAP
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70 sm:text-base">
            Find artists, independent spaces, and local scenes connected through the Countercult Network.
          </p>
          <a
            href={mapHref}
            data-testid="link-home-map-feature-cta"
            onClick={trackMapOpen}
            className="mt-7 inline-flex items-center gap-2 border-2 border-black bg-[#c6ff3d] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Open THE MAP
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

const countercultStudioProjects = [
  "Klunkerkranich",
  "Zalando Pride",
  "Most Wanted: Music",
  "Quouch",
  "The Delta",
  "Whole Festival",
  "WordPress",
  "Rural Hackers",
];

const selectedFounderSupportCredits = [
  "Countercult / Spanish government funding (programme and amount not stated)",
  "Grace Berlin Accelerator / alumna",
  "FIT Hives / FIT Think Big Challenge",
  "FIT Hives / CGI University 2016",
];

function SelectedCreditsBanner() {
  const projectSummary = `Countercult Studio projects: ${countercultStudioProjects.join(", ")}.`;
  const supportSummary = `Selected company funding and founder records: ${selectedFounderSupportCredits.join(", ")}.`;

  return (
    <section id="homepage-selected-credits" className="border-b-2 border-black bg-black text-[#c6ff3d]" aria-label="Selected Countercult Studio projects, company funding, and founder records">
      <div className="mx-auto max-w-7xl px-5 pb-2 pt-4 sm:px-8">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">
          Countercult Studio projects · selected funding + founder records
        </p>
        <p className="sr-only">{projectSummary} {supportSummary}</p>
      </div>
      <div aria-hidden="true" className="pb-2">
        <Marquee
          text={`Countercult Studio projects / ${countercultStudioProjects.join(" / ")}`}
          speed={120}
          direction="right"
          className="border-white/25 py-2 text-white/90"
        />
        <Marquee
          text={`selected funding + founder records / ${selectedFounderSupportCredits.join(" / ")}`}
          speed={140}
          className="border-white/25 py-2 text-white/60"
        />
      </div>
    </section>
  );
}

const practicalExamples = [
  {
    emoji: "🏠",
    title: "Invest in cultural property",
    copy: "Countercult’s strategy includes investing in cultural property across markets. We are building toward our first property investment; Countercult does not yet hold a property portfolio.",
    href: "/journal/cultural-property-investment-example/",
    link: "our investment thesis",
  },
  {
    emoji: "📚",
    title: "Archive and support culture at risk",
    copy: "Document at-risk places, artists, collectives, and practices so their knowledge can guide long-term support.",
    href: "/journal/the-cultural-economy-needs-an-intelligence-layer/",
    link: "explore cultural intelligence",
  },
  {
    emoji: "💶",
    title: "The Fund and local value",
    copy: "Connect client-held budgets, paid commissions, and local businesses so cultural work is part of the economy.",
    href: "/fund",
    link: "see the Fund",
  },
  {
    emoji: "🔁",
    title: "Exchange and open tools",
    copy: "Share room swaps, spaces, skills, and partner resources, with open tools communities can adapt.",
    href: "/residency",
    link: "browse the Exchange",
  },
];

function PracticalExamplesSection() {
  return (
    <section className="border-b-2 border-black bg-[#c6ff3d] px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="practical-examples-heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 border-b-2 border-black pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">from the network to real places</p>
            <h2 id="practical-examples-heading" className="max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">
              what this can look like.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-black/70 sm:text-base">
            We build open-source discovery tools, deliver paid Studios projects, and explore how local cultural value can support durable places.
          </p>
        </div>
        <div className="mt-6 grid gap-px border-2 border-black bg-black sm:grid-cols-2 xl:grid-cols-4">
          {practicalExamples.map((example) => (
            <article key={example.title} className="flex min-h-full flex-col bg-[#f9f9f6] p-5 sm:p-6">
              <span className="mb-8 text-3xl" aria-hidden="true">{example.emoji}</span>
              <h3 className="mb-3 text-xl font-black uppercase leading-[0.95] tracking-[-0.03em]">{example.title}</h3>
              <p className="flex-1 text-xs leading-relaxed text-black/65">{example.copy}</p>
              <a href={example.href} className="mt-6 inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] underline decoration-1 underline-offset-4">
                {example.link} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExchangeResidencyHomeBanner() {
  const exchangeIcons = [
    { Icon: House, label: "a room" },
    { Icon: Globe2, label: "somewhere else" },
  ];

  return (
    <section className="overflow-hidden border-b-2 border-black bg-[#c6ff3d]" aria-label="Exchange Residency first cohort">
      <div className="border-b-2 border-black py-2">
        <Marquee
          text={`exchange residency · looking for exchanges in ${exchangeResidencyLocations}`}
          speed={34}
          className="border-0 py-0 font-mono text-[9px] text-black sm:text-[10px]"
        />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-black/60">
            exchange residency · free artist-to-artist room swap
          </p>
          <h2 className="max-w-3xl text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-5xl">
            swap a room with another artist somewhere else
          </h2>
          <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-black/70 sm:text-xs">
            the first shared window is 1–28 february 2027. the exchange is free to join, and both artists arrange their room swap directly.
            no rent or programme fee is charged by Countercult.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex items-center gap-4" aria-label="a room somewhere else">
            {exchangeIcons.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-black" title={label}>
                <Icon className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                <span className="font-mono text-[8px] uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
          <a
            href="/residency"
            className="border-2 border-black bg-black px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
          >
            post an exchange →
          </a>
        </div>
      </div>
    </section>
  );
}

function LiveExchangePreviewCard({ offer }: { offer: Pick<ResidencyOffer, "id" | "city" | "description"> }) {
  return (
    <a
      href="/residency"
      data-testid={`card-live-exchange-${offer.id}`}
      className="group flex min-h-[172px] flex-col items-start justify-between gap-6 rounded-xl border-2 border-white bg-black p-5 text-white transition-all hover:-translate-y-1 hover:bg-[#111] hover:shadow-[5px_5px_0_#ffffff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] focus-visible:ring-offset-4 focus-visible:ring-offset-black"
      aria-label={`Open the Exchange board to see this post from ${offer.city}`}
    >
      <p
        className="line-clamp-3 text-lg font-bold leading-tight tracking-[-0.03em] sm:text-xl"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {offer.description}
      </p>
      <span className="inline-flex items-center gap-2 border-2 border-white bg-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors group-hover:bg-white group-hover:text-black">
        Open Exchange
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </a>
  );
}

function HomeExchangeTicker() {
  const items = [
    { id: "host", label: "HOST AN ARTIST", href: "/residency", event: "exchange_section_clicked", placement: "homepage_host_ticker" },
    { id: "barter", label: "BARTER WITH AN ARTIST", href: "/residency", event: "exchange_section_clicked", placement: "homepage_barter_ticker" },
    { id: "spaces", label: "SPACES CAN BE FREE OR PAID", href: "/residency", event: "exchange_section_clicked", placement: "homepage_spaces_ticker" },
    { id: "no-cash", label: "NO MONEY EXCHANGED IN BARTER", href: "/residency", event: "exchange_section_clicked", placement: "homepage_barter_terms_ticker" },
    { id: "map", label: "SEARCH OUR CULTURE MAP", href: "/explore", event: "explore_section_clicked", placement: "homepage_culture_map_ticker" },
  ];

  return (
    <div className="cc-home-exchange-ticker border-y border-white/30 bg-black text-white">
      <span className="cc-home-exchange-ticker-window">
        <span className="cc-home-exchange-ticker-track">
          {[0, 1].map((copy) => (
            <span className="cc-home-exchange-ticker-group" aria-hidden={copy > 0 ? true : undefined} key={copy}>
              {items.map((item, index) => (
                <a
                  className="cc-home-exchange-ticker-item"
                  href={appRoute(item.href)}
                  aria-label={item.id === "map" ? "Search the Countercult culture map" : `${item.label.toLowerCase()}, open the Exchange board`}
                  data-testid={`link-home-exchange-ticker-${item.id}`}
                  key={item.id}
                  onClick={() => trackEvent(item.event, { placement: item.placement, source_route: "/" })}
                  tabIndex={copy > 0 ? -1 : undefined}
                >
                  {index > 0 && <span className="cc-home-exchange-ticker-separator" aria-hidden="true">✳</span>}
                  {item.label}
                </a>
              ))}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

function ExchangeBoardPreview() {
  const { data: offerResponse, isLoading, isError } = useListHomepageExchangePicks();
  const offers = Array.isArray(offerResponse) ? offerResponse : [];

  return (
    <section className="overflow-hidden border-b-2 border-white/20 bg-black text-white" aria-labelledby="exchange-board-heading">
      <h2 id="exchange-board-heading" className="sr-only">Host or barter with an artist</h2>
      <HomeExchangeTicker />

      <div className="mx-auto max-w-7xl px-5 pb-9 pt-5 sm:px-8 sm:pb-12 sm:pt-6">

        {isLoading ? (
          <p className="py-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">loading live offers…</p>
        ) : isError ? (
          <p className="py-5 text-[12px] text-white/70">Exchange posts are temporarily unavailable. Please try again later.</p>
        ) : offers.length === 0 ? (
          <div className="border-2 border-white/25 bg-black p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/75">
              No live offers right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => <LiveExchangePreviewCard key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
    </section>
  );
}

type PublicArtistCardData = {
  id: number;
  name: string;
  kind: "artist" | "space" | "artifact";
  city: string;
  country: string;
  tags: string[];
  heroPhoto?: string | null;
  openTo?: string[];
  offeringChoices?: string[];
};

type FeaturedNetworkPreview = {
  id: number;
  name: string;
  kind: "artist" | "space";
  city: string;
  country: string;
  tags: string[];
  heroPhoto: string | null;
  openTo: string[];
  offeringChoices: string[];
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function selectFeaturedNetworkEntries(
  entries: EntrySummary[],
  artistCards: PublicArtistCardData[],
  publicMapPinIds: ReadonlySet<number>,
): FeaturedNetworkPreview[] {
  const artists = artistCards
    .filter((entry) => entry.kind === "artist" && publicMapPinIds.has(entry.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind: "artist" as const,
      city: entry.city,
      country: entry.country,
      tags: entry.tags ?? [],
      heroPhoto: entry.heroPhoto ?? null,
      openTo: toStringArray("openTo" in entry ? entry.openTo : []),
      offeringChoices: toStringArray("offeringChoices" in entry ? entry.offeringChoices : []),
    }));
  const spaces = entries
    .filter((entry) => entry.kind === "space" && entry.lat != null && entry.lng != null && publicMapPinIds.has(entry.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind: "space" as const,
      city: entry.city,
      country: entry.country,
      tags: entry.tags ?? [],
      heroPhoto: entry.heroPhoto ?? null,
      openTo: toStringArray("openTo" in entry ? entry.openTo : []),
      offeringChoices: toStringArray("offeringChoices" in entry ? entry.offeringChoices : []),
    }));

  const featured: FeaturedNetworkPreview[] = [];
  for (let index = 0; index < Math.max(artists.length, spaces.length); index += 1) {
    if (artists[index]) featured.push(artists[index]);
    if (spaces[index]) featured.push(spaces[index]);
  }
  return featured;
}

function LiveNetworkPreview({ heroBackdrop = false }: { heroBackdrop?: boolean }) {
  const [featuredPage, setFeaturedPage] = useState(0);
  const { data: entryResponse, isLoading, isError } = useListEntries({
    query: { queryKey: getListEntriesQueryKey(), enabled: true },
  });
  const {
    data: pinResponse,
    isLoading: pinsLoading,
    isError: pinsError,
  } = useListEntryPins({
    query: { queryKey: getListEntryPinsQueryKey(), enabled: true },
  });
  const {
    data: artistCardResponse,
    isLoading: artistCardsLoading,
    isError: artistCardsError,
  } = useListPublicArtistCards({
    query: { queryKey: getListPublicArtistCardsQueryKey(), enabled: true },
  });
  const entries = Array.isArray(entryResponse) ? entryResponse : [];
  const pins = Array.isArray(pinResponse) ? pinResponse : [];
  const artistCards = Array.isArray(artistCardResponse) ? artistCardResponse : [];
  const publicMapPinIds = new Set(pins.map((pin) => pin.id));
  const allPreviewEntries = selectFeaturedNetworkEntries(entries, artistCards, publicMapPinIds);
  const pageCount = Math.max(1, Math.ceil(allPreviewEntries.length / 5));
  const activePage = Math.min(featuredPage, pageCount - 1);
  const previewEntries = allPreviewEntries.slice(activePage * 5, activePage * 5 + 5);
  const isPreviewLoading = isLoading || pinsLoading || artistCardsLoading;
  const isPreviewError = isError || pinsError || artistCardsError;

  return (
    <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-between sm:min-h-[360px] lg:min-h-[260px] xl:min-h-[340px]">
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#c6ff3d]">
        <span>live featured network</span>
        <div className="flex items-center gap-2">
          <span aria-live="polite">
            {allPreviewEntries.length === 0
              ? "artists + spaces"
              : `${activePage * 5 + 1}–${Math.min(activePage * 5 + previewEntries.length, allPreviewEntries.length)} of ${allPreviewEntries.length}`}
          </span>
          {allPreviewEntries.length > 5 && !heroBackdrop && (
            <span className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous five public pins"
                onClick={() => setFeaturedPage((activePage + pageCount - 1) % pageCount)}
                className="min-h-7 min-w-7 border border-white/30 text-sm leading-none text-white transition-colors hover:border-[#c6ff3d] hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next five public pins"
                onClick={() => setFeaturedPage((activePage + 1) % pageCount)}
                className="min-h-7 min-w-7 border border-white/30 text-sm leading-none text-white transition-colors hover:border-[#c6ff3d] hover:text-[#c6ff3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]"
              >
                ›
              </button>
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {isPreviewLoading ? (
          <div className="border border-white/30 bg-black/80 p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
            loading live pins…
          </div>
        ) : isPreviewError ? (
          <div className="border border-white/30 bg-black/80 p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
            live network temporarily unavailable
          </div>
        ) : previewEntries.length === 0 ? (
          <div className="border border-[#c6ff3d] bg-black/80 p-4 font-mono text-[10px] leading-relaxed text-white">
            <span className="mb-1 block text-[#c6ff3d]">the map is waiting for you</span>
            add your pin and make the network findable
          </div>
        ) : (
          previewEntries.map((entry) => {
            const signals = [
              ...entry.offeringChoices.slice(0, 1).map((choice) => `offers ${choice}`),
              ...entry.openTo.slice(0, 1).map((choice) => `open to ${choice}`),
            ];
            const detailLine = signals.join(" · ")
              || entry.tags.slice(0, 2).join(" · ")
              || "independent culture";
            const href = heroBackdrop
              ? "#homepage-renaissance-choices"
              : entry.kind === "artist"
                ? "/explore?action=join"
                : `/entries/${entry.id}`;
            return (
              <a
                key={entry.id}
                href={href}
                aria-label={entry.kind === "artist" && !heroBackdrop
                  ? `Join the free network to see ${entry.name}'s full profile`
                  : undefined}
                onClick={heroBackdrop ? (event) => {
                  event.preventDefault();
                  scrollToRenaissanceChoices("live_network_listing");
                } : undefined}
                className={`group pointer-events-auto flex cursor-pointer items-center gap-2.5 border border-white/30 bg-black/85 p-2 font-mono text-white transition-transform duration-200 hover:scale-[1.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d] ${
                  heroBackdrop ? "mr-auto w-[min(60%,250px)] max-w-[250px]" : "ml-auto max-w-[290px]"
                }`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden border border-white/20 bg-[#171722]">
                  {entry.heroPhoto ? (
                    <img src={entry.heroPhoto} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover grayscale" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#c6ff3d]">
                      <MapPinned className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 truncate text-[9px] uppercase tracking-[0.12em] text-[#c6ff3d]">
                    {entry.kind} · {entry.city}{entry.country ? `, ${entry.country}` : ""}
                  </div>
                  <div className="truncate text-[11px] font-bold uppercase tracking-[0.08em]">{entry.name}</div>
                  <div className="mt-1 truncate text-[9px] text-white/50">{detailLine}</div>
                </div>
              </a>
            );
          })
        )}
      </div>
      <a href="/explore" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-[#c6ff3d]">
        open THE MAP <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );
}

function scrollToRenaissanceChoices(placement: string) {
  const target = document.getElementById("homepage-renaissance-choices");
  if (!target) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  trackEvent("homepage_renaissance_scroll_clicked", { placement });
}

function BouncingSoapPrompt({ href }: { href: string }) {
  const promptRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const prompt = promptRef.current;
    const section = prompt?.parentElement;
    if (!prompt || !section) return;

    const padding = 12;
    const colors = ["#89a8ff", "#ff5c35", "#c6ff3d"];
    let x = 20;
    let y = 88;
    let velocityX = 0.022;
    let velocityY = 0.015;
    let promptWidth = prompt.offsetWidth;
    let promptHeight = prompt.offsetHeight;
    let colorIndex = 0;
    let previousTime = 0;
    let animationFrame = 0;

    const maxX = () => Math.max(padding, section.clientWidth - promptWidth - padding);
    const maxY = () => Math.max(padding, section.clientHeight - promptHeight - padding);
    const placePrompt = () => {
      x = Math.min(Math.max(padding, x), maxX());
      y = Math.min(Math.max(padding, y), maxY());
      prompt.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const resize = () => {
      promptWidth = prompt.offsetWidth;
      promptHeight = prompt.offsetHeight;
      placePrompt();
    };

    placePrompt();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animate = (time: number) => {
      const elapsed = previousTime ? Math.min(time - previousTime, 40) : 16;
      previousTime = time;
      x += velocityX * elapsed;
      y += velocityY * elapsed;
      let bounced = false;

      if (x <= padding || x >= maxX()) {
        velocityX *= -1;
        bounced = true;
      }
      if (y <= padding || y >= maxY()) {
        velocityY *= -1;
        bounced = true;
      }

      placePrompt();
      if (bounced) {
        colorIndex = (colorIndex + 1) % colors.length;
        prompt.style.backgroundColor = colors[colorIndex];
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(section);
    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <a
      ref={promptRef}
      href={href}
      aria-label="Click something to get started"
      data-testid="link-home-soap-join-cult"
      onClick={() => trackEvent("homepage_soap_join_clicked", { placement: "floating_prompt" })}
      className="pointer-events-auto absolute left-0 top-0 z-[5] hidden cursor-pointer whitespace-nowrap border-2 border-black px-2 py-1.5 text-[8px] font-bold tracking-[0.08em] text-black shadow-[3px_3px_0_#000] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white sm:block sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.12em]"
      style={{ backgroundColor: "#89a8ff", fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      click something to get started
    </a>
  );
}

function HomepageRenaissanceHero({ joinHref }: { joinHref: string }) {
  const [soapHovered, setSoapHovered] = useState(false);

  return (
    <section
      aria-labelledby="homepage-renaissance-title"
      data-testid="section-home-renaissance-hero"
      className="relative z-[31] flex min-h-[clamp(28rem,54svh,42rem)] items-center border-y border-white/15 bg-black text-white"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-5 py-10 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-16">
        <div className="relative z-10">
          <h2
            id="homepage-renaissance-title"
            className="w-full text-[clamp(1.8rem,7.2vw,3.5rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em] lg:text-[clamp(2.8rem,4.1vw,3.95rem)]"
            aria-label="Join the post-internet culture economy"
          >
            <span className="block whitespace-nowrap" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>Join the</span>
            <span className="block whitespace-nowrap" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>post-internet</span>
            <span className="block whitespace-nowrap" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>culture economy</span>
          </h2>
          <p
            className="mt-6 max-w-[38rem] text-[clamp(0.95rem,1.2vw,1.1rem)] leading-[1.6] text-white"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            Countercult builds open-source digital infrastructure for real-world circular economies through culture.
            {" "}
            <a
              href={appRoute("/snail")}
              className="font-bold text-white underline decoration-white/60 underline-offset-4 transition-colors hover:text-[#c6ff3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c6ff3d]"
            >
              Real mail
            </a>{" "}
            helps fund the digital infrastructure that brings online discovery into real-world relationships, work and local economies.
          </p>
        </div>
        <div
          className="homepage-renaissance-art relative mx-auto w-full max-w-[36rem] lg:ml-auto"
          data-soap-hovered={soapHovered ? "true" : undefined}
        >
          <div className="relative min-h-[18rem] w-full sm:min-h-[22rem] lg:min-h-[25rem] xl:min-h-[27rem]">
            <div className="absolute bottom-0 left-1/2 z-20 block w-[min(88vw,22rem)] -translate-x-1/2 sm:w-[min(48vw,22rem)] lg:left-auto lg:right-0 lg:w-[min(90%,30rem)] lg:translate-x-0 xl:w-[32rem]">
              <div className="homepage-renaissance-soap-art">
                <img src="/images/cult-soap.webp" alt="" aria-hidden="true" decoding="async" className="pointer-events-none block w-full object-contain" />
              </div>
              <a
                href={joinHref}
                aria-label="Click the soap to join CULT"
                data-testid="link-home-renaissance-soap-join"
                onClick={() => trackEvent("homepage_soap_join_clicked", { placement: "hero" })}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setSoapHovered(true);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setSoapHovered(false);
                }}
                onPointerCancel={() => setSoapHovered(false)}
                className="homepage-renaissance-soap-link absolute inset-0 z-50 block cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d]"
              />
            </div>
          </div>
          <HomepageRenaissancePills />
        </div>
      </div>
      <BouncingSoapPrompt href={joinHref} />
      <a
        href="#exchange-board-heading"
        data-testid="link-homepage-scroll-cue"
        className="absolute bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span className="motion-safe:animate-bounce">scroll to explore</span>
        <ArrowRight className="h-3 w-3 rotate-90 motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}

function HomepageRenaissancePills() {
  const pills = [
    {
      href: `${import.meta.env.BASE_URL}explore?action=join&intent=network`,
      image: "/images/renaissance-pill-red.webp",
      label: "Click to join the culture map",
      intent: "join",
      testId: "link-home-renaissance-join",
    },
    {
      href: `${import.meta.env.BASE_URL}studios/start`,
      image: "/images/renaissance-pill-blue.webp",
      label: "Click to hire the cult",
      intent: "work_with_us",
      testId: "link-home-renaissance-work-with-us",
    },
  ];

  return (
    <div
      id="homepage-renaissance-choices"
      role="group"
      aria-labelledby="homepage-renaissance-choices-heading"
      className="relative z-[40] mx-auto mt-7 grid w-full max-w-[34rem] scroll-mt-20 grid-cols-1 items-center gap-4 px-2 pb-2 sm:mt-4 sm:grid-cols-2 sm:gap-4 sm:px-0 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:block lg:max-w-none lg:p-0"
    >
      <h2 id="homepage-renaissance-choices-heading" className="sr-only">Choose how to take part</h2>
      {pills.map(({ href, image, label, intent, testId }, index) => (
        <a
          key={intent}
          href={href}
          data-testid={testId}
          aria-label={label}
          onClick={() => trackEvent("homepage_renaissance_pill_clicked", { intent, placement: "homepage_renaissance_hero" })}
          className={`homepage-renaissance-pill group relative mx-auto block w-full max-w-[22rem] rounded-full transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c6ff3d] focus-visible:ring-offset-4 focus-visible:ring-offset-black sm:max-w-[15rem] lg:pointer-events-auto lg:absolute lg:mx-0 lg:w-[38%] lg:max-w-[14rem] ${index === 0 ? "-rotate-[3deg] lg:left-[-6%] lg:top-[15%] lg:-rotate-[6deg]" : "rotate-[3deg] lg:bottom-[12%] lg:right-[-6%] lg:rotate-[6deg]"}`}
        >
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="block h-auto w-full max-w-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.22)]"
          />
          <span
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
            style={{ fontFamily: "Arial, Helvetica, sans-serif", textShadow: "0 2px 4px rgba(0,0,0,0.85)" }}
          >
            <span className="block w-full max-w-[90%] text-[clamp(0.62rem,1.1vw,0.95rem)] font-bold">{label}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function CountercultTractionStats() {
  const operatingAreas = [
    { title: "Public Network", label: "Open discovery of artists, spaces, and local cultural knowledge." },
    { title: "Protected Exchange", label: "Member sharing for rooms, skills, opportunities, and local knowledge." },
    { title: "Paid Studios", label: "Commissioned research, creative production, and place-based delivery." },
    { title: "Client-held Fund", label: "Clients hold the budget and pay artists and Studios separately." },
  ];

  return (
    <section className="border-b-2 border-black bg-[#c6ff3d] px-5 py-8 sm:px-8 sm:py-10" aria-label="Countercult current operating model">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-black/60">what operates today</p>
            <h2 className="mt-2 max-w-xl text-3xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-4xl">
              distinct parts, one system.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-black/65">
            These are the current services and tools. Automated Fund holding and routing, and property expansion, remain future development.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 border-y-2 border-black sm:grid-cols-4">
            {operatingAreas.map((stat, index) => (
            <div
               key={stat.title}
              className={`py-4 pr-4 sm:px-4 sm:py-5 ${index > 0 ? "border-l-2 border-black" : ""} ${index > 1 ? "border-t-2 border-black sm:border-t-0" : ""}`}
            >
                <p className="text-xl font-black uppercase leading-none tracking-[-0.04em] sm:text-2xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{stat.title}</p>
              <p className="mt-3 text-[11px] leading-snug text-black/65">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const referralCode = new URLSearchParams(window.location.search).get("ref");
  const joinHref = appRoute(
    referralCode
      ? `/explore?action=join&ref=${encodeURIComponent(referralCode)}`
      : "/explore?action=join",
  );

  useEffect(() => {
    if (window.location.hash !== "#homepage-renaissance-choices") return;
    const frame = window.requestAnimationFrame(() => {
      scrollToRenaissanceChoices("work_with_us_menu");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <>
    <main className="min-h-screen bg-[#F9F9F6] text-black selection:bg-[#c6ff3d] selection:text-black">
      <HomepageRenaissanceHero joinHref={joinHref} />
      <ExchangeBoardPreview />
      <PatronPostCutoffCountdown href={appRoute("/snail")} />
      <HomepageMapFeature />
      <CircularEconomicsSection />
      <SelectedCreditsBanner />
      <PracticalExamplesSection />

      <PinkSpyJournalFeature />

      <CountercultTractionStats />

      <ExchangeResidencyHomeBanner />

      <CuratorInvite />

      <section className="border-b-2 border-black bg-black text-[#F9F9F6]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-10 flex items-end justify-between gap-6 border-b border-white/25 pb-4">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">
               the network
            </h2>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 sm:inline">
              discover · preserve · exchange
            </span>
          </div>
           <div className="grid gap-px border border-white/25 bg-white/25 md:grid-cols-3">
            {actions.map(({ number, icon: Icon, title, copy }) => (
              <div key={number} className="bg-black p-6 sm:p-8">
                <div className="mb-16 flex items-center justify-between text-[#c6ff3d]">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                  <span className="font-mono text-[10px]">{number}</span>
                </div>
                <h3 className="mb-3 text-3xl font-black uppercase tracking-tight">{title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-white/60">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
             <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">find real culture in a place</p>
            <h2 className="max-w-lg text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl">
              your scene is already happening.
            </h2>
            <div
              className="group relative mt-8 w-fit"
              role="img"
              aria-label="why is there a rat? we also dont know."
              title="why is there a rat? we also dont know."
            >
              <img src="/cult-rat.gif" alt="" aria-hidden="true" className="h-20 w-auto mix-blend-multiply transition-transform group-hover:-rotate-6" />
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 border-2 border-black bg-[#c6ff3d] px-2 py-1.5 text-center font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-black opacity-0 transition-opacity group-hover:opacity-100">
                why is there a rat? we also dont know.
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "new york", href: "/place/New%20York" },
              { label: "berlin", href: "/place/Berlin" },
            ].map((place) => (
              <a
                key={place.label}
                href={place.href}
                className="group flex items-center justify-between border-2 border-black p-5 font-mono text-sm font-bold uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                {place.label}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            ))}
            <p className="font-mono text-[10px] leading-relaxed text-black/50 sm:col-span-3">
              Start with a place, read the context, then follow the public entries into the people and culture already there.
            </p>
            <div className="border-2 border-black p-5 sm:col-span-3 sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">rural places</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/60">
                  Rural culture is not one location. It is a way to find the people, practices, and places making smaller communities distinctive.
                </p>
              </div>
              <a
                href="/explore?q=rural"
                className="group mt-5 inline-flex shrink-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] underline decoration-1 underline-offset-4 sm:mt-0"
              >
                explore rural culture
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="start-here" data-testid="section-home-start-here" className="border-b-2 border-black bg-black px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
           <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">start here</p>
          <h2 className="max-w-3xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-6xl">
             what brings you here?
          </h2>
          <div className="mt-10 grid gap-px border border-white/20 bg-white/20 md:grid-cols-3">
            {[
              {
                label: "hire studios",
                   copy: "you have a brief. you need the local intelligence and the right people to make it.",
                href: "/studios",
                cta: "work with Studios →",
              },
              {
                 label: "use the Fund",
                    copy: "Clients hold the agreed budget and pay artists and Studios separately. Automated sales-linked funding is future development.",
                href: "/fund",
                  cta: "create your Fund →",
              },
              {
                label: "collaborate",
                 copy: "Artists and small cultural spaces can join the network for free and find work.",
                href: "/explore?action=join",
                cta: "join the network →",
              },
            ].map((path) => (
              <a key={path.label} href={path.href} className={`group flex min-h-[220px] flex-col justify-between p-6 transition-colors hover:bg-[#c6ff3d] hover:text-black sm:p-8 ${path.label === "hire studios" ? "bg-[#c6ff3d] text-black" : "bg-black text-white"}`}>
                <div>
                  <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors group-hover:text-black ${path.label === "hire studios" ? "text-black" : "text-[#c6ff3d]"}`}>→ {path.label}</p>
                  <p className={`mt-6 max-w-sm text-lg leading-relaxed transition-colors group-hover:text-black/80 ${path.label === "hire studios" ? "text-black/70" : "text-white/70"}`}>{path.copy}</p>
                </div>
                <span className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">{path.cta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Marquee
               text="countercult // economic development through culture // open cultural infrastructure // artists, spaces, and paid local work // "
        speed={24}
        direction="right"
        className="border-y-2 border-black !bg-black !py-3 !text-[#c6ff3d] text-xs"
      />

      <section className="bg-[#c6ff3d] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-3xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">
            put your scene on the map.
          </h2>
          <div className="flex w-full shrink-0 flex-col items-start gap-4 md:w-auto">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <a
                href={joinHref}
                className="group clr-lime hover-clr-black flex min-h-[52px] w-full items-center justify-center gap-3 border-2 border-black bg-black px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-white sm:w-auto"
              >
                apply to join for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href={appRoute("/submit?kind=space")}
                data-testid="link-home-list-space"
                className="group flex min-h-[52px] w-full items-center justify-center gap-3 border-2 border-black bg-white px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-black hover:text-[#c6ff3d] sm:w-auto"
              >
                list your space
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <p className="max-w-xl font-mono text-[9px] font-bold uppercase leading-relaxed tracking-[0.08em] text-black/65">
              Artist profiles are reviewed before appearing in the Network. Space submissions need no account and are reviewed before appearing on the map.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b-2 border-black">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20 lg:py-20 xl:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="group relative w-fit max-w-full">
              <h1 className="max-w-3xl text-[clamp(3.4rem,8vw,8.5rem)] font-black uppercase leading-[0.9] tracking-[-0.045em] lg:text-[clamp(3rem,5vw,5.5rem)] xl:text-[clamp(3.6rem,6vw,7rem)]">
                join the real culture economy.
              </h1>
            </div>
            <p className="mt-3 max-w-3xl font-mono text-[10px] font-bold leading-relaxed tracking-[0.08em] text-[#496000] sm:text-[11px]">
              artist-founded economic infrastructure for local culture
            </p>
            <div className="mt-5 flex flex-wrap gap-3 lg:mt-4">
              <a
                href={joinHref}
                data-testid="link-home-join-network"
                className="group clr-lime hover-clr-black flex items-center gap-3 border-2 border-black bg-black px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[#c6ff3d]"
              >
                apply to join for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <p className="max-w-md font-mono text-[9px] font-bold uppercase leading-relaxed tracking-[0.08em] text-black/65">
                About 5 minutes. Profiles are reviewed before appearing in the public Network; approval unlocks member-only Exchange access.
              </p>
            </div>
            <div className="mt-4">
              <ExchangeBoardSticker />
            </div>
          </motion.div>

        </div>
      </section>

      <footer className="bg-black px-5 py-8 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row">
          <span>countercult · independent culture, connected</span>
          <div className="flex items-center gap-5">
            <a href="/explore" className="clr-lime hover:text-white">THE MAP →</a>
            <a href="/studios" onClick={() => trackEvent("studios_cta_clicked", { source_route: "/", placement: "footer_studios" })} className="text-white/45 transition-colors hover:text-[#c6ff3d]">studios</a>
            <a href="/fund" className="text-white/45 transition-colors hover:text-[#c6ff3d]">fund</a>
            <a href="/journal/agency-cultural-partner-independent-culture/" className="text-white/45 transition-colors hover:text-[#c6ff3d]">agency partner</a>
            <button onClick={() => showPledgePopup()} className="text-white/45 transition-colors hover:text-[#c6ff3d]">support the archive</button>
            <button onClick={openTermsModal} className="text-white/45 transition-colors hover:text-[#c6ff3d]">terms & privacy</button>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}

function PinkSpyJournalFeature() {
  return (
    <section className="border-b-2 border-black bg-[#f3f2ed]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
        <a
          href="/journal/pink-spy-the-floor-art-residency/"
          className="group block overflow-hidden border-2 border-black bg-black shadow-[8px_8px_0_#c6ff3d]"
          aria-label="Read Pink Spy's internship visual diary"
        >
          <img
            src="/journal/pink-spy-the-floor-art-residency/assets/01-pink-spy-presents.jpg"
            alt="Pink Spy's visual diary of The Floor art residency"
            className="aspect-[4/3] w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
            loading="lazy"
          />
        </a>
        <div>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            from the journal · internship visual diary
          </p>
          <h2 className="max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">
            Pink Spy's Countercult Residency at The Floor.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/70 sm:text-base">
            A month in Berlin through shared living, artist introductions, exhibitions, local spaces, and the relationships that make a residency feel like a way into a city.
          </p>
          <a
            href="/journal/pink-spy-the-floor-art-residency/"
            className="mt-6 inline-flex border-2 border-black bg-black px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black"
          >
            read Pink Spy's diary <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}