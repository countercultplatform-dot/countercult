import assert from "node:assert/strict";
import test from "node:test";
import {
  EXCHANGE_TAXONOMY_TAGS,
  getExchangeCategories,
  getExchangeCategory,
  getExchangeSubfilters,
  getExchangeSubfilterLabel,
  isPaidGigExchangeOffer,
  matchesExchangeFilter,
  matchesExchangeSubfilter,
} from "./exchangeCategories.ts";

test("full Exchange offers map to the public browse categories", () => {
  assert.equal(getExchangeCategory({ kind: "host" }), "housing");
  assert.equal(getExchangeCategory({ kind: "venue_offer" }), "spaces");
  assert.equal(getExchangeCategory({ kind: "skill_share" }), "skills");
  assert.equal(getExchangeCategory({ kind: "open_call" }), "opportunities");
  assert.equal(getExchangeCategory({ kind: "gig" }), "opportunities");
  assert.equal(getExchangeCategory({ kind: "partner_offer" }), "tools");
  assert.equal(getExchangeCategory({ kind: "swap" }), "housing");
});

test("paid gigs require a stated non-zero rate", () => {
  assert.equal(isPaidGigExchangeOffer({ kind: "gig", cost: "€250 flat" }), true);
  assert.equal(isPaidGigExchangeOffer({ kind: "gig", cost: "€0" }), false);
  assert.equal(isPaidGigExchangeOffer({ kind: "gig", cost: null }), false);
  assert.equal(isPaidGigExchangeOffer({ kind: "host", cost: "€250 flat" }), false);
});

test("the explicitly approved Norwich Open Call can be labelled Paid gig without inventing a rate", () => {
  assert.equal(isPaidGigExchangeOffer({
    kind: "gig",
    cost: null,
    tags: ["advert:paid-gig-exchange"],
  }), true);
});

test("housing offers can also appear in Spaces when they include a workspace", () => {
  const offer = {
    kind: "host",
    tags: [EXCHANGE_TAXONOMY_TAGS.housingResidency, EXCHANGE_TAXONOMY_TAGS.includesWorkspace],
  };

  assert.deepEqual(getExchangeCategories(offer), ["housing", "spaces"]);
  assert.equal(matchesExchangeFilter(offer, "housing"), true);
  assert.equal(matchesExchangeFilter(offer, "spaces"), true);
  assert.equal(matchesExchangeSubfilter(offer, "housing_residency"), true);
  assert.equal(matchesExchangeSubfilter(offer, "spaces_workspace"), true);
});

test("a free artist open call can be classified as a residency across Housing and Spaces", () => {
  const offer = {
    kind: "open_call",
    tags: [
      EXCHANGE_TAXONOMY_TAGS.housingResidency,
      EXCHANGE_TAXONOMY_TAGS.includesWorkspace,
    ],
  };

  assert.deepEqual(getExchangeCategories(offer), ["housing", "spaces"]);
  assert.deepEqual(getExchangeSubfilters(offer), ["housing_residency", "spaces_workspace"]);
  assert.equal(matchesExchangeFilter(offer, "housing"), true);
  assert.equal(matchesExchangeFilter(offer, "spaces"), true);
  assert.equal(matchesExchangeSubfilter(offer, "housing_residency"), true);
});

test("a skill swap asking for a free stay appears under Housing and Skills", () => {
  const offer = {
    kind: "skill_share",
    skillShareMode: "swap",
    requestedReturn: "A free stay in Berlin for 10 nights",
    tags: [EXCHANGE_TAXONOMY_TAGS.skillStayRequest],
  };

  assert.deepEqual(getExchangeCategories(offer), ["housing", "skills"]);
  assert.deepEqual(getExchangeSubfilters(offer), ["housing_swap"]);
  assert.equal(matchesExchangeFilter(offer, "housing"), true);
  assert.equal(matchesExchangeFilter(offer, "skills"), true);
  assert.equal(matchesExchangeSubfilter(offer, "housing_swap"), true);
});

