import { useState, type ReactNode } from "react";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

const CONTACT_EMAIL = "countercultplatform@gmail.com";

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t-2 border-black/10 pt-6">
      <h2 className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.16em]">{title}</h2>
      <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-black/70">{children}</div>
    </section>
  );
}

export default function Privacy() {
  const [analyticsConsent, setAnalyticsConsentState] = useState(getAnalyticsConsent());
  const updateAnalyticsConsent = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setAnalyticsConsentState(value);
  };

  return (
    <main className="min-h-[100dvh] bg-[#F9F9F6] text-black">
      <header className="border-b-2 border-black bg-black px-5 py-8 text-[#F9F9F6] sm:px-8">
        <div className="mx-auto max-w-4xl">
          <a href="/" className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d]">
            ← countercult
          </a>
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">privacy and data rights</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
            your data should not be harder to leave than it was to share.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65">
            This notice explains the information Countercult currently collects, why we use it, what is public, and how to ask us to access, correct, restrict, or delete it.
          </p>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-widest text-white/40">last updated: 23 November 2026</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8">
        <div className="border-2 border-[#ff6b4a] bg-[#ff6b4a]/15 p-4 text-sm leading-relaxed">
          <strong className="font-mono text-[10px] uppercase tracking-widest">interim controller details</strong>
          <p className="mt-2">
            The intended operating entity is Countercult LLC, currently being formed in Delaware, United States. Its final legal controller name and postal address are not yet confirmed, so this notice does not present an unconfirmed address as fact. Countercult is currently operated as an independent project and this section will be updated before paid services begin. For privacy questions now, contact{" "}
            <a className="font-bold underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>

        <Section title="what we collect">
          <p>Depending on how you use Countercult, this can include your email address, password hash, display name, artist or space profile, biography, photo, links, approximate city location, resource offers, Exchange posts, messages you send to us, and account or consent records.</p>
          <p>When you create an account, we may also record campaign tags from the link you used, the referring website domain, the first Countercult page you visited, and an optional answer about how you heard about us. This limited signup attribution stays internal and is not shown on your public profile.</p>
          <p>We do not need your exact home address for the public map. Public map coordinates are approximated.</p>
        </Section>

        <Section title="age eligibility">
          <p>Countercult accounts and member access are for adults aged 18 and over. We do not ask for a date of birth because we do not need one. If you are under 18, please do not create an account or submit personal information to Countercult.</p>
        </Section>

        <Section title="why we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>To create and maintain an account and profile, including steps requested before an account is approved.</li>
            <li>To review applications and protect the network from abuse.</li>
            <li>To publish the public profile information you explicitly agree to publish.</li>
            <li>To provide member-only Exchange and profile features.</li>
            <li>To send essential account, security, and application emails.</li>
            <li>To send optional updates only where you have separately opted in.</li>
            <li>To understand which campaign links and discovery routes lead people to Countercult, so we can make outreach more useful.</li>
            <li>To run optional analytics only after you actively allow them.</li>
            <li>To keep the service secure, prevent misuse, and meet legal obligations.</li>
          </ul>
          <p>When you submit an application, the required signup checkbox records your consent for Countercult to collect, store, and use the information you provide to review the application, create and manage your account, and provide Network features. We separately record your choice about public profile visibility; optional newsletter updates, the weekly Exchange digest, and analytics also require separate consent. Exchange digest delivery begins only after your account is approved, and you can unsubscribe from it at any time. Curation, abuse prevention, and service security use legitimate interests, while legal records may be retained to meet legal obligations. You can withdraw consent by contacting us. Withdrawal may mean we cannot continue reviewing the application or maintaining the account, and limited records may still be retained where required for legal or safety reasons.</p>
        </Section>

        <Section title="what is public">
          <p>If you apply for a public artist profile and agree to publication, a limited Explore preview may show your display name, city and country, selected tags, broad open-to or offering categories, the profile photo you chose for public use, and an approximate map position. Visitors can see this preview without signing in. Full artist profiles, detailed biographies, direct contact details, and portfolio media are available only to approved Countercult Network members.</p>
          <p>For a public space profile, the selected name, public description, resource offers, tags, links, photo, city, country, and approximate map position may be visible on the public internet, including to people outside the Countercult network.</p>
          <p>Private contact details, account credentials, moderation information, and protected Exchange information are not intended for anonymous visitors. You can ask us to hide or remove your public profile.</p>
        </Section>

        <Section title="emails and saved applications">
          <p>Account, password-reset, approval, and saved-application emails are operational messages. They are not the same as marketing consent.</p>
          <p>Saved signup applications expire after 14 days. Optional updates require a separate opt-in. You can withdraw from optional updates by contacting us or using the unsubscribe mechanism in the message.</p>
        </Section>

        <Section title="retention and deletion">
          <p>We keep information only for as long as it is needed for the purpose collected, network safety, legal obligations, or the establishment and defence of legal claims. Our current operational defaults are:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Active accounts and public profiles: while the account or profile is active, unless you ask us to remove it.</li>
            <li>Rejected or withdrawn member applications: up to 12 months after the final decision, for curation, abuse prevention, and audit purposes.</li>
            <li>Saved signup drafts: the resume link expires after 14 days and expired drafts are purged during the retention sweep.</li>
            <li>Sessions: until they expire, with expired sessions removed during the retention sweep.</li>
            <li>Completed privacy request records: up to 180 days after completion for accountability.</li>
            <li>Deleted profiles and related records: limited recovery and moderation records may remain for the period needed to complete the deletion workflow, after which the data is purged or anonymised.</li>
            <li>Exchange posts and uploaded media: while needed to provide the feature or until deletion is requested, subject to safety, legal, and backup constraints.</li>
          </ul>
          <p>We are still documenting exact retention periods for operational logs and backups. Backup copies may take longer to disappear from an immutable backup cycle, but they are not restored for ordinary use.</p>
          <p>When you ask us to delete data, some limited information may need to remain where the law requires it or where it is necessary to maintain a suppression, fraud-prevention, payment, or legal record.</p>
        </Section>

        <Section title="your rights">
          <p>Subject to applicable law, you may ask for access, a copy of your data, correction, deletion, restriction, objection, portability, or withdrawal of consent. You may also complain to the data protection authority in the country where you live or work.</p>
          <p>
            Email requests to{" "}
            <a className="font-bold underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}?subject=Countercult%20data%20rights%20request`}>{CONTACT_EMAIL}</a>
            {" "}with the subject “Countercult data rights request”. We may need to verify identity before providing or deleting account information.
          </p>
          <p>We aim to respond within one month. If a request is complex, we will explain any lawful extension.</p>
        </Section>

        <Section id="optional-analytics" title="optional analytics">
          <p>Countercult&apos;s optional analytics are disabled unless you actively allow them in this browser. Essential application storage, such as keeping a signed-in session, is separate from optional analytics.</p>
          <div className="flex flex-wrap items-center gap-3 border border-black/15 bg-white p-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-black/55">
              current setting: {analyticsConsent === "granted" ? "allowed" : analyticsConsent === "denied" ? "blocked" : "not chosen"}
            </span>
            <button type="button" onClick={() => updateAnalyticsConsent("granted")} className="border-2 border-black bg-black px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-[#c6ff3d]">allow analytics</button>
            <button type="button" onClick={() => updateAnalyticsConsent("denied")} className="border-2 border-black px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-black hover:bg-black hover:text-[#c6ff3d]">keep blocked</button>
          </div>
        </Section>

        <Section title="service providers and transfers">
           <p>Countercult currently uses or may use the following provider categories: Replit for hosting, runtime, database, and object storage; Resend for operational email; OpenStreetMap and Nominatim for map and location services; and Umami for optional analytics after consent. Some providers may process information outside the EEA, including in the United States.</p>
          <p>The final provider list, data-processing agreements, transfer mechanism, and supplementary safeguards will be recorded in Countercult&apos;s internal processing record and added here as the operating arrangements are finalized.</p>
        </Section>

        <Section title="contact">
          <p>Countercult has not currently appointed a separate Data Protection Officer. For privacy questions, deletion requests, public-profile removal, or concerns about a listing, contact <a className="font-bold underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        </Section>
      </div>
    </main>
  );
}