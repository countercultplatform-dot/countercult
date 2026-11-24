import { useState } from "react";
import { ArrowUpRight, Heart, Share2 } from "lucide-react";

type OptionalPatronPostSupportStepProps = {
  onPublishForFree: () => void;
  onBack: () => void;
  isPublishing: boolean;
  error?: string;
};

export function OptionalPatronPostSupportStep({
  onPublishForFree,
  onBack,
  isPublishing,
  error,
}: OptionalPatronPostSupportStepProps) {
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "manual">("idle");
  const shareUrl = new URL("/snail", window.location.origin).toString();

  const sharePublication = async () => {
    setShareState("idle");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Countercult Patron Post",
          text: "Monthly art mail, independent culture, and Countercult Network updates.",
          url: shareUrl,
        });
        setShareState("shared");
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
    } catch {
      setShareState("manual");
    }
  };

  return (
    <section
      className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:p-7"
      aria-labelledby="optional-patron-post-title"
      data-testid="panel-optional-patron-post-support"
    >
      <div className="flex items-start gap-3 border-b-2 border-black pb-5">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#ffc5a8]" aria-hidden="true">
          <Heart size={17} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">Optional support</p>
          <h2 id="optional-patron-post-title" className="mt-1 text-2xl font-black uppercase leading-tight sm:text-3xl">Before you post</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/75">
            Posting on Countercult's boards is free. If you are able, a monthly Patron Post membership helps sustain the publication and keep the Countercult Network free. You can also share the publication with someone who may enjoy it. Your post can go ahead either way.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="border-2 border-black bg-[#c6ff3d] p-4">
          <p className="text-xs font-black uppercase tracking-wide">Join the publication</p>
          <p className="mt-2 text-sm leading-5">Patron Post is a paid monthly publication. Membership is separate from free board posting.</p>
          <a
            href="/snail"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-10 items-center gap-2 border-2 border-black bg-black px-3 text-[10px] font-black uppercase tracking-wide text-[#c6ff3d] hover:bg-white hover:text-black"
            data-testid="link-optional-patron-post"
          >
            Explore Patron Post <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </article>

        <article className="border-2 border-black p-4">
          <p className="text-xs font-black uppercase tracking-wide">Share it with someone</p>
          <p className="mt-2 text-sm leading-5">If a membership is not right for you, sharing the publication helps more people find it.</p>
          <button
            type="button"
            onClick={() => void sharePublication()}
            className="mt-4 inline-flex min-h-10 items-center gap-2 border-2 border-black px-3 text-[10px] font-black uppercase tracking-wide hover:bg-[#ffc5a8]"
            data-testid="button-share-patron-post"
          >
            Share Patron Post <Share2 size={14} aria-hidden="true" />
          </button>
        </article>
      </div>

      {shareState !== "idle" && (
        <p role="status" className="mt-4 text-xs font-bold" data-testid="status-patron-post-share">
          {shareState === "shared" && "Thanks for sharing Patron Post."}
          {shareState === "copied" && "Patron Post link copied."}
          {shareState === "manual" && (
            <>
              Copy this link to share:{" "}
              <a href={shareUrl} className="break-all underline underline-offset-2">{shareUrl}</a>
            </>
          )}
        </p>
      )}

      {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700" data-testid="status-post-publish-error">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t-2 border-black pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isPublishing}
          className="min-h-11 px-2 text-left text-xs font-black uppercase underline underline-offset-4 disabled:opacity-50"
          data-testid="button-back-to-post-draft"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onPublishForFree}
          disabled={isPublishing}
          className="min-h-12 border-2 border-black bg-black px-5 text-xs font-black uppercase tracking-widest text-[#c6ff3d] hover:bg-[#c6ff3d] hover:text-black disabled:opacity-50"
          data-testid="button-publish-post-for-free"
        >
          {isPublishing ? "Publishing your post…" : "Continue to publish for free"}
        </button>
      </div>
    </section>
  );
}
