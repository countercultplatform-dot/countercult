import { useState } from "react";
import { useLocation } from "wouter";

export default function RegisterVettedArtist() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await resp.json() as {
        ok?: boolean; token?: string; email?: string;
        isApproved?: boolean; entryId?: number | null; expiresAt?: string; error?: string;
      };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? "invalid email or password");
        return;
      }
      localStorage.setItem("cc_auth", JSON.stringify({
        token: data.token,
        email: data.email,
        entryId: data.entryId ?? null,
        isApproved: data.isApproved ?? false,
        expiresAt: data.expiresAt,
      }));
      navigate("/member-home");
    } catch {
      setError("something went wrong - try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F6] font-mono pb-24">
      {/* Header bar */}
      <div className="border-b-2 border-black bg-[#F9F9F6] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <a href="/" className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors">
          ← countercult
        </a>
        <span className="text-[10px] uppercase tracking-widest font-bold text-black">claim your place</span>
        <span className="w-16" />
      </div>

      <div className="max-w-lg mx-auto px-6 pt-10 pb-16">

        {/* Manifesto pitch block */}
        <div className="border-2 border-black bg-white p-8 mb-8">
          <div className="text-[9px] uppercase tracking-[0.2em] text-black/40 mb-4 font-bold">
            countercult creatives - verified network
          </div>
          <h1 className="font-black text-2xl uppercase tracking-tight leading-none mb-6">
            claim your place<br />in the cult
          </h1>
          <p className="text-[13px] leading-relaxed text-black/80 mb-6">
            A free, curated map for independent artists, spaces, and culture. Apply to claim your pin, connect with the network, and offer housing or creative space.
          </p>

          {/* Legal disclaimer */}
          <div className="border border-black/20 bg-black/[0.03] p-4 mb-6">
            <p className="text-[10px] uppercase tracking-widest font-bold text-black mb-2">
              Legal Disclaimer & Liability Shield
            </p>
            <p className="text-[11px] leading-relaxed text-black/70">
              By registering, you understand that Countercult is an independent cultural network and notice board, not a housing provider, broker, booking service, property manager, insurer, or party to agreements between members. We do not guarantee the identity, ownership, permission to offer, safety, legality, or suitability of any listing. You are responsible for independently checking an arrangement and complying with applicable local law. Nothing in these terms excludes liability that cannot legally be excluded.
            </p>
          </div>

        </div>

        {/* Sign-in form */}
        <div className="border-2 border-black bg-white">
          <div className="px-6 py-4 border-b-2 border-black">
            <p className="text-[10px] uppercase tracking-widest font-bold text-black">
              sign in to your verified account
            </p>
            <p className="text-[11px] text-black/50 mt-1">
              new to countercult? apply to join for free from the map.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">
                email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
                placeholder="your@email.com"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">
                password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
                placeholder="your password"
              />
            </div>

            {error && (
              <div className="text-[11px] text-black/70 leading-relaxed border border-black/10 bg-black/5 px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40"
            >
              {loading ? "signing in…" : "sign in → claim your space"}
            </button>

            <p className="text-[10px] text-black/30 text-center leading-relaxed">
              new here?{" "}
              <a href="/explore?action=join" className="underline decoration-[#c6ff3d] hover:text-black font-bold">
                apply to join for free
              </a>{" "}
              - no invite link needed.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
