import { useState, useEffect } from "react";
import { flagSharePopup } from "@/lib/share-popup";

const SHOWN_KEY = "cc_share_shown";
const PENDING_KEY = "cc_share_pending";

export function SharePopup() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only show once per browser (not just session)
    if (localStorage.getItem(SHOWN_KEY)) return;
    // Only show if sign-in just happened
    if (!localStorage.getItem(PENDING_KEY)) return;

    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(SHOWN_KEY, "1");

    // Short delay so the page settles first
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => setVisible(false);

  const shareUrl = "https://countercult.network";
  const shareText = "thought you should be on this - it's a free map of artists, spaces & scenes worldwide";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: at least show the URL */
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: "Countercult", text: shareText, url: shareUrl });
    } catch {
      // user cancelled or not supported - fall back to copy
      void handleCopy();
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[12000] backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed z-[12001] bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md w-full bg-black border-2 border-[#c6ff3d] font-mono"
        role="dialog"
        aria-modal="true"
        aria-label="share countercult"
      >
        <div className="group overflow-hidden border-b-2 border-[#c6ff3d] bg-[#c6ff3d]">
          <img
            src="/images/cult-soap.png"
            alt="Countercult cult soap"
            title="join our cult why not"
            className="block h-32 w-full object-contain p-2 origin-center transform-gpu transition-transform duration-300 ease-out group-hover:scale-110"
          />
        </div>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-0 gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#c6ff3d] mb-1">you're in - welcome to the cult</div>
            <h2 className="text-base font-bold uppercase tracking-widest text-white leading-tight">
              know someone<br />who should be here?
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="text-white/30 hover:text-[#c6ff3d] transition-colors text-xl leading-none mt-1 shrink-0"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm text-white/70 leading-relaxed">
            Countercult grows through word of mouth. If you know an artist, collective, or space that belongs on the map - just send them the link.
          </p>

          {/* Share message preview */}
          <div className="border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">message to send</p>
            <p className="text-sm text-white/80 leading-relaxed italic">
              "{shareText}"
            </p>
            <p className="text-xs text-[#c6ff3d] mt-1.5 break-all">{shareUrl}</p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            {"share" in navigator ? (
              <button
                onClick={() => void handleNativeShare()}
                className="w-full py-3 text-[11px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black hover:bg-white transition-colors"
              >
                ↗ share / send link
              </button>
            ) : (
              <button
                onClick={() => void handleCopy()}
                className="w-full py-3 text-[11px] uppercase tracking-widest font-bold bg-[#c6ff3d] text-black hover:bg-white transition-colors"
              >
                {copied ? "✓ copied - paste it in a dm or text" : "copy message + link"}
              </button>
            )}

            {/* Secondary copy for desktop when native share is available */}
            {"share" in navigator && (
              <button
                onClick={() => void handleCopy()}
                className="w-full py-2 text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
              >
                {copied ? "✓ copied" : "or copy link"}
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors text-center"
          >
            maybe later
          </button>
        </div>
      </div>
    </>
  );
}
