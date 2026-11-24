import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const image = (file: string) => `${base}/images/guadalajara/${file}`;
const applicationFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdgBFBFejyEbwRucsZitWvGUSd0P6t-l_q7BWOMUoBSfkBADw/viewform?usp=header";

const gallery = [
  { file: "house-courtyard.webp", alt: "A leafy courtyard lounge with tiled floors and seating in the residency house", caption: "courtyard lounge", width: 1450, height: 962 },
  { file: "shared-living-room.webp", alt: "Shared living room with patterned tile, plants, and communal seating", caption: "shared living room", width: 2210, height: 1624 },
  { file: "dining-room.webp", alt: "Dining table with green chairs in a Guadalajara residence dining room", caption: "dining room", width: 1230, height: 1624 },
  { file: "courtyard-sofa.webp", alt: "Sofa and patterned cushions around a table in the plant-filled courtyard", caption: "courtyard seating", width: 1224, height: 1640 },
  { file: "tiled-sitting-room.webp", alt: "Sitting room with patterned tile floor, two armchairs, and a grandfather clock", caption: "tiled sitting room", width: 1218, height: 1628 },
  { file: "doorway-bedroom.webp", alt: "View through a dark wood doorway toward a furnished bedroom", caption: "bedroom doorway", width: 1228, height: 1632 },
  { file: "bedroom.webp", alt: "Residency bedroom with a king bed, writing desk, and open wooden shutters", caption: "bedroom", width: 1222, height: 1622 },
  { file: "hallway-to-lounge.webp", alt: "Long tiled hallway with hanging lanterns leading to a lounge area", caption: "hallway to the lounge", width: 1198, height: 1636 },
  { file: "courtyard-at-dusk.webp", alt: "White interior courtyard with columns, plants, and open doors at dusk", caption: "interior courtyard", width: 1226, height: 1640 },
  { file: "courtyard-reading-nook.webp", alt: "Courtyard seating area with a patterned rug, plants, and a gold-toned wall niche", caption: "courtyard seating", width: 1214, height: 1632 },
  { file: "house-exterior.webp", alt: "Street-facing exterior of the residency house with a tree and painted facade", caption: "the house exterior", width: 2162, height: 1602 },
  { file: "cultural-street.webp", alt: "Colorful Guadalajara street beneath papel picado", caption: "surrounding city", width: 980, height: 1052 },
  { file: "cathedral-panorama.webp", alt: "Panoramic view across Guadalajara rooftops toward the cathedral towers", caption: "Guadalajara skyline", width: 938, height: 702 },
];

