import test from "node:test";
import assert from "node:assert/strict";
import { getExchangeComposerPrefill } from "./exchangeFlow.ts";

test("the Exchange Residency CTA prefills only the fixed-cohort campaign", () => {
  assert.deepEqual(getExchangeComposerPrefill("campaign"), {
    exchangeResidency: true,
  });
});