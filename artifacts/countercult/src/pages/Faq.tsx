import { useState, useEffect, useRef } from "react";
import { Marquee } from "@/components/Marquee";
import { PageHeader } from "@/components/PageHeader";
import { PledgeBanner } from "@/components/PledgeBanner";

// ── Section definitions ──────────────────────────────────────────
const SECTIONS = [
  { id: "what-is",       label: "what is countercult?" },
  { id: "on-the-map",    label: "what's on the map?" },
  { id: "add-entry",     label: "adding to the map" },
  { id: "sign-in",       label: "signing in" },
  { id: "approved",      label: "approved members" },
  { id: "board",         label: "spaces + opportunities" },
  { id: "extra-arms",    label: "extra arms" },
  { id: "safety",        label: "safety & moderation" },
  { id: "legal",         label: "legal" },
  { id: "data",          label: "data & privacy" },
  { id: "contact",       label: "contact" },
];

// ── Accordion component ───────────────────────────────────────────
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
        aria-expanded={open}
      >
        <span className="text-[10px] uppercase tracking-widest text-white/70 group-hover:text-white/90 transition-colors">{title}</span>
        <span className="text-[#c6ff3d] text-sm leading-none transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm leading-relaxed text-white/80 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Faq() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tocRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white font-mono lowercase selection:bg-[#c6ff3d] selection:text-black">
      <PageHeader title="faq" />
      <Marquee
        text="public culture map • artist-founded • independent artists, spaces, and local operators • cultural exchange • economic development through culture •"
        className="bg-[#c6ff3d] !text-black !py-1 text-xs"
        speed={70}
      />

      {/* ── Mobile pill nav ── */}
      <div className="md:hidden overflow-x-auto flex gap-2 px-4 py-3 border-b border-white/10 no-scrollbar">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`shrink-0 px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-colors whitespace-nowrap ${
              activeSection === s.id
                ? "border-[#c6ff3d] text-black bg-[#c6ff3d]"
                : "border-white/20 text-white/40 hover:border-white/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Layout ── */}
      <div className="max-w-6xl mx-auto flex items-start gap-0">

        {/* ── Sticky sidebar TOC (desktop only) ── */}
        <aside
          ref={tocRef}
          className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 h-[100dvh] border-r border-white/10 py-8 overflow-y-auto"
        >
          <div className="text-[8px] uppercase tracking-widest text-white/20 px-6 mb-5">contents</div>
          <nav className="flex flex-col">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`flex items-start gap-3 px-6 py-2.5 text-left transition-colors group ${
                  activeSection === s.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                }`}
              >
                <span className={`text-[8px] tabular-nums mt-0.5 shrink-0 transition-colors ${
                  activeSection === s.id ? "text-[#c6ff3d]" : "text-white/20 group-hover:text-white/30"
                }`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`text-[10px] uppercase tracking-widest leading-tight transition-colors ${
                  activeSection === s.id ? "text-white" : "text-white/50 group-hover:text-white/70"
                }`}>
                  {s.label}
                </span>
                {activeSection === s.id && (
                  <span className="ml-auto text-[#c6ff3d] text-[8px] shrink-0 mt-0.5">◀</span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-6 pt-8">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("cc:open-terms"))}
              className="text-[8px] uppercase tracking-widest text-white/15 hover:text-white/40 transition-colors block mb-2"
            >
              terms & privacy
            </button>
            <a
              href="https://countercultcreatives.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] uppercase tracking-widest text-white/15 hover:text-[#c6ff3d] transition-colors block"
            >
              countercultcreatives.com ↗
            </a>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 px-6 md:px-10 py-10 flex flex-col gap-16">

          {/* 01 - what is countercult */}
          <section
            id="what-is"
            ref={(el) => { sectionRefs.current["what-is"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="01" title="what is countercult?" />
            <div className="border-l-4 border-[#c6ff3d] bg-[#c6ff3d]/[0.06] px-5 py-4 mb-5 max-w-2xl">
              <p className="text-base font-bold text-white uppercase tracking-wide leading-snug mb-2">a public layer for independent culture</p>
              <p className="text-sm text-white/75 leading-relaxed">
                 countercult builds artist-founded economic development infrastructure through culture. artists are the connective intelligence underneath the model: they help people read what is happening, what a place values, and where useful connection can lead. its public map helps people find artists, spaces, scenes, and local operators, then gives them a direct route to share, collaborate, commission, or build something useful.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/70 mb-4 max-w-prose">
              the network is curated rather than ranked like a marketplace. public voices are discoverable; private member data, unpublished voices, sensitive coordinates, and member-only exchange details remain protected.
            </p>
            <p className="text-sm leading-relaxed text-white/70 mb-6 max-w-prose">
              the public discovery layer is free to use and consent-based. “open cultural infrastructure” describes that public layer. countercult’s core software is licensed under AGPL-3.0-or-later; that licence applies to the software, not automatically to artists’ work, submitted images, editorial, public-profile content, member data, private exchange details, or brand assets. those materials remain subject to their own rights and consent terms.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              <ArmCard n="01" title="the global platform"
                button={{ label: "explore the map →", href: "/" }}>
                a free, curated network mapping independent artists, cultural spaces, local operators, and artifacts worldwide. every public pin points to a real person, place, or cultural thing with context around it.
              </ArmCard>
              <ArmCard n="02" title="journal, programmes & field work"
                button={{ label: "follow the journal ↗", href: "https://countercultplatform.substack.com", external: true }}>
                writing, research, events, experiments, and exchange that bring the network into real life and make the work legible to people beyond it.
              </ArmCard>
              <ArmCard n="03" title="countercult studios"
                button={{ label: "work with studios →", href: "/studios" }}>
                a paid delivery partner for agencies, destinations, institutions, brands, and place teams that need local research, cultural curation, creative direction, production, and paid commissions.
              </ArmCard>
            </div>
          </section>

          {/* 02 - on the map */}
          <section
            id="on-the-map"
            ref={(el) => { sectionRefs.current["on-the-map"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="02" title="what's on the map?" />
            <div className="grid md:grid-cols-3 gap-3">
              <MapTypeCard icon="◉" label="artists">
                musicians, photographers, painters, performers, designers, writers, collectives, crews, and communities - anyone doing creative work that the world should know about.
              </MapTypeCard>
              <MapTypeCard icon="▣" label="spaces">
                venues, galleries, squats, studios, record shops, underground bars, community spaces, arts centres, ruins - physical places with cultural gravity.
              </MapTypeCard>
              <MapTypeCard icon="◬" label="artifacts">
                murals, sculptures, hidden gems, traditional recipes, folk traditions, dying languages, oral histories, zines, underground games, sounds, practices - cultural things worth preserving or seeking out.
              </MapTypeCard>
            </div>
          </section>

          {/* 03 - adding to the map */}
          <section
            id="add-entry"
            ref={(el) => { sectionRefs.current["add-entry"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="03" title="adding to the map" />
            <div className="flex flex-col gap-3 max-w-prose">
              <Step n="1" text='click "+ add entry" on the map and fill in the details.' />
              <Step n="2" text="paste a website or instagram handle - our ai will pre-fill the form. check and edit before submitting." />
              <Step n="3" text="submissions are reviewed by volunteer curators before appearing publicly. we accept anything that genuinely represents underground or local culture." />
              <Step n="4" text="if approved, you'll receive an email confirming your account is ready for setup." />
            </div>
          </section>

          {/* 04 - sign in */}
          <section
            id="sign-in"
            ref={(el) => { sectionRefs.current["sign-in"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="04" title="signing in" />
            <div className="border-l-4 border-[#c6ff3d] bg-[#c6ff3d]/5 px-5 py-4 mb-5 max-w-prose">
              <p className="text-sm font-bold text-white uppercase tracking-wide leading-snug mb-1">approved members only</p>
              <p className="text-sm text-white/70 leading-relaxed">
                you can only sign in if you have an approved submission. the sign-in button will not work otherwise - this is intentional.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/70 max-w-prose">
              countercult is a curated network. sign-in is only available to verified members who have been accepted through the submission process. this keeps the network high-quality and trustworthy. once approved, use "sign in" in the header and enter your registered email address and password.
            </p>
          </section>

          {/* 05 - approved members */}
          <section
            id="approved"
            ref={(el) => { sectionRefs.current["approved"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="05" title="approved members" />
            <p className="text-sm leading-relaxed text-white/70 mb-5 max-w-prose">once your submission is approved and your account is set up, you can:</p>
            <div className="flex flex-col gap-2 max-w-prose">
              {[
                "add a bio, photo, and portfolio images",
                "link your bandcamp, instagram, ra profile, website, or other platforms",
                "post to the housing, spaces & opportunities board - offer a room, studio, event space, or open call",
                "leave feedback or a review for any venue, artist, or collective through their voice page",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="text-[#c6ff3d] mt-0.5 shrink-0">-</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 06 - residency board */}
          <section
            id="board"
            ref={(el) => { sectionRefs.current["board"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="06" title="spaces + opportunities" />
            <p className="text-sm leading-relaxed text-white/70 mb-5 max-w-prose">
              the member board is for signed-in members of the countercult network to connect around:
            </p>
            <div className="grid md:grid-cols-3 gap-3 mb-5">
              <BoardCard label="housing">
                approved members can offer free hosting, sublets, rentals, short stays, or reciprocal exchanges. housing details stay inside the member layer.
              </BoardCard>
              <BoardCard label="spaces">
                offer a studio, office, warehouse, shop, bar, rehearsal room, shoot location, exhibition room, or event space.
              </BoardCard>
              <BoardCard label="opportunities">
                open calls, paid gigs, collaborations.
              </BoardCard>
            </div>
            <div className="border border-white/10 p-4 bg-white/[0.02] text-sm text-white/50 leading-relaxed max-w-prose">
              <span className="font-bold text-white">18+ only.</span> the private housing board is strictly for adults. no children allowed. zero tolerance for abuse, exploitation, predatory behaviour, or commercial spam. housing posts require an approved member account; space and opportunity offers require a signed-in account.
            </div>
          </section>

          {/* 07 - extra arms */}
          <section
            id="extra-arms"
            ref={(el) => { sectionRefs.current["extra-arms"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="07" title="extra arms" />
            <div className="grid md:grid-cols-2 gap-3">
              <ArmCard n="◈" title="countercult studios">
                our paid services arm for economic development through culture: local research, artist and space sourcing, cultural strategy, creative direction, production, and place-based work that turns local intelligence into paid outcomes.
              </ArmCard>
              <ArmCard n="⇄" title="countercult exchange">
                a separate experiment for exchange: rooms, spaces, practices, opportunities, and the Exchange Residency programme. discovery stays public; member-only exchange details stay protected.
              </ArmCard>
            </div>
          </section>

          {/* 08 - safety */}
          <section
            id="safety"
            ref={(el) => { sectionRefs.current["safety"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="08" title="safety & moderation" />
            <div className="flex flex-col gap-2 max-w-prose">
              <Accordion title="moderation & account access">
                <p>
                  countercult may suspend or remove an account, listing, review, or venue page when it breaches these rules, creates a safety or legal concern, or harms the community. confirmed serious misconduct, including abusive, fraudulent, or dangerous behaviour, results in permanent removal from Countercult. reinstatement is only considered if we made a clear factual error.
                </p>
              </Accordion>
              <Accordion title="Exchange safety">
                <p>
                  the Exchange is a free notice board only. Countercult is not a housing provider, broker, guarantor, insurer, emergency service, or party to member agreements. check identity, permission, written terms, price, safety, insurance, and local law yourself. we cannot guarantee physical safety or investigate every dispute.
                </p>
                <p className="mt-3">
                  if someone behaves abusively, fraudulently, dangerously, or otherwise does you dirty, report it to{" "}
                  <a href="mailto:countercultplatform@gmail.com?subject=Exchange safety report" className="underline hover:text-[#c6ff3d] transition-colors">
                    countercultplatform@gmail.com
                  </a>
                  . include the listing, people involved, dates, and what happened if it is safe to do so.
                </p>
              </Accordion>
              <Accordion title="prohibited conduct">
                <p>
                  users are strictly prohibited from publishing any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, or otherwise objectionable.
                </p>
              </Accordion>
              <Accordion title="zero tolerance for discrimination">
                <p>
                  any account associated with discrimination or hate speech based on race, sex, sexual orientation, gender identity, ability, nationality, or ethnicity will face immediate, non-negotiable termination.
                </p>
              </Accordion>
              <div className="border border-white/10 px-4 py-3 text-sm text-white/50">
                <span className="font-bold text-white/70">report violations → </span>
                <a href="mailto:countercultplatform@gmail.com" className="underline hover:text-[#c6ff3d] transition-colors">
                  countercultplatform@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* 09 - legal */}
          <section
            id="legal"
            ref={(el) => { sectionRefs.current["legal"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="09" title="legal disclaimers & limitation of liability" />
            <p className="text-sm leading-relaxed text-white/75 mb-4 max-w-prose">
              countercult is an independent cultural network and notice board. it helps artists, spaces, and members discover one another; it does not provide housing, brokerage, booking, or emergency services.
            </p>
            <div className="flex flex-col gap-2 max-w-prose">
              <Accordion title="no liability">
                <p>
                  to the fullest extent permitted by applicable law, countercult is not responsible for user-submitted content or arrangements between members. nothing in these terms excludes liability that cannot legally be excluded.
                </p>
              </Accordion>
              <Accordion title="user-generated content">
                <p>
                  the data, maps, listings, and text displayed on this platform are crowdsourced and submitted entirely by third-party users. countercult acts as a passive conduit and does not verify, vet, audit, or guarantee the accuracy, safety, legitimacy, or legality of any user-submitted entries, voice details, physical locations, or external hyperlinks.
                </p>
              </Accordion>
              <Accordion title="housing & opportunities">
                <p>
                  countercult does not own, operate, book, broker, manage, insure, or guarantee any listed space or housing arrangement, and is not a party to agreements between members. users are responsible for checking identity, permission to offer the space, local rules, written terms, price, insurance, and safety before proceeding.
                </p>
              </Accordion>
              <Accordion title="assumption of risk">
                <p>
                  to the fullest extent permitted by applicable law, countercult is not responsible for user-submitted content or arrangements between members. nothing in these terms excludes liability that cannot legally be excluded.
                </p>
              </Accordion>
            </div>
          </section>

          {/* 10 - data */}
          <section
            id="data"
            ref={(el) => { sectionRefs.current["data"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="10" title="data & privacy" />
            <p className="text-sm leading-relaxed text-white/70 mb-4 max-w-prose">
              we take data privacy seriously. by submitting an entry to this map, you acknowledge that you are publishing your cultural listing details to a shared community archive accessible to the public.
            </p>
            <div className="flex flex-col gap-2 max-w-prose">
              <Accordion title="data usage">
                <p>
                  personal data collected (such as your contact email) is utilised strictly to verify, operate, and maintain your account listing.
                </p>
              </Accordion>
              <Accordion title="aggregated & public data">
                <p>
                  to support cultural research, foster ecosystem partnerships, and develop future platform integrations, countercult may use, share, or license aggregated, anonymised data or publicly submitted voice text. we do not sell raw, non-public personal contact data to third parties for direct marketing without your explicit consent.
                </p>
              </Accordion>
              <Accordion title="your rights">
                <p>
                  you retain the right to access, correct, or request the permanent deletion of your submitted data at any time by contacting us at{" "}
                  <a href="mailto:countercultplatform@gmail.com" className="underline hover:text-[#c6ff3d] transition-colors">
                    countercultplatform@gmail.com
                  </a>
                </p>
              </Accordion>
            </div>
          </section>

          {/* 11 - contact */}
          <section
            id="contact"
            ref={(el) => { sectionRefs.current["contact"] = el; }}
            className="scroll-mt-6"
          >
            <SectionHeading n="11" title="contact" />
            <div className="flex flex-col gap-3 max-w-sm">
              <ContactRow label="instagram">
                <a href="https://instagram.com/countercult_creatives" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#c6ff3d] transition-colors">
                  @countercult_creatives ↗
                </a>
              </ContactRow>
              <ContactRow label="web">
                <a href="https://countercultcreatives.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#c6ff3d] transition-colors">
                  countercultcreatives.com ↗
                </a>
              </ContactRow>
              <ContactRow label="email">
                <a href="mailto:countercultplatform@gmail.com" className="underline hover:text-[#c6ff3d] transition-colors">
                  countercultplatform@gmail.com
                </a>
              </ContactRow>
            </div>
            <p className="text-[11px] text-white/55 mt-5 max-w-prose leading-relaxed">
              want to meet the artists behind the curation? catch us irl at one of our upcoming community events or join our global digital events.
            </p>
          </section>

          {/* Pledge */}
          <div className="pb-6">
            <PledgeBanner variant="full" />
          </div>

        </main>
      </div>

      <footer className="border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <span className="text-[9px] uppercase tracking-widest text-white/20">© {new Date().getFullYear()} countercult</span>
        <div className="flex items-center gap-4">
          <a
            href="https://countercultcreatives.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] uppercase tracking-widest text-white/20 hover:text-[#c6ff3d] transition-colors"
          >
            countercultcreatives.com ↗
          </a>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("cc:open-terms"))}
            className="text-[10px] text-white/20 hover:text-[#c6ff3d] transition-colors uppercase tracking-widest"
          >
            terms & privacy
          </button>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SectionHeading({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-white/10">
      <span className="text-[28px] font-bold text-white/[0.06] tabular-nums leading-none select-none">{n}</span>
      <h2 className="text-sm uppercase tracking-widest font-bold text-white/80">{title}</h2>
    </div>
  );
}

function ArmCard({ n, title, children, button }: {
  n: string; title: string; children: React.ReactNode;
  button?: { label: string; href: string; external?: boolean };
}) {
  return (
    <div className="border border-white/10 p-4 bg-white/[0.02] flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-[#c6ff3d] tabular-nums font-bold">{n}</span>
        <span className="text-[9px] uppercase tracking-widest font-bold text-white">{title}</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed flex-1">{children}</p>
      {button && (
        <a
          href={button.href}
          target={button.external ? "_blank" : undefined}
          rel={button.external ? "noopener noreferrer" : undefined}
          className="self-start border border-[#c6ff3d] text-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors mt-1"
        >
          {button.label}
        </a>
      )}
    </div>
  );
}

function MapTypeCard({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 p-4 bg-white/[0.02] hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white font-bold text-sm">{icon}</span>
        <span className="text-[9px] uppercase tracking-widest font-bold text-white">{label}</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{children}</p>
    </div>
  );
}

function BoardCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 p-4 bg-white/[0.02] hover:border-[#c6ff3d]/30 transition-colors">
      <div className="text-[9px] uppercase tracking-widest font-bold text-[#c6ff3d] mb-2">{label}</div>
      <p className="text-sm text-white/80 leading-relaxed">{children}</p>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-4 border border-white/10 p-4 bg-white/[0.02]">
      <span className="text-[#c6ff3d] font-bold text-sm shrink-0 tabular-nums mt-0.5">{n}</span>
      <p className="text-sm text-white/70 leading-relaxed">{text}</p>
    </div>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 pb-3">
      <span className="text-[9px] uppercase tracking-widest text-white/55 w-16 shrink-0">{label}</span>
      <span className="text-sm text-white/70">{children}</span>
    </div>
  );
}
