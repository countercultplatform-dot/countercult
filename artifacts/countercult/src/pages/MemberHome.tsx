import { useEffect, useState } from "react";
import { ArrowRight, LogOut, Menu, Repeat2, X } from "lucide-react";
import { useLocation } from "wouter";

interface Session {
  token: string;
  email: string;
  expiresAt?: string;
}

interface MemberEntry {
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
  newsletterOptIn: boolean;
  ruralDiscoveryOptIn: boolean;
  exchangeDigestOptIn: boolean;
  entries: MemberEntry[];
}

type MemberPreferences = Pick<MeResponse, "newsletterOptIn" | "ruralDiscoveryOptIn" | "exchangeDigestOptIn">;

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.token || !session.email) return null;
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("cc_auth");
  window.dispatchEvent(new CustomEvent("cc:session-change"));
}

export default function MemberHome() {
  const [, navigate] = useLocation();
  const [session] = useState<Session | null>(() => readSession());
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesNotice, setPreferencesNotice] = useState("");
  const [welcomePrompt, setWelcomePrompt] = useState(
    () => new URLSearchParams(window.location.search).get("welcome") === "1",
  );

  useEffect(() => {
    if (!session) {
      window.location.href = "/explore?action=signin";
      return;
    }

    let active = true;
    fetch("/api/auth/me", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Cache-Control": "no-cache",
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("session expired");
        return response.json() as Promise<MeResponse>;
      })
      .then((data) => {
        if (!active) return;
        setMe(data);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        window.location.href = "/explore?action=signin";
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!welcomePrompt) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("welcome");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [welcomePrompt]);

  const signOut = async () => {
    if (session) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    }
    clearSession();
    navigate("/");
  };

  const savePreferences = async (next: MemberPreferences) => {
    if (!session || !me || preferencesSaving) return;
    const previous: MemberPreferences = {
      newsletterOptIn: me.newsletterOptIn,
      ruralDiscoveryOptIn: me.ruralDiscoveryOptIn,
      exchangeDigestOptIn: me.exchangeDigestOptIn,
    };
    setPreferencesError("");
    setPreferencesNotice("");
    setPreferencesSaving(true);
    setMe((current) => current ? { ...current, ...next } : current);

    try {
      const response = await fetch("/api/auth/preferences", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
      const data = await response.json() as MemberPreferences & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Preferences could not be saved.");
      setMe((current) => current ? { ...current, ...data } : current);
      setPreferencesNotice(
        next.newsletterOptIn && !previous.newsletterOptIn
          ? "Preference saved. Confirm your subscription on Substack."
          : "Preferences saved.",
      );
    } catch (error) {
      setMe((current) => current ? { ...current, ...previous } : current);
      setPreferencesError(error instanceof Error ? error.message : "Preferences could not be saved.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  if (!session || loading) {
    return (
      <main
        className="min-h-[100dvh] bg-[#F9F9F6] px-6 py-20 text-[10px] uppercase tracking-widest text-black/45"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        loading your member home…
      </main>
    );
  }

  const isApproved = Boolean(me?.isApproved);
  const newsletterPrompt = new URLSearchParams(window.location.search).get("newsletter") === "1";

  return (
    <main className="member-home-page min-h-[100dvh] bg-[#F9F9F6] pb-10 text-black selection:bg-[#c6ff3d] selection:text-black">
      <style>{`.member-home-page, .member-home-page * { font-family: Arial, Helvetica, sans-serif !important; }`}</style>
      <header className="sticky top-0 z-30 border-b-2 border-black bg-[#F9F9F6]/95 px-4 py-3 backdrop-blur-sm sm:px-8">
        <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4">
          <a href="/member-home" aria-label="Countercult member home" className="text-[11px] font-black uppercase tracking-[0.18em]">countercult</a>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="border-2 border-black bg-white p-2 sm:hidden"
            aria-label={menuOpen ? "Close account menu" : "Open account menu"}
            aria-controls="member-account-nav"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <nav
            id="member-account-nav"
            aria-label="Member account"
            className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full z-30 flex-col gap-1 border-b-2 border-black bg-[#F9F9F6] px-4 py-3 shadow-[0_4px_0_#000] sm:static sm:flex sm:flex-row sm:items-center sm:gap-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none`}
          >
            <a href="/profile" onClick={() => setMenuOpen(false)} className="border-2 border-transparent px-2.5 py-2 text-[9px] font-bold uppercase tracking-widest hover:border-black">edit profile</a>
            <a href="/residency?view=mine" onClick={() => setMenuOpen(false)} className="border-2 border-transparent px-2.5 py-2 text-[9px] font-bold uppercase tracking-widest hover:border-black">edit listings</a>
            <a href="https://countercultplatform.substack.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="border-2 border-transparent px-2.5 py-2 text-[9px] font-bold uppercase tracking-widest hover:border-black">news</a>
            <button
              onClick={() => { setMenuOpen(false); void signOut(); }}
              className="flex items-center gap-1.5 border-2 border-black bg-white px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
            >
              <LogOut className="h-3 w-3" />
              sign out
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 border-2 border-black bg-[#c6ff3d] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
            {isApproved ? "approved member" : "application in progress"}
          </div>
          <h1 className="text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-6xl">
            what do you<br />want to do?
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-black/65 sm:text-lg">
            {isApproved
              ? "Choose where you want to go next."
              : "Our team reviews applications manually. Only approved applicants receive an email, within two weeks. Your profile and Exchange drafts stay private until approval."}
          </p>
        </div>

        <section
          className="mb-8 grid gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:grid-cols-2 sm:p-6"
          aria-labelledby="member-home-preferences-title"
          data-testid="member-home-preferences"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/50">optional settings</p>
            <h2 id="member-home-preferences-title" className="mt-1 text-xl font-black uppercase tracking-tight">
              choose what you want to receive
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 border-t border-black/15 pt-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                data-testid="member-home-newsletter-opt-in"
                checked={Boolean(me?.newsletterOptIn)}
                disabled={preferencesSaving}
                onChange={(event) => {
                  if (!me) return;
                  void savePreferences({
                    newsletterOptIn: event.target.checked,
                    ruralDiscoveryOptIn: me.ruralDiscoveryOptIn,
                    exchangeDigestOptIn: me.exchangeDigestOptIn,
                  });
                }}
                className="mt-1 h-4 w-4 shrink-0 accent-black"
              />
              <span>
                <span className="block font-bold">I want Countercult newsletter updates.</span>
                <span className="mt-1 block text-xs text-black/60">
                  Substack requires a separate confirmation.
                </span>
              </span>
            </label>
          </div>
          {me?.newsletterOptIn && (
            <div className="sm:col-span-2">
              <a
                href="https://countercultplatform.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
                data-testid="member-home-substack-confirm"
              >
                confirm subscription on Substack <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 border-t border-black/15 pt-4 text-sm leading-relaxed">
            <input
              type="checkbox"
              data-testid="member-home-exchange-digest-opt-in"
              checked={Boolean(me?.exchangeDigestOptIn)}
              disabled={preferencesSaving}
              onChange={(event) => {
                if (!me) return;
                void savePreferences({
                  newsletterOptIn: me.newsletterOptIn,
                  ruralDiscoveryOptIn: me.ruralDiscoveryOptIn,
                  exchangeDigestOptIn: event.target.checked,
                });
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-black"
            />
            <span>
              <span className="block font-bold">Email me the weekly Exchange digest.</span>
              <span className="mt-1 block text-xs text-black/60">
                Sent only after your account is approved. Unsubscribe anytime.
              </span>
            </span>
          </label>
          {preferencesError && (
            <p role="alert" className="text-xs font-bold text-red-700 sm:col-span-2">{preferencesError}</p>
          )}
          {preferencesNotice && (
            <p role="status" className="text-xs font-bold text-black/65 sm:col-span-2">{preferencesNotice}</p>
          )}
        </section>

        {welcomePrompt && (
          <section
            className="mb-8 border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7"
            aria-labelledby="member-home-patron-post-title"
            data-testid="member-home-patron-post-welcome"
          >
            <div className="max-w-2xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/55">
                want something you can hold?
              </p>
              <h2
                id="member-home-patron-post-title"
                className="mt-2 text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-3xl"
              >
                Countercult Patron Post
              </h2>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-black/70 sm:text-sm">
                Monthly art, independent-culture stories, and curated opportunities delivered to your mailbox, shipped worldwide.
              </p>
            </div>
            <a
              href="/snail#snail-checkout"
              data-testid="member-home-patron-post-link"
              className="mt-5 inline-flex shrink-0 items-center gap-2 border-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black sm:mt-0"
            >
              explore Patron Post <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </section>
        )}

        {newsletterPrompt && isApproved && (
          <div className="mb-8 border-2 border-black bg-[#c6ff3d] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest">finish newsletter signup</p>
              <p className="mt-2 text-xs leading-relaxed text-black/65">
                You asked to hear from Countercult. Substack needs one final confirmation from you.
              </p>
            </div>
            <a
              href="https://countercultplatform.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex shrink-0 border-2 border-black bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d] sm:mt-0"
            >
              subscribe on substack ↗
            </a>
          </div>
        )}

        <section
          className="mb-8 border-2 border-black bg-[#c6ff3d] p-5 shadow-[5px_5px_0_#000] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7"
          aria-labelledby="member-home-cultural-spot-title"
          data-testid="member-home-cultural-spot"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-black/55">
              add to the cultural map
            </p>
            <h2
              id="member-home-cultural-spot-title"
              className="mt-2 text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-3xl"
            >
              add a cultural spot
            </h2>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-black/70 sm:text-sm">
              Bring a place you value into the map. You can suggest a space without representing it or claiming its pin.
            </p>
          </div>
          <a
            href="/submit?kind=space&returnTo=%2Fmember-home"
            data-testid="member-home-add-cultural-spot"
            className="mt-5 inline-flex shrink-0 items-center gap-2 border-2 border-black bg-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black sm:mt-0"
          >
            add a cultural spot <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </section>

        {isApproved ? (
          <section className="grid w-full grid-cols-1 items-center gap-5 sm:gap-8 md:grid-cols-2" aria-label="Member destinations">
            {[
              {
                href: "/residency",
                image: "/images/renaissance-pill-red.png",
                label: "Browse Exchange",
                detail: "Search housing, spaces, and skill swaps.",
                ariaLabel: "Browse Exchange listings for housing, spaces, and skill swaps.",
              },
              {
                href: "/explore",
                image: "/images/renaissance-pill-blue.png",
                label: "Search artists + spaces",
                detail: "Explore our global database of artists and cultural spaces.",
                ariaLabel: "Search the global database of artists and cultural spaces.",
              },
            ].map((action, index) => (
              <a
                key={action.href}
                href={action.href}
                aria-label={action.ariaLabel}
                data-testid={action.href === "/residency" ? "member-home-exchange-pill" : "member-home-search-pill"}
                className={`group relative mx-auto block w-[90%] max-w-[440px] rounded-full transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black focus-visible:ring-offset-4 focus-visible:ring-offset-[#F9F9F6] md:w-full ${index === 0 ? "-rotate-[4deg]" : "rotate-[4deg]"}`}
              >
                <img
                  src={action.image}
                  alt=""
                  aria-hidden="true"
                  className="block h-auto w-[110%] max-w-none -translate-x-[5%] drop-shadow-[0_10px_14px_rgba(0,0,0,0.22)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[12%] text-center leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                  style={{ fontFamily: "Arial, Helvetica, sans-serif", textShadow: "0 2px 4px rgba(0,0,0,0.85)" }}
                >
                  <span className="text-[clamp(1rem,2.2vw,1.5rem)] font-bold">{action.label}</span>
                  <span className="mt-1 max-w-[18rem] text-[clamp(0.68rem,1.4vw,0.95rem)] font-bold uppercase tracking-wide">{action.detail}</span>
                </span>
              </a>
            ))}
          </section>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="pending-member-home-actions">
          <a
            href="/residency?action=offer"
            className="group flex min-h-[250px] flex-col border-2 border-black bg-[#c6ff3d] p-5 shadow-[5px_5px_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_#000] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black sm:p-7"
          >
            <span className="flex items-start justify-between gap-4">
              <Repeat2 className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Exchange · while your profile is reviewed</span>
            </span>
            <h2 className="mt-10 max-w-sm text-2xl font-black uppercase leading-none tracking-[-0.03em] sm:text-3xl">
              draft a space or skill swap
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-black/70">
              This post is separate from your application and stays private until your profile is approved. Full Exchange browsing opens after approval.
            </p>
            <span className="mt-auto flex items-center gap-2 pt-5 text-[10px] font-bold uppercase tracking-widest">
              draft on Exchange <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </a>
          <a
            href="/adverts?direction=hiring"
            className="group flex min-h-[250px] flex-col border-2 border-black bg-[#ff684f] p-5 shadow-[5px_5px_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_#000] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black sm:p-7"
          >
            <span className="flex items-start justify-between gap-4">
              <ArrowRight className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Adverts · paid opportunities</span>
            </span>
            <h2 className="mt-10 max-w-sm text-2xl font-black uppercase leading-none tracking-[-0.03em] sm:text-3xl">
              post a paid opportunity
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-black/65">
              Paid gigs and other paid opportunities go on Adverts, not Exchange.
            </p>
            <span className="mt-auto flex items-center gap-2 pt-5 text-[10px] font-bold uppercase tracking-widest">
              open Adverts
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </a>
        </div>
        )}

        {isApproved && (
          <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Post on Exchange or Adverts">
            <a
              href="/residency?action=offer"
              data-testid="member-home-post-exchange"
              className="flex items-center justify-between gap-3 border-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-[#c6ff3d]"
            >
              post a space or skill swap <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
            <a
              href="/adverts?direction=hiring"
              data-testid="member-home-post-advert"
              className="flex items-center justify-between gap-3 border-2 border-black bg-[#ff684f] px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
            >
              post a paid opportunity on Adverts <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </section>
        )}

        <section
          className="mt-14 border-t-2 border-black pt-8"
          aria-labelledby="member-home-how-to-title"
          data-testid="member-home-how-to"
        >
          <div className="mb-6 max-w-2xl">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-black/50">
              the network, step by step
            </p>
            <h2
              id="member-home-how-to-title"
              className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl"
            >
              how to use countercult
            </h2>
          </div>
          <ol className="grid border-2 border-black sm:grid-cols-2">
            <li className="border-b-2 border-black p-5 sm:border-r-2 sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/45">01 · your profile</p>
              <h3 className="mt-3 text-lg font-black uppercase tracking-tight">Share what matters</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
                Share a little about your practice, what you can offer, and what you are looking for. You can update your profile later.
              </p>
            </li>
            <li className="border-b-2 border-black p-5 sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/45">02 · find your people</p>
              <h3 className="mt-3 text-lg font-black uppercase tracking-tight">Search artists and spaces</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
                {isApproved
                  ? "Search the network for artists, venues, and places that fit what you have in mind."
                  : "Once your application is approved, you can search artists and spaces across the network."}
              </p>
            </li>
            <li className="border-b-2 border-black p-5 sm:border-b-0 sm:border-r-2 sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/45">03 · the exchange</p>
              <h3 className="mt-3 text-lg font-black uppercase tracking-tight">Share a space or skill swap</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
                {isApproved
                  ? "Post or search for housing, spaces, and skill swaps on Exchange. Paid opportunities go on Adverts."
                  : "Draft a space or skill-swap post now. It stays private during review; full Exchange browsing opens after approval. Paid opportunities go on Adverts."}
              </p>
            </li>
            <li className="p-5 sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/45">04 · make it work</p>
              <h3 className="mt-3 text-lg font-black uppercase tracking-tight">Agree on the details together</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
                Before you commit, be clear with the other member about timing, costs, responsibilities, and expectations.
              </p>
            </li>
          </ol>
        </section>

      </div>
    </main>
  );
}