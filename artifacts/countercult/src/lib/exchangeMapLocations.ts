export type ExchangeMapVisibilityOffer = {
  visibility?: string | null;
  isOwn?: boolean;
  isPublicPreview?: boolean;
  hasPublicMapLocation?: boolean;
};

export type ExchangeMapViewer = {
  isAuthenticated: boolean;
  hasApprovedPin: boolean;
};

export type ApproximateMapLocation = {
  lat: number;
  lng: number;
  label: string;
  precision: "approximate" | "country";
};

const APPROXIMATE_CITY_COORDINATES: Record<string, [number, number]> = {
  amsterdam: [52.4, 4.9],
  austin: [30.3, -97.7],
  barcelona: [41.4, 2.2],
  berlin: [52.5, 13.4],
  brooklyn: [40.7, -74.0],
  "cape town": [-33.9, 18.4],
  dublin: [53.3, -6.3],
  galicia: [42.6, -8.6],
  "greater london": [51.5, -0.1],
  "hong kong": [22.3, 114.2],
  lisbon: [38.7, -9.1],
  london: [51.5, -0.1],
  "los angeles": [34.1, -118.2],
  madrid: [40.4, -3.7],
  "mexico city": [19.4, -99.1],
  guadalajara: [20.7, -103.4],
  nyc: [40.7, -74.0],
  "new york": [40.7, -74.0],
  "new york city": [40.7, -74.0],
  paris: [48.9, 2.4],
  philadelphia: [39.9, -75.2],
  prague: [50.1, 14.4],
  "rural galicia": [42.6, -8.6],
  "rural spain": [40.2, -3.7],
  tbilisi: [41.7, 44.8],
};

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  spain: [40, -4],
};

const KNOWN_CITY_COUNTRIES: Record<string, string> = {
  alicante: "spain",
  xativa: "spain",
};

const COUNTRY_LABELS: Record<string, string> = {
  spain: "Spain",
};

function normalizeCityName(city: string): string {
  return city
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .split(",")[0]
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getApproximateMapLocation(city: string): ApproximateMapLocation | null {
  const normalized = normalizeCityName(city);
  const cityCoordinates = APPROXIMATE_CITY_COORDINATES[normalized];
  if (cityCoordinates) {
    return {
      lat: cityCoordinates[0],
      lng: cityCoordinates[1],
      label: city.split(",")[0].trim() || city,
      precision: "approximate",
    };
  }

  const locationParts = city
    .split(/[+,;|/]/)
    .map((part) => normalizeCityName(part))
    .filter(Boolean);
  const countries = locationParts.map((part) =>
    KNOWN_CITY_COUNTRIES[part] ?? (part in COUNTRY_COORDINATES ? part : null)
  );
  if (countries.length === 0 || countries.some((country) => country === null)) return null;

  const uniqueCountries = new Set(countries);
  if (uniqueCountries.size !== 1) return null;

  const country = countries[0];
  if (!country) return null;
  const coordinates = COUNTRY_COORDINATES[country];
  const label = COUNTRY_LABELS[country];
  if (!coordinates || !label) return null;

  return {
    lat: coordinates[0],
    lng: coordinates[1],
    label,
    precision: "country",
  };
}

/**
 * Resolve known city labels and explicitly recognized country fallbacks.
 * Unknown locations stay list-only rather than being guessed from free text.
 */
export function getApproximateCityCoordinates(city: string): [number, number] | null {
  const location = getApproximateMapLocation(city);
  return location ? [location.lat, location.lng] : null;
}

/**
 * A listing's audience controls who may see its approximate map location.
 * Public listings are intentionally shareable; network locations require an
 * approved member or the listing's owner. Private and unspecified rows fail closed.
 */
export function canShowExchangeOfferOnMap(
  offer: ExchangeMapVisibilityOffer,
  viewer: ExchangeMapViewer,
): boolean {
  if (offer.isPublicPreview === true) {
    return offer.hasPublicMapLocation === true;
  }
  if (offer.visibility === "public") return true;
  if (offer.visibility !== "network" || !viewer.isAuthenticated) return false;
  return viewer.hasApprovedPin || offer.isOwn === true;
}
