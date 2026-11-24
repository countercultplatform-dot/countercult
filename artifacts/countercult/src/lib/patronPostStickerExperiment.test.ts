import test from "node:test";
import assert from "node:assert/strict";
import { parsePatronPostStickerAttribution } from "./patronPostStickerExperiment.ts";

test("recent envelope sticker clicks retain their attribution", () => {
  const now = 1_800_000_000_000;
  const serialized = JSON.stringify({ variant: "envelope", clickedAt: now - 1_000 });
  assert.deepEqual(parsePatronPostStickerAttribution(serialized, now), {
    variant: "envelope",
    clickedAt: now - 1_000,
  });
});

test("old snail variants, expired, future-dated, or malformed attribution is ignored", () => {
  const now = 1_800_000_000_000;
  assert.equal(parsePatronPostStickerAttribution("not-json", now), null);
  assert.equal(parsePatronPostStickerAttribution(
    JSON.stringify({ variant: "snail", clickedAt: now - 1_000 }),
    now,
  ), null);
  assert.equal(parsePatronPostStickerAttribution(
    JSON.stringify({ variant: "snail", clickedAt: now - 31 * 24 * 60 * 60 * 1000 }),
    now,
  ), null);
  assert.equal(parsePatronPostStickerAttribution(
    JSON.stringify({ variant: "snail", clickedAt: now + 1 }),
    now,
  ), null);
});
