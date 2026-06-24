import { Search, FileCheck2, MessagesSquare } from "lucide-react";

const POINTS = [
  {
    icon: Search,
    title: "Search with confidence",
    body: "Browse ranked local gardeners and landscapers — sorted by a transparent Quality Score, not by who paid the most.",
  },
  {
    icon: FileCheck2,
    title: "Check the proof",
    body: "See real before/after portfolios tagged by style and budget, plus a legitimacy check on every business.",
  },
  {
    icon: MessagesSquare,
    title: "Read the real story",
    body: "We decode every review into themes — reliability, tidiness, value, communication — so you know what to expect before you call.",
  },
];

/** "How GreenList works" — the three-step buyer journey, proof-led. */
export function FocusSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          How it works
        </p>
        <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          Hire a garden pro the honest way
        </h2>
        <p className="mt-4 text-muted-foreground">
          Most directories just list businesses. GreenList ranks them on proof of work,
          honest reviews, and whether they&apos;re even a real, legitimate company.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-sm"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-xl text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
