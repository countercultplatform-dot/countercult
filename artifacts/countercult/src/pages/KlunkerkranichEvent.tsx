import { ArrowDownRight, ArrowUpRight, CalendarDays, MapPin, Mail, Music2, Pencil, Users } from "lucide-react";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { SEO_ORIGIN, setCanonical, setJsonLd, setSeoMeta } from "@/lib/seo";

const EVENT_PATH = "/events/klunkerkranich-2026";
const EVENT_URL = `${SEO_ORIGIN}${EVENT_PATH}`;
const EVENT_IMAGE = `${SEO_ORIGIN}/images/klunkerkranich-event-og.jpg`;
const RSVP_URL = "https://luma.com/lstwjm6h?utm_source=countercult&utm_medium=owned&utm_campaign=klunkerkranich&utm_content=event_page";
const JOIN_URL = "/explore?action=join&utm_source=countercult&utm_medium=owned&utm_campaign=klunkerkranich&utm_content=event_page";
const MUSIC_EMAIL = "mailto:countercultplatform@gmail.com?subject=musician%20interest%20-%20klunkerkranich%2017%20september%202026";

const schedule = [
  { time: "16:00-19:00", title: "draw + play", copy: "open drawing jam and live jazz jam. bring a line, a sketch, an instrument, or just your attention.", tone: "acid" },
  { time: "19:00-late", title: "turn it up", copy: "jazzy house sets and DJs carry the evening from sunset onwards.", tone: "cream" },
];

const lineup = [
  { name: "Sketchy Shona", kind: "live artist", icon: Pencil },
  { name: "Analog Beats Collective", kind: "live jazz", icon: Music2 },
  { name: "Mad.Mod", kind: "live set", icon: Music2 },
  { name: "Natascha Roze", kind: "live set", icon: Music2 },
];

