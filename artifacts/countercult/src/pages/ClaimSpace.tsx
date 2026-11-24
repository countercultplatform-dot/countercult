import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

type InvitationDetails = {
  entryId: number;
  entryName: string;
  city: string;
  country: string;
  email: string;
  hasAccount: boolean;
  hasPassword: boolean;
  expiresAt: string;
};

type AcceptedClaim = {
  ok: true;
  token: string;
  email: string;
  isApproved: boolean;
  canPostPartnerOffers: boolean;
  accountRole: "member" | "partner_poster";
  displayName?: string | null;
  entryId: number;
  entryName: string;
  expiresAt: string;
};

export default function ClaimSpace() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token")?.trim() ?? "");
  const [entryId] = useState(() => new URLSearchParams(window.location.search).get("entryId")?.trim() ?? "");
  const [code, setCode] = useState("");
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (token) {
      // Keep the one-time credential out of browser history and later referrers.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    if (!token) {
      if (!entryId) setError("Open the claim page from your Countercult pin.");
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/auth/space-claims/inspect", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({})) as InvitationDetails & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "This invitation is invalid or has expired.");
        if (active) setDetails(data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "This invitation could not be checked.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, entryId]);

  const needsNewPassword = details ? !details.hasPassword : false;

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedCode = code.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(normalizedCode)) {
      setError("Enter the 12-character code from the claim email.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/space-claims/inspect", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: normalizedCode }),
      });
      const data = await response.json().catch(() => ({})) as InvitationDetails & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "This code is invalid or expired.");
      if (entryId && data.entryId !== Number(entryId)) {
        throw new Error("This code does not match this pin.");
      }
      setToken(normalizedCode);
      setDetails(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The claim code could not be checked.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!details || !token) return;
    setError("");

    if (needsNewPassword && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    if (!details.hasAccount && !displayName.trim()) {
      setError("Enter the name you want on your account.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/space-claims/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          ...(!details.hasAccount ? { displayName: displayName.trim() } : {}),
        }),
      });
      const data = await response.json().catch(() => ({})) as AcceptedClaim & { error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "The claim could not be completed.");
      }

      localStorage.setItem("cc_auth", JSON.stringify({
        token: data.token,
        entryId: data.entryId,
        entryName: data.entryName,
        email: data.email,
        isApproved: data.isApproved,
        canPostPartnerOffers: data.canPostPartnerOffers,
        accountRole: data.accountRole,
        displayName: data.displayName ?? null,
        expiresAt: data.expiresAt,
      }));
      window.dispatchEvent(new Event("cc:session-change"));
      setClaimed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The claim could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const wrapper = "min-h-screen bg-[#F9F9F6] flex flex-col items-center justify-center px-4 py-10 font-mono";
  const card = "w-full max-w-lg border-2 border-black bg-white p-6 sm:p-8 flex flex-col gap-5";
  const inputClass = "w-full bg-transparent border-b-2 border-black/20 py-2 text-sm focus:outline-none focus:border-black text-black placeholder:text-black/30 transition-colors";

  if (claimed && details) {
    return (
      <main className={wrapper}>
        <section className={card} aria-live="polite">
          <div className="text-[10px] uppercase tracking-widest text-black/40">countercult creatives</div>
          <h1 className="text-xl font-bold uppercase">space claimed</h1>
          <p className="text-sm leading-relaxed text-black/70">
            {details.entryName} is now linked to {details.email}. The existing pin and its public status were kept in place.
          </p>
          <p className="text-[11px] leading-relaxed text-black/55">
            Your verified invitation grants permission to post eligible space offers and opportunities on Exchange. It does not add access to member-only Network or Exchange content, and any member access you already had remains unchanged.
          </p>
          <button
            type="button"
            onClick={() => navigate("/residency")}
            className="bg-[#c6ff3d] text-black py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors"
          >
            post on Exchange
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="border-2 border-black py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors"
          >
            view your profile
          </button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={wrapper}>
        <section className={card} role="status">
          <div className="text-[10px] uppercase tracking-widest text-black/40">countercult creatives</div>
          <p className="text-sm font-bold">Checking your invitation…</p>
        </section>
      </main>
    );
  }

  if (!details) {
    if (entryId && !token) {
      return (
        <main className={wrapper}>
          <form onSubmit={(event) => void handleVerifyCode(event)} className={card}>
            <div className="text-[10px] uppercase tracking-widest text-black/40">countercult creatives</div>
            <h1 className="text-xl font-bold uppercase">claim this pin</h1>
            <p className="text-sm leading-relaxed text-black/65">
              Enter the one-time code sent to the verified contact email for this pin. Codes expire after 60 days.
            </p>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-black/45 mb-2">claim code</span>
              <input
                type="text"
                required
                minLength={12}
                maxLength={12}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className={inputClass}
                placeholder="12-character code"
              />
            </label>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#c6ff3d] text-black py-3 text-[10px] uppercase tracking-widest font-bold border-2 border-black disabled:opacity-50"
            >
              {submitting ? "checking code…" : "verify code"}
            </button>
          </form>
        </main>
      );
    }
    return (
      <main className={wrapper}>
        <section className={card} aria-live="polite">
          <div className="text-[10px] uppercase tracking-widest text-black/40">countercult creatives</div>
          <h1 className="text-xl font-bold uppercase">invitation unavailable</h1>
          <p className="text-sm leading-relaxed text-black/65">{error}</p>
          <p className="text-[11px] leading-relaxed text-black/50">
            Claim invitations expire after 60 days and can only be used once. Ask Countercult for a replacement if needed.
          </p>
          <button
            type="button"
            onClick={() => navigate("/explore")}
            className="border-2 border-black py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors"
          >
            back to Countercult
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={wrapper}>
      <form onSubmit={(event) => void handleSubmit(event)} className={card}>
        <div className="text-[10px] uppercase tracking-widest text-black/40">countercult creatives</div>
        <div>
          <h1 className="text-xl font-bold uppercase">claim this pin</h1>
          <p className="mt-2 text-[11px] leading-relaxed text-black/60">
            {details.entryName} · {details.city}, {details.country}
          </p>
        </div>

        <div className="border-l-2 border-[#c6ff3d] pl-3 text-[11px] leading-relaxed text-black/65">
          Invitation for <strong className="text-black">{details.email}</strong>
        </div>

        {details.hasAccount && details.hasPassword ? (
          <p className="text-[11px] leading-relaxed text-black/55">
            An account already exists for this email. Enter its current password to link this listing and activate partner posting access.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-black/55">
            {details.hasAccount
              ? "Set a password for your existing account to link this listing and activate partner posting access."
              : "Create an account to claim this existing public pin. This verified invitation also activates partner posting access on Exchange."}
          </p>
        )}

        {!details.hasAccount && (
          <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-black/45 mb-2">your name</span>
            <input
              type="text"
              required
              minLength={1}
              maxLength={120}
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClass}
              placeholder="Name for your account"
            />
          </label>
        )}

        <label className="block">
          <span className="block text-[10px] uppercase tracking-widest text-black/45 mb-2">
            {details.hasPassword ? "current account password" : "create a password"}
          </span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={200}
            autoComplete={details.hasPassword ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder={details.hasPassword ? "your current password" : "at least 8 characters"}
          />
        </label>

        {needsNewPassword && (
          <label className="block">
            <span className="block text-[10px] uppercase tracking-widest text-black/45 mb-2">confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
              placeholder="enter the password again"
            />
          </label>
        )}

        {error && (
          <p className="border border-black/15 bg-black/5 px-3 py-2 text-[10px] leading-relaxed text-black/75" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#c6ff3d] text-black py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-black transition-colors disabled:opacity-50"
        >
          {submitting ? "linking listing…" : "accept invitation and claim"}
        </button>
      </form>
    </main>
  );
}
