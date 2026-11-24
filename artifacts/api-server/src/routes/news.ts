import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface NewsItem {
  title: string;
  link: string;
  date: string;
  isoDate: string;
  excerpt: string;
  thumbnail: string | null;
}

// Simple in-memory cache — avoids hammering Substack on every page load
let cache: { items: NewsItem[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function extractCdata(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainRe = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, "i");
  const plainMatch = xml.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRss(xml: string): NewsItem[] {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  return itemMatches.slice(0, 20).map((item) => {
    const title = extractCdata(item, "title") || "Untitled";
    // Substack puts the URL in <link> — but <link> has no closing tag in some feeds;
    // fall back to <guid> which is always the post URL.
    const linkMatch = item.match(/<link>([^<\s]+)<\/link>/) ?? item.match(/<guid[^>]*>([^<]+)<\/guid>/);
    const link = linkMatch ? linkMatch[1].trim() : "https://countercultplatform.substack.com";
    const date = extractCdata(item, "pubDate") || extractCdata(item, "dc:date") || "";
    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();
    const description = extractCdata(item, "description");
    const excerpt = stripHtml(description).slice(0, 280).trimEnd() + (stripHtml(description).length > 280 ? "…" : "");
    // Try several image locations: <enclosure>, <media:content>, og:image in content
    const thumbnail =
      extractAttr(item, "enclosure", "url") ??
      extractAttr(item, "media:content", "url") ??
      extractAttr(item, "media:thumbnail", "url") ??
      (() => {
        const content = extractCdata(item, "content:encoded");
        const img = content.match(/<img[^>]+src="([^"]+)"/);
        return img ? img[1] : null;
      })();
    return { title, link, date, isoDate, excerpt, thumbnail };
  });
}

router.get("/news", async (req, res): Promise<void> => {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    res.json(cache.items);
    return;
  }

  try {
    const response = await fetch("https://countercultplatform.substack.com/feed", {
      headers: { "User-Agent": "Countercult/1.0 (+https://countercultplatform.com)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.status(502).json({ error: `Substack returned ${response.status}` });
      return;
    }

    const xml = await response.text();
    const items = parseRss(xml);
    cache = { items, fetchedAt: now };
    res.json(items);
  } catch (err: any) {
    // Return stale cache rather than an error if we have one
    if (cache) {
      res.json(cache.items);
      return;
    }
    res.status(502).json({ error: "Could not fetch news feed", detail: err?.message });
  }
});

export default router;
