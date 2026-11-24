export const EXCHANGE_CATEGORY_FILTERS = [
  "all",
  "housing",
  "spaces",
  "skills",
  "opportunities",
  "tools",
  "swaps",
] as const;

export type ExchangeFilter = typeof EXCHANGE_CATEGORY_FILTERS[number];
export type ExchangeCategory = Exclude<ExchangeFilter, "all">;

export const EXCHANGE_TAXONOMY_TAGS = {
  housingResidency: "cc-exchange:housing:residency",
  housingSublet: "cc-exchange:housing:sublet",
  housingLongTerm: "cc-exchange:housing:long-term",
  housingHosted: "cc-exchange:housing:hosted",
  skillStayRequest: "cc-exchange:housing:skill-stay-request",
  includesWorkspace: "cc-exchange:spaces:workspace",
  spacesEvent: "cc-exchange:spaces:event",
  spacesFlexible: "cc-exchange:spaces:flexible",
  spacesShared: "cc-exchange:spaces:shared",
  arrangementSwap: "cc-exchange:arrangement:swap",
} as const;

export const EXCHANGE_SUBFILTER_GROUPS = {
  housing: [
    { value: "housing_residency", label: "Exchange Residency swap" },
    { value: "housing_sublet", label: "Sublet" },
    { value: "housing_long_term", label: "Long-term" },
    { value: "housing_hosted", label: "Hosted stay" },
    { value: "housing_swap", label: "Swap" },
  ],
  spaces: [
    { value: "spaces_workspace", label: "Workspaces" },
    { value: "spaces_event", label: "Event spaces" },
    { value: "spaces_flexible", label: "Flexible spaces" },
    { value: "spaces_shared", label: "Shared spaces" },
    { value: "spaces_swap", label: "Swap" },
  ],
} as const;

export type ExchangeSubfilter =
  (typeof EXCHANGE_SUBFILTER_GROUPS)[keyof typeof EXCHANGE_SUBFILTER_GROUPS][number]["value"];

export type ExchangeCategoryOffer = {
  kind?: string | null;
  tags?: string[] | null;
  cost?: string | null;
  description?: string | null;
  duration?: string | null;
  isPublicPreview?: boolean;
  publicCategory?: ExchangeCategory;
  publicCategories?: ExchangeCategory[];
  publicSubfilters?: ExchangeSubfilter[];
};

const OFFER_CATEGORY_BY_KIND: Record<string, ExchangeCategory> = {
  host: "housing",
  looking: "housing",
  swap: "housing",
  workshop: "spaces",
  concert: "spaces",
  free_space: "spaces",
  venue_offer: "spaces",
  skill_share: "skills",
  gig: "opportunities",
  open_call: "opportunities",
  collab: "opportunities",
  partner_offer: "tools",
};

export function isPaidGigExchangeOffer(offer: ExchangeCategoryOffer): boolean {
  const tags = (offer.tags ?? []).map((tag) => tag.trim().toLowerCase());
  return offer.kind?.trim().toLowerCase() === "gig" &&
    (/[1-9]/.test(offer.cost ?? "") || tags.includes("advert:paid-gig-exchange"));
}

const SPACE_OFFER_KINDS = new Set(["workshop", "concert", "free_space", "venue_offer"]);
const LEGACY_RESIDENCY_TAG = "exchange residency";

function normalizedTags(tags: string[] | null | undefined): Set<string> {
  return new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()));
}

function isResidentialSpaceSwapOffer(
  offer: ExchangeCategoryOffer,
  kind: string,
  tags: Set<string>,
): boolean {
  return SPACE_OFFER_KINDS.has(kind)
    && tags.has(EXCHANGE_TAXONOMY_TAGS.arrangementSwap)
    && /^space type:\s*(?:room in a shared space|entire apartment\s*\/\s*home)(?:\s|$)/i.test(offer.description ?? "");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function currentCategory(category: ExchangeCategory | undefined): ExchangeCategory | null {
  if (!category) return null;
  // "swaps" was a standalone category in older versions. Keep old public teasers
  // discoverable under Housing while new swap posts use the Housing/Spaces facets.
  return category === "swaps" ? "housing" : category;
}

export function isExchangeTaxonomyTag(tag: string): boolean {
  return tag.trim().toLowerCase().startsWith("cc-exchange:");
}

export function getExchangeCategories(offer: ExchangeCategoryOffer): ExchangeCategory[] {
  if (offer.isPublicPreview) {
    const previewCategories = unique(
      (offer.publicCategories ?? [])
        .map((category) => currentCategory(category))
        .filter((category): category is ExchangeCategory => category !== null),
    );
    if (previewCategories.length > 0) return previewCategories;

    const legacyCategory = currentCategory(offer.publicCategory);
    return legacyCategory ? [legacyCategory] : [];
  }

  const kind = offer.kind?.trim().toLowerCase() ?? "";
  const tags = normalizedTags(offer.tags);
  const isResidentialSpaceSwap = isResidentialSpaceSwapOffer(offer, kind, tags);
  const hasHousingSubtype = [...tags].some((tag) => tag.startsWith("cc-exchange:housing:"));
  const includesWorkspace =
    tags.has(EXCHANGE_TAXONOMY_TAGS.includesWorkspace) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesEvent) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesFlexible) ||
    tags.has(EXCHANGE_TAXONOMY_TAGS.spacesShared);
  const hasHousing = ["host", "looking", "swap"].includes(kind) || hasHousingSubtype || isResidentialSpaceSwap;
  const hasSpaces = SPACE_OFFER_KINDS.has(kind) || includesWorkspace;
  const categories: ExchangeCategory[] = [];

  if (hasHousing) categories.push("housing");
  if (hasSpaces) categories.push("spaces");

  const mappedCategory = OFFER_CATEGORY_BY_KIND[kind];
  const isResidencyOffer = tags.has(EXCHANGE_TAXONOMY_TAGS.housingResidency) || tags.has(LEGACY_RESIDENCY_TAG);
  if (
    mappedCategory &&
    !categories.includes(mappedCategory) &&
    !(mappedCategory === "opportunities" && isResidencyOffer)
  ) {
    categories.push(mappedCategory);
  }

  return categories;
}

