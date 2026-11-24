export type EditorialTrail = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type TrailContext = {
  city?: string | null;
  kind?: string | null;
  tags?: string[];
};

const TRAILS: Record<string, EditorialTrail> = {
  anceuArchive: {
    eyebrow: "place note",
    title: "Why rural places need living cultural archives",
    description: "A field note on documenting what is already active in rural places without flattening it into a destination brand.",
    href: "/journal/why-rural-places-need-living-cultural-archives/",
    label: "read the place note →",
  },
  anceuPilot: {
    eyebrow: "field note",
    title: "The Rural Hackers pilot in Anceu",
    description: "How local relationships, cultural mapping, and practical infrastructure can become a foundation for future place work.",
    href: "/journal/preserving-the-unpreserved/",
    label: "read the field note →",
  },
  berlinSpaces: {
    eyebrow: "city note",
    title: "Berlin’s independent art spaces and culture economy",
    description: "A route through the spaces, scenes, and informal infrastructure that keep culture moving through the city.",
    href: "/journal/berlin-independent-art-spaces-culture-economy/",
    label: "read the city note →",
  },
  berlinNightlife: {
    eyebrow: "infrastructure note",
    title: "Nightlife is cultural infrastructure",
    description: "Why the places supporting a scene matter as much as the events or brands that later discover it.",
    href: "/journal/nightlife-infrastructure-subculture-berlin/",
    label: "read the infrastructure note →",
  },
  sowetoSpaces: {
    eyebrow: "space exchange",
    title: "Trackside Studios, Soweto",
    description: "A case study about artist space, local context, and the relationships behind a future exchange between cities.",
    href: "/journal/trackside-studios-soweto/",
    label: "read the case study →",
  },
  newYorkNetwork: {
    eyebrow: "network note",
    title: "Mapping independent culture in New York",
    description: "What becomes visible when artists and creative spaces are treated as a living network rather than a list.",
    href: "/journal/underground-culture-map-new-york/",
    label: "read the network note →",
  },
  artistNetwork: {
    eyebrow: "network note",
    title: "Why cultural networks need more than visibility",
    description: "The case for connecting public discovery to direct relationships, exchange, and paid work.",
    href: "/journal/curated-cultural-networks-local-knowledge/",
    label: "read the network note →",
  },
  artistExchange: {
    eyebrow: "exchange note",
    title: "Artist-to-artist exchange",
    description: "How shared rooms, spaces, practices, and local knowledge can support movement without turning culture into a booking platform.",
    href: "/journal/artist-to-artist-exchange/",
    label: "read the exchange note →",
  },
  experimentResidency: {
    eyebrow: "residency archive",
    title: "The art of the residency",
    description: "A Countercult residency note about creative connection, participation, and what becomes possible when the project is treated as a shared context.",
    href: "/journal/art-of-the-residency/",
    label: "read the residency note →",
  },
  floorProject: {
    eyebrow: "berlin project space",
    title: "THE FLOOR: an artist-run residency project",
    description: "The physical layer of the network: a Berlin project space and residency experiment built through relationships, not a large institutional budget.",
    href: "/journal/floor-artist-run-space-berlin/",
    label: "read the project note →",
  },
  spaceInfrastructure: {
    eyebrow: "space note",
    title: "Why subcultures need cultural infrastructure",
    description: "A practical argument for protecting the spaces, people, and informal systems that make a scene possible.",
    href: "/journal/why-subcultures-need-cultural-infrastructure/",
    label: "read the space note →",
  },
  placeDocumentation: {
    eyebrow: "method note",
    title: "Documenting place without flattening culture",
    description: "A guide to making local culture easier to find while keeping context, consent, and authorship intact.",
    href: "/journal/documenting-place-without-flattening-culture/",
    label: "read the method note →",
  },
};

function addTrail(
  trails: EditorialTrail[],
  key: keyof typeof TRAILS,
) {
  const trail = TRAILS[key];
  if (!trails.some((item) => item.href === trail.href)) trails.push(trail);
}

export function getEditorialTrails({ city, kind, tags = [] }: TrailContext) {
  const trails: EditorialTrail[] = [];
  const cityKey = city?.trim().toLowerCase() ?? "";
  const tagKeys = tags.map((tag) => tag.trim().toLowerCase());

  if (cityKey === "anceu") {
    addTrail(trails, "anceuPilot");
    addTrail(trails, "anceuArchive");
  } else if (cityKey === "berlin") {
    addTrail(trails, "berlinSpaces");
    addTrail(trails, "berlinNightlife");
  } else if (cityKey === "soweto" || cityKey === "johannesburg") {
    addTrail(trails, "sowetoSpaces");
  } else if (cityKey === "new york" || cityKey === "new york city" || cityKey === "nyc") {
    addTrail(trails, "newYorkNetwork");
  }

  if (tagKeys.includes("residency")) {
    addTrail(trails, "experimentResidency");
    if (cityKey === "berlin") addTrail(trails, "floorProject");
  }

  if (kind === "artist" || tagKeys.some((tag) => ["artist", "artists", "collective", "music", "residency"].includes(tag))) {
    addTrail(trails, "artistNetwork");
    addTrail(trails, "artistExchange");
  } else if (kind === "space" || tagKeys.some((tag) => ["space", "spaces", "venue", "gallery", "studio", "nightlife"].includes(tag))) {
    addTrail(trails, "spaceInfrastructure");
  } else if (kind === "artifact" || tagKeys.some((tag) => ["place", "archive", "rural", "heritage", "tradition"].includes(tag))) {
    addTrail(trails, "placeDocumentation");
  }

  if (trails.length === 0) addTrail(trails, "artistNetwork");
  return trails.slice(0, 3);
}