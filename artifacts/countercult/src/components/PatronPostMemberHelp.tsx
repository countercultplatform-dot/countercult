import { useState, type FormEvent } from "react";
import { useSubmitPatronPostQuestion } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export function PatronPostAnonymousQuestionForm({ compact = false }: { compact?: boolean }) {
  const [, setLocation] = useLocation();
  const [question, setQuestion] = useState("");
  const [questionMessage, setQuestionMessage] = useState("");
  const questionMutation = useSubmitPatronPostQuestion();

  async function submitAnonymousQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestionMessage("");
    try {
      const result = await questionMutation.mutateAsync({ data: { question } });
      if (result.submitted) setLocation("/snail/question-sent");
      else setQuestionMessage(result.message || "Your question could not be sent right now.");
    } catch (error) {
      setQuestionMessage(error instanceof Error ? error.message : "Your question could not be sent right now.");
    }
  }

  return (
    <form
      className="mt-4 grid gap-3 border-2 border-black bg-[#c6ff3d] p-4 text-black sm:p-5"
      id="patron-post-anonymous-question"
      onSubmit={submitAnonymousQuestion}
      data-testid="form-anonymous-patron-post-question"
    >
      <div>
        <h2
          id="patron-post-anonymous-question-title"
          className="mt-1 block text-3xl font-black leading-[0.96] tracking-[-0.04em] sm:text-5xl"
        >
          Ask us something anonymously
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-black/65">
          {compact
            ? "Ask about making art, finding collaborators, or keeping an independent project going. Your anonymous question may shape a future issue."
            : "Ask us about making art, finding people to work with, keeping an independent project going, or the places and scenes behind the mail. For example: “How do you find collaborators?” or “What keeps a cultural space going?”"}
        </p>
      </div>
      <label htmlFor="patron-post-anonymous-question-field" className="text-sm font-bold">
        What would you like us to talk about?
      </label>
      <textarea
        id="patron-post-anonymous-question-field"
        name="question"
        required
        minLength={10}
        maxLength={1200}
        rows={4}
        value={question}
        onChange={(event) => setQuestion(event.currentTarget.value)}
        placeholder="What would you like us to talk about?"
        className="w-full resize-y border-2 border-black bg-white p-3 text-sm leading-relaxed"
      />
      <p className="text-[10px] leading-relaxed text-black/60">
        {compact ? "Leave out names or identifying details." : "Please leave out names or details that could identify you."}
      </p>
      <button
        type="submit"
        disabled={questionMutation.isPending}
        className="justify-self-start border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-black/80 disabled:cursor-wait disabled:opacity-60"
        data-testid="button-anonymous-patron-post-question"
      >
        {questionMutation.isPending ? "Sending" : "Send anonymously"}
      </button>
      {questionMessage && <p className="text-xs leading-relaxed" role="status">{questionMessage}</p>}
    </form>
  );
}

export function PatronPostMemberHelp({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestPortalLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/patron-post/portal-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "The secure membership link could not be sent.");
      setMessage(result.message || "If that email belongs to a membership, a secure link will arrive shortly.");
      setEmail("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The secure membership link could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-5xl border-2 border-black bg-[#fffaf0] p-5 text-black shadow-[6px_6px_0_#171714] sm:p-8" aria-labelledby="patron-post-member-help-title">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">Member help</p>
      <h2 id="patron-post-member-help-title" className="mt-2 text-3xl font-black uppercase leading-[0.95] tracking-[-0.06em] sm:text-4xl">
        Your membership, your mail
      </h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide">Cancellation policy</h3>
          <p className="mt-2 text-sm leading-relaxed text-black/75">
            {compact
              ? "Cancel anytime in Stripe. It takes effect at the end of your paid period; that month still includes one mailing."
              : "You can cancel at any time through Stripe’s secure customer portal. Cancellation takes effect at the end of your current billing period and stops future renewals. Your current paid month still includes one mailing."}
          </p>
          <form className="mt-5 border-t border-black/20 pt-4" onSubmit={requestPortalLink} data-testid="form-patron-post-portal-link">
            <label htmlFor="patron-post-portal-email" className="text-sm font-bold">
              {compact ? "Already a member? Get a secure link." : "Already a member? Get your Stripe portal link."}
            </label>
            <p className="mt-1 text-xs leading-relaxed text-black/65">
              {compact
                ? "Enter your checkout email to receive a management link."
                : "Enter the email you used at checkout and we’ll send a secure link for membership management."}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="patron-post-portal-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="Email used at checkout"
                className="min-w-0 flex-1 border-2 border-black bg-white px-3 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="border-2 border-black bg-[#e53935] px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-[#b71c1c] disabled:cursor-wait disabled:opacity-60"
                data-testid="button-patron-post-portal-link"
              >
                {loading ? "Sending" : "Email secure link"}
              </button>
            </div>
            {message && <p className="mt-3 text-xs leading-relaxed" role="status">{message}</p>}
          </form>
        </div>
        <div className="border-t border-black/20 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <h3 className="text-sm font-black uppercase tracking-wide">We love penpals</h3>
          <p className="mt-2 text-sm leading-relaxed text-black/75">
            {compact
              ? "Write back using the return address on your letter."
              : "Feel free to write us back. The return address is printed on your letter, so you can send us a note once it arrives."}
          </p>
        </div>
      </div>
    </section>
  );
}
