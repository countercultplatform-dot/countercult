import { describe, expect, it } from "vitest";
import { isSafePublicUrl, parseWebsitePreviewHtml } from "../lib/websitePreview";

describe("parseWebsitePreviewHtml", () => {
  it("reads share metadata, decodes entities, and resolves a relative image", () => {
    const result = parseWebsitePreviewHtml(
      "https://artist.example/work",
      "https://artist.example/about/",
      `<html><head>
        <meta content="Studio &amp; Sound" property="og:title">
        <meta name="description" content="A &quot;small&quot; independent practice">
        <meta property="og:image" content="../images/share.jpg">
      </head></html>`,
    );

    expect(result).toEqual({
      sourceUrl: "https://artist.example/work",
      title: "Studio & Sound",
      description: 'A "small" independent practice',
      imageUrl: "https://artist.example/images/share.jpg",
    });
  });

  it("falls back to the page title and ignores non-HTTPS share images", () => {
    const result = parseWebsitePreviewHtml(
      "https://artist.example",
      "https://artist.example/",
      `<title>Artist Archive</title>
       <meta property="og:image" content="http://images.example/share.jpg">`,
    );

    expect(result.title).toBe("Artist Archive");
    expect(result.imageUrl).toBeNull();
  });

  it("rejects local and private destinations before requesting metadata", async () => {
    await expect(isSafePublicUrl("http://127.0.0.1/")).resolves.toBe(false);
    await expect(isSafePublicUrl("http://10.20.30.40/")).resolves.toBe(false);
    await expect(isSafePublicUrl("http://[::1]/")).resolves.toBe(false);
    await expect(isSafePublicUrl("https://user:pass@example.com/")).resolves.toBe(false);
    await expect(isSafePublicUrl("https://example.com:8443/")).resolves.toBe(false);
  });
});