test("housing and workspace swaps stay under their relevant parent categories", () => {
  const housingSwap = { kind: "swap" };
  const workspaceSwap = {
    kind: "workshop",
    tags: [EXCHANGE_TAXONOMY_TAGS.arrangementSwap],
  };

  assert.deepEqual(getExchangeCategories(housingSwap), ["housing"]);
  assert.equal(matchesExchangeSubfilter(housingSwap, "housing_swap"), true);
  assert.equal(matchesExchangeSubfilter(housingSwap, "spaces_swap"), false);

  assert.deepEqual(getExchangeCategories(workspaceSwap), ["spaces"]);
  assert.equal(matchesExchangeSubfilter(workspaceSwap, "spaces_swap"), true);
});

test("a room or apartment offered for a workspace swap appears under both Housing and Spaces", () => {
  const offer = {
    kind: "workshop",
    description: "space type: room in a shared space\n\nHouse swap for visiting artists.",
    tags: [EXCHANGE_TAXONOMY_TAGS.arrangementSwap],
  };

  assert.deepEqual(getExchangeCategories(offer), ["housing", "spaces"]);
  assert.deepEqual(getExchangeSubfilters(offer), ["housing_swap", "spaces_workspace", "spaces_swap"]);
});

test("explicit space subtypes replace broad kind-based subtype guesses", () => {
  const eventSpace = {
    kind: "workshop",
    tags: [EXCHANGE_TAXONOMY_TAGS.spacesEvent],
  };
  const studio = {
    kind: "free_space",
    tags: [EXCHANGE_TAXONOMY_TAGS.includesWorkspace],
  };

  assert.deepEqual(getExchangeSubfilters(eventSpace), ["spaces_event"]);
  assert.deepEqual(getExchangeSubfilters(studio), ["spaces_workspace"]);
});

test("free hosted housing is not categorized as a swap", () => {
  const offer = {
    kind: "host",
    tags: [EXCHANGE_TAXONOMY_TAGS.housingHosted],
  };

  assert.deepEqual(getExchangeCategories(offer), ["housing"]);
  assert.equal(matchesExchangeSubfilter(offer, "housing_hosted"), true);
  assert.equal(matchesExchangeSubfilter(offer, "housing_swap"), false);
});

test("legacy Exchange Residency room swaps are both Residency and Swap", () => {
  const offer = { kind: "swap", tags: ["exchange residency"] };

  assert.deepEqual(getExchangeSubfilters(offer), ["housing_residency", "housing_swap"]);
  assert.equal(getExchangeSubfilterLabel("housing_residency"), "Exchange Residency swap");
});

test("public previews use only their coarse category; hidden offer kinds stay hidden", () => {
  assert.equal(
    getExchangeCategory({ kind: "host", isPublicPreview: true }),
    null,
  );
  assert.equal(
    getExchangeCategory({ isPublicPreview: true, publicCategory: "housing" }),
    "housing",
  );
  assert.equal(
    matchesExchangeFilter({ isPublicPreview: true }, "housing"),
    false,
  );
  assert.equal(
    matchesExchangeFilter({ isPublicPreview: true }, "all"),
    true,
  );
});

test("public previews can expose safe multi-category and subfilter labels", () => {
  const preview = {
    isPublicPreview: true,
    publicCategory: "housing" as const,
    publicCategories: ["housing", "spaces"] as const,
    publicSubfilters: ["housing_residency", "spaces_workspace"] as const,
  };

  assert.deepEqual(getExchangeCategories(preview), ["housing", "spaces"]);
  assert.equal(matchesExchangeFilter(preview, "spaces"), true);
  assert.equal(matchesExchangeSubfilter(preview, "spaces_workspace"), true);
});

test("legacy public swap previews now appear under Housing", () => {
  const preview = { isPublicPreview: true, publicCategory: "swaps" as const };

  assert.deepEqual(getExchangeCategories(preview), ["housing"]);
  assert.equal(matchesExchangeFilter(preview, "housing"), true);
});
