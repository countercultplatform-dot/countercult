import { useState } from "react";
import { WorkWithUsMenu } from "./WorkWithUsMenu";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [q, setQ] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("q") ?? ""; } catch { return ""; }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    window.location.href = term ? `/explore?q=${encodeURIComponent(term)}` : "/explore";
  };

  return (
    <header className="sticky top-0 z-20 bg-black border-b border-white/10 flex items-center gap-3 px-4 py-2.5">
      <a
        href="/"
        className="text-[10px] uppercase tracking-widest font-bold font-mono text-white/40 hover:text-[#c6ff3d] transition-colors shrink-0"
      >
        HOME
      </a>
      <span className="text-white/15 text-xs shrink-0">/</span>
      <div className="min-w-0 shrink-0">
        <div className="text-sm font-bold tracking-widest uppercase leading-none text-white truncate">{title}</div>
        {subtitle && (
          <div className="text-[9px] text-white/40 tracking-widest uppercase leading-none mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      <form onSubmit={handleSearch} className="flex-1 flex items-center min-w-0 ml-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search the map…"
          className="w-full bg-white/5 border border-white/10 focus:border-[#c6ff3d]/40 px-3 py-1.5 text-[12px] font-mono text-white placeholder:text-white/25 focus:outline-none transition-colors"
        />
        {q && (
          <button
            type="submit"
            className="shrink-0 ml-2 text-[10px] uppercase tracking-widest font-bold text-black bg-[#c6ff3d] px-3 py-1.5 font-mono"
          >
            go
          </button>
        )}
      </form>
      <div className="hidden shrink-0 items-center gap-3 font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:flex">
        <WorkWithUsMenu dark />
        <a
          href="https://countercultplatform.substack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/45 transition-colors hover:text-[#c6ff3d]"
        >
          news
        </a>
      </div>
    </header>
  );
}
