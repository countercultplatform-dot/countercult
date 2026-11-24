import { useState } from "react";

type ScenarioId = "hotel" | "restaurant" | "venue" | "membership" | "retail";

type Period = {
  label: string;
  multiplier: number;
};

type Scenario = {
  id: ScenarioId;
  label: string;
  measureLabel: string;
  defaultVolume: string;
  volumeSuffix: string;
  volumeStep: string;
  contributionLabel: string;
  defaultContribution: string;
  contributionKind: "fixed" | "percentage";
  contributionStep: string;
  periods: Period[];
  work: string;
};

const scenarios: Scenario[] = [
  {
    id: "hotel",
    label: "hotel",
    measureLabel: "eligible room nights",
    defaultVolume: "100",
    volumeSuffix: "per day",
    volumeStep: "1",
    contributionLabel: "contribution per room night",
    defaultContribution: "1",
    contributionKind: "fixed",
    contributionStep: "0.01",
    periods: [
      { label: "30 days", multiplier: 30 },
      { label: "365 days", multiplier: 365 },
    ],
    work: "Guest photography, a local guide or an artist-led guest experience.",
  },
  {
    id: "restaurant",
    label: "restaurant",
    measureLabel: "selected menu sales",
    defaultVolume: "200",
    volumeSuffix: "per day",
    volumeStep: "1",
    contributionLabel: "contribution per selected sale",
    defaultContribution: "0.5",
    contributionKind: "fixed",
    contributionStep: "0.01",
    periods: [
      { label: "30 days", multiplier: 30 },
      { label: "365 days", multiplier: 365 },
    ],
    work: "Local live music, DJ programming or commissioned storytelling.",
  },
  {
    id: "venue",
    label: "event venue",
    measureLabel: "event tickets sold",
    defaultVolume: "1200",
    volumeSuffix: "per month",
    volumeStep: "1",
    contributionLabel: "contribution per ticket",
    defaultContribution: "2.5",
    contributionKind: "fixed",
    contributionStep: "0.01",
    periods: [
      { label: "1 month", multiplier: 1 },
      { label: "12 months", multiplier: 12 },
    ],
    work: "Local artists, performances, workshops or cultural programming.",
  },
  {
    id: "membership",
    label: "monthly membership",
    measureLabel: "membership revenue",
    defaultVolume: "15000",
    volumeSuffix: "per month",
    volumeStep: "0.01",
    contributionLabel: "illustrative share of revenue",
    defaultContribution: "2",
    contributionKind: "percentage",
    contributionStep: "0.01",
    periods: [
      { label: "1 month", multiplier: 1 },
      { label: "12 months", multiplier: 12 },
    ],
    work: "A member programme or workshop at a coworking or coliving space.",
  },
  {
    id: "retail",
    label: "retail / brand",
    measureLabel: "selected product sales",
    defaultVolume: "6000",
    volumeSuffix: "per month",
    volumeStep: "1",
    contributionLabel: "contribution per selected sale",
    defaultContribution: "0.5",
    contributionKind: "fixed",
    contributionStep: "0.01",
    periods: [
      { label: "1 month", multiplier: 1 },
      { label: "12 months", multiplier: 12 },
    ],
    work: "A local campaign, artist commission or cultural programme for a particular market.",
  },
];

const initialValues = Object.fromEntries(
  scenarios.map(({ id, defaultVolume, defaultContribution }) => [
    id,
    { volume: defaultVolume, contribution: defaultContribution },
  ]),
) as Record<ScenarioId, { volume: string; contribution: string }>;

