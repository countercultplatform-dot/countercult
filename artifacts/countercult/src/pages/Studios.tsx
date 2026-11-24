import { type FormEvent, useEffect, useState } from "react";
import { MapPin, Megaphone, Radio } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";
import { SHONA_PERSON_JSON_LD } from "@/config/siteIdentity";
import { trackEvent } from "@/lib/analytics";

const studiosEmail = "countercultplatform@gmail.com";
const studiosMailto = `mailto:${studiosEmail}?subject=Countercult%20Studios%20brief`;

const services = [
  {
    number: "01",
    title: "cultural strategy + place intelligence",
    copy: "research, mapping, local context, and a practical route from what is already there to what can be commissioned, visited, or developed.",
    icon: Megaphone,
    journal: [
      { label: "cultural strategy for places and markets", href: "/journal/cultural-strategy-shona-neary/" },
      { label: "a place page is economic infrastructure", href: "/journal/a-place-page-is-economic-infrastructure/" },
      { label: "finding local cultural operators", href: "/journal/find-local-cultural-operators-experiential-campaign/" },
    ],
  },
  {
    number: "02",
    title: "artist curation + programmes",
    copy: "the right artists, spaces, and local operators for a brief, with the roles, terms, production, and care needed to make the work real.",
    icon: Radio,
    journal: [
      { label: "Klunkerkranich paid cultural curation", href: "/journal/klunkerkranich-countercult-paid-cultural-curation/" },
      { label: "briefing local cultural operators", href: "/journal/brief-local-cultural-operators/" },
      { label: "paid artist programmes in colivings", href: "/journal/how-colivings-can-commission-artists-for-paid-creative-programmes/" },
    ],
  },
  {
    number: "03",
    title: "campaigns + experiences",
    copy: "creative direction, content, production, and distribution for work that needs a real audience, a real place, and somewhere useful to go next.",
    icon: MapPin,
    journal: [
      { label: "brand participation in Pride", href: "/journal/zalando-pride-berlin/" },
      { label: "entering Berlin’s music scene", href: "/journal/most-wanted-music-conference/" },
      { label: "from a startup brief to a curated network", href: "/journal/quouch-curated-connection-network/" },
    ],
  },
];

const supportingCapabilities = [
  "local economy + industry research",
  "art direction",
  "artist + space curation",
  "local cultural context",
  "production + commissions",
  "fabrication + build",
  "go-to-market strategy",
  "owned media + editorial formats",
  "campaign distribution + audience development",
  "freelance crew + delivery",
  "client-held local culture budgets",
];

