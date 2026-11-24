import { useEffect, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { getPatronPostCutoffCountdown } from "@/lib/patronPostCutoff";
import { trackEvent } from "@/lib/analytics";

const countdownUnits = [
  { key: "days", label: "days" },
  { key: "hours", label: "hours" },
  { key: "minutes", label: "minutes" },
] as const;

export function PatronPostCutoffCountdown({
  href,
  placement = "after_live_exchange",
  onJoinClick,
}: {
  href: string;
  placement?: string;
  onJoinClick?: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const countdown = getPatronPostCutoffCountdown(now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      aria-label="Patron Post monthly mailing cutoff"
      data-testid="patron-post-cutoff-countdown"
      className="border-y-2 border-black bg-[#c6ff3d] text-black"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-x-4 gap-y-4 px-5 py-5 sm:px-8 sm:py-6 md:grid-cols-[auto_1fr_auto_auto] md:gap-x-8">
        <span className="flex h-12 w-12 items-center justify-center border-2 border-black sm:h-14 sm:w-14">
          <Mail className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="leading-tight">
          <p className="text-lg font-normal leading-tight sm:text-xl md:text-2xl">
            <strong>Time is running out this month.</strong>
          </p>
          <p className="mt-1 text-[11px] leading-snug sm:text-sm">
            Join by <strong>{countdown.deadlineLabel}</strong> at <strong>00:00 Berlin time</strong> for the {countdown.mailingMonthLabel} mailing batch.
          </p>
        </div>
        <div
          role="timer"
          aria-live="off"
          aria-label={`${countdown.days} days, ${countdown.hours} hours, and ${countdown.minutes} minutes until the cutoff.`}
          className="col-span-2 grid grid-cols-3 gap-3 text-center tabular-nums md:col-span-1 md:min-w-[15rem]"
        >
          {countdownUnits.map(({ key, label }) => (
            <span key={key} className="border-l border-black/30 px-1">
              <span className="block text-3xl font-bold leading-none sm:text-4xl">
                {String(countdown[key]).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em]">
                {label}
              </span>
            </span>
          ))}
        </div>
        <a
          href={href}
          onClick={() => {
            trackEvent("homepage_patron_post_cutoff_clicked", { placement });
            onJoinClick?.();
          }}
          className="col-span-2 inline-flex w-fit items-center gap-2 border-2 border-black bg-black px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#c6ff3d] md:col-span-1 md:whitespace-nowrap"
        >
          Join Patron Post
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
