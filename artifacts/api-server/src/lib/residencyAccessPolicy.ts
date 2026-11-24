export const ROOM_SWAP_KINDS = ["host", "swap", "looking"] as const;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function isShortTermSublet(kind: string, duration: string | null): boolean {
  if (kind !== "host" || !duration?.trim()) return false;
  const normalized = duration.trim().toLowerCase().replace(/[_-]+/g, " ");
  return normalized === "shortterm"
    || normalized.includes("short term")
    || normalized.includes("sublet");
}

export function parseAvailabilityEnd(value: string | null): Date | null {
  const input = value?.trim();
  if (!input) return null;

  const monthYear = input.toLowerCase().match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/,
  );
  if (monthYear) {
    const month = MONTH_NAMES.indexOf(monthYear[1]);
    const year = Number(monthYear[2]);
    return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  }

  const yearMonth = input.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonth) {
    return new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]), 0, 23, 59, 59, 999));
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
}

export function shouldExpireByAvailability(
  offer: { kind: string; duration: string | null; availableTo: string | null },
  now: Date,
): boolean {
  if (!isShortTermSublet(offer.kind, offer.duration)) return false;
  const availabilityEnd = parseAvailabilityEnd(offer.availableTo);
  return availabilityEnd !== null && availabilityEnd < now;
}