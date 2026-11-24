import { describe, expect, it, vi } from "vitest";
import {
  addCollectiveFundFooterToHtml,
  addCollectiveFundFooterToText,
  sendWithCollectiveFundFooter,
} from "./emailCampaignFooter";

describe("Collective Fund email footer", () => {
  it("adds the fundraiser CTA inside an existing HTML email", () => {
    const result = addCollectiveFundFooterToHtml("<div><p>Approved.</p></div>");

    expect(result).toContain("Approved.");
    expect(result).toContain('href="https://countercult.network/collective-fund"');
    expect(result.indexOf("See the fundraiser")).toBeLessThan(result.lastIndexOf("</div>"));
  });

  it("adds a readable fundraiser CTA to plain-text mail", () => {
    expect(addCollectiveFundFooterToText("Welcome.")).toContain(
      "See the fundraiser: https://countercult.network/collective-fund",
    );
  });

  it("preserves send arguments and appends both email formats", async () => {
    const send = vi.fn(async (message: { html: string; text: string; subject: string }) => message);
    const result = await sendWithCollectiveFundFooter(send, {
      html: "<div>Message</div>",
      text: "Message",
      subject: "Approved",
    });

    expect(send).toHaveBeenCalledOnce();
    expect(result.subject).toBe("Approved");
    expect(result.html).toContain("collective-fund");
    expect(result.text).toContain("collective-fund");
  });
});
