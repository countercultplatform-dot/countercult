import test from "node:test";
import assert from "node:assert/strict";
import { getNextPatronPostCutoff, getPatronPostCutoffCountdown } from "./patronPostCutoff.ts";

test("the next cutoff is midnight Berlin time on the fifth", () => {
  const now = new Date("2026-11-21T12:00:00.000Z");
  const countdown = getPatronPostCutoffCountdown(now);

  assert.equal(getNextPatronPostCutoff(now).toISOString(), "2026-12-04T23:00:00.000Z");
  assert.equal(countdown.deadlineLabel, "5 Dec");
  assert.equal(countdown.mailingMonthLabel, "December");
});

test("the cutoff rolls to the following month at midnight", () => {
  const exactCutoff = new Date("2026-12-04T23:00:00.000Z");

  assert.equal(
    getNextPatronPostCutoff(exactCutoff).toISOString(),
    "2027-01-04T23:00:00.000Z",
  );
});

test("the cutoff respects Berlin daylight saving time", () => {
  const beforeJuneCutoff = new Date("2027-06-04T21:00:00.000Z");

  assert.equal(
    getNextPatronPostCutoff(beforeJuneCutoff).toISOString(),
    "2027-06-04T22:00:00.000Z",
  );
});
