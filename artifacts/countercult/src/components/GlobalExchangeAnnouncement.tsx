import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/analytics";

export function ExchangeAnnouncementLink({
  location,
  placement = "sitewide_announcement",
}: {
  location: string;
  placement?: string;
}) {
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

  return (
    <a
      href={`${basePath}/residency`}
      aria-label="Open the member Exchange for cultural spaces, artists, hackers, and community organizers to share rooms, tools, skills, and opportunities"
      data-testid="link-home-exchange-announcement"
      className="cc-exchange-announcement group block shrink-0 border-b-2 border-black px-4 py-2.5 text-black transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black sm:px-8 sm:py-3"
      onClick={() => trackEvent("exchange_section_clicked", { placement, source_route: location })}
    >
      <span className="mx-auto flex w-full max-w-7xl items-center gap-3 font-mono text-[10px] uppercase leading-[1.35] sm:text-xs md:text-sm">
        <span className="flex-1">
          CULTURAL SPACES, ARTISTS, HACKERS, AND COMMUNITY ORGANIZERS: SHARE ROOMS, TOOLS, SKILLS, AND OPPORTUNITIES THROUGH THE MEMBER EXCHANGE.
        </span>
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black text-xl leading-none transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
}

export function GlobalExchangeAnnouncement({
  location,
  enabled,
}: {
  location: string;
  enabled: boolean;
}) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMountNode(null);
      return;
    }

    const appRoot = document.getElementById("root") ?? document.body;
    let portalNode: HTMLDivElement | null = null;
    let hasPublishedTarget = false;

    const findMenuOrContent = () => {
      const candidates = Array.from(appRoot.querySelectorAll<HTMLElement>("header, nav"));
      const stickyMenu = candidates.find((candidate) => {
        const style = window.getComputedStyle(candidate);
        return style.position === "sticky" && style.top === "0px";
      });
      return stickyMenu ?? candidates[0] ?? appRoot.querySelector<HTMLElement>("main");
    };

    const attachAfterMenu = () => {
      const menu = findMenuOrContent();
      if (!menu) return;

      portalNode ??= document.createElement("div");
      portalNode.setAttribute("data-cc-exchange-announcement-root", "");

      if (portalNode.parentElement !== menu.parentElement || portalNode.previousElementSibling !== menu) {
        menu.insertAdjacentElement("afterend", portalNode);
      }

      if (!hasPublishedTarget) {
        hasPublishedTarget = true;
        setMountNode(portalNode);
      }
    };

    const observer = new MutationObserver(attachAfterMenu);
    observer.observe(appRoot, { childList: true, subtree: true });
    attachAfterMenu();

    return () => {
      observer.disconnect();
      portalNode?.remove();
      setMountNode((current) => current === portalNode ? null : current);
    };
  }, [enabled, location]);

  if (!enabled || !mountNode) return null;

  return createPortal(
    <ExchangeAnnouncementLink location={location.split("?")[0]} />,
    mountNode,
  );
}
