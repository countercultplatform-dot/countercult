import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdditionalBaseCities,
  hasBaseCity,
  matchesBaseCitySearch,
} from "./entryLocations.ts";

test("additional base-city labels omit the primary city and case-insensitive duplicates", () => {
  assert.deepEqual(
    getAdditionalBaseCities({
      city: "Berlin",
      basedIn: [" Berlin ", "Oslo", "Bergen", "OSLO", ""],
    }),
    ["Oslo", "Bergen"],
  );
});

test("city search matches a secondary base city without changing the primary city", () => {
  const entry = { city: "Berlin", basedIn: ["Oslo", "Bergen"] };
  assert.equal(matchesBaseCitySearch(entry, "oslo"), true);
  assert.equal(matchesBaseCitySearch(entry, "Bergen"), true);
  assert.equal(matchesBaseCitySearch(entry, "Copenhagen"), false);
});

test("city pages match an exact primary or additional base city", () => {
  const entry = { city: "Berlin", basedIn: ["Oslo", "Bergen"] };
  assert.equal(hasBaseCity(entry, "Oslo"), true);
  assert.equal(hasBaseCity(entry, "berlin"), true);
  assert.equal(hasBaseCity(entry, "Osl"), false);
});

test("city matching ignores diacritics and empty search queries", () => {
  const entry = { city: "São Paulo", basedIn: ["Zürich"] };
  assert.equal(matchesBaseCitySearch(entry, "sao"), true);
  assert.equal(hasBaseCity(entry, "zurich"), true);
  assert.equal(matchesBaseCitySearch(entry, " "), true);
});