const selectedWork = [
  {
    label: "curation + production + PR / berlin",
    title: "klunkerkranich",
    copy: "Klunkerkranich paid Countercult to curate, produce, and promote a live cultural programme. We brought the local relationships, selected the artists, shaped the format, and handled the work around the event.",
    href: "/journal/klunkerkranich-countercult-paid-cultural-curation/",
    action: "read the curation, production + PR case study",
  },
  {
    label: "paid curation, operations + production / berlin",
    title: "zalando pride",
    copy: "Zalando hired Countercult as curators, operators, and production partners for an employee Pride programme built around local creative leadership rather than surface visibility: 175+ colleagues, community members, and allies, two locally curated workshops, and 40+ participants in a one-hour format.",
    href: "/journal/zalando-pride-berlin/",
    action: "read the case study",
    proofHref: "https://www.linkedin.com/posts/zalando_insidezalando-zalandoergs-zalandopride-activity-7355963187982221314-i-EG?utm_source=share&utm_medium=member_desktop&rcm=ACoAABmnZ58BTkOQt28anEvPAVmbUgLFkIwDF0A",
    proofAction: "view public proof",
  },
  {
    label: "paid conference curation + production / berlin",
    title: "most wanted / conference in the club",
    copy: "Countercult took a music conference into a club context and made the room work: guest curation, location scouting, seating design, hospitality, music, photography, and song-led connections at Panke.",
    href: "/journal/most-wanted-music-conference/",
    action: "read the case study",
  },
  {
    label: "product strategy / audience testing",
    title: "quouch",
    copy: "For a VC-backed queer travel platform, Countercult translated an audience problem into a sharper product direction, then tested a more curated, culturally specific, connection-led network in the real world.",
    href: "/journal/quouch-curated-connection-network/",
    action: "read the case study",
  },
  {
    label: "urban cultural research / berlin",
    title: "späti raves",
    copy: "Countercult used informal corner shops as a live research environment for cultural relevance, testing how street-level activations can turn everyday urban fabric into participation and connection.",
    href: "/journal/berlin-corner-shops/",
    action: "see the Studio record",
  },
  {
    label: "employer brand / cultural strategy",
    title: "avomind",
    copy: "Countercult worked on the problem beneath employer branding: how an organisation can feel lived-in and human without borrowing a culture it has not earned.",
    href: "/journal/avomind-recruitment-firm/",
    action: "read the case study",
  },
  {
    label: "paid place development + case study / Galicia",
    title: "rural hackers + anceu",
    copy: "After the first place-based pilot, WordPress paid Countercult to return to Anceu and begin building a simpler public case study with Rural Hackers and local partners. The work shows how local context can become a usable record, not just a one-off activation.",
    href: "/journal/preserving-the-unpreserved/",
    action: "read the paid rural case study",
  },
  {
    label: "paid creative technology exchange / berlin + new york",
    title: "the delta / creative tech exchange",
    copy: "Delta paid Countercult to build a Creative Tech Exchange Day, bringing culture and technology into the same room before either side became a panel or a content asset. The work also involved The Orangerie in New York, extending the exchange across both cities.",
    href: "/journal/creative-tech-collaboration-cultural-intelligence/",
    action: "read the exchange record",
    proofHref: "https://luma.com/y55fkhe4",
    proofAction: "view event record",
  },
];

const mutualCollaborations = [
  {
    label: "StickerApp",
    detail: "manufacturing and launch support for the wider Countercult and THE FLOOR ecosystem.",
    href: "https://stickerapp.com/",
  },
  {
    label: "Berlin Pulse",
    detail: "a mutually beneficial Berlin network collaboration around cultural connection and event access.",
    href: "https://berlinpulse.co/",
  },
];

const serviceKeywords: Record<string, string[]> = {
  "01": ["place", "city", "destination", "local", "market", "research", "audience", "context", "strategy"],
  "02": ["artist", "artists", "curation", "curate", "programme", "program", "commission", "space", "culture"],
  "03": ["campaign", "launch", "brand", "experience", "content", "production", "event", "distribution"],
};

