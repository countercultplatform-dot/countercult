export function normalizeProfileUrl(platform: string, value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (platform === "Instagram") {
    const instagramUrl = v.match(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(.+)$/i);
    if (instagramUrl) {
      return `https://www.instagram.com/${instagramUrl[1]!.replace(/^\/+|\/+$/g, "")}`;
    }
    const handle = v.startsWith("@") ? v.slice(1) : v;
    if (!/^https?:\/\//i.test(v)) return `https://www.instagram.com/${handle.replace(/^\/+|\/+$/g, "")}`;
    return v;
  }
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.startsWith("@") ? v.slice(1) : v;
  switch (platform) {
    case "SoundCloud": return `https://soundcloud.com/${handle}`;
    case "Mixcloud":   return `https://mixcloud.com/${handle}`;
    case "Vimeo":      return `https://vimeo.com/${handle}`;
    case "Behance":    return `https://behance.net/${handle}`;
    case "YouTube":    return `https://youtube.com/@${handle}`;
    case "RA":         return `https://ra.co/dj/${handle}`;
    case "Bandcamp":   return handle.includes(".") ? `https://${handle}` : `https://${handle}.bandcamp.com`;
    default:           return handle.includes(".") ? `https://${v}` : v;
  }
}

/** Resolve the legacy profile URL field before it becomes an external link. */
export function normalizeEntryUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) {
    return `https://www.instagram.com/${v.slice(1).replace(/^\/+|\/+$/g, "")}`;
  }
  if (/^[\w-]+(?:\.[\w-]+)+(?:[/?#].*)?$/i.test(v)) {
    return `https://${v}`;
  }
  if (/^[a-z0-9._]+$/i.test(v)) {
    return `https://www.instagram.com/${v}`;
  }
  return v;
}

/** Normalize every URL in a link list then remove duplicates by resolved URL. */
export function cleanLinks(
  links: { platform: string; url: string }[]
): { platform: string; url: string }[] {
  const seen = new Set<string>();
  const result: { platform: string; url: string }[] = [];
  for (const link of links) {
    if (!link.url.trim()) continue;
    const resolved = normalizeProfileUrl(link.platform, link.url);
    // Canonicalize for dedup: strip trailing slash, lowercase host
    const key = resolved.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...link, url: resolved });
  }
  return result;
}
