import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, ArrowUpRight, LoaderCircle } from "lucide-react";
import {
  getListEntriesQueryKey,
  getListPublicArtistCardsQueryKey,
  getListResidencyOffersQueryKey,
  useListEntries,
  useListPublicArtistCards,
  useListResidencyOffers,
} from "@workspace/api-client-react";
import type { EntrySummary, PublicArtistCard, ResidencyOffer } from "@workspace/api-client-react";
import { PUBLIC_SEARCH_PAGES } from "@/data/publicSearchPages";
import { matchesSearchText as matches, normalizeSearchText as normalized } from "@/lib/searchMatching";

type Result = {
  id: string;
  title: string;
  detail: string;
  href: string;
  group: string;
};

type JournalResult = Result;

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const withBase = (path: string) => `${basePath}${path.startsWith("/") ? path : `/${path}`}` || "/";
const tidy = (value?: string | null) => (value || "").trim();
const prettyCategory = (value: string) => value.replaceAll("_", " ");

function searchPages(query: string): Result[] {
  return PUBLIC_SEARCH_PAGES.filter((page) => matches(query, [page.title, page.path]))
    .map((page) => ({ id: page.path, title: page.title, detail: page.path, href: withBase(page.path), group: "site pages" }));
}

function searchSpaces(query: string, entries: EntrySummary[] = []): Result[] {
  return entries.filter((entry) => entry.kind === "space" && matches(query, [
    entry.name, entry.secondaryKind ?? "", entry.city, entry.country,
    ...(entry.tags || []), ...(entry.openTo || []), ...(entry.basedIn || []),
  ]))
    .map((entry) => ({
      id: String(entry.id),
      title: entry.name,
      detail: [entry.city, entry.country, ...(entry.tags || []).slice(0, 2)].filter(Boolean).join(" · "),
      href: withBase(`/entries/${entry.id}`),
      group: "network spaces",
    }));
}

function searchArtists(query: string, artists: PublicArtistCard[] = []): Result[] {
  return artists.filter((artist) => matches(query, [
    artist.name, artist.city, artist.country, ...(artist.tags || []), ...(artist.openTo || []), ...(artist.offeringChoices || []),
  ])).map((artist) => ({
    id: String(artist.id),
    title: artist.name,
    detail: [artist.city, artist.country, ...(artist.tags || []).slice(0, 2)].filter(Boolean).join(" · "),
    href: withBase(`/entries/${artist.id}`),
    group: "consented artist cards",
  }));
}

function safeExchangeResults(query: string, offers: ResidencyOffer[] = []): Result[] {
  const results: Result[] = [];
  for (const offer of offers) {
    if (offer.visibility === "private") continue;
    // Network-only full rows are never used. A preview may expose only its broad
    // location and, where explicitly allowed, coarse public browse categories.
    if (offer.isPublicPreview) {
      if (offer.visibility === "network") {
        const title = "Member Exchange activity";
        const detail = "Network members only";
        if (!matches(query, [title, detail])) continue;
        results.push({
          id: `network-teaser-${offer.id}`,
          title,
          detail,
          href: withBase("/residency"),
          group: "Exchange · member boundary",
        });
        continue;
      }
      const categories = offer.hasPublicMapLocation
        ? [...new Set([offer.publicCategory, ...(offer.publicCategories || [])].filter(Boolean) as string[])]
        : [];
      const city = tidy(offer.city);
      if (!matches(query, [city, ...categories])) continue;
      results.push({
        id: `preview-${offer.id}`,
        title: city ? `Exchange activity near ${city}` : "Public Exchange activity",
        detail: categories.length ? categories.map(prettyCategory).join(" · ") : "A public Exchange teaser",
        href: withBase("/residency"),
        group: "Exchange · public preview",
      });
      continue;
    }
    if (offer.visibility !== "public") continue;
    const categories = [...new Set([offer.publicCategory, ...(offer.publicCategories || [])].filter(Boolean) as string[])];
    const city = tidy(offer.city);
    if (!matches(query, [city, ...categories])) continue;
    results.push({
      id: `public-${offer.id}`,
      title: city ? `Exchange in ${city}` : "Public Exchange listing",
      detail: categories.length ? categories.map(prettyCategory).join(" · ") : "Public Exchange listing",
      href: withBase("/residency"),
      group: "Exchange · public listing",
    });
  }
  return results;
}

async function loadJournalIndex(): Promise<JournalResult[]> {
  const journalIndex = withBase("/journal/index.html");
  const response = await fetch(journalIndex, { headers: { Accept: "text/html" } });
  if (!response.ok) throw new Error("The public Journal index could not be loaded.");
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set<string>();
  return Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[href]")).flatMap((anchor) => {
    const title = tidy(anchor.querySelector("h2, h3")?.textContent || anchor.textContent);
    const hrefValue = anchor.getAttribute("href");
    if (!title || !hrefValue) return [];
    let url: URL;
    try {
      url = new URL(hrefValue, new URL(journalIndex, window.location.origin));
    } catch {
      return [];
    }
    const appBase = new URL(withBase("/"), window.location.origin).pathname.replace(/\/+$/, "");
    const route = url.pathname;
    if (url.origin !== window.location.origin || !route.includes("/journal/") || route.endsWith("/index.html") && route === withBase("/journal/index.html")) return [];
    const localRoute = appBase && route.startsWith(`${appBase}/`) ? route.slice(appBase.length) : route;
    if (localRoute === "/journal/" || localRoute === "/journal/index.html" || seen.has(localRoute)) return [];
    seen.add(localRoute);
    const appRoute = localRoute.replace(/\/+$/, "");
    return [{
      id: appRoute,
      title,
      detail: "Countercult Journal",
      href: withBase(appRoute),
      group: "Journal articles",
    }];
  });
}

