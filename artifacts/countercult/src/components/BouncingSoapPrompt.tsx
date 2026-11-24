import { useEffect, useRef } from "react";

type BouncingSoapPromptProps = {
  onActivate: () => void;
};

const bounceColors = ["#89a8ff", "#ff5c35", "#c6ff3d"];

export function BouncingSoapPrompt({ onActivate }: BouncingSoapPromptProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    const bounds = button?.parentElement;
    if (!button || !bounds) return;

    const gutter = 12;
    const topGutter = 12;
    let x = 20;
    let y = 88;
    let velocityX = 1.25;
    let velocityY = 0.9;
    let width = button.offsetWidth;
    let height = button.offsetHeight;
    let colorIndex = 0;
    let frameId = 0;

    const getMaxX = () => Math.max(gutter, bounds.clientWidth - width - gutter);
    const getMaxY = () => Math.max(topGutter, bounds.clientHeight - height - gutter);

    const clampPosition = () => {
      const maxX = getMaxX();
      const maxY = getMaxY();
      x = Math.min(Math.max(gutter, x), maxX);
      y = Math.min(Math.max(topGutter, y), maxY);
      button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const resize = () => {
      width = button.offsetWidth;
      height = button.offsetHeight;
      clampPosition();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clampPosition();
      return;
    }

    const animate = () => {
      const maxX = getMaxX();
      const maxY = getMaxY();
      let bounced = false;

      x += velocityX;
      y += velocityY;

      if (x <= gutter || x >= maxX) {
        velocityX *= -1;
        bounced = true;
      }
      if (y <= topGutter || y >= maxY) {
        velocityY *= -1;
        bounced = true;
      }

      clampPosition();
      if (bounced) {
        colorIndex = (colorIndex + 1) % bounceColors.length;
        button.style.backgroundColor = bounceColors[colorIndex];
      }
      frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(bounds);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Click the soap to scroll to the join and work options"
      data-testid="button-bouncing-soap-prompt"
      onClick={onActivate}
      className="pointer-events-auto absolute left-0 top-0 z-[5] cursor-pointer whitespace-nowrap border-2 border-black px-2 py-1.5 font-mono text-[8px] font-bold tracking-[0.08em] text-black shadow-[3px_3px_0_#000] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.12em]"
      style={{ backgroundColor: "#89a8ff" }}
    >
      click the soap, do it
    </button>
  );
}
