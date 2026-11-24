export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-mono lowercase flex flex-col">
      <header className="sticky top-0 z-20 bg-black border-b border-white/10 flex items-center gap-4 px-4 py-3">
        <a href="/" className="text-[10px] uppercase tracking-widest font-bold font-mono text-white/40 hover:text-[#c6ff3d] transition-colors shrink-0">HOME</a>
        <span className="text-white/15 text-xs shrink-0">/</span>
        <div className="text-sm font-bold tracking-widest uppercase leading-none text-white">404</div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <img
            src="/cult-rat.gif"
            alt=""
            aria-hidden="true"
            title="why is there a rat? we also dont know."
            style={{ width: 110, margin: "0 auto 8px", filter: "invert(1)", mixBlendMode: "screen" }}
          />
          <div className="text-[80px] font-mono font-black text-[#c6ff3d] leading-none mb-4">404</div>
          <h1 className="text-xl font-bold uppercase tracking-widest mb-3 text-white">page not found</h1>
          <p className="text-sm text-white/50 leading-relaxed mb-8">
            this pin fell off the map. the page you're looking for doesn't exist.
          </p>
          <a
            href="/explore"
            className="inline-block py-3 px-8 bg-[#c6ff3d] text-black border-2 border-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest font-bold"
          >
            back to the map →
          </a>
        </div>
      </div>
    </div>
  );
}
