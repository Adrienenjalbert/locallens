/**
 * Answer-first block: the 40–60 word direct answer that leads every page.
 * Renders before any monetisation slot (trust floor #3) and is the unit AI
 * answer engines extract + cite (AEO).
 */
export function AnswerBlock({
  heading,
  answer,
  stat,
}: {
  heading: string;
  answer: string;
  stat?: { label: string; source: string; date: string };
}) {
  return (
    <section aria-label="Direct answer" className="rounded-lg border bg-card p-5">
      <h1 className="font-display text-2xl font-semibold text-foreground">{heading}</h1>
      <p className="mt-2 max-w-prose text-foreground">{answer}</p>
      {stat && (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{stat.label}</span>
          {" — "}
          <span>
            Source: {stat.source}, {stat.date}
          </span>
        </p>
      )}
    </section>
  );
}
