import { useState } from "react";
import { useLocation } from "wouter";

export default function ResetPassword() {
  const token = new URL(window.location.href).searchParams.get("token")?.trim() ?? "";
  const [, navigate] = useLocation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? "something went wrong - try again");
        return;
      }
      setDone(true);
    } catch {
      setError("something went wrong - try again");
    } finally {
      setLoading(false);
    }
  };

  const wrapper = "min-h-screen bg-[#F9F9F6] flex flex-col items-center justify-center px-4 font-mono";
  const card = "w-full max-w-sm border-2 border-black bg-white p-6 flex flex-col gap-4";

  if (!token) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <div className="text-[10px] uppercase tracking-widest text-black/40 mb-1">countercult creatives</div>
          <p className="text-sm text-black font-bold">Invalid reset link.</p>
          <p className="text-[11px] text-black/50 leading-relaxed">
            This link is missing a token. Request a new one from the sign-in page.
          </p>
          <button
             onClick={() => navigate("/explore?action=signin")}
            className="bg-[#c6ff3d] text-black py-2.5 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors"
          >
            back to home
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <div className="text-[10px] uppercase tracking-widest text-black/40 mb-1">countercult creatives</div>
          <p className="text-sm text-black font-bold">Password updated.</p>
          <p className="text-[11px] text-black/50 leading-relaxed">
            You can now sign in with your new password.
          </p>
          <button
             onClick={() => navigate("/explore?action=signin")}
            className="bg-[#c6ff3d] text-black py-2.5 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors"
          >
            go to sign in →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <form onSubmit={(e) => void handleSubmit(e)} className={card}>
        <div className="text-[10px] uppercase tracking-widest text-black/40 mb-1">countercult creatives</div>
        <p className="text-sm text-black font-bold">Choose a new password</p>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">new password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
            placeholder="at least 8 characters"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
            placeholder="repeat your new password"
          />
        </div>

        {error && (
          <div className="text-[10px] text-black/70 leading-relaxed border border-black/10 bg-black/5 px-3 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#c6ff3d] text-black py-3 text-[11px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-40"
        >
          {loading ? "updating…" : "set new password →"}
        </button>
      </form>
    </div>
  );
}
