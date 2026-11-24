export const stickerPositions = [
  "left-2 bottom-[8vh] sm:left-8",
  "right-2 bottom-[8vh] sm:right-8",
  "left-2 bottom-[12vh] sm:left-8",
  "right-2 bottom-[12vh] sm:right-8",
] as const;

export type StickerPosition = (typeof stickerPositions)[number];

const oppositeStickerPositions: Record<StickerPosition, StickerPosition> = {
  "left-2 bottom-[8vh] sm:left-8": "right-2 bottom-[8vh] sm:right-8",
  "right-2 bottom-[8vh] sm:right-8": "left-2 bottom-[8vh] sm:left-8",
  "left-2 bottom-[12vh] sm:left-8": "right-2 bottom-[12vh] sm:right-8",
  "right-2 bottom-[12vh] sm:right-8": "left-2 bottom-[12vh] sm:left-8",
};

export function chooseStickerPosition(): StickerPosition {
  return stickerPositions[Math.floor(Math.random() * stickerPositions.length)]!;
}

export function getOppositeStickerPosition(position: StickerPosition): StickerPosition {
  return oppositeStickerPositions[position];
}
