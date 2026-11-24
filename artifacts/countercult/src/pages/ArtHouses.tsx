import { useEffect, useState, type FormEvent } from "react";
import { submitArtHouseApplication, type ArtHouseApplicationInput } from "@workspace/api-client-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const patronPostHref = `${base}/snail?utm_source=art_houses&utm_medium=application_confirmation#snail-checkout`;
const journalArticleHref = `${base}/journal/free-residency-cultural-infrastructure`;
const residentDiaryHref = `${base}/journal/pink-spy-the-floor-art-residency/`;
const residencyStartDate = "2026-12-16";
const residencyEndDate = "2026-12-26";

const photos = [
  {
    src: `${base}/images/art-houses/floor-staircase-room.webp`,
    alt: "A collage of the spiral staircase and a bedroom at THE FLOOR in Berlin.",
    caption: "Staircase and room",
    width: 1402,
    height: 1478,
  },
  {
    src: `${base}/images/art-houses/shared-table.webp`,
    alt: "Artists sharing dinner around a table at THE FLOOR.",
    caption: "Shared table",
    width: 1400,
    height: 1574,
  },
  {
    src: `${base}/images/art-houses/private-room.webp`,
    alt: "A private bedroom at THE FLOOR, with a bed, rug, and screen.",
    caption: "Private room",
    width: 1412,
    height: 1466,
  },
  {
    src: `${base}/images/art-houses/artists-in-the-space.webp`,
    alt: "Two artists talking in a room with paintings at THE FLOOR.",
    caption: "Art in the house",
    width: 1326,
    height: 1884,
  },
  {
    src: `${base}/images/the-floor/floor-1.webp`,
    alt: "Shared project and studio space at THE FLOOR.",
    caption: "Project and studio space",
    width: 1420,
    height: 1660,
  },
  {
    src: `${base}/images/the-floor/open-call-resident-mad-mod.webp`,
    alt: "Resident Mad.Mod in the garden at THE FLOOR.",
    caption: "Resident in the garden",
    width: 900,
    height: 1131,
  },
  {
    src: `${base}/images/the-floor/floor-3.webp`,
    alt: "An interior view of THE FLOOR's artist residency.",
    caption: "Inside THE FLOOR",
    width: 1800,
    height: 1347,
  },
  {
    src: `${base}/images/the-floor/floor-2.webp`,
    alt: "The private garden at THE FLOOR.",
    caption: "Private garden",
    width: 1246,
    height: 1656,
  },
  {
    src: `${base}/images/the-floor/floor-4.webp`,
    alt: "A resident's private live and work room at THE FLOOR.",
    caption: "Live and work room",
    width: 1236,
    height: 1660,
  },
  {
    src: `${base}/images/the-floor/open-call-resident-ohhi-uisce.webp`,
    alt: "Resident Ohhi Uisce working in the indoor and outdoor studio area.",
    caption: "Resident at work",
    width: 900,
    height: 1126,
  },
  {
    src: `${base}/images/the-floor/floor-5.webp`,
    alt: "Another view of THE FLOOR's shared space.",
    caption: "Shared space",
    width: 1246,
    height: 1666,
  },
  {
    src: `${base}/images/the-floor/open-call-resident-sketchy-shona.webp`,
    alt: "Sketchy Shona in the garden at THE FLOOR.",
    caption: "Sketchy Shona at THE FLOOR",
    width: 900,
    height: 1120,
  },
];

