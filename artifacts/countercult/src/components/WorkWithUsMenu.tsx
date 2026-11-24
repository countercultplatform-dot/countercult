import { trackEvent } from "@/lib/analytics";

type WorkWithUsMenuProps = {
  dark?: boolean;
};

export function WorkWithUsMenu({ dark = false }: WorkWithUsMenuProps) {
  const textClass = dark
    ? "text-white/45 hover:text-[#c6ff3d]"
    : "text-black hover:text-black/50";
  const trackNavigationCta = (placement: string) => {
    trackEvent("studios_cta_clicked", {
      source_route: window.location.pathname,
      placement,
    });
  };

  return (
    <a
      href={`${import.meta.env.BASE_URL}#homepage-renaissance-choices`}
      aria-label="Work with us"
      data-testid="link-work-with-us"
      onClick={(event) => {
        trackNavigationCta("work_with_us");
        const target = document.getElementById("homepage-renaissance-choices");
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}#homepage-renaissance-choices`,
        );
      }}
      className={`whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#c6ff3d] ${textClass}`}
    >
      <span className="sm:hidden">work with us</span>
      <span className="hidden sm:inline">work with us</span>
    </a>
  );
}