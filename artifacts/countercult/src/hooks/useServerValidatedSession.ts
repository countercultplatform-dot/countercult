import { useEffect, useState } from "react";

export type ServerValidatedSession = {
  token: string;
  entryName?: string;
  email?: string;
  entryId?: number | null;
  accountRole?: "member" | "partner_poster";
  isApproved?: boolean;
  canPostPartnerOffers?: boolean;
  expiresAt: string;
};

export type ServerAuthStatus = "checking" | "anonymous" | "authenticated";

function readStoredSession(): ServerValidatedSession | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const session = JSON.parse(raw) as ServerValidatedSession;
    if (!session.token || !session.expiresAt || new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem("cc_auth");
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function useServerValidatedSession() {
  const [session, setSession] = useState<ServerValidatedSession | null>(() => readStoredSession());
  const [status, setStatus] = useState<ServerAuthStatus>(() => (
    readStoredSession() ? "checking" : "anonymous"
  ));

  useEffect(() => {
    let active = true;

    const validate = () => {
      const storedSession = readStoredSession();
      if (!storedSession) {
        setSession(null);
        setStatus("anonymous");
        return;
      }

      setSession(storedSession);
      setStatus("checking");
      fetch("/api/auth/me", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${storedSession.token}`,
          "Cache-Control": "no-cache",
        },
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json() as Promise<{
            isApproved?: boolean;
            accountRole?: "member" | "partner_poster";
            canPostPartnerOffers?: boolean;
          }>;
        })
        .then((data) => {
          if (!active) return;
          if (!data) {
            localStorage.removeItem("cc_auth");
            setSession(null);
            setStatus("anonymous");
            return;
          }

          const nextSession = {
            ...storedSession,
            isApproved: Boolean(data.isApproved),
            accountRole: data.accountRole ?? storedSession.accountRole,
            canPostPartnerOffers: Boolean(data.canPostPartnerOffers),
          };
          localStorage.setItem("cc_auth", JSON.stringify(nextSession));
          setSession(nextSession);
          setStatus("authenticated");
        })
        .catch(() => {
          if (!active) return;
          localStorage.removeItem("cc_auth");
          setSession(null);
          setStatus("anonymous");
        });
    };

    const onSessionChange = () => validate();
    window.addEventListener("cc:session-change", onSessionChange);
    validate();

    return () => {
      active = false;
      window.removeEventListener("cc:session-change", onSessionChange);
    };
  }, []);

  return {
    session,
    status,
    isAuthenticated: status === "authenticated" && Boolean(session),
  };
}