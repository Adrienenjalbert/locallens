import Link from "next/link";
import { Scissors, Trees, Sprout, Shovel, Axe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Service {
  icon: LucideIcon;
  name: string;
  blurb: string;
}

// Mirrors the gardeners taxonomy in config/verticals/gardeners.ts.
const SERVICES: Service[] = [
  {
    icon: Sprout,
    name: "Lawn care",
    blurb:
      "Mowing, feeding, scarifying and seasonal upkeep to keep a lawn thick, green and healthy.",
  },
  {
    icon: Scissors,
    name: "Hedge trimming",
    blurb:
      "Shaping, reducing and maintaining hedges and topiary, with all the clippings cleared away.",
  },
  {
    icon: Shovel,
    name: "Garden clearance",
    blurb:
      "Overgrown plots, end-of-tenancy and one-off clear-outs — back to a blank, usable canvas.",
  },
  {
    icon: Trees,
    name: "Landscaping",
    blurb:
      "Patios, decking, fencing, planting and full redesigns — the bigger before/after projects.",
  },
  {
    icon: Axe,
    name: "Tree surgery",
    blurb:
      "Pruning, crown reduction, felling and stump removal by insured, qualified arborists.",
  },
];

/**
 * "Services we cover" — the gardeners taxonomy as browsable categories, each
 * linking into the Manchester directory. Single-vertical for now (depth before
 * breadth, per the blueprint GTM).
 */
export function VerticalsSection() {
  return (
    <section id="services" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Services we cover
        </p>
        <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          Every garden job, one trusted list
        </h2>
        <p className="mt-4 text-muted-foreground">
          From a quick tidy-up to a full redesign, find a vetted local pro for the work
          you need — starting in Greater Manchester.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ icon: Icon, name, blurb }) => (
          <Link
            key={name}
            href="/gardeners/manchester"
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary hover:shadow-sm"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition group-hover:bg-primary/15">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-xl text-foreground">{name}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {blurb}
            </p>
            <span className="mt-4 inline-flex w-fit items-center text-sm font-medium text-primary">
              Find a pro in Manchester
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
