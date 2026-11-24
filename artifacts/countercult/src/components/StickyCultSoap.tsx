import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type StickyCultSoapProps = {
  initialClassName: string;
};

const soapArtwork = (
  <img
    src="/images/cult-soap.png"
    alt=""
    aria-hidden="true"
    className="pointer-events-none block w-full origin-center transform-gpu transition-transform duration-300 ease-out group-hover:scale-110"
  />
);

function SoapLabel() {
  return (
    <span className="pointer-events-none absolute right-1/2 top-full z-30 mt-2 w-48 translate-x-1/2 border-2 border-black bg-[#c6ff3d] px-2 py-1.5 text-center font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-black opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      join our cult why not
    </span>
  );
}

export function StickyCultSoap({ initialClassName }: StickyCultSoapProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const anchorTopRef = useRef<number | null>(null);
  const stuckRef = useRef(false);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const getScrollY = () => Math.max(window.scrollY, document.body.scrollTop, document.documentElement.scrollTop);
    const updatePosition = () => {
      if (!anchorRef.current) return;

      const scrollY = getScrollY();
      if (anchorTopRef.current === null) {
        anchorTopRef.current = anchorRef.current.getBoundingClientRect().top + scrollY;
      }

      const navOffset = window.innerWidth < 640 ? 64 : 80;
      const nextStuck = scrollY + navOffset >= anchorTopRef.current;
      if (nextStuck === stuckRef.current) return;

      stuckRef.current = nextStuck;
      setIsStuck(nextStuck);
    };

    const handleResize = () => {
      if (!stuckRef.current) anchorTopRef.current = null;
      updatePosition();
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    document.body.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      document.body.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const baseClassName = "group z-30 rotate-6 drop-shadow-[6px_6px_0_#000]";

  return (
    <>
      <div
        ref={anchorRef}
        role="img"
        aria-label="join our cult why not"
        title="join our cult why not"
        className={`${baseClassName} ${initialClassName} ${isStuck ? "invisible" : ""}`}
      >
        {soapArtwork}
        <SoapLabel />
      </div>
      {isStuck && createPortal(
        <div
          role="img"
          aria-label="join our cult why not"
          title="join our cult why not"
          className={`${baseClassName} fixed right-3 top-16 w-36 sm:right-8 sm:top-20 sm:w-72`}
        >
          {soapArtwork}
          <SoapLabel />
        </div>,
        document.body,
      )}
    </>
  );
}