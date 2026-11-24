import { useEffect, useState } from "react";

interface SessionData {
  token: string;
  entryId: number | null;
  entryName: string | null;
  email: string;
  isApproved: boolean;
  expiresAt: string;
}

export default function AuthVerify() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setErrorMsg("no token provided");
      setStatus("error");
      return;
    }

    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json() as SessionData & { ok?: boolean; error?: string; isApproved?: boolean; hasPassword?: boolean };
        if (!r.ok || !data.ok) {
          setErrorMsg(data.error ?? "invalid or expired link");
          setStatus("error");
          return;
        }
        const session: SessionData = {
          token: data.token,
          entryId: data.entryId ?? null,
          entryName: data.entryName ?? null,
          email: data.email,
          isApproved: data.isApproved ?? false,
          expiresAt: data.expiresAt,
        };
        localStorage.setItem("cc_auth", JSON.stringify(session));
        setName(data.entryName ?? data.email);
        setStatus("success");
        setTimeout(() => {
          // First-time users (no password yet) must set one before proceeding
          if (!data.hasPassword) {
            window.location.href = "/setup-password";
           } else {
             window.location.href = "/member-home";
           }
        }, 2000);
      })
      .catch(() => {
        setErrorMsg("something went wrong - please try again");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] bg-[#F9F9F6] flex items-center justify-center font-mono lowercase">
        <div className="text-center p-8 border-2 border-black max-w-sm w-full mx-4">
          <div className="text-[10px] uppercase tracking-widest text-black/40 animate-pulse mb-4">verifying your link…</div>
          <div className="h-0.5 w-full bg-black/10 overflow-hidden">
            <div className="h-full bg-[#c6ff3d] animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[100dvh] bg-[#F9F9F6] flex items-center justify-center font-mono lowercase">
        <div className="text-center p-8 border-2 border-black max-w-sm w-full mx-4">
          <div className="text-2xl font-bold uppercase mb-2">link invalid</div>
          <p className="text-sm text-black/60 leading-relaxed mb-6">{errorMsg}</p>
          <a
            href="/explore"
            className="block py-3 px-6 bg-black text-[#c6ff3d] border-2 border-black hover:bg-[#c6ff3d] hover:text-black transition-colors text-xs uppercase tracking-widest font-bold"
          >
            ← back to the map
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F9F9F6] flex items-center justify-center font-mono lowercase">
      <div className="text-center p-8 border-2 border-black max-w-sm w-full mx-4">
        <div className="w-14 h-14 bg-[#c6ff3d] border-2 border-black flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
          ✓
        </div>
        <h2 className="font-bold uppercase tracking-widest text-base mb-2">you're in</h2>
        <p className="text-xs text-black/60 leading-relaxed mb-6">
          signed in as <strong className="text-black">{name}</strong>. redirecting…
        </p>
        <a
          href="/explore"
          className="block py-2 px-4 border border-black text-black hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest"
        >
          ← back to map
        </a>
      </div>
    </div>
  );
}
