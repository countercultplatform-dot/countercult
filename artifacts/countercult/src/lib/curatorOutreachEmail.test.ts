import assert from "node:assert/strict";
import test from "node:test";
import { buildCuratorOutreachEmail } from "./curatorOutreachEmail.ts";

test("curator outreach preview personalizes recipient, greeting, and listing URL", () => {
  const email = buildCuratorOutreachEmail({
    id: 6470,
    name: "Bar Tausend",
    contactEmail: "hello@example.test",
  });

  assert.equal(email.recipient, "hello@example.test");
  assert.equal(email.subject, "Congrats! You’ve been curated by our artists");
  assert.match(email.html, /Hello Bar Tausend team/);
  assert.match(email.text, /Hello Bar Tausend team/);
  assert.match(email.html, /https:\/\/countercult\.network\/entries\/6470/);
  assert.match(email.text, /https:\/\/countercult\.network\/entries\/6470/);
  assert.match(email.html, /href="https:\/\/countercult\.network\/residency">Countercult Exchange<\/a>/);
  assert.match(email.html, /href="https:\/\/countercult\.network\/sketchyshona\/">Shona Neary<\/a>/);
  assert.match(email.text, /open-source database and sharing network built by artists/);
  assert.match(email.text, /Claim your pin and update its details, images, and links/);
  assert.doesNotMatch(email.text, /If we have anything wrong|rather not be listed|remove your email/);
});

test("curator outreach preview escapes pin names before inserting them into HTML", () => {
  const email = buildCuratorOutreachEmail({
    id: 12,
    name: "<script>alert(1)</script>",
    contactEmail: "hello@example.test",
  });

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.text, /<script>alert\(1\)<\/script>/);
});
