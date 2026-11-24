import { ArrowLeft } from "lucide-react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { FundApplicationForm } from "@/components/FundApplicationForm";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";

export default function FundPlaybook() {
  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] text-black font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/fund" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult / the Fund / playbook</span>
          </a>
          <nav className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] sm:gap-7">
            <WorkWithUsMenu />
            <a href="/fund" className="hidden hover:text-black/50 sm:inline">back to the Fund</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl">
        <section className="border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20">
          <div>
            <a href="/fund" className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] underline decoration-2 underline-offset-4">
              <ArrowLeft className="h-3 w-3" aria-hidden="true" /> back to the Fund
            </a>
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-black/45">the Fund</p>
            <h1 className="max-w-5xl text-5xl font-bold uppercase leading-[0.92] tracking-[-0.045em] sm:text-7xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              make your<br />sales do more.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">
                we help you set a client-held budget for local creative work. Selected sales may inform the agreed budget, and your business pays artists and Countercult Studios separately. Automated fund holding and routing are not live.
            </p>
          </div>
        </section>

        <section className="grid gap-px border-b-2 border-black bg-black md:grid-cols-3">
          {[
            ["01", "apply", "tell us what you sell."],
            ["02", "get approved", "we check the fit."],
            ["03", "commission the brief", "Countercult brings in local artists and manages the work your business needs."],
          ].map(([number, title, copy]) => (
            <div key={number} className="bg-[#c6ff3d] px-4 py-8 sm:px-8 sm:py-10">
              <p className="text-2xl font-bold">{number}</p>
              <h2 className="mt-6 text-3xl font-bold uppercase leading-none tracking-[-0.04em]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/65">{copy}</p>
            </div>
          ))}
        </section>
        <p className="border-b-2 border-black px-4 py-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] sm:px-8">approved businesses get the Countercult seal and a sticker for the door.</p>

        <section className="grid gap-10 border-b-2 border-black px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">apply to the Fund</p>
            <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>want to join?</h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-black/60">
               tell us what you sell, the culture euro you have in mind, and what marketing you need.
            </p>
          </div>

          <FundApplicationForm analyticsRoute="fund_playbook" />
        </section>

      </main>

      <footer className="border-t-2 border-black bg-black px-4 py-5 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
    </div>
  );
}