import assert from "node:assert/strict";
import test from "node:test";
import {
  OFFERING_CHOICES,
  OPEN_TO_CHOICES,
  getPublicOpenTo,
  isOfferingChoice,
  normalizeOfferingChoice,
  parseOfferings,
  serializeOfferings,
} from "@workspace/profile-choices";

test("profile offer categories focus on resources, paid work, and artist exchange", () => {
  assert.deepEqual(OFFERING_CHOICES, [
    "a room / short-term stay",
    "tools / equipment / materials",
    "paid work / gigs",
    "organizing artist coworking",
    "skill swaps",
    "a studio / workspace",
    "a venue / event space",
    "artist opportunities / open calls",
  ]);
  assert.deepEqual(OPEN_TO_CHOICES, [
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
  ]);
  for (const retired of [
    "local recommendations",
    "introductions to people / places",
    "teaching / workshops",
    "feedback / peer support",
    "language / practical local help",
  ]) {
    assert.equal(OFFERING_CHOICES.includes(retired as (typeof OFFERING_CHOICES)[number]), false);
  }
});

test("legacy offer labels normalize to current categories and retired labels disappear", () => {
  assert.equal(normalizeOfferingChoice("tools / equipment"), "tools / equipment / materials");
  assert.equal(normalizeOfferingChoice("skills / peer support"), "skill swaps");
  assert.equal(normalizeOfferingChoice("space / venue"), "a venue / event space");
  assert.equal(normalizeOfferingChoice("feedback / peer support"), "");
  assert.equal(isOfferingChoice("a coworking partner"), true);
  assert.equal(isOfferingChoice("language / practical local help"), false);
});

test("persisted offerings keep active choices separate from freeform details", () => {
  assert.deepEqual(
    parseOfferings(
      "a room / place to stay, skills / peer support, teaching / workshops, paid work / gigs\n\nAvailable by arrangement.",
    ),
    {
      choices: ["a room / short-term stay", "skill swaps", "paid work / gigs"],
      details: "Available by arrangement.",
    },
  );
  assert.equal(
    serializeOfferings(
      ["a room / place to stay", "paid work / gigs", "paid work / gigs"],
      "Available by arrangement.",
    ),
    "a room / short-term stay, paid work / gigs\n\nAvailable by arrangement.",
  );
});

test("legacy open-to values are normalized without mixing them into offers", () => {
  assert.deepEqual(
    getPublicOpenTo(["housing offers", "collaborations", "hosting residencies"]),
    ["being a resident", "collaborations"],
  );
});