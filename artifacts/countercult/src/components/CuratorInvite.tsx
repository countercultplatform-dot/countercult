const CURATOR_EMAIL = "countercultplatform@gmail.com";

const curatorRequestHref = `mailto:${CURATOR_EMAIL}?subject=${encodeURIComponent("Countercult curator code request")}&body=${encodeURIComponent(`Hi Countercult,

I want a curator code.

Who I am:

What I know:

Why I want one:

Where I could help:

Thanks,`)}`;

export default function CuratorInvite() {
  return (
    <section className="border-b-2 border-black bg-[#0c0c14] px-5 py-14 text-[#F9F9F6] sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">know a scene we should know?</p>
          <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.05em] sm:text-6xl">
            become a curator.
          </h2>
        </div>
        <div className="max-w-2xl">
          <p className="text-base leading-relaxed text-white/75 sm:text-lg">
            We have up to 50 curator codes. They are for people who know a scene, a city, or a community well and want to help us find the good stuff.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            A curator code means we trust you. So we are careful about who gets one. Tell us who you are, what you know, and why you want in.
          </p>
          <a
            href={curatorRequestHref}
            className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-3 border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white"
          >
            ask for a curator code
            <span aria-hidden="true">↗</span>
          </a>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            email us why you want one · 50 codes max
          </p>
        </div>
      </div>
    </section>
  );
}