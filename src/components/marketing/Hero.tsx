import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

/**
 * Above-the-fold hero. Leads with the buyer promise — find a trusted local
 * gardener or landscaper with proof of work and honest reviews — and offers two
 * CTAs (buyer → the Manchester directory, pro → claim a free profile). The soft
 * green glow + gradient keyword echo the GreenList palette.
 */
export function Hero() {
  return (
    <section className="brand-glow relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden />
            Gardeners &amp; landscapers in Greater Manchester
          </span>

          <h1 className="mt-6 font-display text-4xl leading-[1.05] text-foreground sm:text-6xl">
            Find a gardener you can{" "}
            <span className="brand-text-gradient">actually trust</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            GreenList ranks local gardeners and landscapers on the things that matter:
            proof of their work, what past customers really said, and whether the
            business is genuine. See real portfolios and honest reviews — no forms, no
            ten-companies-calling.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/gardeners/manchester"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Find a gardener
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/claim"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-base font-semibold text-foreground transition hover:bg-muted"
            >
              List your business
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free to search · Verified portfolios · Reviews decoded into real themes
          </p>
        </div>

        {/* Tagline ribbon echoing the brand line. */}
        <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card/70 p-6 text-center shadow-sm backdrop-blur sm:p-8">
          <p className="font-display text-xl text-foreground sm:text-2xl">
            Proof, not promises.{" "}
            <span className="text-muted-foreground">
              The most honest way to hire a garden pro.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
