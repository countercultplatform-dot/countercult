import "./FundTalentTicker.css";

const tickerItems = [
  "culture euro",
  "watch your budget grow",
  "marketing + creative delivery",
  "community programmes + residencies",
  "local strategists",
  "writers",
  "designers",
  "photographers",
  "content producers",
  "artists",
  "musicians",
  "workshop leaders",
  "mentors",
  "live performances",
  "artist-led workshops",
  "community programmes",
  "residencies",
  "local partners",
  "partner stories",
];

const accessibleText = tickerItems.join(". ");

export function FundTalentTicker() {
  return (
    <section className="cc-fund-talent-ticker" aria-label="Countercult talent and programme network">
      <p className="sr-only">{accessibleText}</p>
      <div className="cc-fund-talent-ticker__mask" aria-hidden="true">
        <div className="cc-fund-talent-ticker__track">
          {[0, 1].map((copy) => (
            <div className="cc-fund-talent-ticker__group" key={copy}>
              {tickerItems.map((item, index) => (
                <span className={index < 2 ? "cc-fund-talent-ticker__item cc-fund-talent-ticker__item--lead" : "cc-fund-talent-ticker__item"} key={`${copy}-${item}`}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
