import {
  EXCHANGE_TAXONOMY_TAGS,
  type ExchangeFilter,
  type ExchangeSubfilter,
} from "./exchangeCategories.ts";

export type ExchangeBoardFilter = ExchangeFilter | "residency" | "paid_gigs";
export type ExchangeCostFilter = "all" | "free";

export type ExchangeFreeFilterState = {
  category: ExchangeBoardFilter;
  subfilter: ExchangeSubfilter | null;
  cost: ExchangeCostFilter;
};

type ExchangeCostOffer = {
  kind?: string | null;
  cost?: string | null;
  tags?: string[] | null;
  publicTags?: string[] | null;
};

export function isFreeExchangeOffer(offer: ExchangeCostOffer): boolean {
  const kind = offer.kind?.trim().toLowerCase() ?? "";
  const tags = [...(offer.tags ?? []), ...(offer.publicTags ?? [])]
    .map((tag) => tag.trim().toLowerCase());

  return kind === "swap"
    || kind === "skill_share"
    || kind === "free_space"
    || offer.cost?.trim().toLowerCase() === "free"
    || tags.includes("countercult:art-houses:free")
    || tags.includes(EXCHANGE_TAXONOMY_TAGS.arrangementSwap)
    || tags.includes(EXCHANGE_TAXONOMY_TAGS.housingHosted);
}

export function toggleFreeExchangeFilter(state: ExchangeFreeFilterState): ExchangeFreeFilterState {
  if (state.cost === "free") return { ...state, cost: "all" };
  return { category: "all", subfilter: null, cost: "free" };
}

export const COUNTERCULT_RESIDENCY_PROGRAMMES = [
  {
    id: "the-floor",
    searchText: "the floor berlin residency housing space countercult",
  },
] as const;

export type CountercultResidencyProgrammeId = typeof COUNTERCULT_RESIDENCY_PROGRAMMES[number]["id"];

export function getVisibleCountercultResidencies(query: string): CountercultResidencyProgrammeId[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return COUNTERCULT_RESIDENCY_PROGRAMMES
    .filter((programme) => terms.every((term) => programme.searchText.includes(term)))
    .map((programme) => programme.id);
}
