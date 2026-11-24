import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearchText } from "./searchMatching.ts";

test("search matches singular and plural co-living terms across punctuation", () => {
  assert.equal(matchesSearchText("colivings", ["Anceu Co-Living"]), true);
  assert.equal(matchesSearchText("co-livings", ["Anceu Co-Living"]), true);
  assert.equal(matchesSearchText("co-living", ["Anceu Co-Living"]), true);
});

test("search still normalizes accents and matches all query terms", () => {
  assert.equal(matchesSearchText("squats Paris", ["59 Rivoli", "Paris", "squat"]), true);
  assert.equal(matchesSearchText("squats in Tokyo", ["59 Rivoli", "Paris", "squat"]), false);
});
