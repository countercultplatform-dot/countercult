export const OFFERING_CHOICES = [
  "a room / short-term stay",
  "tools / equipment / materials",
  "paid work / gigs",
  "organizing artist coworking",
  "skill swaps",
  "a studio / workspace",
  "a venue / event space",
  "artist opportunities / open calls",
] as const;

export const OPEN_TO_CHOICES = [
  "collaborations",
  "commissions / paid work",
  "a place to stay",
  "studio / workspace",
  "residencies",
  "jobs / gigs",
  "local introductions",
  "exhibitions / bookings",
  "workshops / learning",
  "press / features",
] as const;

export const LEGACY_OFFERING_CHOICES = [
  "a place to stay",
  "hosting residencies",
  "tourism support / local recommendations",
  "a room / place to stay",
  "a workspace / studio",
  "venue / event space",
  "tools / equipment",
  "equipment / materials",
  "materials / supplies",
  "tools / equipment / materials",
  "skills / peer support",
  "jobs / paid opportunities",
  "local knowledge / introductions",
  "a paid opportunity / gig",
  "a coworking partner",
  "free space",
  "space / venue",
  "local recommendations",
  "introductions to people / places",
  "teaching / workshops",
  "feedback / peer support",
  "language / practical local help",
] as const;

export const ALL_OFFERING_CHOICES = [
  ...OFFERING_CHOICES,
  ...LEGACY_OFFERING_CHOICES,
] as const;

const OFFERING_ALIASES: Record<string, string> = {
  "a place to stay": "a room / short-term stay",
  "a room / place to stay": "a room / short-term stay",
  "housing offers": "a room / short-term stay",
  "hosting residencies": "artist opportunities / open calls",
  "a workspace / studio": "a studio / workspace",
  "studio / workspace": "a studio / workspace",
  "venue / event space": "a venue / event space",
  "space / venue": "a venue / event space",
  "tools / equipment": "tools / equipment / materials",
  "equipment / materials": "tools / equipment / materials",
  "materials / supplies": "tools / equipment / materials",
  "jobs / paid opportunities": "paid work / gigs",
  "a paid opportunity / gig": "paid work / gigs",
  "a coworking partner": "organizing artist coworking",
  "skills / peer support": "skill swaps",
  "free space": "a venue / event space",
};

const RETIRED_OFFERING_CHOICES = new Set([
  "tourism support / local recommendations",
  "local recommendations",
  "introductions to people / places",
  "local knowledge / introductions",
  "teaching / workshops",
  "feedback / peer support",
  "language / practical local help",
]);

const KNOWN_OFFERING_CHOICES = new Set<string>(ALL_OFFERING_CHOICES);
const ACTIVE_OFFERING_CHOICES = new Set<string>(OFFERING_CHOICES);

export function normalizeOfferingChoice(value: string): string {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  if (RETIRED_OFFERING_CHOICES.has(normalized)) return "";
  return OFFERING_ALIASES[normalized] ?? trimmed;
}

export function isOfferingChoice(value: string): boolean {
  return ACTIVE_OFFERING_CHOICES.has(normalizeOfferingChoice(value));
}

export type ParsedOfferings = {
  choices: string[];
  details: string;
};

export function parseOfferings(value: string | null | undefined): ParsedOfferings {
  const sections = (value ?? "").trim().split(/\n\n+/);
  const choiceSection = sections.shift() ?? "";
  const choices: string[] = [];
  const unclassifiedDetails: string[] = [];

  for (const rawChoice of choiceSection.split(",").map((item) => item.trim()).filter(Boolean)) {
    const normalized = normalizeOfferingChoice(rawChoice);
    if (ACTIVE_OFFERING_CHOICES.has(normalized)) {
      if (!choices.includes(normalized)) choices.push(normalized);
    } else if (!KNOWN_OFFERING_CHOICES.has(rawChoice)) {
      unclassifiedDetails.push(rawChoice);
    }
  }

  const details = [
    unclassifiedDetails.join(", "),
    sections.join("\n\n").trim(),
  ].filter(Boolean).join("\n\n");

  return { choices, details };
}

export function serializeOfferings(choices: string[], details: string): string {
  const normalizedChoices = choices
    .map(normalizeOfferingChoice)
    .filter((choice) => ACTIVE_OFFERING_CHOICES.has(choice))
    .filter((choice, index, all) => all.indexOf(choice) === index);
  const normalizedDetails = details.trim();

  return [normalizedChoices.join(", "), normalizedDetails].filter(Boolean).join("\n\n");
}

const LEGACY_HOUSING_VALUES = new Set(["housing offers"]);
const LEGACY_HOSTING_VALUES = new Set([
  "hosting residencies",
  "residencies",
  "residency opportunities",
  "artist residency",
  "artist residencies",
  "hosting residency",
]);

export function getPublicOpenTo(values: string[]): string[] {
  return values
    .map((value) => {
      const normalized = value.trim().toLowerCase();
      if (LEGACY_HOSTING_VALUES.has(normalized)) return null;
      if (LEGACY_HOUSING_VALUES.has(normalized)) return "being a resident";
      return value;
    })
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
}