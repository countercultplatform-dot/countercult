export const PROFILE_TAG_SUGGESTIONS = [
  "artist-run",
  "independent music",
  "local makers",
  "living traditions",
  "gallery",
  "studio",
  "collective",
  "queer",
  "punk",
  "bipoc",
  "nightlife",
  "experimental",
  "rave",
  "residency",
  "visual artists",
  "musicians",
  "djs",
  "dancers",
  "photographers",
  "writers",
  "film",
  "theatre",
] as const;

export function parseProfileTags(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function toggleProfileTag(value: string, tag: string): string {
  const tags = parseProfileTags(value);
  const existing = tags.find((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase());
  return (existing
    ? tags.filter((item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase())
    : [...tags, tag]
  ).join(", ");
}

export function addProfileTags(value: string, input: string): string {
  const tags = parseProfileTags(value);
  const seen = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  for (const tag of parseProfileTags(input)) {
    if (!seen.has(tag.toLocaleLowerCase())) {
      tags.push(tag);
      seen.add(tag.toLocaleLowerCase());
    }
  }
  return tags.join(", ");
}
