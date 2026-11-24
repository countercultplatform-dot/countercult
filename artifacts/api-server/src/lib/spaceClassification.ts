export type SpaceOrganizationModel =
  | "artist_run"
  | "nonprofit"
  | "community"
  | "independent"
  | "commercial_operator"
  | "hospitality"
  | "agency"
  | "institution"
  | "other";

export type SpaceClassification = "independent" | "commercial" | "needs_review";

/**
 * A space is commercial because it intends to use Countercult commercially,
 * never merely because it calls itself a venue or has a particular legal form.
 */
export function deriveSpaceClassification(input: {
  organizationModel?: string | null;
  intendedCommercialUse?: boolean | null;
}): SpaceClassification {
  if (input.intendedCommercialUse === true) return "commercial";
  if (input.intendedCommercialUse === false) return "independent";
  return "needs_review";
}

export function effectiveSpaceClassification(input: {
  reviewedClassification?: string | null;
  derivedClassification?: string | null;
}): SpaceClassification {
  const reviewed = input.reviewedClassification;
  if (reviewed === "independent" || reviewed === "commercial") return reviewed;
  return input.derivedClassification === "commercial"
    ? "commercial"
    : input.derivedClassification === "independent"
      ? "independent"
      : "needs_review";
}

export function isCanonicalEntryOwner(
  entry: { contactEmail?: string | null; claimedEmail?: string | null },
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return [entry.contactEmail, entry.claimedEmail]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.trim().toLowerCase() === normalized);
}