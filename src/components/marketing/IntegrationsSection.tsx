import Link from "next/link";
import { Database } from "lucide-react";

const SOURCES = [
  "Google reviews",
  "Facebook",
  "Trustpilot",
  "Companies House",
  "Instagram",
  "Business websites",
  "Trade associations",
  "Insurance & certifications",
];

/**
 * "Where our trust data comes from" — the legitimacy and review signals behind
 * every ranking, sourced from public data with provenance (blueprint §4.1).
 * Replaces the old CRM-integrations wall.
 */
export function IntegrationsSection() {
  return (
    <section id="data" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <Database className="h-3.5 w-3.5" aria-hidden />
            Where our data comes from
          </span>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
            Trust signals you can&apos;t fake
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every ranking is built from public data — reviews, social presence, company
            records and proof of work — with the source and date stored for each signal.
            We publish our derived findings, show review counts and confidence, and let
            pros reply.
          </p>
          <Link
            href="/gardeners/manchester"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            See it in Manchester
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SOURCES.map((name) => (
            <li
              key={name}
              className="flex h-16 items-center justify-center rounded-xl border border-border bg-card px-3 text-center text-sm font-medium text-foreground transition hover:border-primary hover:shadow-sm"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
