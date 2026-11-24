import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { eq } from "drizzle-orm";
import { db, entriesTable, type WebsitePreview } from "@workspace/db";
import { logger } from "./logger";

const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 4_000;
const inFlight = new Map<number, string>();

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && ((b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) ||
    (a === 203 && b === 0 && c === 113)
  );
}

async function resolvePublicAddress(value: string): Promise<{ address: string; family: 4 } | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) ||
    url.hostname.endsWith(".localhost") ||
    url.hostname === "localhost"
  ) return null;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    return isIP(hostname) === 4 && isPublicIpv4(hostname)
      ? { address: hostname, family: 4 }
      : null;
  }
  try {
    const resolved = await lookup(hostname, { all: true, family: 4, verbatim: true });
    if (!resolved.length || !resolved.every(({ address }) => isPublicIpv4(address))) return null;
    return { address: resolved[0].address, family: 4 };
  } catch {
    return null;
  }
}

export async function isSafePublicUrl(value: string): Promise<boolean> {
  return Boolean(await resolvePublicAddress(value));
}

function requestHtml(
  url: URL,
  address: { address: string; family: 4 },
): Promise<{ status: number; location: string | null; contentType: string; html: string }> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)({
      protocol: url.protocol,
      hostname: url.hostname.replace(/^\[|\]$/g, ""),
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "accept-encoding": "identity",
        "user-agent": "CountercultWebsitePreview/1.0",
      },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, (response) => {
      const header = (name: string) => {
        const value = response.headers[name];
        return Array.isArray(value) ? value[0] ?? "" : value ?? "";
      };
      const status = response.statusCode ?? 0;
      const location = header("location") || null;
      const contentType = header("content-type");
      const length = Number(header("content-length") || 0);
      if ([301, 302, 303, 307, 308].includes(status) || status < 200 || status >= 300 || !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        response.resume();
        resolve({ status, location, contentType, html: "" });
        return;
      }
      if (length > MAX_HTML_BYTES) {
        response.resume();
        reject(new Error("website response too large"));
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += bytes.byteLength;
        if (total > MAX_HTML_BYTES) {
          request.destroy(new Error("website response too large"));
          return;
        }
        chunks.push(bytes);
      });
      response.on("end", () => resolve({
        status,
        location,
        contentType,
        html: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", reject);
    });
    request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new Error("website preview timed out")));
    request.on("error", reject);
    request.end();
  });
}

async function fetchHtml(sourceUrl: string): Promise<{ html: string; finalUrl: URL }> {
  let url = new URL(sourceUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const address = await resolvePublicAddress(url.href);
    if (!address) throw new Error("website host is not publicly reachable");
    const response = await requestHtml(url, address);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location || redirects === 3) throw new Error("too many or invalid redirects");
      const redirectedUrl = new URL(response.location, url);
      if (url.protocol === "https:" && redirectedUrl.protocol !== "https:") {
        throw new Error("refusing insecure redirect");
      }
      url = redirectedUrl;
      continue;
    }
    if (response.status < 200 || response.status >= 300 || !/text\/html|application\/xhtml\+xml/i.test(response.contentType)) {
      throw new Error("website did not return an HTML page");
    }
    return { html: response.html, finalUrl: url };
  }
  throw new Error("redirect limit reached");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const number = code[0]?.toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return Number.isFinite(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .replace(/<[^>]*>/g, "")
    .trim();
}

function parseMeta(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    if ((attributes.get("property") ?? attributes.get("name") ?? "").toLowerCase() === key) {
      const content = attributes.get("content")?.trim();
      if (content) return decodeHtml(content).slice(0, 600);
    }
  }
  return null;
}

export function parseWebsitePreviewHtml(sourceUrl: string, finalUrl: string, html: string): Omit<WebsitePreview, "fetchedAt"> {
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const imageCandidate = parseMeta(html, "og:image") ?? parseMeta(html, "twitter:image");
  let imageUrl: string | null = null;
  if (imageCandidate) {
    try {
      const candidate = new URL(imageCandidate, finalUrl);
      if (candidate.protocol === "https:" && !candidate.username && !candidate.password) imageUrl = candidate.href;
    } catch {
      imageUrl = null;
    }
  }
  return {
    sourceUrl,
    title: parseMeta(html, "og:title") ?? (decodeHtml(titleTag).slice(0, 180) || null),
    description: parseMeta(html, "og:description") ?? parseMeta(html, "description"),
    imageUrl,
  };
}

async function getPreview(sourceUrl: string): Promise<Omit<WebsitePreview, "fetchedAt">> {
  try {
    const { html, finalUrl } = await fetchHtml(sourceUrl);
    const preview = parseWebsitePreviewHtml(sourceUrl, finalUrl.href, html);
    if (preview.imageUrl && !(await isSafePublicUrl(preview.imageUrl))) preview.imageUrl = null;
    return preview;
  } catch (error) {
    logger.warn({ sourceUrl, error: error instanceof Error ? error.message : String(error) }, "Website preview fetch failed");
    return { sourceUrl, title: null, description: null, imageUrl: null };
  }
}

export function scheduleWebsitePreviewFetch(entryId: number, sourceUrl: string): void {
  if (inFlight.get(entryId) === sourceUrl) return;
  inFlight.set(entryId, sourceUrl);
  void (async () => {
    const metadata = await getPreview(sourceUrl);
    const preview: WebsitePreview = { ...metadata, fetchedAt: new Date().toISOString() };
    const [current] = await db.select({ url: entriesTable.url }).from(entriesTable).where(eq(entriesTable.id, entryId));
    if (current?.url === sourceUrl) {
      await db.update(entriesTable).set({ websitePreview: preview }).where(eq(entriesTable.id, entryId));
    }
  })()
    .catch((error: unknown) => logger.warn({ entryId, error }, "Could not save website preview"))
    .finally(() => {
      if (inFlight.get(entryId) === sourceUrl) inFlight.delete(entryId);
    });
}
