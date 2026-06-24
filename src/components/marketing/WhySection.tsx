import { ShieldCheck, Images, ScanSearch, HeartHandshake } from "lucide-react";

const REASONS = [
  {
    icon: ScanSearch,
    title: "Reviews, decoded",
    body: "We analyse every review across every source into honest themes — reliability, tidiness, value and communication.",
  },
  {
    icon: Images,
    title: "Proof, not promises",
    body: "Real before/after portfolios, tagged by style and budget, so you can see the work before you commit.",
  },
  {
    icon: ShieldCheck,
    title: "Real businesses only",
    body: "Every pro carries a legitimacy score — website, socials, insurance, certifications and recent activity.",
  },
  {
    icon: HeartHandshake,
    title: "No lead spam",
    body: "We don't sell one job to ten companies. You see the pros, you choose who to contact — on your terms.",
  },
];

/** "Why homeowners choose GreenList" + the honesty manifesto band. */
export function WhySection() {
  return (
    <section id="trust" className="scroll-mt-20 bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* Honesty manifesto */}
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            Not the cheapest list. The most honest one.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            We rank gardeners on proof of work and what real customers said — never on
            who paid the most. We show review counts and confidence so you can judge the
            signal for yourself.
          </p>
        </div>

        <h3 className="mt-16 text-center font-display text-2xl text-foreground sm:text-3xl">
          Why homeowners choose GreenList
        </h3>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-sm"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h4 className="mt-4 font-display text-lg text-foreground">{title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
