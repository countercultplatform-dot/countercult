import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import questionSticker from "@/assets/repo-placeholder.svg";
import type { StickerPosition } from "./sticker-position";

const QUESTION_TITLE_ID = "patron-post-anonymous-question-title";
const FUND_GOAL_SECTION_ID = "snail-fund-goal";
const SNAIL_HERO_SECTION_ID = "snail-hero";

export function AnonymousQuestionSticker({
  href,
  position,
}: {
  href: string;
  position: StickerPosition;
}) {
  const [location] = useLocation();
  const [stickerHiddenBySection, setStickerHiddenBySection] = useState(false);

  useEffect(() => {
    setStickerHiddenBySection(false);
    if (location.split(/[?#]/, 1)[0] !== "/snail") return;
    if (!("IntersectionObserver" in window)) return;

    const sectionIds = [QUESTION_TITLE_ID, FUND_GOAL_SECTION_ID, SNAIL_HERO_SECTION_ID];
    const visibleSections = new Map<string, boolean>();
    const observedSections = new Set<string>();
    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visibleSections.set(entry.target.id, Boolean(entry.isIntersecting));
      }
      setStickerHiddenBySection([...visibleSections.values()].some(Boolean));
    }, { threshold: 0.01 });
    let pageObserver: MutationObserver | undefined;

    const observeSections = () => {
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (!section || observedSections.has(id)) continue;
        sectionObserver.observe(section);
        observedSections.add(id);
        visibleSections.set(id, false);
      }
      return observedSections.size === sectionIds.length;
    };

    if (!observeSections()) {
      pageObserver = new MutationObserver(() => {
        if (!observeSections()) return;
        pageObserver?.disconnect();
      });
      pageObserver.observe(document.getElementById("root") ?? document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      sectionObserver.disconnect();
      pageObserver?.disconnect();
    };
  }, [location]);

  if (stickerHiddenBySection) return null;

  return (
    <a
      href={href}
      aria-label="Ask us something anonymously"
      title="Ask us something anonymously"
      data-testid="sticker-anonymous-question-countercult"
      className={`fixed z-[9400] flex w-[136px] flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:w-[156px] ${position}`}
    >
      <img
        src={questionSticker}
        alt=""
        aria-hidden="true"
        className="h-[100px] w-[76px] object-contain drop-shadow-[1px_2px_2px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:rotate-[-4deg] hover:scale-110 motion-reduce:transition-none sm:h-[132px] sm:w-[100px]"
      />
      <span className="-mt-1 rotate-[-3deg] border-2 border-black bg-[#c6ff3d] px-2 py-1.5 text-center font-mono text-[10px] font-black uppercase leading-[1.05] tracking-[0.01em] text-black shadow-[2px_2px_0_#111] sm:px-2.5 sm:text-[11px]">
        ask us something
        <br />
        anonymously
      </span>
    </a>
  );
}
