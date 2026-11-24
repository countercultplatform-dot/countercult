import assert from "node:assert/strict";
import test from "node:test";
import { EXCHANGE_TAXONOMY_TAGS } from "./exchangeCategories.ts";
import {
  getVisibleCountercultResidencies,
  isFreeExchangeOffer,
  toggleFreeExchangeFilter,
} from "./exchangeFilters.ts";

test("free Exchange filtering includes housing swaps and all skill exchanges", () => {
  assert.equal(isFreeExchangeOffer({ kind: "swap", cost: "€500" }), true);
  assert.equal(isFreeExchangeOffer({ kind: "skill_share", cost: null }), true);
  assert.equal(isFreeExchangeOffer({ kind: "host", tags: [EXCHANGE_TAXONOMY_TAGS.arrangementSwap] }), true);
  assert.equal(isFreeExchangeOffer({ kind: "host", tags: [EXCHANGE_TAXONOMY_TAGS.housingHosted] }), true);
});

test("free Exchange filtering includes explicitly free spaces and offers", () => {
  assert.equal(isFreeExchangeOffer({ kind: "free_space" }), true);
  assert.equal(isFreeExchangeOffer({ kind: "venue_offer", cost: "Free" }), true);
  assert.equal(isFreeExchangeOffer({ isPublicPreview: true, publicTags: ["countercult:art-houses:free"] }), true);
  assert.equal(isFreeExchangeOffer({ kind: "host", cost: "€500" }), false);
});

test("turning on Free clears category and subtype filters so cross-category offers remain visible", () => {
  assert.deepEqual(
    toggleFreeExchangeFilter({ category: "housing", subfilter: "housing_swap", cost: "all" }),
    { category: "all", subfilter: null, cost: "free" },
  );
  assert.deepEqual(
    toggleFreeExchangeFilter({ category: "all", subfilter: null, cost: "free" }),
    { category: "all", subfilter: null, cost: "all" },
  );
});

test("residency search returns the active Countercult Exchange programme", () => {
  assert.deepEqual(getVisibleCountercultResidencies(""), ["the-floor"]);
  assert.deepEqual(getVisibleCountercultResidencies("Berlin Floor"), ["the-floor"]);
  assert.deepEqual(getVisibleCountercultResidencies("Guadalajara Mexico"), []);
  assert.deepEqual(getVisibleCountercultResidencies("New York"), []);
});
