import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Closing CTA on a full-bleed brand-gradient band — one route per audience. */
export function CtaSection() {
  return (
    <section className="px-4 py-20">
      <div className="brand-gradient mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
        <h2 className="mx-auto max-w-2xl font-display text-3xl text-primary-foreground sm:text-5xl">
          Find a garden pro you can trust
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base font-medium text-primary-foreground/80">
          Browse ranked, verified gardeners and landscapers in Greater Manchester — or
          claim your free profile and put your best work in front of local homeowners.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/gardeners/manchester"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-base font-semibold text-background transition hover:opacity-90"
          >
            Find a gardener
            <ArrowRight
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href="/claim"
            className="inline-flex items-center justify-center rounded-full border border-foreground/20 bg-background/30 px-7 py-3.5 text-base font-semibold text-foreground backdrop-blur transition hover:bg-background/50"
          >
            List your business
          </Link>
        </div>
      </div>
    </section>
  );
}
