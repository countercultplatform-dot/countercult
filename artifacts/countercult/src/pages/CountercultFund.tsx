import { useEffect } from "react";
import { ArchitectSignature } from "@/components/ArchitectSignature";
import { FundApplicationForm } from "@/components/FundApplicationForm";
import { FundBudgetExamples } from "@/components/FundBudgetExamples";
import { FundPartnerTicker } from "@/components/FundPartnerTicker";
import { FundTalentTicker } from "@/components/FundTalentTicker";
import { WorkWithUsMenu } from "@/components/WorkWithUsMenu";

const curatedDirectoryHref = "mailto:countercultplatform@gmail.com?subject=Countercult%20curated%20local%20artists";

const fundFaqItems = [
  {
    question: "Who is the Countercult Studios Fund for?",
    answer: "The Fund is open to place-based businesses, brands, companies and institutions that want to connect a business budget to paid local cultural work. You do not need to be in hospitality.",
  },
  {
    question: "How does the Culture Euro work?",
    answer: "The Culture Euro is the sales-linked route. Choose which sales count and agree either a fixed amount per sale or a percentage of selected revenue. You and Countercult agree how sales will be recorded before launch.",
  },
  {
    question: "Can a brand or client take part without linking the budget to sales?",
      answer: "Yes. A brand or organisation can agree a defined budget for a local commission, programme or residency. Scope, creative fees and Countercult Studios’ Fund delivery fee are agreed before work begins.",
  },
  {
    question: "What can the Fund pay for?",
    answer: "Marketing + Creative Delivery covers strategy, writing, design, photography and content. Community Programmes + Residencies covers workshops, mentoring and local programmes.",
  },
  {
    question: "What does Countercult Studios handle?",
      answer: "Countercult Studios finds local artists and partners, shapes the work around your business goal, agrees scope and fees, and manages production through delivery.",
  },
  {
    question: "What fees come out of the budget?",
      answer: "The gross Fund budget covers the commissioned creative fees and Countercult Studios’ separately agreed curation and delivery fee. Both are agreed before work begins.",
  },
  {
    question: "How are sales recorded and invoices paid?",
      answer: "For a Culture Euro, you and Countercult Studios agree which sales count, how to record them, and when invoices are settled. For a client-funded programme, you agree the project budget and payment schedule. Your organisation keeps the budget and pays commissioned artists and Countercult Studios separately. Building transaction-linked cultural finance as fintech infrastructure for local culture is a core roadmap priority. Automated fund holding or routing is not live yet.",
  },
  {
    question: "Do customers pay extra?",
    answer: "No separate Countercult fee is added for customers. A Culture Euro is funded by the business from selected sales. A client-funded programme comes from the organisation’s agreed budget.",
  },
  {
    question: "Is the Fund a grant?",
      answer: "No. It is a client-held commercial budget for defined local work, built either from selected sales or from an agreed allocation. The Fund is not a grant or donation programme.",
  },
];

