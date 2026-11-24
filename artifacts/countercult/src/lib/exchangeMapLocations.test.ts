import test from "node:test";
import assert from "node:assert/strict";
import {
  canShowExchangeOfferOnMap,
  getApproximateCityCoordinates,
  getApproximateMapLocation,
} from "./exchangeMapLocations.ts";

test("known city labels resolve to coarse coordinates", () => {
  assert.deepEqual(getApproximateCityCoordinates("Berlin, Germany"), [52.5, 13.4]);
  assert.deepEqual(getApproximateCityCoordinates("NYC"), [40.7, -74]);
  assert.deepEqual(getApproximateCityCoordinates("Rural Galicia"), [42.6, -8.6]);
  assert.deepEqual(getApproximateCityCoordinates("Guadalajara"), [20.7, -103.4]);
});

test("unknown locations remain list-only rather than being guessed", () => {
  assert.equal(getApproximateCityCoordinates("A small village near the coast"), null);
});

test("Alicante and Xàtiva composite locations use a broad Spain-level map point", () => {
  assert.deepEqual(getApproximateCityCoordinates("Alicante+Xativa"), [40, -4]);
  assert.deepEqual(getApproximateMapLocation("Alicante+Xativa"), {
    lat: 40,
    lng: -4,
    label: "Spain",
    precision: "country",
  });
  assert.equal(getApproximateCityCoordinates("Alicante+Paris"), null);
});

test("public offer locations can appear on the map to any visitor", () => {
  assert.equal(
    canShowExchangeOfferOnMap(
      { visibility: "public" },
      { isAuthenticated: false, hasApprovedPin: false },
    ),
    true,
  );
});

test("only explicitly public teaser locations can appear on the anonymous map", () => {
  assert.equal(
    canShowExchangeOfferOnMap(
      { isPublicPreview: true, hasPublicMapLocation: true },
      { isAuthenticated: false, hasApprovedPin: false },
    ),
    true,
  );
  assert.equal(
    canShowExchangeOfferOnMap(
      { isPublicPreview: true },
      { isAuthenticated: false, hasApprovedPin: false },
    ),
    false,
  );
});

test("network offer locations require an approved member or the listing owner", () => {
  const viewer = { isAuthenticated: false, hasApprovedPin: false };
  assert.equal(canShowExchangeOfferOnMap({ visibility: "network" }, viewer), false);
  assert.equal(
    canShowExchangeOfferOnMap(
      { visibility: "network" },
      { isAuthenticated: true, hasApprovedPin: true },
    ),
    true,
  );
  assert.equal(
    canShowExchangeOfferOnMap(
      { visibility: "network", isOwn: true },
      { isAuthenticated: true, hasApprovedPin: false },
    ),
    true,
  );
});

test("private and unspecified listings never get map markers", () => {
  const viewer = { isAuthenticated: true, hasApprovedPin: true };
  assert.equal(canShowExchangeOfferOnMap({ visibility: "private" }, viewer), false);
  assert.equal(canShowExchangeOfferOnMap({}, viewer), false);
});
