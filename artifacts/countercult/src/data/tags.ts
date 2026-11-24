const TAG_ALIASES: Record<string, string> = {
  "installation art": "installation", "art installation": "installation", "installations": "installation",
  "performance art": "performance", "live performance": "performance", "performances": "performance",
  "art residency": "residency", "artist residency": "residency", "music residency": "residency",
  "residencies": "residency", "artist in residence": "residency", "residdency": "residency",
  "open calls": "open call", "call for artists": "open call", "call for entries": "open call",
  "art collective": "collective", "artist collective": "collective", "collectives": "collective",
  "record label": "label", "music label": "label",
  "recording studio": "studio", "art studio": "studio",
  "music festival": "festival", "art festival": "festival", "festivals": "festival",
  "electronic music": "electronic", "electronica": "electronic",
  "club music": "club", "clubbing": "club",
  "experimental music": "experimental", "experimental art": "experimental",
  "community art": "community", "community space": "community",
  "contemporary art": "contemporary", "contemporary music": "contemporary",
  "hiphop": "hip hop", "hip-hop": "hip hop",
};

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => {
      const normalized = tag.toLowerCase().trim();
      return TAG_ALIASES[normalized] ?? normalized;
    })
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

const OPEN_TO_LABELS: Record<string, string> = {
  "housing offers": "being a resident",
  "residencies": "hosting residencies",
  "residency opportunity": "hosting residencies",
  "residency opportunities": "hosting residencies",
  "artist residency": "hosting residencies",
  "artist residencies": "hosting residencies",
  "hosting residency": "hosting residencies",
};

export function formatOpenToLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  return OPEN_TO_LABELS[normalized] ?? value;
}