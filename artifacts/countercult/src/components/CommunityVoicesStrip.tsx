import { useState } from "react";
import { useListPublicVoices, useListResidencyOffers } from "@workspace/api-client-react";

type FeedItem =
  | {
      id: string;
      type: "voice";
      quote: string;
      name: string;
      city: string;
    }
  | {
      id: string;
      type: "exchange";
      quote: string;
      city: string;
    };

function trimText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3).trimEnd()}…`
    : normalized;
}

export function CommunityVoicesStrip() {
  const { data: voiceResponse, isLoading: voicesLoading, isError: voicesError } = useListPublicVoices();
  const { data: offerResponse, isLoading: offersLoading, isError: offersError } = useListResidencyOffers();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const voices = Array.isArray(voiceResponse) ? voiceResponse : [];
  const offers = Array.isArray(offerResponse)
    ? offerResponse.filter((offer) => offer.isActive !== false && offer.visibility !== "private" && offer.city && offer.description).slice(0, 3)
    : [];

  const feedItems: FeedItem[] = [];
  const maxLength = Math.max(voices.length, offers.length);
  for (let index = 0; index < maxLength; index += 1) {
    const voice = voices[index];
    const offer = offers[index];
    if (voice) {
      feedItems.push({
        id: `voice-${voice.id}`,
        type: "voice",
        quote: trimText(String(voice.joinReason ?? ""), 150),
        name: voice.name,
        city: voice.city,
      });
    }
    if (offer) {
      feedItems.push({
        id: `exchange-${offer.id}`,
        type: "exchange",
        quote: trimText(String(offer.description ?? ""), 180),
        city: offer.city,
      });
    }
  }

  const movingItems = feedItems.length > 1 ? [...feedItems, ...feedItems] : feedItems;
  if ((voicesLoading || offersLoading) && feedItems.length === 0) return null;
  if ((voicesError && offersError) || feedItems.length === 0) return null;

  const goToSignup = () => {
    const joinParams = new URLSearchParams({ action: "join" });
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode) joinParams.set("ref", referralCode);
    window.location.href = `/explore?${joinParams.toString()}`;
  };

  return (
    <section
      className="shrink-0 cursor-pointer border-b-2 border-black bg-[#0c0c14] px-3 py-2.5 text-[#F9F9F6] sm:px-8"
      aria-label="Why people join Countercult. Click to apply to join for free."
      role="link"
      tabIndex={0}
      onClick={goToSignup}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToSignup();
        }
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="w-[112px] shrink-0 border-r border-white/20 pr-3 sm:w-[165px]">
          <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#c6ff3d]">why people join</p>
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/40">member voices</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className="countercult-voices-marquee flex w-max gap-2"
            style={{
              animation: movingItems.length > 1 ? "countercult-voices-marquee 120s linear infinite" : undefined,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {movingItems.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const isVoice = item.type === "voice";
              return (
                <article
                  key={`${item.id}-${index}`}
                  role={isVoice ? "button" : undefined}
                  tabIndex={isVoice ? 0 : undefined}
                  aria-expanded={isVoice ? isExpanded : undefined}
                  aria-label={isVoice ? `Read ${isExpanded ? "short" : "full"} reason from ${item.name}` : `Read live Exchange post from ${item.city}`}
                  title={isVoice ? "Hover, focus, or tap to read the full reason" : "Live Exchange post"}
                  onMouseEnter={() => {
                    setIsPaused(true);
                    if (isVoice) setExpandedId(item.id);
                  }}
                  onMouseLeave={() => {
                    setIsPaused(false);
                    if (isVoice) setExpandedId(null);
                  }}
                  onFocus={() => {
                    setIsPaused(true);
                    if (isVoice) setExpandedId(item.id);
                  }}
                  onBlur={() => {
                    setIsPaused(false);
                    if (isVoice) setExpandedId(null);
                  }}
                  onClick={() => {
                    goToSignup();
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && isVoice) {
                      event.preventDefault();
                      goToSignup();
                    }
                  }}
                  className={`flex min-h-[64px] w-[235px] cursor-pointer flex-col justify-between border px-3 py-2 transition-colors sm:w-[290px] ${
                    isExpanded ? "border-[#c6ff3d] bg-white/[0.12]" : "border-white/25 bg-white/[0.06]"
                  }`}
                >
                  <p className={`text-[11px] leading-snug text-white/85 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {isVoice ? "“" : ""}{isExpanded ? (item.type === "voice" ? item.quote : item.quote) : item.quote}{isVoice ? "”" : ""}
                  </p>
                  <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.1em]">
                    {isVoice ? (
                      <>
                        <span className="font-bold text-[#c6ff3d]">{item.name}</span>
                        <span className="text-white/40"> · {item.city}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-[#c6ff3d]">live Exchange</span>
                        <span className="text-white/40"> · {item.city}</span>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}