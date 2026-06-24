const PILLARS = [
  { value: "Reviews, decoded", label: "Themes from every review, not just a star average" },
  { value: "Proof, not promises", label: "Real portfolios tagged by style and budget" },
  { value: "Real businesses only", label: "A legitimacy check on every listed pro" },
  { value: "Free for both sides", label: "Cost tools for buyers, profile tools for pros" },
];

/**
 * The four GreenList differentiators on a dark brand band so they pop. Kept
 * qualitative on purpose — we don't publish fabricated counts (honesty rule).
 */
export function StatStrip() {
  return (
    <section className="bg-foreground py-16 text-background">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl text-background sm:text-4xl">
          What makes GreenList different
        </h2>
        <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.value} className="text-center">
              <dt className="brand-text-gradient font-display text-2xl sm:text-3xl">
                {pillar.value}
              </dt>
              <dd className="mx-auto mt-2 max-w-[14rem] text-sm text-background/70">
                {pillar.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
