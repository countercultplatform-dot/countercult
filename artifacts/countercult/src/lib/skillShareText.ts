function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getCharacterTrigrams(value: string): Set<string> {
  const characters = [...value.replace(/\s/g, "")];
  const trigrams = new Set<string>();

  for (let index = 0; index <= characters.length - 3; index += 1) {
    trigrams.add(characters.slice(index, index + 3).join(""));
  }

  return trigrams;
}

export function areSkillShareAnswersNearDuplicate(
  offer: string,
  requestedReturn: string,
): boolean {
  const normalizedOffer = normalizeAnswer(offer);
  const normalizedReturn = normalizeAnswer(requestedReturn);

  if (!normalizedOffer || !normalizedReturn) return false;
  if (normalizedOffer === normalizedReturn) return normalizedOffer.length >= 20;
  if (Math.min(normalizedOffer.length, normalizedReturn.length) < 40) return false;

  const offerCharacters = [...normalizedOffer.replace(/\s/g, "")];
  const returnCharacters = [...normalizedReturn.replace(/\s/g, "")];
  const lengthRatio = Math.min(offerCharacters.length, returnCharacters.length)
    / Math.max(offerCharacters.length, returnCharacters.length);
  if (lengthRatio < 0.85) return false;

  const offerTrigrams = getCharacterTrigrams(normalizedOffer);
  const returnTrigrams = getCharacterTrigrams(normalizedReturn);
  const sharedTrigrams = [...offerTrigrams].filter((trigram) => returnTrigrams.has(trigram)).length;
  const diceSimilarity = (2 * sharedTrigrams) / (offerTrigrams.size + returnTrigrams.size);

  return diceSimilarity >= 0.92;
}
