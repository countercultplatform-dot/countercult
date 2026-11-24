import { SEO_ORIGIN } from "./seo.ts";

export type CuratorOutreachEntry = {
  id: number;
  name: string;
  contactEmail: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCuratorOutreachEmail(entry: CuratorOutreachEntry) {
  const name = entry.name.trim();
  const safeName = escapeHtml(name);
  const recipient = entry.contactEmail.trim();
  const listingUrl = `${SEO_ORIGIN}/entries/${entry.id}`;
  const exchangeUrl = `${SEO_ORIGIN}/residency`;
  const countercultUrl = `${SEO_ORIGIN}/`;
  const countercultInstagramUrl = "https://www.instagram.com/countercult_creatives/";
  const sketchyShonaUrl = `${SEO_ORIGIN}/sketchyshona/`;
  const subject = "Congrats! You’ve been curated by our artists";
  const text = `Hello ${name} team,

Congrats! Artists building Countercult have curated ${name} onto the Culture Explorer because you’re creating space for culture. Your listing is free.

Countercult is an open-source database and sharing network built by artists. We curate every artist, collective, and space on the map so people can find one another and discover places to make work, gather, and collaborate.

View your pin: ${listingUrl}

Claim your pin and update its details, images, and links using the claim link on that page. We verify each request so the right people can manage the listing.

We’d love to have your collective or venue join the network, be found on the map, and share space, tools, gigs, calls, and opportunities on Countercult Exchange: ${exchangeUrl}

Countercult is created by artists and hackers, including founder Shona Neary: ${sketchyShonaUrl}

Best,
Shona and the Countercult team`;

  const html = `
    <p>Hello ${safeName} team,</p>
    <p>Congrats! Artists building Countercult have curated ${safeName} onto the Culture Explorer because you’re creating space for culture. <strong>Your listing is free.</strong></p>
    <p>Countercult is an open-source database and sharing network built by artists. We curate every artist, collective, and space on the map so people can find one another and discover places to make work, gather, and collaborate.</p>
    <p><a href="${listingUrl}">View your pin</a></p>
    <p>Claim your pin and update its details, images, and links using the claim link on that page. We verify each request so the right people can manage the listing.</p>
    <p>We’d love to have your collective or venue join the network, be found on the map, and share space, tools, gigs, calls, and opportunities on <a href="${exchangeUrl}">Countercult Exchange</a>.</p>
    <p>Countercult is created by artists and hackers, including founder <a href="${sketchyShonaUrl}">Shona Neary</a>.</p>
    <p>Best,<br />Shona and the Countercult team</p>
  `;

  return { recipient, subject, text, html, listingUrl, exchangeUrl, countercultUrl, countercultInstagramUrl, sketchyShonaUrl };
}
