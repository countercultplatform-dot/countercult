import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COPY = {
  headline: "updates on the wider crowdfunding campaign",
  body: "Patron Post is one current way to support Countercult through a tangible monthly mailing. The wider crowdfunding campaign is not open yet. Leave your email and we'll let you know when it opens.",
  cta: "get updates",
  success_title: "✓ you're on the update list.",
  success_body: "we'll let you know when the wider campaign opens.",
  disclaimer: "no payment now. just your email.",
};

export function PledgeBanner({ variant = "full" }: { variant?: "full" | "compact" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("something went wrong - try again");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("please enter a valid email address");
      setState("error");
      return;
    }
    setState("loading");
    setErrorMessage("something went wrong - try again");
    try {
      const r = await fetch("/api/pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-[#c6ff3d]">
          wider crowdfunding updates →
        </span>
        {state === "done" ? (
          <span className="text-[10px] uppercase tracking-widest text-[#c6ff3d]">✓ we'll be in touch</span>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              required
              pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
              className="bg-transparent border-b border-white/55 text-[10px] text-white placeholder:text-white/55 focus:outline-none focus:border-[#c6ff3d] pb-0.5 w-36 transition-colors"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="text-[10px] uppercase tracking-widest text-white/85 hover:text-[#c6ff3d] transition-colors disabled:opacity-40"
            >
              pledge
            </button>
          </form>
        )}
      </div>
    );
  }

  // Full variant - used on swap board and FAQ
  return (
    <div className="border-2 border-black bg-white mt-4 mb-8">
      <div className="bg-black px-5 py-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#c6ff3d]">wider crowdfunding updates</span>
        <span className="text-[9px] uppercase tracking-widest text-white/30">keep the archive independent</span>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-sm text-black/80 leading-relaxed font-sans">
          {COPY.body}
        </p>
        {state === "done" ? (
          <div className="border-l-4 border-[#c6ff3d] pl-4 py-1">
            <p className="text-sm font-bold text-black uppercase tracking-widest">{COPY.success_title}</p>
            <p className="text-[10px] text-black/50 uppercase tracking-widest mt-0.5">{COPY.success_body}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex items-stretch gap-0 max-w-sm">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              required
              className="flex-1 border-2 border-r-0 border-black bg-transparent px-3 py-2 text-sm font-mono text-black placeholder:text-black/25 focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="border-2 border-black bg-[#c6ff3d] px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-black hover:bg-black hover:text-[#c6ff3d] transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
            >
              {state === "loading" ? "…" : COPY.cta}
            </button>
          </form>
        )}
        {state === "error" && (
              <p className="text-[10px] text-red-500 uppercase tracking-widest">{errorMessage}</p>
        )}
        <p className="text-[9px] text-black/25 uppercase tracking-widest font-mono border-t border-black/10 pt-3">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
