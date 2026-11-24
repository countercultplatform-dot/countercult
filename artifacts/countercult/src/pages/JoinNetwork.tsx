export default function JoinNetwork() {
  const params = new URLSearchParams(window.location.search);
  const referralCode = params.get("ref");
  const joinParams = new URLSearchParams({ action: "join", intent: "network" });
  if (referralCode) joinParams.set("ref", referralCode);
  const talentJoinHref = `${import.meta.env.BASE_URL}explore?${joinParams.toString()}`;
  const businessHref = `${import.meta.env.BASE_URL}studios/start`;
  const pills = [
    {
      href: talentJoinHref,
      image: "/images/renaissance-pill-red.png",
      label: "I build culture",
      detail: "join free",
      intent: "join",
    },
    {
      href: businessHref,
      image: "/images/renaissance-pill-blue.png",
      label: "I’m a business",
      detail: "hire us",
      intent: "work_with_us",
    },
  ];

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#e8e8e8] px-[2.5vw] py-8 text-black sm:py-12">
      <section className="w-full max-w-[1000px]" aria-labelledby="join-heading">
        <h1 id="join-heading" className="sr-only">Choose how to take part</h1>
        <div className="grid w-full grid-cols-1 items-center gap-5 sm:gap-8 md:grid-cols-2">
          {pills.map(({ href, image, label, detail, intent }, index) => (
            <a
              key={intent}
              href={href}
              aria-label={`${label}, ${detail}`}
              className={`group relative mx-auto block w-[78%] max-w-[380px] rounded-full transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black focus-visible:ring-offset-4 focus-visible:ring-offset-[#e8e8e8] md:w-full ${index === 0 ? "-rotate-[5deg]" : "rotate-[5deg]"}`}
            >
              <img
                src={image}
                alt=""
                aria-hidden="true"
                className="block h-auto w-[110%] max-w-none -translate-x-[5%] drop-shadow-[0_10px_14px_rgba(0,0,0,0.22)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[12%] text-center leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "Arial, Helvetica, sans-serif", textShadow: "0 2px 4px rgba(0,0,0,0.85)" }}
              >
                <span className="text-[clamp(1rem,2.2vw,1.5rem)] font-bold">{label}</span>
                <span className="mt-1 text-[clamp(0.68rem,1.4vw,0.95rem)] font-bold uppercase tracking-wide">{detail}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-black/65 sm:text-[10px]">
          Cultural spaces, artists, hackers, and community organizers are welcome to apply for the free Network. The application takes about two minutes. Approved members can use the Member Exchange.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
          <a
            href="/explore?action=signin"
            className="underline decoration-1 underline-offset-4 transition-colors hover:text-black/55"
          >
            already have an account? sign in
          </a>
          <a
            href="/residency"
            className="underline decoration-1 underline-offset-4 transition-colors hover:text-black/55"
          >
            browse public posts
          </a>
        </div>
      </section>
    </main>
  );
}