import { ArrowUpRight } from "lucide-react";
import { ExchangePhotoSlideshow } from "@/components/ExchangePhotoSlideshow";

const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const GUADALAJARA_PHOTOS = [
  { src: `${base}/images/guadalajara/house-courtyard.webp`, alt: "Courtyard at the Guadalajara residency home" },
  { src: `${base}/images/guadalajara/shared-living-room.webp`, alt: "Shared living room at the Guadalajara residency home" },
  { src: `${base}/images/guadalajara/bedroom.webp`, alt: "Bedroom at the Guadalajara residency home" },
  { src: `${base}/images/guadalajara/dining-room.webp`, alt: "Dining room at the Guadalajara residency home" },
  { src: `${base}/images/guadalajara/house-exterior.webp`, alt: "Exterior of the Guadalajara residency home" },
];

export function GuadalajaraResidencyCard() {
  return (
    <article className="exchange-listing-card exchange-floor-card" aria-labelledby="exchange-guadalajara-title" data-testid="card-exchange-guadalajara">
      <div className="exchange-listing-top flex items-center justify-between gap-3 px-4 py-3 sm:px-5" style={{ backgroundColor: "#c6ff3d", color: "#111" }}>
        <span className="exchange-floor-kicker-title">COUNTERCULT</span>
        <span className="exchange-feature-label">featured listing</span>
      </div>
      <div className="exchange-listing-content exchange-floor-content">
        <h3 id="exchange-guadalajara-title" className="exchange-listing-title">
          <span className="exchange-listing-place">Guadalajara</span>: housing + space
        </h3>
        <p className="exchange-listing-subtitle">Residency + workspace · Mexico</p>
        <p className="exchange-listing-description">A month for up to 8 international artists, with artist office hours, mentorship, coworking, family dinners, critiques, a Mexican cooking session with Susana, Fernanda’s mother, and a project developed with a local business or initiative. Artists based in Guadalajara can join shared activities for free through a separate call.</p>
      </div>
      <ExchangePhotoSlideshow
        className="exchange-floor-image"
        photos={GUADALAJARA_PHOTOS}
        label="Guadalajara residency home"
        aspect="portrait"
        testId="image-exchange-guadalajara"
      />
      <dl className="exchange-floor-facts">
        <div><dt>Dates</dt><dd>5 January to 5 February 2027</dd></div>
        <div><dt>Capacity</dt><dd>Up to 8 international artists</dd></div>
      </dl>
      <div className="exchange-floor-actions">
        <a href="/residency/guadalajara" data-testid="link-exchange-guadalajara-details" className="exchange-apply-link">
          See more <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>
    </article>
  );
}