export default function GuadalajaraResidency() {
  return (
    <main className="gdl-page min-h-[100dvh] bg-[#f7f3eb] pb-16 text-[#191916]">
      <PageHeader title="countercult pop-up art house: guadalajara" subtitle="coliving · artist residency · patron stays" />
      <article>
        <header className="border-b-2 border-black bg-black px-5 py-9 text-white sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Guadalajara · 5 January to 5 February 2027 · pop-up art house</p>
            <h1 style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="max-w-5xl text-5xl font-black uppercase leading-[0.85] tracking-[-0.055em] sm:text-7xl lg:text-8xl">Pop-up art house:<br />Guadalajara</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Countercult Art Houses welcome artists to make work and patrons who want to spend time close to the people and ideas shaping it. In Guadalajara, artists will lead workshops and cultural programming for a small community of residents and patrons, alongside their own practice and projects developed with people who know the city.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              Guadalajara’s cultural life includes <a href="https://ich.unesco.org/en/RL/mariachi-string-music-song-and-trumpet-00575" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">mariachi</a>, José Clemente Orozco’s murals at <a href="https://whc.unesco.org/en/list/815/" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">Hospicio Cabañas</a>, the ceramic workshops of nearby <a href="https://visitjalisco.mx/regiones/guadalajara?lang=en" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">Tonalá and Tlaquepaque</a>, and food such as birria and tortas ahogadas.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={applicationFormUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 border-2 border-white bg-white px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-black hover:text-white">
                apply as an artist <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#patron-stay" className="inline-flex items-center gap-3 border-2 border-white px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black">
                explore the Patron Stay <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 grid max-w-4xl grid-cols-2 border-y border-white/25 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/55 sm:grid-cols-4 sm:text-[10px]">
              <a href="#space" className="border-r border-b border-white/25 py-3 pr-3 sm:border-b-0">place<br /><span className="text-white">pop-up art house + coliving</span></a>
              <a href="#programme" className="border-b border-white/25 px-3 py-3 sm:border-r sm:border-b-0">programme<br /><span className="text-white">artists + local culture</span></a>
              <a href="#details" className="border-r border-white/25 py-3 pr-3 sm:px-3">dates<br /><span className="text-white">5 Jan to 5 Feb 2027</span></a>
              <a href="#details" className="py-3 pl-3">artist places<br /><span className="text-white">€750 shared / €1,500 private</span></a>
            </div>
            <a href="#programme" className="mt-4 inline-flex font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/60 hover:text-white">see the programme and how we work ↓</a>
          </div>
        </header>

        <section id="patron-stay" aria-labelledby="gdl-patron-title" className="scroll-mt-6 border-b-2 border-black bg-[#c6ff3d] px-5 py-9 sm:px-8 sm:py-12">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">for patrons</p>
              <h2 id="gdl-patron-title" className="mt-4 max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">Spend time with artists. Take part in the work.</h2>
            </div>
            <div className="max-w-2xl text-sm leading-relaxed text-black/75 sm:text-base">
              <p>A one-month Patron Stay is €2,000 for a private room. It is for people in tech, design, culture, and other fields who want to experience artists’ work up close and take part in workshops and cultural programming led by the artists, alongside selected shared dinners. This is an invitation into a small, artist-led environment, not simply a place to stay.</p>
              <p className="mt-4">This is coliving, not a hotel or an all-inclusive retreat. Flights, visas, local transport, and most meals are not included. Selected shared dinners are included.</p>
              <a href="mailto:countercultplatform@gmail.com?subject=Guadalajara%20Art%20House%20Patron%20Stay" className="mt-6 inline-flex min-h-12 items-center gap-3 border-2 border-black bg-black px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black">
                enquire about a Patron Stay <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section id="space" className="scroll-mt-6 border-b-2 border-black bg-[#1d1d1a] px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-end justify-between gap-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">the house and the streets around it</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">Guadalajara, Mexico</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gallery.map((photo, index) => (
                <figure key={photo.file} className={`relative overflow-hidden bg-white/10 ${index === 0 ? "col-span-2 aspect-[16/8] sm:col-span-2" : "aspect-[4/3]"}`}>
                  <img src={image(photo.file)} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <figcaption className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-white">{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-5 max-w-4xl space-y-3 text-sm leading-relaxed text-white/70 sm:text-base">
              <p>The house is a spacious 200-year-old historic building in Guadalajara&apos;s central area. It has five bedrooms, two garden/patio areas, Wi-Fi, kitchen access, desks, shared workspace, and a lounge. Historic streets and restaurants are all around us.</p>
              <p className="text-xs text-white/50">The house is in a lively central neighbourhood, close to historic streets and restaurants. City sounds are part of the setting, and petty theft can happen in crowded places. Keep your belongings close as you explore.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="gdl-advisors-title" className="border-b-2 border-black bg-black px-5 py-9 text-white sm:px-8 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 border-b border-white/30 pb-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">resident advisors</p>
                <h2 id="gdl-advisors-title" className="mt-4 max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">Your resident advisors.</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                Our resident advisors are Sketchy Shona, a visual and installation artist and curator, and Fernanda, a floral artist, interior designer, and curator in Guadalajara. Shona has spent years making room for artists at <a href={`${base}/the-floor/`} className="font-bold text-white underline underline-offset-4">THE FLOOR</a>, Countercult&apos;s in-person Berlin residency. Artist office hours and mentorship give you time to talk through your ideas, share perspectives, and get feedback from fellow artists.
              </p>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <article className="grid grid-cols-[minmax(100px,0.7fr)_1fr] gap-4 border border-white/25 p-4 sm:gap-6 sm:p-6">
                  <img src={image("fernanda-host.webp")} alt="Fernanda, a resident advisor in Guadalajara, arranging a shared dinner table" width="1238" height="1642" loading="lazy" decoding="async" className="h-full min-h-44 w-full object-cover" />
                <div className="self-end">
                  <p className="mb-2 inline-flex border border-[#c6ff3d] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#c6ff3d]">Resident advisor · Guadalajara</p>
                  <h3 className="text-2xl font-black uppercase">Fernanda</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">Floral artist, interior designer, and curator.</p>
                </div>
              </article>
              <article className="grid grid-cols-[minmax(100px,0.7fr)_1fr] gap-4 border border-white/25 p-4 sm:gap-6 sm:p-6">
                <img src={image("sketchy-shona-installation.webp")} alt="Sketchy Shona seated within a large painted installation" width="1550" height="1968" loading="lazy" decoding="async" className="h-full min-h-44 w-full object-cover" />
                <div className="self-end">
                  <p className="mb-2 inline-flex border border-white/25 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/65">Resident advisor</p>
                  <h3 className="text-2xl font-black uppercase"><a href="https://countercult.network/sketchyshona/" target="_blank" rel="noopener noreferrer" className="underline decoration-white/35 underline-offset-4 transition-colors hover:text-[#c6ff3d] hover:decoration-[#c6ff3d]">Sketchy Shona</a></h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">Visual and installation artist and curator.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="programme" aria-labelledby="gdl-programme-title" className="scroll-mt-6 border-b-2 border-black bg-[#f7f3eb] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 border-b-2 border-black pb-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">how the month works</p>
                <h2 id="gdl-programme-title" className="mt-4 max-w-lg text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">Make work with the city and with each other.</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-black/70 sm:text-lg">
                The residency combines time for your own practice with an artist-led shared programme. You will have space to work, meet local artists, and develop ideas with people who know Guadalajara.
              </p>
            </div>
            <div className="mt-7 grid gap-px border-2 border-black bg-black sm:grid-cols-2">
              {[
                ["01", "Artist office hours and mentorship", "Talk through your work with resident advisors, share questions, and get feedback as your project develops."],
                ["02", "Shared artist practice", "Residents take part in artist coworking hours, family dinners, and group critiques, helping shape the rhythm of the month together."],
                ["03", "A project with a local partner", "Each international resident develops one project with a local business or initiative. It could take the form of a workshop, event, documentation, or another idea agreed with the people involved."],
                ["04", "Local activities and workshops", "The programme includes selected activities and workshops led by artists in Guadalajara, alongside time to explore the city and its cultural life."],
              ].map(([number, title, copy]) => (
                <article key={number} className="bg-[#f7f3eb] p-5 sm:p-7">
                  <p className="font-mono text-[10px] font-bold tracking-[0.15em] text-black/45">{number}</p>
                  <h3 className="mt-4 text-xl font-black uppercase leading-tight tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-black/70">{copy}</p>
                </article>
              ))}
            </div>
            <article className="mt-7 grid overflow-hidden border-2 border-black bg-white lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)]">
              <figure className="relative min-h-72 bg-black">
                <img
                  src={image("susana-cooking.png")}
                  alt="Susana smiling at a kitchen counter"
                  width={720}
                  height={776}
                  loading="lazy"
                  decoding="async"
                  className="h-full min-h-72 w-full object-cover"
                />
                <figcaption className="absolute bottom-3 left-3 bg-black/75 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white">Susana · local programme</figcaption>
              </figure>
              <div className="p-5 sm:p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">a local session around the table</p>
                <h3 className="mt-4 max-w-xl text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-4xl">Mexican cooking with Susana.</h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/70 sm:text-base">
                  Susana, Fernanda’s mother, will share Mexican cooking through a hands-on session with the residency artists. She wants to pass on recipes, aromas and traditions, and to make a welcoming table where food can carry stories and bring people together. Her hope is that residents take the recipes home to share with their own families and friends. The session date and practical details will be agreed with the cohort.
                </p>
                <blockquote lang="es" className="mt-6 border-l-4 border-[#c6ff3d] bg-[#f7f3eb] p-4 text-sm leading-relaxed text-black/75 sm:p-5">
                  <p>“Hola, soy Susana. Mis amigas dicen que soy una buena oyente y una compañía agradable, y creo que eso es porque me gusta escuchar, compartir y hacer que los demás se sientan bienvenidos y queridos. ❤️</p>
                  <p className="mt-3">Una de mis grandes pasiones es la cocina, especialmente la deliciosa gastronomía mexicana. Me encantaría compartir un pedacito de mi cultura a través de sus sabores, aromas y tradiciones.</p>
                  <p className="mt-3">Para mí, cocinar es mucho más que preparar alimentos: es una manera de transmitir cariño, contar historias y crear recuerdos alrededor de una mesa.</p>
                  <p className="mt-3">Mi mayor ilusión es que quienes aprendan a cocinar conmigo puedan llevar esos sabores a sus propias casas, compartirlos con sus familiares y amigos y decir con una sonrisa: «¡Esta receta me la enseñó la señora Susana!» 🥰</p>
                  <p className="mt-3">Porque creo que la comida sabe todavía mejor cuando se prepara con amor.”</p>
                  <footer className="mt-4 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-black/50">Susana</footer>
                </blockquote>
                <details className="mt-4 border-t border-black/15 pt-4 text-sm leading-relaxed text-black/70">
                  <summary className="cursor-pointer font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-black">English translation</summary>
                  <div lang="en" className="mt-3 space-y-3">
                    <p>“Hello, I’m Susana. My friends say I’m a good listener and pleasant company, and I think that’s because I like to listen, share, and make others feel welcome and loved. ❤️</p>
                    <p>One of my great passions is cooking, especially delicious Mexican food. I would love to share a little of my culture through its flavours, aromas and traditions.</p>
                    <p>For me, cooking is much more than preparing food. It is a way to show affection, tell stories and create memories around a table.</p>
                    <p>My greatest wish is that people who learn to cook with me can take those flavours home, share them with family and friends, and say with a smile, «Señora Susana taught me this recipe!» 🥰</p>
                    <p>Because I believe food tastes even better when it is made with love.”</p>
                  </div>
                </details>
              </div>
            </article>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-black/65">
              This is a shared working home. Residents help keep common areas tidy and take part in cleaning when needed. The residency is queer- and child-friendly, and Spanish is welcome but not required.
            </p>
          </div>
        </section>

        <section id="details" className="scroll-mt-6 border-b-2 border-black px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 border-b-2 border-black pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">who should apply?</p>
                <h2 className="mt-4 max-w-md text-4xl font-black uppercase leading-[0.88] tracking-[-0.05em] sm:text-6xl">Bring a project you want time to make.</h2>
              </div>
                <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-black/70 sm:text-base">
                <p>We welcome artists who want time to develop a project and make a month of their own. Your plan can still be taking shape. We value clear intentions, curiosity about Guadalajara, and openness to collaboration.</p>
                <div className="grid gap-6 border-y-2 border-black py-5 sm:grid-cols-2">
                  <div>
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">This could be a good fit if</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                      <li>You have a project or question you would like time to develop. Your plan can still be taking shape.</li>
                      <li>You are curious about Guadalajara and interested in learning from the people, businesses, and initiatives you meet.</li>
                      <li>You enjoy shared living and want to help shape some of the month with other artists.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">How the month is structured</h3>
                    <p className="mt-3">The room fee includes the artist-led programme, mentoring with our resident advisors, and scheduled artist coworking sessions. Each international resident develops one project with a local business or initiative, with the form agreed together. Everyone takes part in weekly family dinners, group critiques, and selected activities led by artists in Guadalajara. A shared-room place is €750 per artist, or €1,500 for a private-room place, for the full stay. Food, travel, and visas are separate. Write to us if you would like to talk through the format or what the house can provide before applying.</p>
                  </div>
                </div>
                <div className="border-b-2 border-black pb-5">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">This may not be the right fit if</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>You need a fully funded residency. Room fees cover the house and shared programme; flights, visas, local transport, and most meals remain your responsibility. Selected shared dinners are included.</li>
                    <li>You are looking for a fully scheduled course or a quiet retreat. The residency is self-directed, in a lively central neighbourhood and a shared home.</li>
                    <li>You would rather not take part in communal living, scheduled coworking, or a weekly family dinner. All residents are expected to join these parts of the programme.</li>
                    <li>You are seeking therapy or clinical support. Resident advisors offer artistic mentoring and peer feedback, not mental-health care.</li>
                  </ul>
                </div>
                <p>This is a queer- and child-friendly residency. Spanish is welcome, but not required. Accessibility matters to us. <a href="mailto:countercultplatform@gmail.com?subject=Guadalajara%20residency%20accessibility%20question" className="font-bold underline underline-offset-2">Write to us</a> about access needs or any other questions. We will talk through what the house can provide.</p>
              </div>
            </div>
            <div className="mt-10 border-t-2 border-black pt-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">practical information</p>
              <div className="mt-3 divide-y-2 divide-black border-y-2 border-black">
                <details open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-xl font-black uppercase tracking-[-0.03em] [&::-webkit-details-marker]:hidden">dates, rooms + fees <Plus className="h-5 w-5" aria-hidden="true" /></summary>
                  <div className="grid gap-5 pb-5 text-sm leading-relaxed text-black/70 sm:grid-cols-3">
                    <p><strong className="text-black">Dates:</strong> 5 January to 5 February 2027. Up to 8 international artists live in the pop-up art house.</p>
                    <p><strong className="text-black">Room fee:</strong> A shared-room place is €750 per artist for the full stay. A private-room place is €1,500 per artist. Two artists applying together and sharing one room each pay €750 (€1,500 for both). Tell us whether you prefer one large king bed or two double beds; this is a preference, not a guaranteed assignment.</p>
                    <p><strong className="text-black">Payment:</strong> The €400 non-refundable down payment is due on acceptance. Pay the remaining balance before 1 December 2026. We confirm your place once the full fee for your selected room option is paid; the first artist to pay in full gets first choice of the rooms still available.</p>
                  </div>
                    <p className="pb-3 text-xs leading-relaxed text-black/60">Artist room fees include participation in the residency programme. Flights, visas, local transport, and most meals are not included. Selected shared dinners are part of the programme. The Patron Stay is €2,000 for one month in a private room, including artist-led workshops, cultural programming, and selected shared dinners.</p>
                  <p className="pb-5 text-xs leading-relaxed text-black/60">The down payment is non-refundable if you cancel. If your plans change, we may offer your place to someone on the waitlist, but a refund is not guaranteed. Please arrange travel, weather, health, and visa matters independently; Countercult cannot cover disruptions in these areas.</p>
                </details>
              </div>
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-6 border-b-2 border-black px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">application</p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">Tell us what you would bring.</h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-black/65">Tell us about your practice, the project you want to develop, and how you work and live with other people. For an artist duo, one person sends a joint application with separate details for both artists. The application form opens in a new tab.</p>
                <p className="mt-4 border-l-2 border-[#ba5c43] pl-4 text-xs leading-relaxed text-black/60">We read applications as they arrive and stop when every place is filled.</p>
                <div className="mt-7 border-2 border-black bg-white p-5">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Join Countercult for free</h3>
                  <p className="mt-3 text-sm leading-relaxed text-black/70">We ask every artist who applies to create a free Countercult Network profile. It helps us organise the artists we meet by practice and place, and keep those connections active beyond one residency. Joining is free and separate from selection.</p>
                  <a href={`${base}/join`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-mono text-[10px] font-bold uppercase tracking-[0.12em] underline underline-offset-4">Create a free profile <ArrowRight className="ml-2 h-3 w-3" /></a>
                </div>
            </div>
            <div className="border-2 border-black bg-white p-6 sm:p-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/55">Google Forms</p>
              <h3 className="mt-3 text-2xl font-black uppercase">Ready to apply?</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-black/70">Use the application form to tell us about your practice, your plans for Guadalajara, and the room option you prefer. It opens in a new tab, so you can keep this page open for reference.</p>
              <a href={applicationFormUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-14 items-center justify-center gap-3 border-2 border-black bg-black px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#c6ff3d] hover:text-black">
                open application form <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
        <section id="local-impact" aria-labelledby="gdl-local-impact-title" className="scroll-mt-6 border-b-2 border-black bg-[#e3ead3] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">a separate local call</p>
              <h2 id="gdl-local-impact-title" className="mt-4 max-w-md text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-6xl">Artists from Guadalajara can join for free.</h2>
            </div>
            <div className="max-w-2xl text-sm leading-relaxed text-black/70 sm:text-base">
              <p>Artists based in Guadalajara can take part in shared programme activities at no cost through a separate call. The house&apos;s rooms are part of the international residency offer. We will announce local-call details separately.</p>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
