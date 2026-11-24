import { useEffect, useRef, useState } from "react";
import { Building2, Landmark, Palette, Users, Wallet, Wrench } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { trackEvent } from "@/lib/analytics";

const studiosProjectHref = "mailto:countercultplatform@gmail.com?subject=Countercult%20Studios%20project";
const cultureBudgetHref = "mailto:countercultplatform@gmail.com?subject=Countercult%20Studios%20Fund%20pilot";
const countercultLinkedInHref = "https://www.linkedin.com/company/countercult-studios/";
const studiosNames = [
  "Klunkerkranich", "Späti Raves", "Anceu + Rural Hackers", "The Delta",
  "FOMO Berlin", "EXPERIMENT Residency", "Quouch",
  "Production agencies", "Marketing agencies", "Recruitment agencies", "THE FLOOR",
];
function renderStudiosNameGroup(group: string, linkFloorCall = false) {
  return studiosNames.map((name, index) => (
    <span key={`${group}-${name}-${index}`}>
      {name === "THE FLOOR"
        ? linkFloorCall ? <a href="/the-floor">THE FLOOR open call</a> : "THE FLOOR open call"
        : name}
      <i aria-hidden="true">✳</i>
    </span>
  ));
}
const studiosHeadlineLines = [
  "(cult)ural infrastructure",
  "that makes people",
  "want to be in a place.",
];
const studiosHeadline = studiosHeadlineLines.join(" ");
const selectedWork = [
  {
    label: "employer experience + curation / Berlin",
    title: "AVOMIND / StickerApp",
    copy: "An employer-brand experience produced and curated through Countercult’s local creative network, grounded in Berlin culture.",
    href: "https://countercult.network/shona-neary-portfolio/journal/avomind-employer-experience/",
    image: `${import.meta.env.BASE_URL}images/case-studies/avomind-stickerapp.jpg`,
    imageAlt: "Photo documentation from the AVOMIND and StickerApp creative experience",
  },
  {
    label: "creative direction + curation / Berlin",
    title: "Zalando Pride",
    copy: "A Berlin Pride programme shaped with the company’s LGBTQIA+ employee resource group, bringing creative direction, production, and curation together.",
    href: "/journal/zalando-pride-berlin/",
    image: `${import.meta.env.BASE_URL}images/case-studies/zalando-pride.jpg`,
    imageAlt: "Zalando Pride programme and workshop documentation in Berlin",
  },
  {
    label: "creative direction + live production / Europe",
    title: "Whole Festival",
    copy: "The Beach Stage was co-created with lead creative director Eva Garland, combining design, production, on-site installation, and painting.",
    href: "https://countercult.network/shona-neary-portfolio/journal/whole-festival-beach-stage/",
    image: "https://countercult.network/shona-neary-portfolio/work/previews/whole-festival/page-01.jpg",
    imageAlt: "Whole Festival Beach Stage image record",
  },
  {
    label: "curation + experience / Berlin",
    title: "Klunkerkranich",
    copy: "A commissioned cultural programme with local artists at the Berlin rooftop venue, developed through Countercult’s creative direction and curation.",
    href: "https://countercult.network/shona-neary-portfolio/journal/klunkerkranich-experience-production/",
    image: `${import.meta.env.BASE_URL}images/studios-cases/klunker-session.webp`,
    imageAlt: "Guests taking part in a creative session at Klunkerkranich",
  },
  {
    label: "neighbourhood culture / Berlin",
    title: "Späti Raves",
    copy: "Street-level experiences rooted in Berlin corner shops and the communities around them, shaped through Countercult’s curation and production.",
    href: "https://countercult.network/shona-neary-portfolio/journal/spati-raves-berlin/",
    image: `${import.meta.env.BASE_URL}images/studios-cases/spati-shop-portrait.webp`,
    imageAlt: "A guest standing in front of the drinks fridges at a Berlin Späti",
  },
  {
    label: "place partnership / Galicia",
    title: "Anceu + Rural Hackers",
    copy: "Place-based work with local partners and artists. An artist residency here is a future plan, not a completed project.",
    href: "/journal/preserving-the-unpreserved/",
    image: `${import.meta.env.BASE_URL}images/studios-cases/anceu-mural-workshop.webp`,
    imageAlt: "A group of people working together in the Anceu mural space",
  },
  {
    label: "creative technology + business",
    title: "The Delta",
    copy: "A curated gathering connecting culture, technology, and venture capital, produced through Countercult.",
    href: "https://countercult.network/shona-neary-portfolio/journal/the-delta-creative-tech-business-day/",
    image: `${import.meta.env.BASE_URL}images/studios-cases/delta-sign.webp`,
    imageAlt: "The Delta Creative x Tech Exchange Day sign",
  },
  {
    label: "local talent + production / Berlin",
    title: "FOMO Berlin × Lynk & Co",
    copy: "Countercult connected local talent with a Lynk & Co production in Berlin.",
    href: "/journal/fomo-berlin-local-talent/",
    image: `${import.meta.env.BASE_URL}images/fomo-local-talent.webp`,
    imageAlt: "Local creative talent meeting at a Berlin venue",
  },
  {
    label: "artist residency / Vietnam + Berlin",
    title: "EXPERIMENT Residency / Da Nang + Berlin",
    copy: "Countercult co-founded and led artist residencies in Da Nang and Berlin, built around local relationships and shared creative work.",
    href: "/journal/one-month-in-da-nang-experiment-residency/",
    image: `${import.meta.env.BASE_URL}images/experiment-residency/local-mural.webp`,
    imageAlt: "Artist standing in front of a mural made during EXPERIMENT Residency in Da Nang",
  },
  {
    label: "product + connection / global",
    title: "Quouch",
    copy: "Product and experience strategy for a more intentional queer travel network, shaped through Countercult’s cultural perspective.",
    href: "https://countercult.network/shona-neary-portfolio/journal/quouch-curated-connection/",
    image: `${import.meta.env.BASE_URL}images/studios-cases/quouch-community.webp`,
    imageAlt: "Members of the Quouch community together",
  },
  {
    label: "artist-owned cultural programme / Berlin",
    title: "THE FLOOR",
    copy: "An artist-owned Berlin cultural concept and coliving programme, developed independently from Countercult Studios. An adjacent example of how art, shared life, and place can inform one another, not a Countercult client project.",
    href: "/the-floor",
    image: `${import.meta.env.BASE_URL}images/the-floor/the-floor-open-call.webp`,
    imageAlt: "THE FLOOR artist-run Berlin coliving and residency programme",
  },
];

