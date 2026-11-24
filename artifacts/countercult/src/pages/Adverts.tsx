import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { ExchangeBoardTabs } from "@/components/ExchangeBoardTabs";
import { OptionalPatronPostSupportStep } from "@/components/OptionalPatronPostSupportStep";

type Advert = {
  id: number;
  tier: "free" | "community" | "commercial";
  direction: "service" | "hiring" | "open_call";
  posterName: string;
  city: string;
  title: string;
  rate: string | null;
  description: string;
  contact: string | null;
  createdAt: string;
  expiresAt: string;
};

type AdvertBoardFilter = "all" | Advert["direction"];

const advertFilters: { value: AdvertBoardFilter; label: string }[] = [
  { value: "all", label: "All adverts" },
  { value: "open_call", label: "Open calls" },
  { value: "hiring", label: "Paid gigs & opportunities" },
  { value: "service", label: "Services offered" },
];

const inputClass = "w-full border-b-2 border-black/20 bg-transparent px-1 py-3 text-sm text-black placeholder:text-black/35 focus:border-black focus:outline-none";

function getContactHref(contact: string) {
  if (contact.startsWith("/") && !contact.startsWith("//")) return contact;
  if (/^https?:\/\//i.test(contact)) return contact;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return `mailto:${contact}`;
  if (/^\+?[\d()\-\s]{7,}$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, "")}`;
  if (/^@[a-z0-9._]{1,30}$/i.test(contact)) return `https://instagram.com/${contact.slice(1)}`;
  return null;
}

function formatAdvertDate(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(dateString));
}

