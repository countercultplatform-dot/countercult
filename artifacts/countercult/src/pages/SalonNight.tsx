import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { useEffect } from "react";

const COUNTERCULT_URL = "https://countercult.network/";
const FLOOR_URL = "https://countercult.network/the-floor";
const FLOOR_JOURNAL_URL = "https://countercult.network/sketchyshona/journal/the-floor-salon-night-berlin-pulse";
const BERLIN_PULSE_URL = "https://www.instagram.com/berlinpulse/";

export default function SalonNight() {
  useEffect(() => {
    document.title = "Berlin Salon Night | Countercult x THE FLOOR x Berlin Pulse";
    const description = "A Berlin Salon Night collaboration involving Countercult, THE FLOOR, Sketchy Shona and Berlin Pulse. Event logistics will be published when confirmed.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, []);

  return (
    <main className="min-h-screen bg-[#f9f9f6] text-black">
      <nav className="flex items-center justify-between border-b-2 border-black px-5 py-5 font-mono text-[10px] uppercase tracking-[0.15em] sm:px-10">
        <a href={COUNTERCULT_URL} className="font-bold">Countercult</a>
        <a href={FLOOR_URL} className="underline underline-offset-4">THE FLOOR <ArrowUpRight className="inline h-3 w-3" /></a>
      </nav>

      <section className="border-b-2 border-black bg-[#c6ff3d] px-5 py-20 sm:px-10 lg:px-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Countercult / THE FLOOR / Berlin Pulse / Sketchy Shona</p>
          <h1 className="mt-10 max-w-6xl text-[clamp(4.5rem,14vw,13rem)] font-black uppercase leading-[0.75] tracking-[-0.09em]">
            Salon<br /><span className="text-[#ff5c35]">Night.</span>
          </h1>
          <p className="mt-12 max-w-2xl text-xl leading-8 sm:text-2xl">
            A new Berlin collaboration bringing together Countercult, THE FLOOR, Sketchy Shona and Berlin Pulse around a room, a night and the people making the city specific.
          </p>
          <p className="mt-8 max-w-xl border-l-2 border-black pl-5 font-mono text-xs uppercase leading-6 tracking-[0.08em]">
            The collaboration is announced. Date, time, venue and RSVP details will be added here once confirmed.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-black px-5 py-16 sm:px-10 lg:px-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">The record</p>
          <div>
            <h2 className="max-w-4xl text-5xl font-black uppercase leading-[0.85] tracking-[-0.06em] sm:text-7xl">A room for the people behind the city.</h2>
            <div className="mt-10 grid gap-8 text-base leading-7 sm:grid-cols-3">
              <p>THE FLOOR is Sketchy Shona&apos;s Berlin studio, residency and project room.</p>
              <p>Countercult connects local cultural knowledge to public discovery and paid work.</p>
              <p>Berlin Pulse and Sketchy Shona are named as hosts of the Salon Night collaboration.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-black px-5 py-16 text-[#f9f9f6] sm:px-10 lg:px-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c6ff3d]">What is confirmed</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {([
              [Users, "The collaboration", "Countercult, THE FLOOR, Sketchy Shona and Berlin Pulse"],
              [CalendarDays, "The date", "To be confirmed"],
              [MapPin, "The place", "To be confirmed"],
            ] as Array<[typeof Users, string, string]>).map(([IconComponent, label, value]) => {
              return (
                <div key={String(label)} className="border border-[#f9f9f6]/40 p-6">
                  <IconComponent className="h-6 w-6 text-[#ff5c35]" />
                  <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f9f9f6]/60">{label}</p>
                  <p className="mt-3 text-lg leading-7">{value}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-10 max-w-2xl text-sm leading-7 text-[#f9f9f6]/70">
            There is no public ticket or RSVP route to publish yet. Follow the connected records below for the next confirmed update.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10 lg:px-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Continue through the record</p>
          <div className="flex flex-col items-start gap-5">
            <a href={FLOOR_URL} className="border-b-2 border-black pb-2 text-lg font-bold uppercase tracking-[-0.02em]">Read THE FLOOR open call <ArrowUpRight className="inline h-4 w-4" /></a>
            <a href={FLOOR_JOURNAL_URL} className="border-b-2 border-black pb-2 text-lg font-bold uppercase tracking-[-0.02em]">Read the Sketchy Shona journal record <ArrowUpRight className="inline h-4 w-4" /></a>
            <a href={BERLIN_PULSE_URL} target="_blank" rel="noreferrer" className="border-b-2 border-black pb-2 text-lg font-bold uppercase tracking-[-0.02em]">Berlin Pulse <ArrowUpRight className="inline h-4 w-4" /></a>
          </div>
        </div>
      </section>
    </main>
  );
}