import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEntryPinsQueryKey, getListEntriesQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

type ChatMessage = { role: "user" | "assistant"; content: string };

type EntryDraft = {
  name?: string;
  kind?: "artist" | "space" | "artifact";
  city?: string;
  country?: string;
  blurb?: string;
  tags?: string[];
  url?: string;
  address?: string;
  contactEmail?: string;
  openTo?: string[];
};

const KIND_GLYPH: Record<string, string> = {
  artist: "◉",
  space: "▣",
  artifact: "◬",
};

const OPENER =
  "hey - what are you adding to the map?\n\n◉ artists / collectives / festivals - musicians, producers, crews, labels, radio stations\n▣ spaces / studios / spots - venues, clubs, studios, community spaces\n◬ cultural artifacts - murals, ruins, traditions, recipes, objects tied to a place\n\ndrop a name, a link, a bio dump - whatever you've got and i'll do the rest.";
const SPACE_OPENER =
  "let's add a cultural spot to the map. tell me its name and where it is. you can suggest any place; you don't need to represent it, and this won't claim the pin.";

export function SubmitChat({
  initialQuery,
  initialKind,
  onClose,
  onSuccess,
}: {
  initialQuery?: string;
  initialKind?: EntryDraft["kind"];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initialOpener = initialKind === "space" ? SPACE_OPENER : OPENER;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialOpener },
  ]);
  const [draft, setDraft] = useState<EntryDraft>(() => initialKind ? { kind: initialKind } : {});
  const [isReady, setIsReady] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingEntry, setExistingEntry] = useState<{ id: number; name: string } | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [openTo, setOpenTo] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const didAutoSend = useRef(false);

  const safeInitialQuery =
    typeof initialQuery === "string" ? initialQuery.trim() : "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string, currentMessages: ChatMessage[], currentDraft: EntryDraft) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = { role: "user", content: text };
      const newMessages = [...currentMessages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      const isUrl = /^https?:\/\//i.test(text.trim());
      const isHandle = /^@\w+/.test(text.trim());
      let enrichedDraft: EntryDraft = { ...currentDraft };
      let enrichContext = "";

      if (isUrl || isHandle) {
        try {
          const enrichResp = await fetch("/api/entries/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text.trim() }),
          });
          if (enrichResp.ok) {
            const enriched = await enrichResp.json();
            enrichedDraft = { ...enrichedDraft, ...enriched };
            enrichContext = ` [enriched profile data: ${JSON.stringify(enriched)}]`;
          }
        } catch {
          // ignore
        }
      }

      const apiMessages = newMessages.slice(1).map((m, i, arr) =>
        i === arr.length - 1 && enrichContext
          ? { ...m, content: m.content + enrichContext }
          : m
      );

      try {
        const resp = await fetch("/api/entries/converse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, draft: enrichedDraft }),
        });

        if (!resp.ok) throw new Error("api error");
        const data = (await resp.json()) as {
          message: string;
          draft: EntryDraft;
          isReady: boolean;
        };

        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        setDraft(data.draft);

        const missingForReady: string[] = [];
        if (data.draft.kind !== "space" && !data.draft.url) missingForReady.push("a link (website, instagram, bandcamp, ra.co…)");
        if (data.isReady && data.draft.kind !== "space" && missingForReady.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `almost there - still need ${missingForReady.join(" and ")} before i can submit. can you find one, or should i look it up?`,
            },
          ]);
          setIsReady(false);
        } else {
          setIsReady(data.isReady);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "something went wrong - try again" },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    },
    [isLoading]
  );

  useEffect(() => {
    if (safeInitialQuery && !didAutoSend.current) {
      didAutoSend.current = true;
      void sendMessage(safeInitialQuery, [{ role: "assistant", content: OPENER }], {});
    } else {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => sendMessage(input, messages, draft);

  const handleSubmit = async (force = false) => {
    if (!draft.name || !draft.kind || !draft.city || !draft.country) {
      toast.error("need name, kind, city and country before submitting");
      return;
    }
    if (draft.kind !== "space" && !draft.url) {
      toast.error("a full link (https://website.com) is required - ask the ai to find one");
      return;
    }
    if (draft.url && !draft.url.startsWith("http")) {
      toast.error("please provide a full URL starting with https://");
      return;
    }
    setIsSubmitting(true);
    const resolvedKind = (draft.kind as string) === "collective" ? "artist" : draft.kind;
    const contactEmail = draft.contactEmail?.trim() || null;
    try {
      const isSpaceSuggestion = draft.kind === "space";
      const resp = await fetch(isSpaceSuggestion ? "/api/entries/space-suggestions" : "/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSpaceSuggestion ? {
          name: draft.name,
          city: draft.city,
          country: draft.country,
          url: draft.url ?? null,
          blurb: draft.blurb ?? "",
          tags: draft.tags ?? [],
        } : {
          name: draft.name,
          kind: resolvedKind,
          city: draft.city,
          country: draft.country,
          blurb: draft.blurb ?? "",
          tags: draft.tags ?? [],
          url: draft.url ?? "",
          address: draft.address?.trim() || undefined,
          contactEmail,
          openTo: openTo,
          _force: force,
        }),
      });

      if (resp.status === 409) {
        const data = await resp.json() as { existingId: number; existingName: string };
        setExistingEntry({ id: data.existingId, name: data.existingName });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: draft.kind === "space"
              ? `a likely match for "${data.existingName}" is already on the map. check it before adding another pin.`
              : `heads up - "${data.existingName}" is already on the map. is this a different entry, or the same one?`,
          },
        ]);
        return;
      }

      if (!resp.ok) throw new Error("submit failed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListEntryPinsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() }),
      ]);
      setSubmitted(true);
    } catch {
      toast.error("submission failed - try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const draftRows: { label: string; value: string | undefined }[] = [
    { label: "name", value: draft.name },
    {
      label: "kind",
      value: draft.kind ? `${KIND_GLYPH[draft.kind]} ${draft.kind}` : undefined,
    },
    { label: "city", value: draft.city },
    { label: "country", value: draft.country },
    { label: "blurb", value: draft.blurb },
    { label: "tags", value: draft.tags?.filter(Boolean).join(", ") || undefined },
    { label: "url", value: draft.url || undefined },
    { label: draft.kind === "space" ? "private address" : "neighborhood", value: draft.address || undefined },
    { label: "contact", value: draft.contactEmail || undefined },
  ].filter((r) => r.value);

  const needsEmail = draft.kind === "artist";
  const needsOwnerVerify = draft.kind === "artist";
  const showsOpenTo = draft.kind === "artist" || draft.kind === "space";
  const validUrl = draft.kind === "space" || (!!draft.url && draft.url.startsWith("http"));
  const requiredFilled =
    !!draft.name && !!draft.kind && !!draft.city && !!draft.country && validUrl &&
    (!needsEmail || !!draft.contactEmail?.trim()) &&
    (!needsOwnerVerify || ownerVerified);

  if (submitted) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-black font-mono text-white">
        <div className="shrink-0 bg-black text-[#c6ff3d] flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-bold uppercase tracking-widest text-sm leading-none">add to the map</span>
          <button onClick={onClose} className="text-white/40 hover:text-white font-bold text-xl leading-none" aria-label="close">✕</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6 text-center">
          <div className="text-5xl text-[#c6ff3d]">◉</div>
          <div>
              <div className="font-bold text-lg uppercase tracking-widest mb-2 text-[#c6ff3d]">{draft.kind === "space" ? "space is on the map." : "you're on the list."}</div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              {draft.kind === "space"
                ? "Your recommendation is in review. The space will not receive an email or account. If approved, its public profile can later be claimed by a verified representative."
                : "your submission is in review. check your email over the next week - we'll be in touch from the countercult email."}
            </p>
          </div>
          {draft.name && (
            <div className="border border-white/10 bg-white/5 px-4 py-3 text-[11px] uppercase tracking-widest text-white/50">
              {draft.name} · {draft.city}, {draft.country}
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-2 py-3 px-8 bg-[#c6ff3d] text-black border-2 border-[#c6ff3d] hover:bg-black hover:text-[#c6ff3d] transition-colors text-xs uppercase tracking-widest font-bold"
          >
            back to map →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black font-mono text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 flex items-center justify-between px-4 py-3">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-white/30 block leading-none mb-0.5">
            countercult
          </span>
          <span className="font-bold uppercase tracking-widest text-sm leading-none text-[#c6ff3d]">
            add to the map
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white font-bold text-xl leading-none"
          aria-label="close"
        >
          ✕
        </button>
      </div>

      {/* Mobile progress bar */}
      <div className="sm:hidden shrink-0 px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-white/20 shrink-0">draft</span>
        <div className="flex gap-1 flex-1">
          {["name", "kind", "city", "country", "url"].map((f) => (
            <div
              key={f}
              className={`flex-1 h-1 rounded-full transition-colors ${
                draft[f as keyof EntryDraft] ? "bg-[#c6ff3d]" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        {draft.name && <span className="text-[9px] text-white/30 truncate max-w-[80px]">{draft.name}</span>}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                    msg.role === "assistant"
                      ? "bg-white/5 border border-white/10 text-white"
                      : "bg-[#c6ff3d] text-black"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 text-white/40 px-3 py-2 text-[13px]">
                  <span className="animate-pulse">thinking…</span>
                </div>
              </div>
            )}

            {existingEntry && (
              <div className="flex justify-start">
                <div className="max-w-[85%] flex flex-col gap-1.5">
                  <a
                    href={`/entries/${existingEntry.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[#c6ff3d] text-black px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold text-center hover:bg-black hover:text-[#c6ff3d] transition-colors border-2 border-[#c6ff3d]"
                  >
                    view existing entry →
                  </a>
                  {draft.kind !== "space" && (
                    <button
                      onClick={() => {
                        setExistingEntry(null);
                        setForceSubmit(true);
                        void handleSubmit(true);
                      }}
                      className="bg-white/5 text-white/40 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                    >
                      it's different - submit anyway
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/10 p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isLoading ? "waiting…" : "type here…"}
                disabled={isLoading}
                className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-sm focus:outline-none focus:border-[#c6ff3d] text-white placeholder:text-white/20 disabled:opacity-40 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-[#c6ff3d] text-black px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] border-2 border-[#c6ff3d] transition-colors disabled:opacity-30"
              >
                send
              </button>
            </div>
            {showsOpenTo && (
              <div className="sm:hidden flex flex-col gap-2 pt-2 border-t border-white/10">
                <div>
                  <div className="text-[8px] uppercase tracking-widest text-white/30 mb-1.5">open to</div>
                  <div className="flex flex-wrap gap-1">
                    {["collaborations","commissions","housing offers","residency opportunities","touring support","teaching / workshops","licensing","exhibitions","bookings / gigs","press / features"].map((opt) => (
                      <button key={opt} type="button"
                        onClick={() => setOpenTo((prev) => prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt])}
                        className={`text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ${openTo.includes(opt) ? "bg-[#c6ff3d] text-black border-[#c6ff3d]" : "border-white/20 text-white/40 hover:text-white hover:border-white/60"}`}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {draft.kind === "space" && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-[9px] uppercase tracking-widest text-[#c6ff3d]">community recommendation · reviewed before publishing</p>
                <p className="mt-2 text-[10px] leading-relaxed text-white/55">
                  No sign-in, email, or private street address is needed. The space will not be contacted. If approved, its representative can request a verified claim.
                </p>
              </div>
            )}
            {needsOwnerVerify && (
              <label className="sm:hidden flex items-start gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={ownerVerified}
                  onChange={(e) => setOwnerVerified(e.target.checked)}
                  className="mt-0.5 accent-[#c6ff3d] shrink-0"
                />
                <span className="text-[10px] text-white/50 leading-relaxed">
                  i verify that i am the artist / owner of this entry
                </span>
              </label>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !requiredFilled}
              className="sm:hidden w-full bg-[#c6ff3d] text-black py-2.5 text-[10px] uppercase tracking-widest font-bold border-2 border-[#c6ff3d] disabled:opacity-30 hover:bg-black hover:text-[#c6ff3d] transition-colors"
            >
              {isSubmitting
                ? "submitting…"
                : requiredFilled
                ? "submit to map →"
                : `still need: ${[!draft.name && "name", (!draft.city || !draft.country) && "location", !validUrl && "link", (needsEmail && !draft.contactEmail?.trim()) && "email"].filter(Boolean).join(" · ")}`}
            </button>
          </div>
        </div>

        {/* Draft preview panel - desktop only */}
        <div className="hidden sm:flex w-[160px] shrink-0 border-l border-white/10 flex-col bg-white/[0.02]">
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-[8px] uppercase tracking-widest text-white/30">live draft</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
            {draftRows.length === 0 ? (
              <p className="text-[9px] text-white/20 leading-relaxed uppercase tracking-widest mt-1">
                fields appear here as we chat
              </p>
            ) : (
              draftRows.map((row) => (
                <div key={row.label}>
                  <div className="text-[7px] uppercase tracking-widest text-white/25 mb-0.5">
                    {row.label}
                  </div>
                  <div className="text-[11px] text-white/80 leading-snug break-words">
                    {row.value}
                  </div>
                </div>
              ))
            )}
            {showsOpenTo && (
              <div className="mt-1 pt-2 border-t border-white/10 flex flex-col gap-2">
                <div>
                  <div className="text-[7px] uppercase tracking-widest text-white/25 mb-1">open to</div>
                  <div className="flex flex-wrap gap-1">
                    {["collaborations","commissions","housing offers","residency opportunities","touring support","teaching / workshops","licensing","exhibitions","bookings / gigs","press / features"].map((opt) => (
                      <button key={opt} type="button"
                        onClick={() => setOpenTo((prev) => prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt])}
                        className={`text-[7px] uppercase tracking-widest px-1.5 py-0.5 border transition-colors ${openTo.includes(opt) ? "bg-[#c6ff3d] text-black border-[#c6ff3d]" : "border-white/20 text-white/30 hover:text-white hover:border-white/50"}`}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 px-3 py-2 border-t border-white/10">
            <div className="flex gap-1 mb-2">
              {["name", "kind", "city", "country", "url"].map((f) => (
                <div
                  key={f}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    draft[f as keyof EntryDraft] ? "bg-[#c6ff3d]" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {!requiredFilled && (
              <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1.5 leading-relaxed">
                {[
                  !draft.name && "name",
                  (!draft.city || !draft.country) && "location",
                  !validUrl && "link",
                  (needsEmail && !draft.contactEmail?.trim()) && "email",
                  (needsOwnerVerify && !ownerVerified) && "verify ownership",
                ]
                  .filter(Boolean)
                  .join(" · ")} needed
              </div>
            )}
            {needsOwnerVerify && (
              <label className="flex items-start gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={ownerVerified}
                  onChange={(e) => setOwnerVerified(e.target.checked)}
                  className="mt-0.5 accent-[#c6ff3d] shrink-0"
                />
                <span className="text-[8px] text-white/50 leading-relaxed uppercase tracking-widest">
                  i verify that i am the artist / owner of this entry
                </span>
              </label>
            )}
            <button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !requiredFilled}
              className="w-full bg-[#c6ff3d] text-black py-2 text-[9px] uppercase tracking-widest font-bold hover:bg-black hover:text-[#c6ff3d] transition-colors border-2 border-[#c6ff3d] disabled:opacity-30"
            >
              {isSubmitting ? "submitting…" : "submit →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
