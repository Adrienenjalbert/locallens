import { buildFaqPageJsonLd, jsonLdScript, type FaqItem } from "@/lib/tools/jsonld";

/**
 * Renders an accessible FAQ list as native <details>/<summary> (works without
 * JS for static export) AND injects a matching Schema.org FAQPage JSON-LD block
 * so answer engines can extract the Q&A pairs (AEO).
 */
export function FaqBlock({
  heading = "Frequently asked questions",
  items,
}: {
  heading?: string;
  items: FaqItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="rounded-lg border bg-card p-5">
      <h2 id="faq-heading" className="font-display text-xl font-semibold text-foreground">
        {heading}
      </h2>
      <dl className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <details key={item.question} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-foreground">
              <dt className="font-medium">{item.question}</dt>
              <span
                aria-hidden
                className="text-muted-foreground transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <dd className="mt-2 max-w-prose text-sm text-muted-foreground">
              {item.answer}
            </dd>
          </details>
        ))}
      </dl>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(buildFaqPageJsonLd(items)),
        }}
      />
    </section>
  );
}
