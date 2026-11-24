import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function PatronPostQuestionSent() {
  useEffect(() => {
    const previousTitle = document.title;
    const existingRobots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = existingRobots?.content;

    document.title = "Question received | Countercult Patron Post";
    let description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = "Your anonymous question has been sent to Countercult for review.";

    let robots = existingRobots;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, follow";

    return () => {
      document.title = previousTitle;
      if (existingRobots) existingRobots.content = previousRobots ?? "";
      else robots?.remove();
    };
  }, []);

  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-[#f9f9f6] px-5 py-16 text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <section className="w-full max-w-3xl border-2 border-black bg-white p-6 shadow-[8px_8px_0_#171714] sm:p-10" aria-labelledby="patron-post-question-sent-title">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/55">Countercult · Patron Post</p>
        <h1 id="patron-post-question-sent-title" className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-[-0.07em] sm:text-6xl">
          Your question is with us.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
          It has been sent to the Countercult team for review. If you’re lucky, we might answer it in a future Patron Post letter.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/65">
          Questions are reviewed before anything is shared, and a reply is never guaranteed. Join Patron Post if you want to read selected answers when they arrive.
        </p>
        <Link
          href="/snail#snail-checkout"
          className="mt-8 inline-flex min-h-14 items-center justify-between gap-8 border-2 border-black bg-[#c6ff3d] px-5 py-4 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          data-testid="link-question-sent-join-patron-post"
        >
          Join Patron Post <ArrowRight aria-hidden="true" />
        </Link>
        <p className="mt-6 text-xs">
          <Link href="/" className="font-bold underline underline-offset-4">Back to Countercult</Link>
        </p>
      </section>
    </main>
  );
}