export default function CountercultFund() {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target) {
      window.requestAnimationFrame(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="cc-fund-page min-h-[100dvh] bg-[#F9F9F6] text-black lowercase selection:bg-[#c6ff3d] selection:text-black">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-[#F9F9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d]">
            <img src="/images/cc-logo-black.png" alt="countercult" className="h-7 w-7 object-contain" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">countercult studios / the Fund</span>
          </a>
          <nav className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] sm:gap-7">
            <WorkWithUsMenu />
            <a href="/about" className="hidden hover:text-black/50 sm:inline">about</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-[#c6ff3d] px-5 py-16 text-center sm:px-8 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-5xl">
            <p className="mb-7 text-[10px] font-bold uppercase tracking-[0.24em] text-black/65">
              countercult studios · transaction-linked cultural finance · local value
            </p>
            <h1 className="text-[clamp(3.1rem,9vw,8.2rem)] font-black uppercase leading-[0.82] tracking-[-0.075em]">
              fintech for<br />local culture.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
              Countercult Studios is building transaction-linked financial infrastructure for local culture, with the Fund at its centre. Selected business sales and defined client budgets support paid local creative work. This fintech roadmap is a core part of Countercult. Today, clients retain the budget and pay artists and Countercult Studios separately; automated holding, routing and payouts are not live yet.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#apply"
                className="inline-flex min-h-12 items-center border-2 border-black bg-black px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c6ff3d] transition-colors hover:bg-white hover:text-black"
              >
                talk about the Fund
              </a>
              <a
                href="#examples"
                className="inline-flex min-h-12 items-center border-2 border-black bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-black hover:text-white"
              >
                see the numbers
              </a>
            </div>
          </div>
        </section>

        <section aria-label="Countercult collaborators, clients and past funders">
          <FundPartnerTicker />
        </section>

        <section className="border-b-2 border-black bg-black px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">in practice · berlin</p>
              <h2 className="mt-5 max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-5xl">
                a local burger shop linked sales to live music. so can you.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                Martha’s Burgers tested a sales-linked paid music commission. Today, clients hold the Fund budget and pay artists and Countercult Studios separately; selected sales may inform the agreed budget.
              </p>
              <a
                href={`${import.meta.env.BASE_URL}journal/fund-local-culture-business-growth/`}
                className="mt-6 inline-flex border-2 border-[#c6ff3d] bg-[#c6ff3d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-black transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                read the Martha’s Burgers case study
              </a>
            </div>
            <div className="grid grid-cols-2 items-center gap-3 sm:gap-5">
              <img
                src={`${import.meta.env.BASE_URL}images/marthas-burgers-cultural-investment.webp`}
                alt="Party, Burgers, and Cultural Investment at Martha’s Burgers"
                loading="lazy"
                className="h-auto w-full -rotate-2 border border-white/30"
              />
              <img
                src={`${import.meta.env.BASE_URL}images/marthas-burgers-story.webp`}
                alt="Martha’s Burgers participant with a burger and fries"
                loading="lazy"
                className="h-auto w-full rotate-2 border border-white/30"
              />
            </div>
          </div>
        </section>

        <section id="uses" className="border-b-2 border-black px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 max-w-3xl">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">two uses / one Fund</p>
              <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                two ways to put the Fund to work.
              </h2>
            </div>
            <div className="grid border-2 border-black md:grid-cols-2">
              <article className="border-b-2 border-black bg-white p-6 sm:p-9 md:border-b-0 md:border-r-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">path A / marketing + creative delivery</p>
                <h3 className="mt-5 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl">build your marketing.</h3>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/70 sm:text-base">
                  Use the budget for marketing strategy, writing, design, photography and content shaped around your business goal and local customers.
                </p>
              </article>
              <article className="bg-[#c6ff3d] p-6 sm:p-9">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">path B / community programmes + residencies</p>
                <h3 className="mt-5 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl">support the culture around you.</h3>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/75 sm:text-base">
                  Give guests, members and local partners a reason to connect with the artists and culture around your business through workshops, programmes and residencies.
                </p>
              </article>
            </div>
            <p className="mt-5 max-w-3xl text-xs leading-relaxed text-black/60">
              Countercult’s emerging PR and media work can also feature the projects and people involved.
            </p>
          </div>
        </section>

        <section id="why-countercult" className="border-b-2 border-black bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">why Countercult Studios</p>
                <h2 className="mt-4 max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                  we know the culture. we deliver the work.
                </h2>
              </div>
              <div className="max-w-3xl text-base leading-relaxed text-black/70">
                <p>
                  Countercult Studios is a private commercial service for brands, businesses, places, and institutions. We work directly with artists, venues, and local organisers in the places where a project will happen. Countercult is artist-led technology infrastructure for the post-internet culture economy, built for artists to share knowledge, resources, spaces, and opportunities.
                </p>
                <p className="mt-4">
                  Before work begins, we agree the scope, creative fees, Countercult Studios’ Fund fee, delivery roles and payment terms.
                </p>
                <p className="mt-4">
                  Countercult is building the financial infrastructure for local culture, with the Fund as a transaction-linked fintech layer. Connecting selected business sales to defined local creative budgets and paid commissions is a core part of our roadmap. Today, clients retain the budget and pay artists and Countercult Studios separately; automated holding, routing and payouts are not live yet.
                </p>
              </div>
            </div>

          </div>
        </section>

        <FundTalentTicker />
        <FundBudgetExamples />

        <section id="questions" className="border-b-2 border-black bg-[#F9F9F6] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">plain answers</p>
              <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                Fund FAQ
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {fundFaqItems.map(({ question, answer }) => (
                <details key={question} className="group border-2 border-black bg-white">
                  <summary className="flex min-h-[4.25rem] cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-[10px] font-bold uppercase leading-relaxed tracking-[0.08em] outline-none transition-colors hover:bg-[#c6ff3d]/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black [&::-webkit-details-marker]:hidden">
                    <span>{question}</span>
                    <span aria-hidden="true" className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="border-t border-black/20 px-4 py-4 text-sm leading-relaxed text-black/70">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="border-b-2 border-black bg-[#c6ff3d] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]">for brands · businesses · places · institutions</p>
              <h2 className="max-w-lg text-4xl font-black uppercase leading-[0.88] tracking-[-0.07em] sm:text-6xl">
                tell us what<br />you want to fund.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70">
                Tell us whether you have selected sales or a defined programme budget in mind, what the work should support, and the amount or range you are considering. “To discuss” is fine.
              </p>
            </div>
            <FundApplicationForm analyticsRoute="fund" />
          </div>
        </section>

        <section id="already-have-a-budget" className="border-b-2 border-black bg-black px-5 py-14 text-white sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-12">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c6ff3d]">for work outside a local Fund programme</p>
              <h2 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-7xl">
                have a different project in mind?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                Countercult Studios can draw on our curated local directory and relationships to select artists, spaces, and cultural partners for a defined project, then carry the work through delivery. We agree scope and fees before anything begins.
              </p>
            </div>
            <a
              href={curatedDirectoryHref}
              className="inline-flex min-h-14 items-center justify-center border-2 border-[#c6ff3d] bg-[#c6ff3d] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-white hover:border-white"
            >
              contact us about a curated selection →
            </a>
          </div>
          <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-x-8 gap-y-3 border-t border-white/25 pt-5 text-[10px] font-bold uppercase tracking-[0.13em] text-white/70">
            <a className="underline underline-offset-4 hover:text-black/50" href="/journal/how-money-moves-through-the-countercult-fund/">how the Fund works</a>
            <a className="underline underline-offset-4 hover:text-black/50" href="/journal/countercult-fund-vs-grants-sponsorship-advertising-and-charity/">the Fund, grants and advertising</a>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-black px-5 py-8 text-white sm:px-8">
        <ArchitectSignature className="mx-auto max-w-7xl text-white/35" />
      </footer>
      <a
        href="https://www.linkedin.com/company/countercult-studios/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Countercult Studios on LinkedIn, opens in a new tab"
        title="Countercult Studios on LinkedIn"
        className="fixed bottom-4 right-4 z-50 block w-12 transition-transform hover:-rotate-6 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black sm:bottom-6 sm:right-6 sm:w-16"
      >
        <img
          src={`${import.meta.env.BASE_URL}images/cult-soap.png`}
          alt=""
          aria-hidden="true"
          className="block h-auto w-full drop-shadow-[3px_4px_0_#000]"
        />
      </a>
    </div>
  );
}