function EventNav() {
  return (
    <nav className="cc-event-nav" aria-label="Event navigation">
      <a href="/" data-testid="link-event-home" className="cc-event-wordmark">countercult<span>.</span></a>
      <div className="cc-event-nav-links">
        <a href="#what-happens" data-testid="link-event-programme">programme</a>
        <a href="#who-is-here" data-testid="link-event-lineup">who's here</a>
        <a href="#the-point" data-testid="link-event-point">the point</a>
      </div>
      <a
        href={RSVP_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-event-nav-rsvp"
        className="cc-event-nav-cta"
        onClick={() => trackEvent("event_rsvp_clicked", { event: "klunkerkranich_2026", placement: "nav" })}
      >
        RSVP ↗
      </a>
    </nav>
  );
}

function EventMeta() {
  return (
    <div className="cc-event-meta" data-testid="event-meta">
      <div className="cc-event-meta-item">
        <CalendarDays aria-hidden="true" />
        <div><span>when</span><strong>thu 17 september 2026</strong><strong>16:00-01:00 · europe/berlin</strong></div>
      </div>
      <div className="cc-event-meta-item">
        <MapPin aria-hidden="true" />
        <div><span>where</span><strong>klunkerkranich</strong><strong>karl-marx-straße 66 · 12043 berlin</strong></div>
      </div>
    </div>
  );
}

export default function KlunkerkranichEvent() {
  useEffect(() => {
    const title = "Countercult x Klunkerkranich - live drawing, jazz + DJs | 17 September 2026";
    const description = "A Countercult + Klunkerkranich gathering in Berlin: open drawing, live jazz, jazzy house sets and DJs, with local creatives curated and paid.";
    document.title = title;
    setSeoMeta("name", "description", description);
    setSeoMeta("name", "robots", "index, follow");
    setSeoMeta("property", "og:title", title);
    setSeoMeta("property", "og:description", description);
    setSeoMeta("property", "og:url", EVENT_URL);
     setSeoMeta("property", "og:type", "website");
    setSeoMeta("property", "og:site_name", "Countercult");
     setSeoMeta("property", "og:image", EVENT_IMAGE);
     setSeoMeta("property", "og:image:alt", "Countercult x Klunkerkranich - live drawing, jazz and DJs in Berlin");
     setSeoMeta("property", "og:image:width", "1200");
     setSeoMeta("property", "og:image:height", "630");
    setSeoMeta("name", "twitter:card", "summary_large_image");
    setSeoMeta("name", "twitter:title", title);
    setSeoMeta("name", "twitter:description", description);
     setSeoMeta("name", "twitter:image", EVENT_IMAGE);
     setSeoMeta("name", "twitter:image:alt", "Countercult x Klunkerkranich - live drawing, jazz and DJs in Berlin");
    setCanonical(EVENT_URL);

    setJsonLd("countercult-klunkerkranich-event-jsonld", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Event",
          "@id": `${EVENT_URL}#event`,
          name: "Countercult x Klunkerkranich",
          description,
          url: EVENT_URL,
           image: EVENT_IMAGE,
          startDate: "2026-09-17T16:00:00+02:00",
          endDate: "2026-09-18T01:00:00+02:00",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: "Klunkerkranich",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Karl-Marx-Straße 66",
              postalCode: "12043",
              addressLocality: "Berlin",
              addressCountry: "DE",
            },
          },
          organizer: { "@type": "Organization", name: "Countercult", url: SEO_ORIGIN },
          performer: [
            { "@type": "Person", name: "Sketchy Shona" },
            { "@type": "PerformingGroup", name: "Analog Beats Collective" },
            { "@type": "Person", name: "Mad.Mod" },
            { "@type": "Person", name: "Natascha Roze" },
          ],
          offers: { "@type": "Offer", url: RSVP_URL },
        },
        {
          "@type": "WebPage",
          "@id": `${EVENT_URL}#page`,
          url: EVENT_URL,
          name: title,
          description,
          isPartOf: { "@id": `${SEO_ORIGIN}/#website` },
          about: { "@id": `${EVENT_URL}#event` },
          mainEntity: { "@id": `${EVENT_URL}#event` },
        },
      ],
    });

    return () => {
      document.getElementById("countercult-klunkerkranich-event-jsonld")?.remove();
    };
  }, []);

  const handleRsvp = (placement: string) => {
    trackEvent("event_rsvp_clicked", { event: "klunkerkranich_2026", placement });
  };

  return (
    <main className="cc-event-page">
      <EventNav />
      <header className="cc-event-hero" data-testid="event-hero">
        <div className="cc-event-hero-grid">
          <div className="cc-event-hero-copy">
            <p className="cc-event-kicker"><span>01</span> countercult + klunkerkranich / berlin</p>
            <h1>make a<br /><em>scene.</em></h1>
            <p className="cc-event-deck">A live case study in how a venue need becomes paid local creative work. One night, in public.</p>
            <div className="cc-event-hero-actions">
              <a href={RSVP_URL} target="_blank" rel="noopener noreferrer" data-testid="link-event-hero-rsvp" className="cc-event-button cc-event-button-acid" onClick={() => handleRsvp("hero")}>
                RSVP on Luma <ArrowUpRight aria-hidden="true" />
              </a>
              <a href="#what-happens" data-testid="link-event-hero-programme" className="cc-event-text-link">
                see the programme <ArrowDownRight aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="cc-event-hero-poster" role="img" aria-label="Countercult event poster for Klunkerkranich, 17 September 2026">
            <div className="cc-poster-ring cc-poster-ring-one" />
            <div className="cc-poster-ring cc-poster-ring-two" />
            <p className="cc-poster-top">countercult presents</p>
            <div className="cc-poster-scribble">K<br />K</div>
            <p className="cc-poster-title">live<br /><span>case</span><br />study</p>
            <p className="cc-poster-bottom">berlin · 17.09.26<br />16:00 → 01:00</p>
            <span className="cc-poster-stamp">paid<br />local<br />work</span>
          </div>
        </div>
        <EventMeta />
      </header>

      <section className="cc-event-statement" id="the-point" data-testid="event-statement">
        <p className="cc-event-section-label">/ why this night exists</p>
        <div className="cc-event-statement-grid">
          <h2>The venue had a need.<br /><span>the network had people.</span></h2>
          <div>
            <p>Countercult is an artist-founded platform for economic development through culture. This gathering is the thing in motion: Klunkerkranich opens the roof, local creatives are curated and paid, and the public gets to watch culture do its actual work.</p>
            <p>Not a panel about the future. A night of drawing, jazz, house music and a public cultural network.</p>
          </div>
        </div>
      </section>

      <section className="cc-event-programme" id="what-happens" data-testid="event-programme">
        <div className="cc-event-section-header">
          <p className="cc-event-section-label">/ the evening</p>
          <p className="cc-event-section-note">no keynote. no pitch deck.<br />just the work, happening.</p>
        </div>
        <div className="cc-event-schedule">
          {schedule.map((item, index) => (
            <article key={item.time} className={`cc-event-schedule-row cc-event-schedule-${item.tone}`} data-testid={`event-schedule-${index}`}>
              <span className="cc-event-schedule-time">{item.time}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <span className="cc-event-schedule-number">0{index + 1}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cc-event-lineup" id="who-is-here" data-testid="event-lineup">
        <div className="cc-event-lineup-intro">
          <p className="cc-event-section-label">/ on the roof</p>
          <h2>people who<br /><i>make</i> things.</h2>
          <p className="cc-event-lineup-copy">Live artist Sketchy Shona. Analog Beats Collective in the room. Mad.Mod and Natascha Roze on live sets. The rest is what happens when people show up.</p>
        </div>
        <div className="cc-event-lineup-list">
          {lineup.map(({ name, kind, icon: Icon }, index) => (
            <div className="cc-event-lineup-item" key={name} data-testid={`event-performer-${index}`}>
              <span className="cc-event-lineup-icon"><Icon aria-hidden="true" /></span>
              <span className="cc-event-lineup-name">{name}</span>
              <span className="cc-event-lineup-kind">{kind}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cc-event-network" data-testid="event-network">
        <div className="cc-event-network-mark">CC<br /><span>×</span><br />KK</div>
        <div className="cc-event-network-copy">
          <p className="cc-event-section-label">/ a partnership, in public</p>
          <h2>culture is<br /><span>infrastructure.</span></h2>
          <p>Countercult and Klunkerkranich are making a night where local creative work is not decoration around the programme. It is the programme. Join the network, meet the people, and make the next thing easier to find.</p>
          <a href={JOIN_URL} data-testid="link-event-join-network" className="cc-event-button cc-event-button-dark" onClick={() => trackEvent("event_join_network_clicked", { event: "klunkerkranich_2026", placement: "partnership" })}>
            join the network <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="cc-event-bottom-cta" data-testid="event-final-cta">
        <div>
          <p className="cc-event-section-label">/ thursday 17 september 2026</p>
          <h2>come see<br /><span>what happens.</span></h2>
        </div>
        <div className="cc-event-bottom-actions">
          <a href={RSVP_URL} target="_blank" rel="noopener noreferrer" data-testid="link-event-final-rsvp" className="cc-event-button cc-event-button-acid" onClick={() => handleRsvp("final")}>RSVP on Luma <ArrowUpRight aria-hidden="true" /></a>
          <a href={MUSIC_EMAIL} data-testid="link-event-musician-email" className="cc-event-button cc-event-button-outline" onClick={() => trackEvent("event_musician_contact_clicked", { event: "klunkerkranich_2026", placement: "final_cta" })}><Mail aria-hidden="true" /> musicians: email us</a>
        </div>
      </section>

      <footer className="cc-event-footer">
        <span>countercult · economic development through culture</span>
        <a href="/studios" data-testid="link-event-studios" onClick={() => trackEvent("studios_cta_clicked", { source_route: EVENT_PATH, placement: "event_footer" })}>studios / partner with us ↗</a>
      </footer>
    </main>
  );
}