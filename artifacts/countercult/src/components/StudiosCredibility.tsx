import { ArrowUpRight } from "lucide-react";
import { SITE_IDENTITY } from "@/config/siteIdentity";

type CaseStudy = {
  label: string;
  detail?: string;
  href?: string;
};

const countercultCaseStudies: CaseStudy[] = [
  {
    label: "StickerApp · manufacturing collaboration",
    detail: "launch event partner at Avomind · free stickers for network marketing",
  },
  {
    label: "Quouch · VC-backed startup",
    href: "/journal/quouch-curated-connection-network/",
  },
  {
    label: "Rural Hackers · Galicia",
    href: "/journal/preserving-the-unpreserved/",
  },
  {
    label: "Zalando Pride · Berlin",
    href: "/journal/zalando-pride-berlin/",
  },
  {
    label: "Most Wanted Music · Berlin",
    href: "/journal/most-wanted-music-conference/",
  },
  {
    label: "Avomind · employer branding",
    href: "/journal/avomind-recruitment-firm/",
  },
];

export function StudiosCredibility() {
  return (
    <>
      <section className="border-b-2 border-black bg-[#c6ff3d] px-4 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]">the team behind the work</p>
            <h2
              className="mt-5 max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            >
              countercult<br />is a team.
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
              The work is delivered with researchers, curators, strategists, writers, producers, fabricators, and local collaborators who know
              the place and the people. we build the team that can carry the work all the way through.
            </p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em]">selected team work</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {countercultCaseStudies.map((study) =>
                study.href ? (
                  <a
                    key={study.label}
                    href={study.href}
                    className="group flex items-center justify-between gap-4 border-2 border-black bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-black hover:text-[#c6ff3d]"
                  >
                    <span>
                      {study.label}
                      {study.detail && <small className="mt-1 block text-[8px] font-normal normal-case tracking-[0.04em] text-black/55 group-hover:text-[#c6ff3d]/70">{study.detail}</small>}
                    </span>
                    <span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <div key={study.label} className="border-2 border-black bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em]">
                    <span>
                      {study.label}
                      {study.detail && <small className="mt-1 block text-[8px] font-normal normal-case tracking-[0.04em] text-black/55">{study.detail}</small>}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid border-b-2 border-black lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-black px-4 py-12 text-white sm:px-8 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c6ff3d]">your main contact</p>
          <h2
            className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            Shona Neary.
          </h2>
          <p className="mt-4 max-w-xl text-[10px] font-bold uppercase leading-relaxed tracking-[0.16em] text-[#c6ff3d]">
            artist · founder · creative director · AI-informed product building · product and systems architecture · creative technology · cultural strategy
          </p>
          <p className="mt-7 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
             every Studios brief starts with Shona. they bring together local research, cultural context, creative direction,
             production, fabrication, product thinking, and the Countercult network, then build the team that can carry the work from
             the first question to the final delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-5">
             <a
               href="/journal/shona-neary-founder-interview/"
              className="inline-flex items-center gap-2 border-b border-[#c6ff3d] pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d]"
            >
               meet Shona Neary <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
             <a
               href="https://countercult.network/sketchyshona/"
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 border-b border-[#c6ff3d] pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d]"
             >
               see Sketchy Shona <ArrowUpRight className="h-3.5 w-3.5" />
             </a>
            <a
              href="/entries/46"
              className="inline-flex items-center gap-2 border-b border-[#c6ff3d] pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d]"
            >
              see the live Sketchy Shona pin <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={SITE_IDENTITY.shona.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-[#c6ff3d] pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d]"
            >
              LinkedIn <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">Shona’s past client work</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SITE_IDENTITY.shona.pastClientWork.map((client) => (
              <span key={client} className="border-2 border-black bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em]">
                {client}
              </span>
            ))}
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">selected support + recognition</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SITE_IDENTITY.shona.supportAndRecognition.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-black bg-[#c6ff3d] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                {item.label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}