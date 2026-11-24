import test from "node:test";
import assert from "node:assert/strict";
import { areSkillShareAnswersNearDuplicate } from "./skillShareText.ts";

test("matches copied answers after normalizing case, punctuation, and spacing", () => {
  assert.equal(
    areSkillShareAnswersNearDuplicate(
      "I offer graphic design and identity work.",
      " i OFFER graphic design, and identity work! ",
    ),
    true,
  );
});

test("warns when a long answer is copied with only a small addition", () => {
  const offer = "I can design a visual identity and build a logo system for your project";
  assert.equal(
    areSkillShareAnswersNearDuplicate(offer, `${offer}, today`),
    true,
  );
});

test("does not warn on short, generic answers", () => {
  assert.equal(
    areSkillShareAnswersNearDuplicate("Graphic design", "Graphic design"),
    false,
  );
});

test("does not warn when the requested return is materially different", () => {
  assert.equal(
    areSkillShareAnswersNearDuplicate(
      "I can design a visual identity and build a logo system for your project",
      "I am looking for help with photography, editing, and a portfolio review",
    ),
    false,
  );
});