function groupOrder(group: string) {
  return ["network spaces", "consented artist cards", "Exchange · public preview", "Exchange · public listing", "site pages", "Journal articles"].indexOf(group);
}

export default function SiteSearch({
  open,
  onClose,
  initialQuery = "",
  onQueryChange,
}: {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [journal, setJournal] = useState<JournalResult[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const entriesQuery = useListEntries({ query: { queryKey: getListEntriesQueryKey(), enabled: open } });
  const artistsQuery = useListPublicArtistCards({ query: { queryKey: getListPublicArtistCardsQueryKey(), enabled: open } });
  const offersQuery = useListResidencyOffers({ query: { queryKey: getListResidencyOffersQueryKey(), enabled: open } });

  useEffect(() => {
    if (!open) {
      openerRef.current?.focus();
      return;
    }
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery(initialQuery);
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setJournalLoading(true);
    setJournalError(false);
    loadJournalIndex().then((items) => {
      if (!cancelled) setJournal(items);
    }).catch(() => {
      if (!cancelled) setJournalError(true);
    }).finally(() => {
      if (!cancelled) setJournalLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  const isSearching = query.trim().length > 0;
  const suppressJournalResultsForArtistSearch = /\b(?:shona|sketchy)\b/i.test(query);
  const groups = useMemo(() => {
    if (!isSearching) return [];
    return [
      ...searchSpaces(query, entriesQuery.data),
      ...searchArtists(query, artistsQuery.data),
      ...safeExchangeResults(query, offersQuery.data),
      ...searchPages(query),
      ...(suppressJournalResultsForArtistSearch ? [] : journal.filter((item) => matches(query, [item.title]))),
    ].sort((a, b) => groupOrder(a.group) - groupOrder(b.group) || a.title.localeCompare(b.title));
  }, [query, isSearching, entriesQuery.data, artistsQuery.data, offersQuery.data, journal, suppressJournalResultsForArtistSearch]);
  const displayed = groups;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown" && displayed.length) {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, displayed.length - 1));
      }
      if (event.key === "ArrowUp" && displayed.length) {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === "Enter" && displayed[activeIndex]) {
        event.preventDefault();
        window.location.assign(displayed[activeIndex].href);
      }
      if (event.key === "Tab") {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>(".cc-search-dialog button, .cc-search-dialog input, .cc-search-dialog a[href]"))
          .filter((element) => !element.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, displayed, activeIndex]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  const loading = entriesQuery.isLoading || artistsQuery.isLoading || offersQuery.isLoading || journalLoading;
  const hasDataError = entriesQuery.isError || artistsQuery.isError || offersQuery.isError;

  return createPortal((
    <div className="cc-search-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="cc-search-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-search-title">
        <header className="cc-search-topline">
          <h2 id="cc-search-title">Find your scene, your artists, your space worldwide.</h2>
          <button type="button" className="cc-search-close" onClick={onClose} aria-label="Close search" data-testid="button-search-close">
            <X size={19} strokeWidth={2.5} />
          </button>
        </header>
        <label className="cc-search-field">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Search public Countercult</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onQueryChange?.(event.target.value);
            }}
            placeholder="Search"
            autoComplete="off"
            aria-controls="cc-search-results"
            data-testid="input-site-search"
          />
        </label>
        <div className="cc-search-results" id="cc-search-results" role="listbox" aria-label="Search results" aria-live="polite">
          {!isSearching ? (
            <div className="cc-search-empty" aria-hidden="true" />
          ) : (
            <>
              {(hasDataError || journalError) && (
                <div className="cc-search-status cc-search-status--warning" role="status" data-testid="status-search-partial-error">
                  {hasDataError && journalError
                    ? "Some public sources could not be reached. Results below may be incomplete."
                    : hasDataError
                      ? "Network search could not load. Showing available public pages and Journal results."
                      : "The public Journal could not be reached. Showing available Network and site results."}
                </div>
              )}
              {loading && groups.length === 0 && (
                <div className="cc-search-loading" role="status" data-testid="status-search-loading">
                  <LoaderCircle size={17} className="cc-search-loader" /> checking public sources…
                </div>
              )}
              {!loading && groups.length === 0 && !hasDataError && !journalError && (
                <div className="cc-search-empty" data-testid="status-search-no-results">
                  <p>No results for “{query}”.</p>
                </div>
              )}
              {groups.map((result, index) => (
                <a
                  key={`${result.group}-${result.id}`}
                  href={result.href}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`cc-search-result${activeIndex === index ? " is-active" : ""}`}
                  data-testid={`link-search-result-${result.group.replaceAll(/[^a-z]+/gi, "-").toLowerCase()}-${result.id}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="cc-search-result-main">
                    <span className="cc-search-result-group">{result.group}</span>
                    <strong>{result.title}</strong>
                    <span className="cc-search-result-detail">{result.detail}</span>
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              ))}
              {loading && groups.length > 0 && <p className="cc-search-tail-status">More public sources are still loading…</p>}
            </>
          )}
        </div>
      </section>
    </div>
  ), document.body);
}
