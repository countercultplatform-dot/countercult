import "./FundPartnerTicker.css";

const partnerNames = [
  "City of Berlin",
  "Grace Accelerator",
  "Most Wanted Music Conference",
  "Anceu Coliving",
  "Zalando",
  "StickerApp",
  "The Delta VC Ecosystem",
  "WordPress",
  "Klunkerkranich",
  "Government of Spain",
  "Rural Hackers",
  "AVOMIND",
];

export function FundPartnerTicker() {
  return (
    <div className="cc-fund-partners">
      <div className="cc-fund-partners__label">
        <p>Countercult collaborators, clients &amp; past funders</p>
        <a href="/journal/">see the work ↗</a>
      </div>
      <p className="sr-only">{`Countercult collaborators, clients and past funders: ${partnerNames.join(", ")}.`}</p>
      <div className="cc-fund-partners__mask" aria-hidden="true">
        <div className="cc-fund-partners__track">
          {[0, 1].map((copy) => (
            <div className="cc-fund-partners__group" key={copy}>
              {partnerNames.map((partner) => (
                <span className="cc-fund-partners__item" key={`${copy}-${partner}`}>
                  {partner}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