export default function Adverts() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [boardFilter, setBoardFilter] = useState<AdvertBoardFilter>("all");
  const [direction, setDirection] = useState<Advert["direction"]>(() =>
    (["service", "hiring", "open_call"] as const).includes(
      new URLSearchParams(window.location.search).get("direction") as Advert["direction"],
    )
      ? new URLSearchParams(window.location.search).get("direction") as Advert["direction"]
      : "service",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [supportStepOpen, setSupportStepOpen] = useState(false);
  const [pendingAdvert, setPendingAdvert] = useState<(Record<string, string> & { direction: Advert["direction"] }) | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const visibleAdverts = boardFilter === "all"
    ? adverts
    : adverts.filter((advert) => advert.direction === boardFilter);

  const loadAdverts = useCallback(async () => {
    try {
      const response = await fetch("/api/adverts", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load adverts.");
      setAdverts(await response.json() as Advert[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load adverts.");
    }
  }, []);

  useEffect(() => { void loadAdverts(); }, [loadAdverts]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    setPendingAdvert({ ...payload, direction });
    setSupportStepOpen(true);
  };

  const publishPendingAdvert = async () => {
    if (!pendingAdvert || busy) return;
    setBusy(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/adverts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingAdvert),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not publish your advert.");
      const appearsOnExchange = pendingAdvert.direction === "hiring" && /[1-9]/.test(pendingAdvert.rate ?? "");
      formRef.current?.reset();
      setPendingAdvert(null);
      setSupportStepOpen(false);
      setStatusMessage(appearsOnExchange
        ? "Your paid advert is live on Adverts and Exchange. It will expire automatically after 14 days."
        : "Your advert is live on Adverts. It will expire automatically after 14 days.");
      await loadAdverts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not publish your advert.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f5f0] text-black" style={{ fontFamily: "Arial, sans-serif" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/15 bg-[#f6f5f0]/95 px-4 py-4 sm:px-8">
        <a href="/residency" className="text-xs font-bold uppercase tracking-widest hover:underline">Countercult boards</a>
        <span className="text-xs font-black uppercase tracking-[0.2em]">Countercult</span>
      </header>
      <ExchangeBoardTabs active="adverts" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(19rem,0.72fr)_minmax(0,1.28fr)] lg:gap-14 lg:py-16">
        <section>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-black/55">Exchange · Adverts</p>
          <h1 className="max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">Adverts</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/70">A board for services, paid gigs, open calls, and collaborations across the Countercult network. Every advert says whether you are offering a service or inviting applications.</p>
          {statusMessage && (
            <div className="mt-6 border-2 border-black bg-[#c6ff3d] p-4">
              <p role="status" className="text-sm font-bold">{statusMessage}</p>
              <div className="mt-4 border-t border-black/25 pt-4">
                <p className="text-sm font-bold">Would you also consider joining Countercult’s mail?</p>
                <p className="mt-1 text-xs leading-relaxed">Patron Post helps fund the Countercult Network and keeps its resources free to access.</p>
                <a href="/snail" className="mt-3 inline-flex min-h-10 items-center border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#c6ff3d] hover:bg-white hover:text-black">
                  See Patron Post <ArrowUpRight size={14} className="ml-2" />
                </a>
              </div>
            </div>
          )}
          {supportStepOpen && (
            <div className="mt-9">
              <OptionalPatronPostSupportStep
                onPublishForFree={() => void publishPendingAdvert()}
                onBack={() => {
                  setError("");
                  setSupportStepOpen(false);
                }}
                isPublishing={busy}
                error={error}
              />
            </div>
          )}
          <form
            ref={formRef}
            onSubmit={(event) => submit(event)}
            hidden={supportStepOpen}
            aria-hidden={supportStepOpen}
            className={`mt-9 border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:p-7 ${supportStepOpen ? "hidden" : ""}`}
          >
            <h2 className="text-lg font-black uppercase">Post an advert</h2>
            <p className="mt-3 border-2 border-black bg-[#c6ff3d] p-3 text-xs font-black uppercase">Posting is free</p>
            <fieldset className="mt-5">
              <legend className="text-[10px] font-black uppercase tracking-widest">What are you doing?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  ["service", "Offering my services"],
                  ["hiring", "Hiring / inviting applications"],
                  ["open_call", "Open call"],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setDirection(value)} aria-pressed={direction === value} className={`border-2 px-3 py-2 text-[10px] font-black uppercase tracking-wide ${direction === value ? "border-black bg-black text-[#c6ff3d]" : "border-black/20 bg-white"}`}>{label}</button>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-x-5 sm:grid-cols-2">
              <input className={inputClass} name="posterName" placeholder="Your name" required maxLength={100} />
              <input className={inputClass} name="posterEmail" type="email" placeholder="Your email address" required maxLength={254} />
              <input className={inputClass} name="city" placeholder="City" required maxLength={100} />
               <input className={inputClass} name="title" placeholder={direction === "service" ? "Service or offer" : direction === "open_call" ? "Open call title" : "Paid gig or collaboration"} required maxLength={120} />
              {direction === "hiring" && (
                <div className="sm:col-span-2">
                  <input className={inputClass} name="rate" placeholder="Rate or budget, for example €250 flat or €35/hour" maxLength={120} />
                  <p className="mt-1 text-[10px] leading-relaxed text-black/55">Optional. Paid gigs with a stated amount also appear in Exchange’s Paid gigs filter.</p>
                </div>
              )}
              <textarea className={`${inputClass} min-h-28 resize-y sm:col-span-2`} name="description" placeholder="Describe the work, terms, budget, or service clearly." required minLength={10} maxLength={4000} />
              <input className={`${inputClass} sm:col-span-2`} name="contact" placeholder="Public email, phone number, or full link" required maxLength={300} />
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="mt-6 w-full border-2 border-black bg-black px-4 py-4 text-xs font-black uppercase tracking-widest text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black disabled:opacity-50">
              {busy ? "Publishing advert…" : "Continue to posting options"}
            </button>
            <p className="mt-3 text-[10px] leading-relaxed text-black/55">Posting is free. Monthly Patron Post membership is optional and supports the publication and Countercult Network.</p>
          </form>
        </section>
        <section>
            <div className="flex items-end justify-between border-b-2 border-black pb-4">
             <div><p className="text-[10px] font-black uppercase tracking-widest text-black/55">Open board</p><h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">Current adverts</h2></div>
            <button onClick={() => void loadAdverts()} className="text-[10px] font-black uppercase underline">refresh</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter adverts by type">
            {advertFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={boardFilter === filter.value}
                onClick={() => setBoardFilter(filter.value)}
                className={`min-h-10 border-2 px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors ${
                  boardFilter === filter.value
                    ? "border-black bg-black text-[#c6ff3d]"
                    : "border-black/25 bg-white text-black hover:border-black"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="mt-3 border-l-4 border-[#ff684f] pl-3 text-xs font-bold leading-relaxed">Each advert stays live for 14 days, then expires automatically.</p>
          {visibleAdverts.length === 0 ? (
            <p className="mt-5 border border-black/20 bg-white p-5 text-sm text-black/60">
              {adverts.length === 0 ? "No adverts have been published yet." : "No adverts in this category yet."}
            </p>
          ) : (
            <div className="mt-6 grid gap-6">
              {visibleAdverts.map((advert) => (
                <article key={advert.id} className="adverts-listing-card relative border-2 border-black bg-white shadow-[4px_4px_0_#000] transition-[transform,box-shadow] duration-200 ease-out">
                  <div className={`flex flex-wrap items-center justify-between gap-3 border-b-2 border-black px-5 py-4 sm:px-6 ${advert.tier === "commercial" ? "bg-[#ffc5a8]" : "bg-[#c6ff3d]"}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest sm:text-[11px]">{advert.direction === "service" ? "Offering services" : advert.direction === "open_call" ? "Open call" : "Hiring / paying"} · {advert.tier === "free" ? "Free" : advert.tier}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide sm:text-[11px]">{advert.city}</span>
                  </div>
                  <div className="p-5 sm:p-6 lg:p-7">
                    <h3 className="text-xl font-black uppercase leading-tight sm:text-2xl">{advert.title}</h3>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-black/55 sm:text-[11px]">by {advert.posterName}</p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                      <span>Posted {formatAdvertDate(advert.createdAt)}</span>
                      <span className="text-black">Expires {formatAdvertDate(advert.expiresAt)}</span>
                    </p>
                    {advert.rate && <p className="mt-4 inline-flex border-2 border-black bg-[#c6ff3d] px-3 py-2 text-xs font-black uppercase">Rate / budget: {advert.rate}</p>}
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 sm:text-base">{advert.description}</p>
                    {advert.contact && getContactHref(advert.contact) && <a href={getContactHref(advert.contact)!} target={/^https?:\/\//i.test(advert.contact) ? "_blank" : undefined} rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase underline underline-offset-4">{advert.contact === "/art-houses" ? "Read the full call and apply" : "Contact"} <ArrowUpRight size={14} /></a>}
                    {advert.contact && !getContactHref(advert.contact) && <p className="mt-6 text-sm font-bold">Contact: {advert.contact}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
