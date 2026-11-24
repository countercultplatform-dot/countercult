type PinkSoapStickerProps = {
  className?: string;
};

export function PinkSoapSticker({ className = "" }: PinkSoapStickerProps) {
  return (
    <img
      src="/images/cult-soap.png"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none block h-auto w-full select-none drop-shadow-[3px_4px_0_#000] ${className}`}
    />
  );
}
