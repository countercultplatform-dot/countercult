export default function Discover() {
  return (
    <div className="min-h-[100dvh] flex flex-col pb-16 md:pb-0">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-black/10 bg-[#F9F9F6]">
        <a href="/explore" className="clr-black hover-clr-lime text-[9px] uppercase tracking-widest transition-colors" style={{ fontFamily: 'monospace', opacity: 0.4 }}>← map</a>
        <span className="font-black text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Countercult</span>
        <div className="flex items-center gap-4">
          <a href="/news" className="clr-black text-[9px] uppercase tracking-widest transition-colors" style={{ fontFamily: 'monospace', opacity: 0.4 }}>news</a>
          <a href="/faq" className="clr-black text-[9px] uppercase tracking-widest transition-colors" style={{ fontFamily: 'monospace', opacity: 0.4 }}>faq</a>
        </div>
      </div>

      {/* Hero - Arial, centered, prominent */}
      <div className="shrink-0 border-b border-black/10 bg-[#F9F9F6] px-8 py-12 md:px-16 md:py-16 text-center">
        <p
          className="uppercase mb-5 font-bold tracking-[0.25em]"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#000000', letterSpacing: '0.25em' }}
        >
          - You Found Us -
        </p>
        <h1
          className="font-black uppercase leading-tight"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            color: '#000000',
            lineHeight: 1.05,
          }}
        >
          We try to stay a bit hidden.<br />
          That says something about you.
        </h1>
      </div>

      {/* Split panels */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* ── LEFT: For artists ── */}
        <div
          className="flex-1 flex flex-col px-8 py-10 md:px-12 md:py-14 gap-6 min-h-[50vh] md:min-h-0"
          style={{ backgroundColor: '#000000' }}
        >
          <p
            className="uppercase tracking-widest"
            style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}
          >
            I make or run something
          </p>

          <div className="flex flex-col gap-4">
            <h2
              className="font-black uppercase leading-tight"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', color: '#ffffff' }}
            >
              The free network where artists swap studios, host each other, and get found.
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
              A curated global map of independent artists and spaces. Swap studios with members worldwide, host artists passing through, and be found by the people actually looking. Every application reviewed by a real person.
            </p>
          </div>

          <a
            href="/explore?action=join"
            className="clr-black self-start"
            style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              padding: '14px 32px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '13px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            Apply Free
          </a>
        </div>

        {/* Divider */}
        <div className="h-px md:h-auto md:w-px shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} />

        {/* ── RIGHT: For explorers ── */}
        <div
          className="flex-1 flex flex-col px-8 py-10 md:px-12 md:py-14 gap-6 min-h-[50vh] md:min-h-0"
          style={{ backgroundColor: '#F9F9F6' }}
        >
          <p
            className="uppercase tracking-widest"
            style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(0,0,0,0.35)' }}
          >
            I want to find something real
          </p>

          <div className="flex flex-col gap-4">
            <h2
              className="font-black uppercase leading-tight"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', color: '#000000' }}
            >
              Real culture, curated by the people who make it.
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.7 }}>
              Every pin on this map was chosen by a real person - not an algorithm, not a paid placement. Artists open to commissions, underground venues, local scenes built from the inside. Browse freely, connect directly, no account needed.
            </p>
          </div>

          <a
            href="/explore"
            className="clr-lime self-start"
            style={{
              display: 'inline-block',
              backgroundColor: '#000000',
              padding: '14px 32px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '13px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            Explore the Map
          </a>
        </div>

      </div>
    </div>
  );
}
