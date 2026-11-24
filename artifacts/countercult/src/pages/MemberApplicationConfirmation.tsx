import { ArrowRight } from "lucide-react";
import honestWork from "@/assets/repo-placeholder.svg";

export default function MemberApplicationConfirmation() {
  return (
    <main
      className="min-h-[100dvh] bg-[#F9F9F6] px-4 py-8 sm:px-8 sm:py-12"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <section
        className="mx-auto w-full max-w-2xl overflow-hidden border-2 border-[#c6ff3d] bg-black text-white shadow-[8px_8px_0_#000]"
        aria-labelledby="application-confirmation-title"
        data-testid="member-application-confirmation"
      >
        <img
          src={honestWork}
          alt="A farmer in a field with the caption, It ain't much, but it's honest work"
          className="block h-auto w-full"
        />
        <div className="p-5 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d]">
            Countercult Network · application received
          </p>
          <h1
            id="application-confirmation-title"
            className="mt-2 text-4xl font-black uppercase leading-[0.92] tracking-[-0.06em] sm:text-6xl"
          >
            thanks for applying.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/85 sm:text-base">
            Our team reviews every application manually. Only approved applicants receive an email, within two weeks. If you do not hear from us after two weeks, we cannot offer a place this time.
          </p>

          <div className="mt-6 border-l-4 border-[#c6ff3d] bg-white/10 px-4 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-[#c6ff3d]">
              your application is not an Exchange listing
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Space and skill-swap posts are separate. You can draft one on Exchange while you wait, but it stays private to you until your profile is approved. Full Exchange browsing opens after approval.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/70">
              Paid opportunities belong on{" "}
              <a href="/adverts?direction=hiring" className="font-bold text-[#c6ff3d] underline underline-offset-2">
                Adverts
              </a>
              .
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a
              href="/residency?action=offer"
              data-testid="member-application-draft-exchange"
              className="flex min-h-12 items-center justify-between gap-3 border-2 border-[#c6ff3d] bg-[#c6ff3d] px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white"
            >
              draft a space or skill swap <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
            <a
              href="/member-home"
              data-testid="member-application-member-home"
              className="flex min-h-12 items-center justify-between gap-3 border-2 border-white/60 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white hover:text-black"
            >
              go to member home <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