export default function Studios() {
  const [briefStatus, setBriefStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [discoveryText, setDiscoveryText] = useState("");
  const [discoverySubmitted, setDiscoverySubmitted] = useState(false);
  const [recommendedServiceNumber, setRecommendedServiceNumber] = useState<string | null>(null);
  const [scopeDraft, setScopeDraft] = useState(
    () => new URLSearchParams(window.location.search).get("scope") ?? "",
  );
  const searchParams = new URLSearchParams(window.location.search);
  const isTourismBrief = searchParams.get("route") === "tourism";
  const profileId = searchParams.get("profile") ?? "";
  const profileName = searchParams.get("profileName") ?? "";

  function trackBookingCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: "/studios/brief",
      placement,
    });
  }

  useEffect(() => {
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    const scriptId = "countercult-studios-jsonld";
    let script = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": "https://countercult.network/studios#service",
      name: "Countercult Studios",
      serviceType: [
        "Cultural infrastructure and place development",
        "Local talent sourcing and team building",
        "Creative production and physical space development",
        "Place programmes and cultural activation",
        "Operating systems for cultural places",
      ],
      description:
        "Countercult Studios builds cultural infrastructure that makes people want to be in a place. It connects property owners, brands, agencies, municipalities, and cultural partners with local artists, builders, creative and technical teams, physical spaces, programmes, and operating systems.",
      provider: { "@id": "https://countercult.network/studios#organization" },
      areaServed: ["Berlin, Germany", "New York City, United States", "Philadelphia, Pennsylvania, United States", "EU-US cross-border briefs"],
      audience: [
        { "@type": "Audience", audienceType: "Businesses and agencies" },
        { "@type": "Audience", audienceType: "Places and institutions" },
        { "@type": "Audience", audienceType: "Philanthropists and cultural funders" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Countercult Studios ways to work",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Talent sourcing and team building" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Creative production and physical spaces" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Place programmes and cultural activation" } },
        ],
      },
      about: [...services.map(({ title }) => title), ...supportingCapabilities, "Creative production agency", "Post-AI cultural infrastructure", "EU-US cross-border production"],
      employee: SHONA_PERSON_JSON_LD,
      url: "https://countercult.network/studios/brief",
    });
    return () => script?.remove();
  }, []);

  async function handleBriefSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const need = String(form.get("need") || "not_selected");
    const budget = String(form.get("budget") || "not_selected");
    const timeline = String(form.get("timeline") || "not_selected");
    const eventData = { need, budget, timeline, route: isTourismBrief ? "studios_tourism" : "studios_services", profileId };
    trackEvent("studios_brief_attempted", eventData);
    setBriefStatus("sending");

    try {
      const response = await fetch("/api/studios/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          organisation: form.get("organisation"),
          email: form.get("email"),
          location: form.get("location"),
          need: form.get("need"),
          budget: form.get("budget"),
          timeline: form.get("timeline"),
          scope: form.get("scope"),
          profile: form.get("profile"),
          company: form.get("company"),
        }),
      });
      if (!response.ok) throw new Error("brief failed");
      formElement.reset();
      setScopeDraft("");
      trackEvent("studios_brief_submitted", eventData);
      setBriefStatus("sent");
    } catch {
      trackEvent("studios_brief_failed", { route: isTourismBrief ? "studios_tourism" : "studios_services", reason: "request_error" });
      setBriefStatus("error");
    }
  }

  function handleDiscoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const words = discoveryText.toLowerCase();
    const ranked = services
      .map((service) => ({
        number: service.number,
        score: (serviceKeywords[service.number] ?? []).reduce(
          (score, keyword) => score + (words.includes(keyword) ? 1 : 0),
          0,
        ),
      }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    setRecommendedServiceNumber(best && best.score > 0 ? best.number : null);
    setDiscoverySubmitted(true);
    trackEvent("studios_discovery_submitted", {
      route: isTourismBrief ? "studios_tourism" : "studios_services",
      recommended_service: best && best.score > 0 ? best.number : "all",
    });
  }

  function carryDiscoveryToBrief() {
    setScopeDraft(discoveryText.trim());
    document.getElementById("brief")?.scrollIntoView({ behavior: "smooth" });
  }

  const recommendedService = services.find(({ number }) => number === recommendedServiceNumber);

  return (
    <div className="studios-route-page min-h-[100dvh] overflow-x-hidden bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult / studios / services</span>
          </a>
          <nav className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] sm:gap-7">
            <WorkWithUsMenu />
            <a href="/about" className="hidden hover:text-black/50 sm:inline">about</a>
            <a href="/explore" className="hover:text-black/50">search for culture</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl">
         <section className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
           <div className="max-w-6xl">
             <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-black/45">countercult studios / paid cultural delivery</p>
             <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">artist-founded · Berlin + New York · working internationally</p>
             <h1 className="max-w-6xl text-5xl font-black uppercase leading-[0.87] tracking-[-0.07em] sm:text-7xl lg:text-[7.2rem]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
               cultural strategy,<br />curation + delivery.
             </h1>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
                We build cultural infrastructure that makes people want to be in a place: the artists and builders to run your network, the crews to build your space, and the systems to operate it. We work with property owners, brands, agencies, municipalities, and cultural partners to bring local talent, physical places, and cultural programmes together.
             </p>
             <div className="mt-8 flex flex-wrap gap-3">
                <a href={studiosMailto} onClick={() => trackBookingCta("hero")} className="border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">email the brief ↗</a>
               <a href="#work" className="border-2 border-black bg-transparent px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-black hover:text-white">see the work ↓</a>
               <a href={`${import.meta.env.BASE_URL}studios/start`} className="border-2 border-black bg-transparent px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-[#c6ff3d]">choose another route →</a>
             </div>
           </div>
         </section>

          <section id="studios-discovery" aria-labelledby="studios-discovery-title" className="border-b-2 border-black bg-[#c6ff3d] px-4 pb-12 pt-32 sm:px-8 sm:pb-16 sm:pt-32">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em]">find a useful starting point</p>
                <h2 id="studios-discovery-title" className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                  what are you<br />trying to make<br />happen?
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-black/70 sm:text-base">
                  Describe the place, people, challenge, or result. We’ll suggest a relevant Studios route and useful reading. This is a starting point, not an automated proposal.
                </p>
              </div>

              <div className="border-2 border-black bg-[#F9F9F6]">
                <div className="flex items-center justify-between gap-4 border-b-2 border-black bg-black px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c6ff3d]">
                  <span>countercult studios / brief finder</span>
                  <span aria-hidden="true">● ● ●</span>
                </div>
                <form onSubmit={handleDiscoverySubmit} className="p-4 sm:p-6">
                  <label htmlFor="studios-discovery-input" className="mb-3 block text-[10px] font-bold uppercase tracking-[0.12em]">
                    what needs to happen, and where?
                  </label>
                  <textarea
                    id="studios-discovery-input"
                    value={discoveryText}
                    onChange={(event) => {
                      setDiscoveryText(event.target.value);
                      setDiscoverySubmitted(false);
                    }}
                    required
                    maxLength={1800}
                    rows={4}
                    placeholder="For example: we need to connect a new Berlin space with local artists and build a public programme."
                    className="w-full resize-y border-2 border-black bg-white px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-black/35 focus:bg-[#f4ffe0]"
                    data-testid="input-studios-discovery"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-black/50">Your note stays in this page until you add it to a brief.</span>
                    <button type="submit" className="border-2 border-black bg-black px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black" data-testid="button-studios-discovery">
                      find a route →
                    </button>
                  </div>
                </form>

                {discoverySubmitted && (
                  <div className="border-t-2 border-black bg-white p-4 sm:p-6" aria-live="polite" data-testid="studios-discovery-result">
                    {recommendedService ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">a useful place to start / {recommendedService.number}</p>
                        <h3 className="mt-2 text-2xl font-black uppercase leading-tight tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{recommendedService.title}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70">{recommendedService.copy}</p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                          {recommendedService.journal.map((article) => (
                            <a key={article.href} href={article.href} className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-[#c6ff3d]">{article.label} →</a>
                          ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={carryDiscoveryToBrief} className="border-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] hover:bg-black hover:text-[#c6ff3d]">
                            use this in a brief ↓
                          </button>
                          <a href="#work" className="border-2 border-black px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] hover:bg-black hover:text-white">see all services</a>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">choose a useful place to start</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {services.map((service) => (
                            <a key={service.number} href="#work" className="border-2 border-black p-4 transition-colors hover:bg-[#c6ff3d]">
                              <span className="text-[10px] font-bold">{service.number}</span>
                              <span className="mt-3 block text-sm font-black uppercase leading-tight">{service.title}</span>
                              <span className="mt-3 block text-xs leading-relaxed text-black/60">{service.copy}</span>
                            </a>
                          ))}
                        </div>
                        <button type="button" onClick={carryDiscoveryToBrief} className="mt-4 border-2 border-black bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] hover:bg-black hover:text-[#c6ff3d]">
                          use this in a brief ↓
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

        <section className="grid gap-8 border-b-2 border-black bg-black px-4 py-12 text-white sm:px-8 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c6ff3d]">how the work moves</p>
            <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-[#c6ff3d] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              context<br />before<br />content.
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              You bring the brief. We understand the place, people, and pressure around it, then find the right cultural workers, make the work, put it in the right channels, and leave a record that can support the next move.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "understand", "local context, audience, constraints, and the actual need"],
                ["02", "assemble", "artists, spaces, operators, partners, production, and terms"],
                ["03", "deliver", "the programme, campaign, experience, archive, or next brief"],
              ].map(([number, title, copy]) => (
                <div key={number} className="border-2 border-white/35 p-4">
                  <p className="text-[10px] font-black text-[#c6ff3d]">{number}</p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em]">{title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-14 sm:px-8 sm:py-20" aria-labelledby="finance-studios-heading">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">route 04 / countercult fund</p>
              <h2 id="finance-studios-heading" className="max-w-xl text-4xl font-black uppercase leading-[0.86] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                can’t see the<br />budget yet?
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-relaxed text-black/75 sm:text-lg">
                we help you find the right route into one. The Fund is the financial layer. Studios is the delivery layer. Together they connect a business, place, or institution to local cultural context, a defined budget, the right creative workers, and work that can actually be made.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["the Fund", "transaction-linked budgets that accumulate toward a useful benchmark."],
                  ["the match", "artists, photographers, writers, DJs, producers, and local operators selected for the brief."],
                  ["the delivery", "creative direction, production, reporting, and evidence that the budget became paid work."],
                ].map(([title, copy]) => (
                  <div key={title} className="border-2 border-black bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em]">{title}</p>
                    <p className="mt-3 text-xs leading-relaxed text-black/70">{copy}</p>
                  </div>
                ))}
              </div>
              <a href="/fund" className="mt-7 inline-flex border-2 border-black bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black">
                countercult fund →
              </a>
            </div>
          </div>
        </section>

        <section id="work" className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div className="mb-8 flex items-end justify-between gap-5">
               <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">what you hire us for</p><h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>strategy, curation<br />+ delivery.</h2></div>
            <a href="/journal/" className="hidden text-[10px] font-bold uppercase tracking-[0.15em] underline decoration-2 underline-offset-4 sm:block">read the thinking →</a>
          </div>
          <div className="divide-y-2 divide-black border-y-2 border-black">
             {services.map(({ number, title, copy, icon: Icon, journal }) => (
              <details key={number} className="group">
                 <summary className="grid cursor-pointer list-none gap-4 py-6 outline-none transition-colors hover:bg-[#c6ff3d] focus-visible:bg-[#c6ff3d] sm:grid-cols-[3rem_1fr] sm:gap-8">
                  <span className="text-[10px] font-bold text-black/40">{number}</span>
                   <div className="max-w-4xl">
                     <div className="flex items-start gap-4">
                       <Icon className="mt-0.5 h-7 w-7 shrink-0 stroke-[1.5]" aria-hidden="true" />
                       <h3 className="text-2xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h3>
                     </div>
                     <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">{copy}</p>
                   </div>
                </summary>
                <div className="grid gap-5 border-t-2 border-black bg-white px-4 py-5 sm:grid-cols-[3rem_1fr_1fr] sm:gap-8 sm:pl-[5rem]">
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">supporting reading</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      {journal.map((article) => (
                        <a key={article.href} href={article.href} className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-[#c6ff3d]">
                          {article.label} →
                        </a>
                      ))}
                    </div>
           <div className="mt-8 grid gap-4 border-2 border-black bg-[#c6ff3d] p-5 sm:grid-cols-[.8fr_1.2fr] sm:p-7">
             <div>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em]">the supporting capabilities</p>
                 <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/70">we direct it, curate it, build it, and get people there.</p>
             </div>
             <div className="flex flex-wrap content-start gap-2">
               {supportingCapabilities.map((capability) => (
                 <span key={capability} className="border-2 border-black bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em]">{capability}</span>
               ))}
             </div>
           </div>
                  </div>
                   <a href="#brief" onClick={() => trackBookingCta(`service_${title}`)} className="self-end border-2 border-black bg-[#c6ff3d] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-black hover:text-[#c6ff3d]">
                    start this project ↓
                  </a>
                </div>
              </details>
            ))}
          </div>
        </section>

         <section className="border-b-2 border-black bg-white px-4 py-14 sm:px-8 sm:py-20">
           <div className="mb-8 max-w-4xl">
             <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">case studies / selected work</p>
             <h2 className="text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>the work has<br />a record.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-black/60 sm:text-base">named partners, real briefs, and documented work across curation, campaigns, product direction, and place development. read the proof, not just the promise.</p>
           </div>
           <div className="grid gap-3 md:grid-cols-2">
              {selectedWork.map((work) => (
                <article key={work.title} className="flex min-h-[250px] flex-col justify-between border-2 border-black bg-[#F9F9F6] p-5 sm:p-6">
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">{work.label}</p>
                   <h3 className="mt-10 text-3xl font-black uppercase leading-[0.9] tracking-[-0.05em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{work.title}</h3>
                   <p className="mt-4 text-sm leading-relaxed text-black/65">{work.copy}</p>
                 </div>
                 <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                   <a href={work.href} className="self-start text-[10px] font-bold uppercase tracking-[0.16em] underline decoration-2 underline-offset-4 hover:bg-[#c6ff3d]">{work.action} ↗</a>
                   {work.proofHref && (
                     <a href={work.proofHref} target="_blank" rel="noopener noreferrer" className="self-start text-[10px] font-bold uppercase tracking-[0.16em] text-black/55 underline decoration-2 underline-offset-4 hover:bg-[#c6ff3d] hover:text-black">
                       {work.proofAction} ↗
                     </a>
                   )}
                 </div>
               </article>
             ))}
           </div>
         </section>

        <section className="border-b-2 border-black bg-[#F9F9F6] px-4 py-10 sm:px-8 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">mutual collaborations</p>
              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                partnerships<br />make the<br />work wider.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
                StickerApp and Berlin Pulse have helped Countercult make things, reach people, and build relationships across the wider cultural world. Their manufacturing, launch support, cultural connection, and event access have strengthened the work around Countercult and THE FLOOR.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {mutualCollaborations.map((collaboration) => (
                  <a
                    key={collaboration.label}
                    href={collaboration.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border-2 border-black bg-white p-4 transition-colors hover:bg-[#c6ff3d]"
                  >
                    <p className="text-xl font-black uppercase tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{collaboration.label}</p>
                    <p className="mt-3 text-xs leading-relaxed text-black/65">{collaboration.detail}</p>
                    <span className="mt-5 block text-[10px] font-bold uppercase tracking-[0.16em]">partner record ↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-black px-4 py-10 text-white sm:px-8 sm:py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
           <div className="max-w-2xl">
             <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c6ff3d]">the source practice</p>
              <p className="text-base leading-relaxed text-white/75 sm:text-lg">Sketchy Shona is building a world that people like them can recognise themselves in, through recurring images, rooms, objects, and a visual language with its own rules. That artist practice is the source of the cultural intelligence and material thinking. Countercult is the network and economic infrastructure. Studios is the paid delivery arm.</p>
           </div>
           <div className="flex shrink-0 flex-wrap gap-3">
             <a href="https://countercult.network/sketchyshona/" target="_blank" rel="noopener noreferrer" className="border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white">visit Sketchy Shona ↗</a>
             <a href="https://www.linkedin.com/in/shona-neary-aa7182100" target="_blank" rel="noopener noreferrer" className="border-2 border-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black">connect with Shona ↗</a>
           </div>
          </div>
        </section>

        <section id="brief" className="border-b-2 border-black bg-[#c6ff3d] px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
            <div>
               <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em]">{isTourismBrief ? "for place + tourism work" : "for work that needs to happen"}</p>
                <h2 className="max-w-lg text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>got a campaign,<br />content series,<br />or experience?</h2>
                 <p className="mt-6 max-w-md text-sm leading-relaxed text-black/70">{profileName ? `you are starting a brief around ${profileName}. ` : ""}{isTourismBrief ? "tell us what is happening, who you want to reach, and what needs to change." : "tell us what you are making, where it is, who it needs to reach, and what you can spend."}</p>
                 <p className="mt-5 max-w-md border-l-2 border-black/30 pl-4 text-xs leading-relaxed text-black/65">
                   The form sends to <strong>{studiosEmail}</strong> when the mail service is active. Prefer the direct route?{" "}
                   <a href={studiosMailto} className="font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-[#c6ff3d]">open your email app</a>.
                 </p>
              {briefStatus === "sent" && <p aria-live="polite" className="mt-6 border-2 border-black bg-white p-4 text-xs font-bold uppercase leading-relaxed">brief received. Shona will reply directly. no mail app required.</p>}
              {briefStatus === "error" && <p aria-live="polite" className="mt-6 border-2 border-black bg-[#ffb3b3] p-4 text-xs font-bold uppercase leading-relaxed">we couldn’t send that just now. please try again or email {studiosEmail}.</p>}
            </div>
            <form onSubmit={handleBriefSubmit} className="grid gap-4 border-2 border-black bg-[#F9F9F6] p-5 sm:grid-cols-2 sm:p-7">
              <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <input name="profile" type="hidden" value={profileId} readOnly />
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">your name<input required name="name" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]" /></label>
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">organisation<input required name="organisation" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]" /></label>
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">email<input required type="email" name="email" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]" /></label>
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">location<input required name="location" placeholder="city / country" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none placeholder:text-black/35 focus:bg-[#c6ff3d]" /></label>
                <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">what do you need?<select required name="need" defaultValue="" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]"><option value="" disabled>select one</option><option>campaign or launch</option><option>content or editorial format</option><option>experience or programme</option><option>artist curation or art direction</option><option>production or fabrication</option><option>go-to-market</option><option>not sure yet</option></select></label>
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">{isTourismBrief ? "budget / available resources · optional if not set yet" : "working budget / full projects usually start at €10,000"}<select required name="budget" defaultValue="" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]"><option value="" disabled>select one</option>{isTourismBrief ? <><option>not set yet, help us scope it</option><option>under €10,000 / early-stage or focused scope</option></> : <option>under €10,000 / focused scope</option>}<option>€10,000–€15,000</option><option>€15,000–€30,000</option><option>€30,000+</option>{!isTourismBrief && <option>not set yet</option>}</select></label>
              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">when does it need to happen?<select required name="timeline" defaultValue="" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none focus:bg-[#c6ff3d]"><option value="" disabled>select one</option><option>within 4 weeks</option><option>1–3 months</option><option>3–6 months</option><option>6+ months</option><option>flexible</option></select></label>
                 <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">what should we know about the scope?<textarea required name="scope" rows={4} value={scopeDraft} onChange={(event) => setScopeDraft(event.target.value)} placeholder="what are you making, for whom, and what would make it useful?" className="border-2 border-black bg-white px-3 py-3 text-sm font-normal normal-case outline-none placeholder:text-black/35 focus:bg-[#c6ff3d] sm:col-span-2" /></label>
               <button type="submit" disabled={briefStatus === "sending"} className="border-2 border-black bg-black px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{briefStatus === "sending" ? "sending..." : "send through the website →"}</button>
            </form>
          </div>
        </section>

        <section className="px-4 py-14 text-center sm:px-8 sm:py-20">
           <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">countercult studios</p>
            <h2 className="mx-auto max-w-3xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>ready to make<br />something real?</h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-black/60">tell us what you are making, where, and what you can spend.</p>
            <a href="#brief" onClick={() => trackBookingCta("closing")} className="mt-8 inline-flex border-2 border-black bg-[#c6ff3d] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-black hover:text-[#c6ff3d]">work with us ↓</a>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}