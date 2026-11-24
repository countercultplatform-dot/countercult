import type { EditorialTrail as EditorialTrailItem } from "@/data/editorialTrails";

export function EditorialTrail({
  trails,
  tone = "light",
  title = "context around this place",
  description = "Voices are starting points. Follow the Journal into the people, spaces, and cultural questions around them.",
}: {
  trails: EditorialTrailItem[];
  tone?: "light" | "dark";
  title?: string;
  description?: string;
}) {
  if (trails.length === 0) return null;

  const dark = tone === "dark";
  return (
    <section
      aria-labelledby="editorial-trail-heading"
      className={dark ? "border-y border-white/10 bg-[#080808] px-5 py-10 md:px-10 md:py-14" : "border-y border-black/10 bg-white px-4 py-10 md:py-14"}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 max-w-2xl">
          <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${dark ? "text-[#c6ff3d]" : "text-black/45"}`}>
            follow the thread
          </div>
          <h2
            id="editorial-trail-heading"
            className={`mt-3 font-mono text-xl font-bold uppercase leading-tight tracking-[-0.04em] md:text-2xl ${dark ? "text-white" : "text-black"}`}
          >
            {title}
          </h2>
          <p className={`mt-3 max-w-xl text-sm leading-relaxed ${dark ? "text-white/55" : "text-black/55"}`}>
            {description}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {trails.map((trail) => (
            <a
              key={trail.href}
              href={trail.href}
              className={dark
                ? "group flex min-h-44 flex-col justify-between border border-white/15 p-5 transition-colors hover:border-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black"
                : "group flex min-h-44 flex-col justify-between border-2 border-black/10 p-5 transition-colors hover:border-black hover:bg-[#c6ff3d]"}
            >
              <div>
                <div className={`font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${dark ? "text-[#c6ff3d] group-hover:text-black/60" : "text-black/40"}`}>
                  {trail.eyebrow}
                </div>
                <h3 className={`mt-3 text-base font-bold leading-tight ${dark ? "text-white group-hover:text-black" : "text-black"}`}>
                  {trail.title}
                </h3>
                <p className={`mt-3 text-xs leading-relaxed ${dark ? "text-white/50 group-hover:text-black/65" : "text-black/55"}`}>
                  {trail.description}
                </p>
              </div>
              <span className={`mt-5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${dark ? "text-white/60 group-hover:text-black" : "text-black/60"}`}>
                {trail.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}