function formatEuro(amount: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function FundBudgetExamples() {
  const [selectedId, setSelectedId] = useState<ScenarioId>("retail");
  const [values, setValues] = useState(initialValues);
  const selected = scenarios.find(({ id }) => id === selectedId) ?? scenarios[0];
  const selectedValues = values[selected.id];
  const volume = Number(selectedValues.volume);
  const contribution = Number(selectedValues.contribution);
  const isValid = selectedValues.volume.trim() !== ""
    && selectedValues.contribution.trim() !== ""
    && Number.isFinite(volume)
    && volume >= 0
    && Number.isFinite(contribution)
    && contribution >= 0;
  const budgetPerPeriod = selected.contributionKind === "percentage"
    ? volume * contribution / 100
    : volume * contribution;

  const updateValue = (key: "volume" | "contribution", value: string) => {
    setValues((current) => ({
      ...current,
      [selected.id]: { ...current[selected.id], [key]: value },
    }));
  };

  return (
    <section id="examples" className="border-b-2 border-black bg-[#c6ff3d] px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]">hypothetical / sales-linked route</p>
          <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.065em] sm:text-6xl">
            see what<br />sales can build.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-black/70 sm:text-base">
            Enter an expected sales volume and contribution to estimate the budget for a place, brand or organisation.
          </p>
          <p className="mt-4 max-w-lg border-t border-black/20 pt-4 text-xs leading-relaxed text-black/65">
            These are examples, not standard rates. You and Countercult agree which sales count and the contribution before launch. A client-funded programme budget is scoped separately. The gross budget covers creative fees and Countercult’s agreed delivery fee.
          </p>
        </div>

        <div className="border-2 border-black bg-white">
          <div className="grid grid-cols-2 border-b-2 border-black sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Choose a hypothetical sales model">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                aria-pressed={selected.id === scenario.id}
                onClick={() => setSelectedId(scenario.id)}
                className={`min-h-12 border-b-2 border-black px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] transition-colors sm:border-b-0 sm:border-r-2 sm:last:border-r-0 ${selected.id === scenario.id ? "bg-black text-[#c6ff3d]" : "bg-white text-black hover:bg-black/5"}`}
              >
                {scenario.label}
              </button>
            ))}
          </div>

          <div className="grid gap-7 p-5 sm:p-7 md:grid-cols-[1fr_0.9fr] md:gap-9">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/50">hypothetical · {selected.label}</p>
              <div className="mt-5 flex items-end gap-4">
                <label className="block min-w-0 flex-1">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em]">{selected.measureLabel}</span>
                  <span className="flex items-center border-2 border-black bg-[#f9f9f6] focus-within:bg-[#c6ff3d]">
                    {selected.id === "membership" && <span aria-hidden="true" className="pl-3 font-mono text-sm">€</span>}
                    <input
                      data-testid={selected.id === "membership" ? "input-membership-revenue" : `input-${selected.id}-sales-volume`}
                      aria-label={selected.measureLabel}
                      type="number"
                      min="0"
                      step={selected.volumeStep}
                      inputMode="decimal"
                      value={selectedValues.volume}
                      onChange={(event) => updateValue("volume", event.target.value)}
                      className="min-w-0 w-full bg-transparent px-3 py-3 font-mono text-lg outline-none"
                    />
                    <span aria-hidden="true" className="shrink-0 pr-3 font-mono text-[9px] text-black/50">{selected.volumeSuffix}</span>
                  </span>
                </label>
                <span aria-hidden="true" className="pb-3 font-mono text-lg font-bold">×</span>
                <label className="block w-28 shrink-0">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em]">
                    {selected.contributionKind === "percentage" ? "share" : "per sale"}
                  </span>
                  <span className="flex items-center border-2 border-black bg-[#f9f9f6] focus-within:bg-[#c6ff3d]">
                    {selected.contributionKind === "fixed" && <span aria-hidden="true" className="pl-2 font-mono text-sm">€</span>}
                    <input
                      data-testid={selected.id === "membership" ? "input-membership-percentage" : `input-${selected.id}-per-sale`}
                      aria-label={selected.contributionLabel}
                      type="number"
                      min="0"
                      step={selected.contributionStep}
                      inputMode="decimal"
                      value={selectedValues.contribution}
                      onChange={(event) => updateValue("contribution", event.target.value)}
                      className="min-w-0 w-full bg-transparent px-2 py-3 font-mono text-lg outline-none"
                    />
                    {selected.contributionKind === "percentage" && <span aria-hidden="true" className="pr-2 font-mono text-sm">%</span>}
                  </span>
                </label>
              </div>
              {selected.id === "membership" && (
                <p className="mt-3 text-xs leading-relaxed text-black/60">A percentage of monthly membership revenue, not a fixed amount per renewal.</p>
              )}
              <p className="mt-5 border-t border-black/20 pt-4 text-xs leading-relaxed text-black/60">
                Possible local work: {selected.work}
              </p>
            </div>

            <div className="flex flex-col justify-center border-t-2 border-black pt-5 md:border-l-2 md:border-t-0 md:pl-7 md:pt-0">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">gross Fund budget</p>
              {isValid ? (
                <div className="mt-3 grid gap-3">
                  {selected.periods.map((period) => (
                    <div key={period.label} className="flex items-baseline justify-between gap-3 border-b border-black/20 py-2">
                      <span className="text-xs uppercase">{period.label}</span>
                      <output
                        data-testid={selected.id === "membership"
                          ? `output-membership-${period.multiplier === 1 ? "1-month" : "12-months"}`
                          : `output-${selected.id}-${period.multiplier === 1 ? "1-month" : period.multiplier === 12 ? "12-months" : period.multiplier === 30 ? "30-days" : "365-days"}`}
                        aria-label={`${selected.label} gross Fund budget over ${period.label}`}
                        className="font-mono text-3xl font-bold tracking-[-0.07em] sm:text-4xl"
                      >
                        {formatEuro(budgetPerPeriod * period.multiplier)}
                      </output>
                    </div>
                  ))}
                </div>
              ) : (
                <p role="status" className="mt-3 text-sm text-black/65">Enter valid non-negative numbers to see the total.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
