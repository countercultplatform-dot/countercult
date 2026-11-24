export function ArchitectSignature({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[9px] leading-relaxed text-current/30 ${className}`}>
       Countercult built by{" "}
      <a
         href="/about"
        className="underline underline-offset-2 transition-opacity hover:opacity-100"
      >
        Shona Neary
      </a>
       . Artist practice:{" "}
      <a
         href="https://countercult.network/sketchyshona/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-opacity hover:opacity-100"
      >
         Sketchy Shona
      </a>
      .
    </p>
  );
}