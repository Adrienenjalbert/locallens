import { ThumbsUp, Sparkles, Clock, BadgePoundSterling } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Signal {
  icon: LucideIcon;
  theme: string;
  blurb: string;
}

// Illustrates HOW GreenList presents reviews (the decoded themes), not a claim
// about any specific business — no fabricated ratings or counts.
const SIGNALS: Signal[] = [
  { icon: ThumbsUp, theme: "Reliability", blurb: "Turns up when they say they will" },
  { icon: Sparkles, theme: "Tidiness", blurb: "Leaves the garden spotless" },
  { icon: Clock, theme: "Communication", blurb: "Quick to reply and easy to reach" },
  { icon: BadgePoundSterling, theme: "Value", blurb: "Fair price for the quality of work" },
];

/**
 * "Reviews, decoded" — shows the structured review themes GreenList produces
 * from raw reviews. Illustrative of the methodology, not fabricated ratings.
 */
export function SocialProof() {
  return (
    <section id="proof" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Reviews, decoded
        </p>
        <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          We don&apos;t show a star average. We show what people actually said.
        </h2>
        <p className="mt-4 text-muted-foreground">
          For every pro, we analyse their reviews across sources into honest themes — so
          you see strengths and trade-offs at a glance, with the review count and
          confidence shown.
        </p>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {SIGNALS.map((s) => (
          <div
            key={s.theme}
            className="rounded-2xl border border-border bg-card p-6 text-center transition hover:shadow-sm"
          >
            <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <dt className="mt-4 font-display text-lg text-foreground">{s.theme}</dt>
            <dd className="mt-2 text-xs text-muted-foreground">{s.blurb}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