export default function ArtHouses() {
  const [applyingAs, setApplyingAs] = useState<"solo" | "duo">("solo");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("privacyConsent") !== "on") {
      setSubmitError("Please agree to the use of your application details.");
      setSubmitting(false);
      return;
    }
    const availableFrom = String(form.get("availableFrom") ?? "");
    const availableTo = String(form.get("availableTo") ?? "");
    if (!availableFrom || !availableTo || availableFrom > availableTo) {
      setSubmitError("Choose a valid start date and end date within the residency period.");
      setSubmitting(false);
      return;
    }
    const payload: ArtHouseApplicationInput = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      applyingAs,
      ...(applyingAs === "duo"
        ? { secondArtistName: String(form.get("secondArtistName") ?? "").trim() }
        : {}),
      portfolioUrl: String(form.get("portfolioUrl") ?? "").trim(),
      availableFrom,
      availableTo,
      residencyPlan: String(form.get("residencyPlan") ?? "").trim(),
      sharedLiving: String(form.get("sharedLiving") ?? "").trim(),
      friendsDescription: String(form.get("friendsDescription") ?? "").trim(),
      networkMember: form.get("networkMember") === "yes",
      networkConnection: String(form.get("networkConnection") ?? "").trim(),
      considerPatronPost: form.get("considerPatronPost") === "on",
      privacyConsent: true,
      honeypot: String(form.get("website") ?? ""),
    };

    try {
      await submitArtHouseApplication(payload);
      setSubmittedEmail(payload.email);
      formElement.reset();
      setApplyingAs("solo");
      window.setTimeout(() => window.location.assign(patronPostHref), 900);
    } catch {
      setSubmitError("Your application could not be sent. Please check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-[100dvh] bg-white pb-12 text-black"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", textTransform: "none" }}
    >
      <PageHeader title="Countercult Art Houses" subtitle="open call · Berlin" />
      <article>
        <header className="border-b border-[#bdbdbd] px-5 pb-9 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap justify-between gap-2 border-y border-[#bdbdbd] py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a4a4a]">
              <span>Open call · THE FLOOR</span>
            </div>
            <div className="grid gap-8 pt-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)] lg:items-end lg:gap-12 lg:pt-14">
              <h1 className="max-w-5xl text-[clamp(2.7rem,10.5vw,8rem)] font-black uppercase leading-[.88] tracking-[-.065em] lg:text-[clamp(3.25rem,5.4vw,5rem)]">
                FREE ART
                <br />
                RESIDENCY +
                <br />
                ACCOMMODATION
                <br />
                IN BERLIN*
              </h1>
              <div className="max-w-xl lg:pb-1">
                <p className="text-lg font-medium leading-snug sm:text-xl">
                  A ten-day stay at our secret art residency, <a href={`${base}/the-floor`} className="underline decoration-[#aaa] underline-offset-4 hover:decoration-black">THE FLOOR</a>, for one artist or duo. Apply for any part of 16–26 December.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#444]">
                  We’re looking for someone who will document their stay and share it in a format they propose: a zine, journal, mini-film or video, or another approach.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#444]">
                  This residency and the <a href={`${base}/explore`} className="font-semibold underline underline-offset-4">free Countercult Network</a> are supported by our <a href={patronPostHref} className="font-semibold underline underline-offset-4">real mail publication</a>.
                </p>
                <a
                  href="#apply"
                  data-testid="link-art-houses-apply-hero"
                  className="mt-6 inline-flex min-h-12 items-center gap-3 border border-black bg-black px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                >
                  Apply online <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={residentDiaryHref}
                  className="mt-5 inline-flex w-fit items-center gap-3 border border-black bg-white p-2 text-left shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-1"
                  data-testid="link-art-houses-resident-diary"
                >
                  <img
                    src={`${base}/journal/pink-spy-the-floor-art-residency/assets/01-pink-spy-presents.jpg`}
                    alt=""
                    className="h-16 w-16 object-cover"
                  />
                  <span className="max-w-32 text-[10px] font-bold uppercase leading-tight tracking-[.08em]">
                    See what residents think ↓
                  </span>
                </a>
              </div>
            </div>

            <dl className="mt-9 grid grid-cols-2 gap-px border border-[#bdbdbd] bg-[#bdbdbd] sm:grid-cols-3 lg:grid-cols-6">
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Dates</dt>
                <dd className="mt-1 text-sm font-bold sm:text-base">16–26 December 2026</dd>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Residency fee</dt>
                <dd className="mt-1 text-sm font-bold sm:text-base">FREE</dd>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Rent</dt>
                <dd className="mt-1 text-sm font-bold sm:text-base">FREE</dd>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Utilities</dt>
                <dd className="mt-1 text-sm font-bold leading-snug sm:text-base">€75 for one resident<br />€150 total for a duo</dd>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Private room</dt>
                <dd className="mt-1 text-sm font-bold sm:text-base">22 m² per resident</dd>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#555]">Shared workspace</dt>
                <dd className="mt-1 text-sm font-bold sm:text-base">22 m²</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-[#555]">
              *Artists only cover a flat €75 utility contribution (€150 for duos); no program or rent fees apply.
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-relaxed text-[#444]">
              <a className="font-semibold underline underline-offset-4" href="#the-space">See THE FLOOR photos ↓</a>
              <a className="font-semibold underline underline-offset-4" href={journalArticleHref}>Why this residency is a test of cultural infrastructure</a>
            </p>
          </div>
        </header>

        <section id="the-space" aria-label="THE FLOOR in Berlin" className="scroll-mt-24 border-b border-[#bdbdbd] px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <figure key={photo.src} className="m-0">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="block h-auto w-full border border-[#d2d2d2] bg-[#f2f2f2] object-contain"
                />
                <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#555]">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="apply" aria-labelledby="apply-heading" className="scroll-mt-24 border-b border-[#bdbdbd] px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[.7fr_1.3fr] md:gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#555]">Free art residency · Berlin</p>
              <h2 id="apply-heading" className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Apply online.</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#555]">
                One link to your work is enough. No PDF or file upload.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#555]">
                Existing connection to <a href={`${base}/about`} className="font-semibold underline underline-offset-4">Countercult</a> is one consideration alongside your project plan and shared-living fit. Newcomers are welcome. Patron Post is optional and does not affect selection.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#555]">
                Community organizers and independent publishers are especially encouraged to apply, but are not required.
              </p>
            </div>
            <div>
              {submittedEmail ? (
                <div className="border border-black bg-[#f4f4f1] p-5 sm:p-7" data-testid="art-house-application-success" role="status">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-[#555]">Application received</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-[-.03em]">Thank you for applying.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#444]">
                    We have your application and will contact you at <strong>{submittedEmail}</strong>. Opening Patron Post now. It is optional and does not affect selection.
                  </p>
                  <div className="mt-6 border-t border-[#c7c7c3] pt-5">
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-[#555]">Supported by real mail</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#444]">
                      Patron Post helps keep our mission and network alive, fund free residency places, and move us toward paying the volunteers who work hard to keep it going. It also helps keep the free <a href={`${base}/residency`} className="font-semibold underline underline-offset-4">Exchange board</a> accessible. It is optional and your application has already been submitted.
                    </p>
                    <a
                      href={patronPostHref}
                      data-testid="link-art-houses-patron-post-after-application"
                      className="mt-5 inline-flex min-h-11 items-center gap-2 border border-black bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Join Patron Post <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={submitApplication} data-testid="form-art-house-application">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold">
                      Your name
                      <input name="name" required minLength={2} maxLength={120} autoComplete="name" className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                    </label>
                    <label className="block text-xs font-bold">
                      Email
                      <input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                    </label>
                  </div>

                  <fieldset>
                    <legend className="text-xs font-bold">Applying as</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["solo", "duo"] as const).map((option) => (
                        <label key={option} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-sm ${applyingAs === option ? "border-black bg-black text-white" : "border-[#aaa] bg-white"}`}>
                          <input
                            type="radio"
                            name="applyingAs"
                            value={option}
                            checked={applyingAs === option}
                            onChange={() => setApplyingAs(option)}
                            className="accent-[#111]"
                          />
                          {option === "solo" ? "One artist" : "Duo"}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {applyingAs === "duo" && (
                    <label className="block text-xs font-bold">
                      Second artist’s name
                      <input name="secondArtistName" required maxLength={120} className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                    </label>
                  )}

                  <label className="block text-xs font-bold">
                    One link to your work
                    <input name="portfolioUrl" type="url" required maxLength={500} placeholder="https://" className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                  </label>

                  <fieldset>
                    <legend className="text-xs font-bold">Which dates can you stay?</legend>
                    <p className="mt-2 text-xs font-normal leading-relaxed text-[#555]">
                      You can apply for part of the residency. Choose dates within 16–26 December 2026.
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-bold">
                        From
                        <input name="availableFrom" type="date" required min={residencyStartDate} max={residencyEndDate} className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                      </label>
                      <label className="block text-xs font-bold">
                        Through
                        <input name="availableTo" type="date" required min={residencyStartDate} max={residencyEndDate} className="mt-2 block min-h-11 w-full border border-[#aaa] bg-white px-3 text-sm font-normal outline-none focus:border-black" />
                      </label>
                    </div>
                  </fieldset>

                  <label className="block text-xs font-bold">
                    What would you use the residency time for, and how would you document your stay?
                    <span className="mt-2 block text-xs font-normal leading-relaxed text-[#555]">
                      We’re looking for someone to share documentation in a format they propose, such as a zine, journal, mini-film or video, or another approach.
                    </span>
                    <textarea name="residencyPlan" required minLength={10} maxLength={2000} rows={4} className="mt-2 block w-full border border-[#aaa] bg-white p-3 text-sm font-normal leading-relaxed outline-none focus:border-black" />
                  </label>

                  <label className="block text-xs font-bold">
                    How do you approach living with other people?
                    <textarea name="sharedLiving" required minLength={10} maxLength={1200} rows={3} className="mt-2 block w-full border border-[#aaa] bg-white p-3 text-sm font-normal leading-relaxed outline-none focus:border-black" />
                  </label>

                  <label className="block text-xs font-bold">
                    How would your friends describe you?
                    <textarea name="friendsDescription" required minLength={10} maxLength={1000} rows={3} className="mt-2 block w-full border border-[#aaa] bg-white p-3 text-sm font-normal leading-relaxed outline-none focus:border-black" />
                  </label>

                  <fieldset>
                    <legend className="text-xs font-bold">
                      Are you already signed up to the <a href={`${base}/explore`} className="underline underline-offset-4">free Countercult Network</a>?
                    </legend>
                    <div className="mt-2 flex gap-4 text-sm">
                      <label className="inline-flex items-center gap-2"><input type="radio" name="networkMember" value="yes" required className="accent-black" /> Yes</label>
                      <label className="inline-flex items-center gap-2"><input type="radio" name="networkMember" value="no" required className="accent-black" /> No</label>
                    </div>
                  </fieldset>

                  <label className="block text-xs font-bold">
                    Any other connection to Countercult? (Optional)
                    <textarea name="networkConnection" maxLength={1200} rows={2} className="mt-2 block w-full border border-[#aaa] bg-white p-3 text-sm font-normal leading-relaxed outline-none focus:border-black" />
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-[#aaa] p-3 text-sm leading-relaxed">
                    <input name="considerPatronPost" type="checkbox" className="mt-1 h-4 w-4 accent-black" />
                    <span>I’ll seriously consider joining Patron Post from €7 a month. It helps fund independent cultural journalism, keep the Countercult Network and Exchange free, support free residency places, and move us toward paying the volunteers who keep it going.</span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-[#aaa] p-3 text-xs leading-relaxed text-[#444]">
                    <input name="privacyConsent" type="checkbox" required className="mt-1 h-4 w-4 accent-black" />
                    <span>I agree that Countercult can use these answers and my email to assess this application and contact me about it. Applications are stored in the private Studio OS.</span>
                  </label>

                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                  />

                  {submitError && <p role="alert" className="border border-red-700 bg-red-50 p-3 text-sm text-red-900">{submitError}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="button-submit-art-house-application"
                    className="inline-flex min-h-12 items-center gap-3 border border-black bg-black px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting ? "Sending application…" : "Submit application"}
                    {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="support-heading" className="border-b border-[#bdbdbd] bg-[#f2f2f2] px-5 py-7 sm:px-8 sm:py-8">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 id="support-heading" className="text-xl font-bold tracking-[-.02em]">Supported by real mail</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#444]">
                <a href={patronPostHref} className="font-semibold underline underline-offset-4">Patron Post</a> helps keep our mission and <a href={`${base}/explore`} className="font-semibold underline underline-offset-4">free Countercult Network</a> alive, fund free residency places, and move us toward paying the volunteers who work hard to keep it going. It supports the free <a href={`${base}/residency`} className="font-semibold underline underline-offset-4">Exchange board</a> too. If you can, please consider joining. It is entirely optional.
              </p>
            </div>
            <a
              href={patronPostHref}
              data-testid="link-art-houses-patron-post"
              className="inline-flex min-h-11 items-center gap-2 border border-black px-4 py-2 text-sm font-bold transition-colors hover:bg-black hover:text-white"
            >
              Join Patron Post <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        <footer className="px-5 py-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[#555]">Countercult Art Houses · THE FLOOR, Berlin</p>
            <a href="#apply" data-testid="link-art-houses-apply-footer" className="inline-flex w-fit items-center gap-2 font-bold underline underline-offset-4">
              Apply online <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </footer>
      </article>
    </main>
  );
}
