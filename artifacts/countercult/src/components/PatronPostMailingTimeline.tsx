export function PatronPostMailingTimeline() {
  return (
    <figure className="border-t border-black/15 pt-4" data-testid="patron-post-mailing-timeline">
      <img
        src="/images/patron-post-mailing-timeline.svg"
        alt="Join by the 5th for this month’s post, or after the 5th for next month’s. Post goes out mid-month. One paid month includes one envelope."
        className="hidden h-auto w-full border-2 border-black sm:block"
        loading="lazy"
        decoding="async"
      />
      <svg
        className="block h-auto w-full border-2 border-black sm:hidden"
        viewBox="0 0 600 570"
        role="img"
        aria-labelledby="patron-post-mobile-timeline-title patron-post-mobile-timeline-description"
      >
        <title id="patron-post-mobile-timeline-title">When the first Patron Post envelope is sent</title>
        <desc id="patron-post-mobile-timeline-description">Join by the 5th for this month’s post, or after the 5th for next month’s. Each batch goes out around mid-month. One paid month includes one envelope.</desc>
        <rect width="600" height="570" fill="#f3eedf" />
        <g fontFamily="Arial, Helvetica, sans-serif" fill="#171714">
          <rect x="16" y="16" width="568" height="215" fill="#c6ff3d" stroke="#171714" strokeWidth="3" />
          <text x="40" y="57" fontSize="20" fontWeight="900" letterSpacing="2">JOIN BY THE 5TH</text>
          <path d="M40 76h520" stroke="#171714" strokeWidth="2" />
          <path d="M44 133h45m-12-12 12 12-12 12" fill="none" stroke="#e94c38" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
          <text x="108" y="132" fontSize="31" fontWeight="900">THIS MONTH’S POST</text>
          <text x="108" y="170" fontSize="20" fontWeight="700">Posted around mid-month</text>

          <rect x="16" y="247" width="568" height="215" fill="#f5d27a" stroke="#171714" strokeWidth="3" />
          <text x="40" y="288" fontSize="20" fontWeight="900" letterSpacing="2">JOIN AFTER THE 5TH</text>
          <path d="M40 307h520" stroke="#171714" strokeWidth="2" />
          <path d="M44 364h45m-12-12 12 12-12 12" fill="none" stroke="#e94c38" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
          <text x="108" y="363" fontSize="29" fontWeight="900">NEXT MONTH’S POST</text>
          <text x="108" y="401" fontSize="17" fontWeight="700">Just after cutoff? Allow 6–8 weeks.</text>

          <rect x="16" y="478" width="568" height="70" fill="#171714" />
          <text x="40" y="522" fill="#c6ff3d" fontSize="19" fontWeight="900" letterSpacing="1">ONE PAID MONTH = ONE ENVELOPE</text>
        </g>
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-relaxed text-black/65">
        <span>Billing renews from your signup date. International delivery may take longer.</span>
      </figcaption>
    </figure>
  );
}
