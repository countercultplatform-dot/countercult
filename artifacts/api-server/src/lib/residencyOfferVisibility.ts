export interface ResidencyOfferProfileState {
  entryId: number | null;
  entryApproved: boolean | null;
  entryStatus: string | null;
  entryHidden: boolean | null;
  entryDeletedAt: Date | string | null;
}

export function canExposeResidencyOfferForProfile(
  offer: ResidencyOfferProfileState,
  isOwner: boolean,
): boolean {
  if (offer.entryId === null) return true;
  if (offer.entryDeletedAt !== null || offer.entryHidden !== false) return false;
  if (offer.entryApproved === true && offer.entryStatus === "published") return true;

  return isOwner &&
    offer.entryApproved !== true &&
    offer.entryStatus === "pending_review";
}
