import { useEffect, useRef, useState } from "react";
import { ArrowRight, Copy, X } from "lucide-react";

interface MemberSession {
  token?: string;
  email?: string;
  accountRole?: string;
  isApproved?: boolean;
  expiresAt?: string;
}

function readApprovedMember(): MemberSession | null {
  try {
    const raw = localStorage.getItem("cc_auth");
    if (!raw) return null;
    const session = JSON.parse(raw) as MemberSession;
    if (!session.token || !session.email || session.accountRole === "partner_poster" || session.isApproved !== true) {
      return null;
    }
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

const AUTO_INVITE_AFTER_MS = 2 * 60 * 1000;
const ACTIVE_IDLE_LIMIT_MS = 45 * 1000;
const INVITE_DISMISSED_KEY = "cc_network_invite_dismissed_v1";

function isInviteFlowBlocked() {
  const path = window.location.pathname;
  if (
    path.startsWith("/admin") ||
    path.startsWith("/auth/") ||
    path.startsWith("/setup-password") ||
    path.startsWith("/reset-password")
  ) {
    return true;
  }

  return Boolean(
    document.querySelector('[data-cc-editing="true"]') ||
    document.querySelector('button[aria-label="close signup"]') ||
    document.querySelector('[role="dialog"][aria-modal="true"]'),
  );
}

export default function MemberNetworkPrompt() {
  const [member, setMember] = useState<MemberSession | null>(null);
  const [open, setOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const activeTimeRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const autoInviteShownRef = useRef(false);

  useEffect(() => {
    const syncSession = () => setMember(readApprovedMember());
    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("cc:session-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("cc:session-change", syncSession);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    activeTimeRef.current = 0;
    autoInviteShownRef.current = false;
  }, [member?.email]);

  useEffect(() => {
    if (!member) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const activityEvents: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const currentMember = readApprovedMember();
      if (
        autoInviteShownRef.current ||
        !currentMember ||
        currentMember.email !== member.email ||
        localStorage.getItem(`${INVITE_DISMISSED_KEY}:${member.email}`) ||
        document.visibilityState !== "visible" ||
        Date.now() - lastActivityRef.current > ACTIVE_IDLE_LIMIT_MS ||
        isInviteFlowBlocked()
      ) {
        return;
      }

      activeTimeRef.current += 1000;
      if (activeTimeRef.current >= AUTO_INVITE_AFTER_MS) {
        autoInviteShownRef.current = true;
        setOpen(true);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [member?.email]);

  if (!member) return null;

  const inviteUrl = `${window.location.origin}/join`;
  const dismissPrompt = () => {
    setOpen(false);
    try {
      localStorage.setItem(`${INVITE_DISMISSED_KEY}:${member.email}`, "1");
    } catch {
      // Keep the prompt usable if browser storage is unavailable.
    }
  };

  const inviteSomeone = async () => {
    setInviteStatus("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Countercult",
          text: "Join Countercult, digital infrastructure connecting cultural spaces, workers, creative builders, and artists to local opportunities and one another.",
          url: inviteUrl,
        });
        dismissPrompt();
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteStatus("invite link copied");
    } catch {
      setInviteStatus(inviteUrl);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 p-4 font-mono">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="network-invite-title"
            className="relative w-full max-w-lg border-2 border-black bg-[#F9F9F6] p-6 text-black shadow-[8px_8px_0_#c6ff3d] sm:p-8"
          >
            <button
              type="button"
              onClick={dismissPrompt}
              aria-label="close invite message"
              className="absolute right-4 top-4 p-1 text-black/45 transition-colors hover:text-black"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="pr-8 text-[9px] font-bold uppercase tracking-[0.2em] text-black/50">welcome to the network</p>
            <h2 id="network-invite-title" className="mt-3 max-w-md text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-5xl">
              help make it useful.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70">
              Countercult works because people share real resources, opportunities, local knowledge, and trusted introductions.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-black/70">
              A trusted reference gives a new artist or space context before they apply. It helps us understand how they connect to a place and keeps the network useful instead of filling it with spam or extractive outreach.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <a
                href="/residency"
                onClick={dismissPrompt}
                className="group flex min-h-24 flex-col justify-between border-2 border-black bg-[#c6ff3d] p-4 text-black transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">share something useful</span>
                <span className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                  start sharing <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
              <button
                type="button"
                onClick={() => void inviteSomeone()}
                className="group flex min-h-24 flex-col justify-between border-2 border-black bg-white p-4 text-left transition-colors hover:bg-black hover:text-[#c6ff3d]"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">invite an artist or space you trust</span>
                <span className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                  {inviteStatus || "copy an invite link"} <Copy className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-black/45">
              You can close this and come back to it any time from the note in the bottom-left corner.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-3 z-[8500] sm:bottom-16 sm:left-6">
        <button
          type="button"
          onClick={() => { setInviteStatus(""); setOpen(true); }}
          className="pointer-events-auto rotate-[-2deg] border-2 border-black bg-[#c6ff3d] px-3 py-2 text-left font-mono text-black shadow-[4px_4px_0_#000] transition-transform hover:rotate-0 hover:translate-x-0.5 hover:translate-y-0.5"
          aria-label="open Countercult network welcome message"
        >
          <span className="flex items-center gap-2">
            <img
              src="/cult-rat.gif"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 object-contain mix-blend-multiply"
            />
            <span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.18em]">network note</span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.08em]">share something useful ↗</span>
            </span>
          </span>
        </button>
      </div>
    </>
  );
}