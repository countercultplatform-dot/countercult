import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import SiteSearch from "@/components/SiteSearch";
import { SEARCH_EXAMPLES } from "@/data/searchExamples";

const primaryNavigation = [
  { label: "the map", path: "/explore", testId: "explore" },
  { label: "artist resources", path: "/residency", testId: "artist-resources" },
] as const;

const moreNavigation = [
  { label: "collective fund", path: "/collective-fund" },
  { label: "studio", path: "/studios" },
  { label: "fund", path: "/fund" },
  { label: "media", href: "https://countercultplatform.substack.com/subscribe", external: true },
] as const;

interface Session {
  token: string;
  expiresAt?: string;
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.token) return null;
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

function appRoute(path: string) {
  const baseSegments = (import.meta.env.BASE_URL || "/").replace(/^\/+|\/+$/g, "");
  const basePath = baseSegments ? `/${baseSegments}` : "";
  const routePath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${routePath}`;
}

type NavigationItem = typeof primaryNavigation[number] | typeof moreNavigation[number];

function primaryNavigationHref(item: NavigationItem) {
  return "path" in item ? appRoute(item.path) : item.href;
}

export default function MainSiteMenu() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const isStudiosRoute = /(?:^|\/)studios(?:\/for-you)?\/?$/.test(window.location.pathname);
  const isExploreRoute = /(?:^|\/)explore(?:\/|$)/.test(window.location.pathname);
  const joinButtonLabel = isExploreRoute ? "add to the map" : "apply to join for free";
  const referralCode = new URLSearchParams(window.location.search).get("ref");
  const joinHref = appRoute(
    referralCode
      ? `/explore?action=join&ref=${encodeURIComponent(referralCode)}`
      : "/explore?action=join",
  );
  const signInHref = appRoute("/explore?action=signin");
  const homeHref = appRoute("/member-home");
  const faqHref = appRoute("/faq");

  useEffect(() => {
    const syncSession = () => setSession(readSession());
    window.addEventListener("storage", syncSession);
    window.addEventListener("cc:session-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("cc:session-change", syncSession);
    };
  }, []);

  useEffect(() => {
    const openSiteSearch = (event: Event) => {
      const query = (event as CustomEvent<{ query?: unknown }>).detail?.query;
      setSearchQuery(typeof query === "string" ? query : "");
      setIsSearchOpen(true);
    };
    window.addEventListener("cc:open-site-search", openSiteSearch);
    return () => window.removeEventListener("cc:open-site-search", openSiteSearch);
  }, []);

  useEffect(() => {
    if (isStudiosRoute) return;
    const timer = window.setInterval(() => {
      setSearchPlaceholderIndex((index) => (index + 1) % SEARCH_EXAMPLES.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isStudiosRoute]);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    if (session?.token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    }
    localStorage.removeItem("cc_auth");
    window.dispatchEvent(new CustomEvent("cc:session-change"));
    setSession(null);
    window.location.assign(appRoute("/"));
  };

  return (
    <header
      data-main-site-menu
      className="sticky top-0 z-[9500] border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm"
    >
      <div className="flex w-full items-center justify-start gap-5 px-4 py-3 sm:gap-7 sm:px-8 sm:py-4 lg:px-12">
        <a
          href={appRoute("/")}
          data-testid="link-main-menu-home"
          className="shrink-0 whitespace-nowrap font-mono text-[12px] font-black uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em]"
        >
          countercult
        </a>
        <nav
          aria-label="Primary navigation"
          className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-x-4 font-mono text-[8px] font-bold uppercase tracking-[0.08em] lg:flex xl:gap-x-6 xl:text-[9px]"
        >
          {!isStudiosRoute && (
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setIsSearchOpen(true);
              }}
              className="flex w-72 shrink-0 items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2.5 xl:w-[28rem]"
            >
              <Search size={13} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClick={() => setIsSearchOpen(true)}
                placeholder={SEARCH_EXAMPLES[searchPlaceholderIndex]}
                aria-label="Search Countercult"
                className="w-full min-w-0 bg-transparent font-sans text-xs text-black outline-none placeholder:text-black/40"
                data-testid="input-main-menu-search"
              />
            </form>
          )}
          <div className="flex items-center gap-x-5 xl:gap-x-7">
            {primaryNavigation.map((item) => (
              <a
                key={item.label}
                href={primaryNavigationHref(item)}
                data-testid={`link-main-menu-${item.testId}`}
                className={`whitespace-nowrap py-3 transition-colors hover:text-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${"path" in item && item.path === "/explore" ? "border-2 border-black bg-[#c6ff3d] px-3 py-2.5 text-black hover:text-black" : ""}`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <details className="group relative">
            <summary
              data-testid="button-main-menu-more"
              className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap py-3 text-black transition-colors hover:text-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black [&::-webkit-details-marker]:hidden"
            >
              more <span aria-hidden="true" className="inline-block text-black/50 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 min-w-40 border-2 border-black bg-[#F9F9F6] p-1 shadow-[4px_4px_0_#c6ff3d]">
              {moreNavigation.map((item) => {
                const external = "external" in item && item.external;
                return (
                <a
                  key={item.label}
                  href={primaryNavigationHref(item)}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  data-testid={`link-main-menu-${item.label.replaceAll(" ", "-")}`}
                  className="block px-3 py-2.5 text-black/70 transition-colors hover:bg-[#c6ff3d] hover:text-black"
                >
                  {item.label}
                </a>
                );
              })}
              <a href={faqHref} data-testid="link-main-menu-more-faq" className="block px-3 py-2.5 text-black/70 transition-colors hover:bg-[#c6ff3d] hover:text-black">
                FAQ
              </a>
            </div>
          </details>
          {session && (
            <a href={homeHref} data-testid="link-main-menu-member-home" className="whitespace-nowrap py-3 transition-colors hover:text-black/55">
              home
            </a>
          )}
          {session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isSigningOut}
              data-testid="button-main-menu-sign-out"
              className="whitespace-nowrap border-2 border-black bg-transparent px-3 py-2 text-black transition-colors hover:bg-black hover:text-white disabled:opacity-60"
            >
              {isSigningOut ? "signing out…" : "sign out"}
            </button>
          ) : (
            <>
              <a
                href={signInHref}
                data-testid="link-main-menu-sign-in"
                className="whitespace-nowrap border-2 border-black bg-transparent px-3 py-2 text-black transition-colors hover:bg-black hover:text-white"
              >
                sign in
              </a>
              <a
                href={joinHref}
                data-testid="link-main-menu-join"
                className="whitespace-nowrap border-2 border-black bg-[#c6ff3d] px-3 py-2 transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                {joinButtonLabel}
              </a>
            </>
          )}
        </nav>
        <details className="group relative ml-auto shrink-0 lg:hidden">
          <summary
            data-testid="button-main-menu-mobile"
            className="flex min-h-10 cursor-pointer list-none items-center gap-2 border-2 border-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] outline-none transition-colors hover:bg-[#c6ff3d] focus-visible:ring-2 focus-visible:ring-[#c6ff3d] [&::-webkit-details-marker]:hidden"
          >
            menu <span aria-hidden="true" className="inline-block text-black/45 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-1.5rem)] border-2 border-black bg-[#F9F9F6] shadow-[5px_5px_0_#c6ff3d]">
            <nav aria-label="Primary navigation" className="grid gap-0.5 p-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
              {!isStudiosRoute && (
                <form
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setIsSearchOpen(true);
                  }}
                  className="m-2 flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2.5"
                >
                  <Search size={14} aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onClick={() => setIsSearchOpen(true)}
                    placeholder={SEARCH_EXAMPLES[searchPlaceholderIndex]}
                    aria-label="Search Countercult"
                    className="w-full min-w-0 bg-transparent font-sans text-xs text-black outline-none placeholder:text-black/40"
                    data-testid="input-main-menu-mobile-search"
                  />
                </form>
              )}
              {primaryNavigation.map((item) => (
                <a
                  key={item.label}
                  href={primaryNavigationHref(item)}
                  data-testid={`link-main-menu-mobile-${item.testId}`}
                  className={`block px-3 py-3 transition-colors hover:bg-[#c6ff3d] ${"path" in item && item.path === "/explore" ? "bg-[#c6ff3d] text-black" : ""}`}
                >
                  {item.label}
                </a>
              ))}
              <details className="group mt-1 border-t border-black/25 pt-1">
                <summary
                  data-testid="button-main-menu-mobile-more"
                  className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-black/70 transition-colors hover:bg-[#c6ff3d] hover:text-black [&::-webkit-details-marker]:hidden"
                >
                  more <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-45">+</span>
                </summary>
                {moreNavigation.map((item) => {
                  const external = "external" in item && item.external;
                  return (
                    <a
                      key={item.label}
                      href={primaryNavigationHref(item)}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      data-testid={`link-main-menu-mobile-${item.label.replaceAll(" ", "-")}`}
                      className="block px-5 py-3 text-black/65 transition-colors hover:bg-[#c6ff3d] hover:text-black"
                    >
                      {item.label}
                    </a>
                  );
                })}
                <a href={faqHref} data-testid="link-main-menu-mobile-faq" className="block px-5 py-3 text-black/65 transition-colors hover:bg-[#c6ff3d] hover:text-black">
                  FAQ
                </a>
              </details>
              {session && <a href={homeHref} className="block px-3 py-3 transition-colors hover:bg-[#c6ff3d]">home</a>}
              {session ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={isSigningOut}
                  data-testid="button-main-menu-mobile-sign-out"
                  className="block w-full px-3 py-3 text-left transition-colors hover:bg-[#c6ff3d] disabled:opacity-60"
                >
                  {isSigningOut ? "signing out…" : "sign out"}
                </button>
              ) : (
                <>
                  <a href={signInHref} className="block px-3 py-3 transition-colors hover:bg-[#c6ff3d]">sign in</a>
                  <a href={joinHref} className="block px-3 py-3 transition-colors hover:bg-[#c6ff3d]">{joinButtonLabel}</a>
                </>
              )}
            </nav>
          </div>
        </details>
      </div>
      <SiteSearch
        open={isSearchOpen}
        initialQuery={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
