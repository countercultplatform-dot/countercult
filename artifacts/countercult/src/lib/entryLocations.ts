export interface EntryLocations {
  city?: string | null;
  basedIn?: readonly string[] | null;
}

function normalizeCity(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function getAdditionalBaseCities(entry: EntryLocations): string[] {
  const seen = new Set<string>();
  if (entry.city?.trim()) seen.add(normalizeCity(entry.city));

  const additional: string[] = [];
  for (const value of entry.basedIn ?? []) {
    const label = value.trim();
    if (!label) continue;
    const normalized = normalizeCity(label);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    additional.push(label);
  }
  return additional;
}

export function matchesBaseCitySearch(entry: EntryLocations, query: string): boolean {
  const normalizedQuery = normalizeCity(query);
  if (!normalizedQuery) return true;

  return [entry.city ?? "", ...getAdditionalBaseCities(entry)]
    .some((city) => normalizeCity(city).includes(normalizedQuery));
}

export function hasBaseCity(entry: EntryLocations, city: string): boolean {
  const normalizedTarget = normalizeCity(city);
  if (!normalizedTarget) return false;

  return [entry.city ?? "", ...getAdditionalBaseCities(entry)]
    .some((candidate) => normalizeCity(candidate) === normalizedTarget);
}
