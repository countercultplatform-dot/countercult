import assert from "node:assert/strict";
import test from "node:test";
import { addProfileTags, parseProfileTags, toggleProfileTag } from "./profileTags.ts";

test("profile tags parse, normalize spacing, and deduplicate case-insensitively", () => {
  assert.deepEqual(parseProfileTags("  DJ  , visual   artists, dj,  "), ["DJ", "visual artists"]);
});

test("suggested profile tags can be selected and removed", () => {
  assert.equal(toggleProfileTag("musicians", "djs"), "musicians, djs");
  assert.equal(toggleProfileTag("musicians, djs", "DJS"), "musicians");
});

test("custom profile tags append without replacing selected suggestions", () => {
  assert.equal(addProfileTags("artist-run, musicians", "experimental, MUSICiANS"), "artist-run, musicians, experimental");
});