export function getExchangeCategory(offer: ExchangeCategoryOffer): ExchangeCategory | null {
  return getExchangeCategories(offer)[0] ?? null;
}

export function getExchangeSubfilters(offer: ExchangeCategoryOffer): ExchangeSubfilter[] {
  if (offer.isPublicPreview) {
    return unique(offer.publicSubfilters ?? []);
  }

  const kind = offer.kind?.trim().toLowerCase() ?? "";
  const tags = normalizedTags(offer.tags);
  const text = `${offer.description ?? ""} ${offer.duration ?? ""}`.toLowerCase();
  const isResidentialSpaceSwap = isResidentialSpaceSwapOffer(offer, kind, tags);
  const categories = getExchangeCategories(offer);
  const subfilters: ExchangeSubfilter[] = [];
  const hasExplicitSpacesSubtype = [
    EXCHANGE_TAXONOMY_TAGS.includesWorkspace,
    EXCHANGE_TAXONOMY_TAGS.spacesEvent,
    EXCHANGE_TAXONOMY_TAGS.spacesFlexible,
    EXCHANGE_TAXONOMY_TAGS.spacesShared,
  ].some((tag) => tags.has(tag));

  if (categories.includes("housing")) {
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingResidency) || tags.has(LEGACY_RESIDENCY_TAG)) {
      subfilters.push("housing_residency");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingSublet) || (kind === "host" && /\bsublet\b/i.test(text))) {
      subfilters.push("housing_sublet");
    }
    if (
      tags.has(EXCHANGE_TAXONOMY_TAGS.housingLongTerm) ||
      (kind === "host" && /\blong[ -]?term\b/i.test(text))
    ) {
      subfilters.push("housing_long_term");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.housingHosted)) {
      subfilters.push("housing_hosted");
    }
    if (
      kind === "swap" ||
      tags.has(LEGACY_RESIDENCY_TAG) ||
      tags.has(EXCHANGE_TAXONOMY_TAGS.skillStayRequest) ||
      isResidentialSpaceSwap
    ) {
      subfilters.push("housing_swap");
    }
  }

  if (categories.includes("spaces")) {
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.includesWorkspace) || (!hasExplicitSpacesSubtype && kind === "workshop")) {
      subfilters.push("spaces_workspace");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesEvent) || (!hasExplicitSpacesSubtype && kind === "concert")) {
      subfilters.push("spaces_event");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesFlexible) || (!hasExplicitSpacesSubtype && kind === "free_space")) {
      subfilters.push("spaces_flexible");
    }
    if (tags.has(EXCHANGE_TAXONOMY_TAGS.spacesShared) || (!hasExplicitSpacesSubtype && kind === "venue_offer")) {
      subfilters.push("spaces_shared");
    }
    if (kind === "swap" || tags.has(EXCHANGE_TAXONOMY_TAGS.arrangementSwap)) {
      subfilters.push("spaces_swap");
    }
  }

  return unique(subfilters);
}

export function getExchangeSubfilterLabel(subfilter: ExchangeSubfilter): string {
  for (const options of Object.values(EXCHANGE_SUBFILTER_GROUPS)) {
    const option = options.find((candidate) => candidate.value === subfilter);
    if (option) return option.label;
  }
  return subfilter;
}

export function matchesExchangeFilter(
  offer: ExchangeCategoryOffer,
  filter: ExchangeFilter,
): boolean {
  if (filter === "all") return true;
  return getExchangeCategories(offer).includes(currentCategory(filter) ?? filter);
}

export function matchesExchangeSubfilter(
  offer: ExchangeCategoryOffer,
  subfilter: ExchangeSubfilter,
): boolean {
  return getExchangeSubfilters(offer).includes(subfilter);
}
