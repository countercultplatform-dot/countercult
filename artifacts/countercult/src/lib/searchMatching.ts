export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function matchesSearchText(query: string, fields: string[]): boolean {
  const stem = (term: string) => term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean).map(stem);
  const haystack = normalizeSearchText(fields.join(" "));
  const words = new Set(haystack.split(/\s+/).filter(Boolean));
  const compactHaystack = haystack.replaceAll(" ", "");
  return terms.every((term) => words.has(term) || compactHaystack.includes(term));
}
