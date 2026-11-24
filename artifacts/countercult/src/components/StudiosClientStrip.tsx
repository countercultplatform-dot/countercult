import { SITE_IDENTITY } from "@/config/siteIdentity";

const studiosClientsAndPartners = [
  "The Delta",
  "Quouch",
  "Zalando Pride",
  "Klunkerkranich",
  "Most Wanted: Music",
  "Rural Hackers",
  "Anceu",
  "AVOMIND",
  "StickerApp",
  "Berlin Pulse",
];

function ProofTicker({ items, label }: { items: readonly string[]; label: string }) {
  const renderItems = (repeat = false) => items.map((item, index) => (
    <span key={`${item}${repeat ? "-repeat" : ""}`}>
      {index > 0 && <i aria-hidden="true"> / </i>}
      <span>{item}</span>
    </span>
  ));

  return (
    <div className="cc-studios-proof-row">
      <p className="cc-studios-proof-label">{label}</p>
      <div className="cc-studios-proof-marquee" aria-label={`${label}: ${items.join(", ")}`}>
        <div className="cc-studios-proof-track">
          <span className="cc-studios-proof-group">{renderItems()}</span>
          <span className="cc-studios-proof-group" aria-hidden="true">{renderItems(true)}</span>
        </div>
      </div>
    </div>
  );
}

export function StudiosClientStrip() {
  return (
    <section className="cc-studios-client-strip" aria-label="Selected client and partner experience">
      <p className="cc-studios-client-label">clients + partners</p>
      <div className="cc-studios-proof-content">
        <ProofTicker items={SITE_IDENTITY.shona.pastClientWork} label="Leadership client experience" />
        <ProofTicker items={studiosClientsAndPartners} label="Countercult Studios clients + partners" />
      </div>
    </section>
  );
}
