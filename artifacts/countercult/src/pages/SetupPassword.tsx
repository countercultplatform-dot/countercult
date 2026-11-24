import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function SetupPassword() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect away if no active session
  useEffect(() => {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) navigate("/");
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("passwords don't match"); return; }
    if (password.length < 8) { setError("password must be at least 8 characters"); return; }

    const raw = localStorage.getItem("cc_auth");
    if (!raw) { navigate("/"); return; }
    const session = JSON.parse(raw) as { token?: string; isApproved?: boolean };

    setLoading(true);
    try {
      const resp = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token ?? ""}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? "something went wrong - try again");
        return;
      }
      navigate("/member-home");
    } catch {
      setError("something went wrong - try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center p-6">
      <div className="w-full max-w-sm border-2 border-black bg-white">
        <div className="p-6 border-b-2 border-black">
          <div className="text-[9px] uppercase tracking-widest text-black/40 mb-2">countercult creatives</div>
          <h1 className="font-black uppercase tracking-widest text-lg leading-tight">set your password</h1>
          <p className="text-[11px] text-black/60 mt-2 leading-relaxed">
            you're in - set a password so you can sign in next time without a link.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-black/40 mb-2">password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors"
              placeholder="min 8 characters"
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
              placeholder="repeat password"
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
            {loading ? "saving…" : "set password →"}
          </button>

          <p className="text-[10px] text-black/30 text-center">
            you can always change it later from your voice.
          </p>
        </form>
        <div className="px-6 pb-5 text-center">
          <a href="/explore" className="text-[10px] uppercase tracking-widest text-black/25 hover:text-black transition-colors">← back to map</a>
        </div>
      </div>
    </div>
  );
}