export default function StudiosForYou() {
  const [headlineHovered, setHeadlineHovered] = useState(false);
  const [keepInTouchOpen, setKeepInTouchOpen] = useState(false);
  const [caseStudiesOpen, setCaseStudiesOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const caseStudiesToggleRef = useRef<HTMLButtonElement | null>(null);
  const caseStudiesCloseRef = useRef<HTMLButtonElement | null>(null);

  function trackBookingCta(placement: string) {
    trackEvent("studios_cta_clicked", {
      source_route: "/studios",
      placement,
    });
  }

  async function playHoverSound(letter: string) {
    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    audioContextRef.current ??= new AudioContextConstructor();
    const context = audioContextRef.current;
    if (context.state !== "running") {
      try {
        await context.resume();
      } catch {
        return;
      }
    }
    if (context.state !== "running") return;
    const letterIndex = Math.max(0, letter.toLowerCase().charCodeAt(0) - 97);
    const startFrequency = 220 * 2 ** (letterIndex / 12);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2800, context.currentTime);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.1, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
    filter.connect(envelope);
    envelope.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(startFrequency * 1.12, context.currentTime + 0.1);
    oscillator.connect(filter);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
  }

  useEffect(() => {
    const unlockAudio = () => {
      const AudioContextConstructor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      audioContextRef.current ??= new AudioContextConstructor();
      const context = audioContextRef.current;
      if (context.state !== "running") {
        void context.resume().then(() => playHoverSound("c")).catch(() => {});
      } else {
        void playHoverSound("c");
      }
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
    } else {
      window.scrollTo(0, 0);
    }
    const title = "Countercult Studios | Property Technology, Experiences + Connection";
    document.title = title;
    const description = "Countercult Studios builds cultural infrastructure by connecting local people, physical production, and operating systems, with paid projects today and longer-term place and property ambitions.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    const socialTags = [
      { selector: 'meta[property="og:title"]', attribute: "property", name: "og:title", content: title },
      { selector: 'meta[property="og:description"]', attribute: "property", name: "og:description", content: description },
      { selector: 'meta[property="og:url"]', attribute: "property", name: "og:url", content: "https://countercult.network/studios" },
      { selector: 'meta[property="og:type"]', attribute: "property", name: "og:type", content: "website" },
      { selector: 'meta[property="og:image"]', attribute: "property", name: "og:image", content: "https://countercult.network/images/studios-local-context.webp" },
      { selector: 'meta[name="twitter:card"]', attribute: "name", name: "twitter:card", content: "summary_large_image" },
      { selector: 'meta[name="twitter:title"]', attribute: "name", name: "twitter:title", content: title },
      { selector: 'meta[name="twitter:description"]', attribute: "name", name: "twitter:description", content: description },
      { selector: 'meta[name="twitter:image"]', attribute: "name", name: "twitter:image", content: "https://countercult.network/images/studios-local-context.webp" },
    ];
    for (const tag of socialTags) {
      let element = document.head.querySelector<HTMLMetaElement>(tag.selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(tag.attribute, tag.name);
        document.head.appendChild(element);
      }
      element.content = tag.content;
    }
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://countercult.network/studios";

    const serviceScriptId = "countercult-studios-property-technology-jsonld";
    let serviceScript = document.head.querySelector<HTMLScriptElement>(`#${serviceScriptId}`);
    if (!serviceScript) {
      serviceScript = document.createElement("script");
      serviceScript.id = serviceScriptId;
      serviceScript.type = "application/ld+json";
      document.head.appendChild(serviceScript);
    }
    serviceScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://countercult.network/studios#property-technology",
      name: "Countercult property technology for experiences and connection",
      description,
      url: "https://countercult.network/studios",
      about: ["Property technology", "Experiences", "Local culture", "Connection between people and places"],
    });

    return () => {
      serviceScript?.remove();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const storageKey = "countercult-studios-keep-in-touch-shown";
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // Storage may be unavailable; still show the prompt for this visit.
    }
    const timer = window.setTimeout(() => {
      setKeepInTouchOpen(true);
      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // The close button and Escape key still work without storage.
      }
    }, 30000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!caseStudiesOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCaseStudiesOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    caseStudiesCloseRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      caseStudiesToggleRef.current?.focus();
    };
  }, [caseStudiesOpen]);

  useEffect(() => {
    if (!keepInTouchOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#studios-keep-in-touch button, #studios-keep-in-touch a[href]")?.focus();
    });
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setKeepInTouchOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("studios-keep-in-touch");
      const focusable = dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeys);
      previousFocus?.focus();
    };
  }, [keepInTouchOpen]);

  return (
    <div className="cc-studios-page min-h-[100dvh] overflow-x-clip bg-white text-black selection:bg-black selection:text-white">
      <main>
        <section className="cc-studios-desktop" aria-labelledby="studios-desktop-title">
          <div className="cc-studios-desktop-brand">
            <div className="cc-studios-hero-kicker">
              <span className="cc-studios-desktop-kicker">COUNTERCULT STUDIOS</span>
            </div>
            <h1
              id="studios-desktop-title"
              className="cc-studios-studio-title"
              aria-label={studiosHeadline}
              onMouseEnter={() => setHeadlineHovered(true)}
              onMouseLeave={() => setHeadlineHovered(false)}
            >
              {studiosHeadlineLines.map((line, lineIndex) => (
                <span className="cc-studios-heading-line" key={`line-${lineIndex}`} aria-hidden="true">
                  {line.split(" ").map((word, wordIndex) => (
                    <span className="cc-studios-heading-word" key={`${word}-${wordIndex}`}>
                      {Array.from(word).map((letter, letterIndex) => (
                        <span
                          key={`${letter}-${letterIndex}`}
                          className="cc-studios-heading-letter"
                          style={{ color: headlineHovered ? "#f04444" : undefined }}
                          onPointerEnter={() => void playHoverSound(letter)}
                        >
                          {letter}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
              ))}
            </h1>
            <p>The artists and builders to run your network. The crews to build your space. The systems to operate it. Think Soho House (when it was still authentic) meets that cute hobbit village we all wanted to be a part of.</p>
          </div>
          <div className="cc-studios-hero-side">
              <figure className="cc-studios-media-window" onPointerEnter={() => void playHoverSound("c")}>
              <div className="cc-studios-gif-browser" aria-hidden="true">
                <span className="cc-studios-gif-browser-dots"><i /><i /><i /></span>
                <span className="cc-studios-gif-browser-address">countercult.network / studios</span>
                <span className="cc-studios-gif-browser-controls">− □ ×</span>
              </div>
              <img
                src={`${import.meta.env.BASE_URL}images/studios-metal-teeth.webp`}
                alt="Animated collage of Countercult’s creative and cultural work"
                width="800"
                height="450"
                decoding="async"
                fetchPriority="high"
              />
            </figure>
          </div>
          <div id="studios-photos" className="cc-studios-hero-overlays" aria-label="Selected case-study photographs">
            {[selectedWork[3], selectedWork[4], selectedWork[5], selectedWork[7], selectedWork[9]].map((work, index) => (
              <a
                href={work.href}
                key={`hero-photo-${work.title}`}
                className={`cc-studios-photo-window cc-studios-photo-window-${["one", "two", "three", "four", "five"][index]}`}
                aria-label={`View ${work.title} case study`}
                onPointerEnter={() => void playHoverSound("c")}
              >
                <div className="cc-studios-mini-chrome" aria-hidden="true">
                  <span className="cc-studios-mini-dots"><i /><i /><i /></span>
                  <span>countercult.network / {work.title.toLowerCase().replaceAll(" ", "-")}</span>
                </div>
                <img src={work.image} alt={work.imageAlt} />
              </a>
            ))}
          </div>
        </section>

        <section className="cc-studios-name-marquee" aria-label={`Selected clients and projects: ${studiosNames.join(", ")}`}>
          <span className="cc-studios-name-marquee-label">SELECTED CLIENTS + PROJECTS</span>
          <div className="cc-studios-name-marquee-window">
            <div className="cc-studios-name-marquee-track">
              <span className="cc-studios-name-group">{renderStudiosNameGroup("primary", true)}</span>
              <span className="cc-studios-name-group" aria-hidden="true">{renderStudiosNameGroup("duplicate")}</span>
            </div>
          </div>
        </section>

        <section id="contact" className="cc-studios-contact-section cc-studios-contact-early" aria-labelledby="studios-contact-heading">
          <div>
              <p className="cc-studios-contact-kicker">PROPERTY OWNERS / CULTURAL PARTNERS / PRODUCERS</p>
            <h2 id="studios-contact-heading">You clicked this page for a reason.</h2>
              <p>Tell us what you’re thinking.</p>
          </div>
          <a href={studiosProjectHref} onClick={() => trackBookingCta("early_contact")}>Tell us what you’re thinking <span aria-hidden="true">↗</span></a>
        </section>

        <section id="model" className="cc-studios-content-section cc-studios-model-section" aria-labelledby="studios-model-title">
          <div className="cc-studios-section-heading">
            <p>WHO WE WORK WITH</p>
            <div>
              <h2 id="studios-model-title">Who works with us, and how</h2>
              <p>Countercult is building cultural infrastructure, not a conventional agency. Studios delivers paid projects now, bringing together local people, production, and operating systems while building toward lasting cultural places and future property ventures.</p>
            </div>
          </div>
          <div className="cc-studios-future-grid">
            <article>
              <Building2 className="cc-studios-track-icon" aria-hidden="true" />
              <p className="cc-studios-future-label">01 / COMMISSIONING PARTNERS</p>
              <h3>Property owners + operators</h3>
              <p>We shape cultural direction, build local partnerships, and deliver programming for venues, hospitality, coworking, and coliving spaces.</p>
            </article>
            <article>
              <Users className="cc-studios-track-icon" aria-hidden="true" />
              <p className="cc-studios-future-label">02 / COMMISSIONING PARTNERS</p>
              <h3>Brands, agencies + teams new to a market</h3>
              <p>We source local creative and technical talent and produce cultural projects for teams without trusted local contacts. Scope, rates, credit, and usage are agreed before work begins.</p>
            </article>
            <article>
              <Palette className="cc-studios-track-icon" aria-hidden="true" />
              <p className="cc-studios-future-label">03 / PAID CREATIVE COLLABORATORS</p>
              <h3>Artists + local producers</h3>
              <p>Artists and producers contribute as paid curators, makers, and local teams. We agree scope, payment, credit, and rights before work starts.</p>
            </article>
            <article>
              <Landmark className="cc-studios-track-icon" aria-hidden="true" />
              <p className="cc-studios-future-label">04 / PLACE-BASED PARTNERS</p>
              <h3>Municipalities + economic development partners</h3>
              <p>We develop programmes and proposals for municipalities and regional partners seeking to activate underused places. Project scope and evaluation measures are agreed with the commissioning partner.</p>
            </article>
          </div>
          <a className="cc-studios-inline-cta" href={studiosProjectHref} onClick={() => trackBookingCta("model_contact")}>Talk with us about a project ↗</a>
        </section>

        <section id="offerings" className="cc-studios-content-section cc-studios-offerings-section" aria-labelledby="studios-offerings-title">
          <div className="cc-studios-section-heading">
            <p>WHAT WE DO</p>
            <div>
              <h2 id="studios-offerings-title">Three ways to work with Countercult</h2>
              <p>Produce a project with a local team, build a programme for a place, or work with us on a culture budget that pays for local creative work.</p>
            </div>
          </div>
          <div className="cc-studios-offerings-grid">
            <article>
              <span>01</span>
              <h3><Wrench aria-hidden="true" />Creative production</h3>
              <p>We take projects from local research and creative direction to fabrication, live experiences, and on-site delivery. We bring in artists, technical specialists, and independent producers through the Countercult Network when the work calls for it.</p>
            </article>
            <article>
              <span>02</span>
              <h3><Landmark aria-hidden="true" />Place programmes</h3>
              <p>We develop and deliver pop-ups, residencies, and cultural programming with property, municipal, and regional partners.</p>
            </article>
            <article>
              <span>03</span>
              <h3><Wallet aria-hidden="true" />Fund local culture</h3>
              <p>Through the Countercult Studios Fund, businesses can set aside a budget, potentially linked to selected sales, to commission artists or support cultural work in a place where they operate. You hold the budget and pay the artists and Studios separately. Automating how sales feed into these budgets is a future step.</p>
              <a className="cc-studios-inline-cta" href={cultureBudgetHref} onClick={() => trackBookingCta("culture_budget")}>Discuss a Fund pilot ↗</a>
            </article>
          </div>
        </section>

        <section id="work" className="cc-studios-content-section cc-studios-work-section" aria-labelledby="studios-work-title">
          <div className="cc-studios-section-heading">
            <p>IN PRACTICE</p>
            <div>
              <h2 id="studios-work-title">Selected Global Projects</h2>
            </div>
          </div>
          <div className="cc-studios-work-list">
            {selectedWork.map((work, index) => (
              <article key={work.title} className="cc-studios-work-row">
                <figure className="cc-studios-case-window" onPointerEnter={() => void playHoverSound("c")}>
                  <div className="cc-studios-mini-chrome" aria-hidden="true">
                    <span className="cc-studios-mini-dots"><i /><i /><i /></span>
                    <span>countercult.network / {work.title.toLowerCase().replaceAll(" ", "-")}</span>
                  </div>
                  <img className="cc-studios-case-image" src={work.image} alt={work.imageAlt} loading="lazy" />
                </figure>
                <span className="cc-studios-row-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="cc-studios-work-title">
                  <p>{work.label}</p>
                  <h3>{work.title}</h3>
                </div>
                <div className="cc-studios-work-detail">
                  <p>{work.copy}</p>
                  <a href={work.href}>read the case study <span aria-hidden="true">↗</span></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cc-studios-network-section" aria-labelledby="studios-network-title">
          <p className="cc-studios-network-kicker">WHY COUNTERCULT</p>
          <div>
            <h2 id="studios-network-title">We don’t start from zero.</h2>
            <p>We draw on an open-source network of cultural people and places, built through real work together. The network is open; personal data and creative work stay protected.</p>
            <p>Countercult was founded by <a href="/shona-neary-portfolio/" className="cc-studios-founder-link">Shona Neary</a>, an artist, curator, creative director, and product builder working between New York City and Berlin. Their clients and collaborators include <strong>Fendi</strong>, <strong>Versace</strong>, <strong>New York Fashion Week</strong>, <strong>MoMA</strong>, <strong>Ann Taylor</strong>, <strong>Sunday Natural</strong>, <strong>Tommy Hilfiger</strong>, and <strong>venture-backed startups</strong>. They built Countercult’s product and software and lead its cultural and technology work.</p>
          </div>
        </section>

        <section className="cc-studios-residency-note" aria-label="Next residency">
          <p>NEXT RESIDENCY</p>
          <div>
            <strong><a href="/residency/guadalajara">Mexico / Guadalajara</a></strong>
            <span><a href="/residency/guadalajara">View the open call ↗</a></span>
          </div>
          <p className="cc-studios-residency-footnote">EXPERIMENT Residency in Da Nang and Berlin is shown above as a case study. Anceu and Rural Hackers were place-based work, not a completed residency.</p>
        </section>

        <section className="cc-studios-content-section cc-studios-faq-section" aria-labelledby="studios-faq-title">
          <div className="cc-studios-section-heading">
            <p>THE DETAILS</p>
            <div>
              <h2 id="studios-faq-title">Frequently asked questions</h2>
              <p>What we do now, how projects work, and what is still a future plan.</p>
            </div>
          </div>
          <div className="cc-studios-faq-list">
            <details>
              <summary>Are you a creative agency or a production shop?</summary>
              <p>Neither is quite right. Countercult is building cultural infrastructure. Studios brings local people, production, and operating systems together for commissioned work today, while building toward lasting cultural places and future property ventures.</p>
            </details>
            <details>
              <summary>How do you build and work with your creative network?</summary>
              <p>Our network grows through real collaborative work, not through selling an unfiltered contact list. For each project, we find people suited to the scope, experience, place, and timing, then agree roles, rates, credit, usage, and responsibilities before work begins.</p>
            </details>
            <details>
              <summary>We’re an agencyless team. How can we work with you?</summary>
              <p>If your team needs trusted local people or physical production in a place where you do not have those relationships, we can source and coordinate artists, specialists, fabricators, and local producers for a defined project. We agree scope, roles, rates, credit, and usage before work begins.</p>
            </details>
            <details>
              <summary>What can a municipality or regional partner commission?</summary>
              <p>Partners can commission cultural programming, pop-ups, residencies, and local production for underused places. We agree the project goals and how to assess the work together. We do not promise a specific footfall or economic multiplier without evidence.</p>
            </details>
            <details>
              <summary>How does Countercult get paid?</summary>
              <p>Clients pay agreed project fees for research, talent sourcing and coordination, creative direction, production, or place programming. We define the scope and collaborator fees before work begins. We do not charge for access to private member information.</p>
            </details>
            <details>
              <summary>Are residencies only for artists?</summary>
              <p>No. A residency can support artists, founders, technologists, researchers, and other practitioners whose work benefits from time in a place. Each programme is shaped around its participants, local partners, and purpose.</p>
            </details>
            <details>
              <summary>Are you already operating cultural spaces or investing in property?</summary>
              <p>No. Our current offer is paid project work. Locally operated models, permanent cultural places, and Countercult’s own property-technology or real-estate investments are future ambitions, not current operations or an established portfolio.</p>
            </details>
          </div>
        </section>

        <section className="cc-studios-future-vision" aria-labelledby="studios-future-vision-title">
          <div className="cc-studios-future-vision-heading">
            <div>
              <p>THE FUTURE VISION</p>
              <h2 id="studios-future-vision-title">Franchise the model. Make our own property-technology investments.</h2>
            </div>
            <p>Our next phase is locally operated franchising and Countercult’s own property-technology investments. Both are future plans, not current offers or an established portfolio.</p>
          </div>
          <div className="cc-studios-future-vision-grid">
            <article>
              <p>01 / LOCALLY OPERATED FRANCHISES</p>
              <h3>Scale through local ownership and knowledge.</h3>
              <p>Local partners adapt a shared operating framework while keeping programmes, relationships, and decisions rooted in their place.</p>
            </article>
            <article>
              <p>02 / OUR PROPERTY-TECHNOLOGY INVESTMENTS</p>
              <h3>Build and invest in the infrastructure around place.</h3>
              <p>We plan to build and invest in technology that helps property operators connect buildings with local networks and cultural work. The investment portfolio is not yet established.</p>
            </article>
          </div>
        </section>

        <section className="cc-studios-contact-section cc-studios-contact-final" aria-labelledby="studios-final-contact-heading">
          <div>
            <p className="cc-studios-contact-kicker">COUNTERCULT / PROPERTY TECHNOLOGY</p>
            <h2 id="studios-final-contact-heading">Build connection into the place.</h2>
            <p>For property owners and partners building places that work with the people around them.</p>
          </div>
          <a href={studiosProjectHref} onClick={() => trackBookingCta("final_contact")}>
            Start a conversation <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

      <div className="cc-studios-case-drawer">
        <button
          ref={caseStudiesToggleRef}
          className="cc-studios-case-drawer-tab"
          type="button"
          aria-expanded={caseStudiesOpen}
          aria-controls="studios-selected-case-studies"
          onClick={() => setCaseStudiesOpen((open) => !open)}
        >
          <span>Selected case studies</span><strong aria-hidden="true">{caseStudiesOpen ? "−" : "+"}</strong>
        </button>
        {caseStudiesOpen && (
          <aside
            id="studios-selected-case-studies"
            className="cc-studios-case-drawer-panel"
            aria-label="Selected case studies"
          >
            <header>
              <div>
                <p>COUNTERCULT / IN PRACTICE</p>
                <h2>Selected case studies</h2>
              </div>
              <button
                ref={caseStudiesCloseRef}
                type="button"
                aria-label="Close selected case studies"
                onClick={() => setCaseStudiesOpen(false)}
              >×</button>
            </header>
            <nav aria-label="Selected project links">
              {selectedWork.map((work) => (
                <a href={work.href} key={`drawer-${work.title}`}>
                  <img src={work.image} alt="" loading="lazy" />
                  <span><small>{work.label}</small><strong>{work.title}</strong></span>
                  <i aria-hidden="true">↗</i>
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>

      {keepInTouchOpen && (
        <div
          className="cc-studios-follow-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setKeepInTouchOpen(false);
          }}
        >
          <section
            id="studios-keep-in-touch"
            className="cc-studios-follow-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studios-follow-title"
          >
            <div className="cc-studios-follow-titlebar">
              <span><i aria-hidden="true" /> COUNTERCULT / KEEP IN TOUCH</span>
              <button type="button" onClick={() => setKeepInTouchOpen(false)} aria-label="Close contact prompt">×</button>
            </div>
            <div className="cc-studios-follow-main">
              <p>A NOTE BEFORE YOU GO</p>
              <h2 id="studios-follow-title">Want to keep Countercult in mind?</h2>
              <p>If you have a place, a cultural partnership, or a project in mind, tell us what you’re thinking. We’ll talk through what it needs and who should be involved.</p>
              <div className="cc-studios-follow-actions">
                <a href={studiosProjectHref}>Contact Countercult ↗</a>
                <a href={countercultLinkedInHref} target="_blank" rel="noopener noreferrer">Follow Countercult on LinkedIn ↗</a>
              </div>
            </div>
            <div className="cc-studios-follow-statusbar">
              <span>COUNTERCULT / CULTURE / PROPERTY / CONNECTION</span>
              <span>ESC TO CLOSE</span>
            </div>
          </section>
        </div>
      )}

      <footer className="cc-studios-site-footer">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}