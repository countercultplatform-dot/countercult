import { Router, type IRouter } from "express";
import {
  listConsentedPublicArtistProfilesForWeekly,
  listPublicExchangeWeeklyCandidates,
} from "./residency";

const router: IRouter = Router();
const pageUrl = "https://countercult.network/journal/exchange-weekly/";
const siteName = "Countercult";
const categoryLabels: Record<string, string> = {
  housing: "Housing",
  spaces: "Spaces",
  skills: "Skills",
  opportunities: "Opportunities",
  paid_work: "Paid work",
  tools: "Tools",
  swaps: "Swaps",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isoWeek(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function publicCategories(offer: { publicCategories?: string[]; publicCategory?: string }): string[] {
  const categories = offer.publicCategories?.length
    ? offer.publicCategories
    : offer.publicCategory
      ? [offer.publicCategory]
      : [];
  return [...new Set(categories.map((category) => categoryLabels[category] ?? "Cultural opportunity"))];
}

function selectWeeklyFeatures<T extends {
  id: number;
  city?: string;
  description?: string;
  publicCategories?: string[];
  publicCategory?: string;
  publicPhotoUrls?: string[];
  publicProfile?: { id: number; name: string; city: string | null; country: string | null; heroPhoto: string | null };
}>(offers: T[], limit = 5): T[] {
  const ranked = offers
    .map((offer) => {
      const words = (offer.description ?? "").trim().split(/\s+/).filter(Boolean).length;
      const detailScore = Math.min(words, 90) / 6;
      const imageScore = offer.publicPhotoUrls?.length ? 8 : 0;
      return { offer, baseScore: detailScore + imageScore };
    })
    .sort((a, b) => b.baseScore - a.baseScore || a.offer.id - b.offer.id);

  const selected: T[] = [];
  const usedCities = new Set<string>();
  const usedCategories = new Set<string>();

  while (selected.length < limit && ranked.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    ranked.forEach(({ offer, baseScore }, index) => {
      const city = (offer.city ?? "").trim().toLowerCase();
      const categories = publicCategories(offer).map((category) => category.toLowerCase());
      const diversityScore =
        (city && !usedCities.has(city) ? 5 : 0) +
        (categories.some((category) => !usedCategories.has(category)) ? 7 : 0);
      const score = baseScore + diversityScore;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [chosen] = ranked.splice(bestIndex, 1);
    if (!chosen) break;
    selected.push(chosen.offer);
    if (chosen.offer.city) usedCities.add(chosen.offer.city.trim().toLowerCase());
    publicCategories(chosen.offer).forEach((category) => usedCategories.add(category.toLowerCase()));
  }

  return selected;
}

function renderWeeklyPage(
  offers: Awaited<ReturnType<typeof listPublicExchangeWeeklyCandidates>>,
  profiles: Awaited<ReturnType<typeof listConsentedPublicArtistProfilesForWeekly>>,
  now: Date,
): string {
  const week = isoWeek(now);
  const title = `Artist Housing, Spaces and Opportunities This Week | ${siteName}`;
  const description =
    "A weekly selection of active public listings from the Countercult Exchange, including artist housing, creative spaces, and cultural opportunities.";
  const features = selectWeeklyFeatures(offers);
  const indexable = features.length >= 3;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `This week on the Countercult Exchange: ${week}`,
    description,
    datePublished: now.toISOString(),
    dateModified: now.toISOString(),
    author: { "@type": "Organization", name: "Countercult", url: "https://countercult.network/" },
    publisher: { "@type": "Organization", name: "Countercult", url: "https://countercult.network/" },
    mainEntityOfPage: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: features.length,
      itemListElement: features.map((offer, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${offer.city || "Local"}: ${publicCategories(offer).join(" + ") || "Cultural opportunity"}`,
        description: offer.description,
        url: "https://countercult.network/residency",
        ...(offer.publicProfile
          ? {
              author: {
                "@type": "Person",
                name: offer.publicProfile.name,
                url: `https://countercult.network/entries/${offer.publicProfile.id}`,
              },
            }
          : {}),
      })),
    },
    mentions: profiles.map((profile) => ({
      "@type": "Person",
      name: profile.name,
      url: `https://countercult.network/entries/${profile.id}`,
    })),
  };
  const safeSchema = JSON.stringify(articleSchema).replaceAll("<", "\\u003c");
  const cards = features.map((offer, index) => {
    const location = offer.city ? escapeHtml(offer.city) : "Local";
    const categories = publicCategories(offer).map(escapeHtml).join(" + ") || "Cultural opportunity";
    const photo = offer.publicPhotoUrls?.[0];
    const publicProfile = offer.publicProfile
      ? `<p class="weekly-exchange-artist">Posted by <a href="/entries/${offer.publicProfile.id}">${escapeHtml(offer.publicProfile.name)}</a>${offer.publicProfile.city ? ` · ${escapeHtml(offer.publicProfile.city)}` : ""}</p>`
      : "";
    return `<article class="weekly-exchange-card"><p class="meta">weekly pick ${String(index + 1).padStart(2, "0")}</p><h2>${location}: ${categories}</h2>${publicProfile}${photo ? `<img src="${escapeHtml(photo)}" alt="Public photo for this Exchange listing" loading="lazy">` : ""}<p>${escapeHtml(offer.description)}</p><a class="button" href="/residency">Open the live Exchange board</a></article>`;
  }).join("\n");
  const emptyNote = features.length < 3
    ? `<p class="editorial-note">Only ${features.length} active public ${features.length === 1 ? "listing currently meets" : "listings currently meet"} the selection criteria. We do not add member-only posts to fill the roundup. Check the live Exchange board for the latest public listings.</p>`
    : `<p class="editorial-note">Selected from active public posts for clear detail and a mix of categories and locations. Availability can change, so check each listing on the live Exchange board.</p>`;
  const artistProfiles = profiles.map((profile) =>
    `<article class="weekly-profile-card">${profile.heroPhoto ? `<img src="${escapeHtml(profile.heroPhoto)}" alt="Public profile photo of ${escapeHtml(profile.name)}" loading="lazy">` : ""}<h3><a href="/entries/${profile.id}">${escapeHtml(profile.name)}</a></h3><p>${[profile.city, profile.country].filter(Boolean).map(escapeHtml).join(", ")}</p></article>`,
  ).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${indexable ? "index, follow" : "noindex, follow"}">
  <link rel="canonical" href="${pageUrl}">
  <link rel="icon" type="image/png" href="/images/cult-soap.png">
  <meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="https://countercult.network/images/cult-soap.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${safeSchema}</script>
  <link rel="stylesheet" href="/journal/journal.css">
  <script src="/domain-redirect.js?v=weekly-exchange-1"></script>
  <style>.wrap.article{padding-top:1.25rem}.article h1{font-size:clamp(2.5rem,5vw,4.5rem);line-height:.97;margin:.5rem 0 1rem}.article .dek{font-size:1.1rem;line-height:1.5;margin:0 0 1rem}.weekly-exchange-list{display:grid;gap:1.25rem;margin:1rem 0}.weekly-exchange-card{border:2px solid #111;padding:1.25rem}.weekly-exchange-card h2{margin:.5rem 0;font-size:1.45rem}.weekly-exchange-card img{display:block;width:100%;max-height:24rem;object-fit:cover;margin:1rem 0}.weekly-exchange-card p{line-height:1.65}.weekly-exchange-artist{font-size:.9rem;margin:.25rem 0}.weekly-exchange-artist a{text-decoration:underline;text-underline-offset:3px}.weekly-profile-section{margin:2.5rem 0}.weekly-profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.weekly-profile-card{border:2px solid #111;padding:1rem}.weekly-profile-card img{width:100%;aspect-ratio:4/3;object-fit:cover;margin-bottom:.75rem}.weekly-profile-card h3{margin:.25rem 0}.weekly-profile-card a{text-decoration:underline;text-underline-offset:3px}.weekly-exchange-cta{background:#c6ff3d;color:#111;padding:1.5rem;margin:2rem 0}.weekly-exchange-cta .button{display:inline-block;margin-top:.5rem;background:#111;color:#c6ff3d;padding:.8rem 1rem}</style>
</head>
<body>
  <header class="site-header"><nav class="nav" aria-label="Primary"><a class="brand" href="/">countercult</a><div class="nav-links"><a href="/explore">map</a><a href="/journal/">journal</a><a href="/news">dispatches</a></div></nav><div class="ticker">COUNTERCULT EXCHANGE // WEEKLY PUBLIC PICKS //</div></header>
  <main class="wrap article" data-skip-shona-note="true">
    <a class="back" href="/journal/">← back to journal</a>
    <p class="meta"><span>Weekly Exchange roundup</span><span>${week}</span></p>
    <h1>Artist housing, spaces and opportunities this week</h1>
    <p class="dek">${escapeHtml(description)}</p>
    ${emptyNote}
    <section class="weekly-exchange-list" aria-label="Selected public Exchange listings">${cards || ""}</section>
    ${profiles.length ? `<section class="weekly-profile-section" aria-labelledby="weekly-profile-heading"><h2 id="weekly-profile-heading">Artists with public profiles</h2><p>These artists have chosen to make their profiles public. Profiles are listed separately from Exchange posts unless a listing is directly linked to that profile.</p><div class="weekly-profile-grid">${artistProfiles}</div><p><a href="/explore">Discover more artists and cultural places</a></p></section>` : ""}
    <section class="weekly-exchange-cta"><h2>Find more on the Exchange</h2><p>Browse public listings, then check the live post for current details and availability.</p><a class="button" href="/residency">Browse the Exchange board</a></section>
  </main>
  <footer><a href="/">countercult</a> · <a href="/journal/">more journal notes</a> · <a href="/explore">explore the map</a></footer>
</body>
</html>`;
}

router.get(["/journal/exchange-weekly", "/journal/exchange-weekly/"], async (_req, res): Promise<void> => {
  const now = new Date();
  const offers = await listPublicExchangeWeeklyCandidates(now);
  const profiles = await listConsentedPublicArtistProfilesForWeekly();
  res
    .set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600")
    .type("html")
    .send(renderWeeklyPage(offers, profiles, now));
});

export default router;
