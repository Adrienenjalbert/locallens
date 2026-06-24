import Link from "next/link";
import { ArrowRight, Calculator, Ruler, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FreeTool {
  name: string;
  href: string;
  icon: LucideIcon;
  pitch: string;
  features: string[];
}

// Each entry links to a real, generated route (verified in the build route list).
const TOOLS: FreeTool[] = [
  {
    name: "Garden cost estimator",
    href: "/tools/gardeners-cost-manchester/",
    icon: Calculator,
    pitch: "See what a job really costs before you call anyone.",
    features: [
      "Price bands by garden size",
      "Built for Manchester rates",
      "No signup, instant result",
    ],
  },
  {
    name: "Concrete calculator",
    href: "/tools/concrete-calculator/",
    icon: Ruler,
    pitch: "Work out concrete volume and bags for a patio or base.",
    features: [
      "Volume in cubic metres",
      "Estimated 25 kg bags",
      "Runs in your browser",
    ],
  },
  {
    name: "Review-request email builder",
    href: "/tools/review-email-setup/",
    icon: FileText,
    pitch: "For pros: get more 5-star Google reviews, the compliant way.",
    features: [
      "Ready-to-send email",
      "Happy customers → Google",
      "Free, no account",
    ],
  },
];

/**
 * The free-tools surface: engineering-as-marketing for both sides of the
 * marketplace. Buyer cost tools + everyday utilities that pull traffic and link
 * back to the directory. Each card links to a live /tools page.
 */
export function ToolsShowcase() {
  return (
    <section id="tools" className="scroll-mt-20 bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Free tools
          </p>
          <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
            Free tools for both sides of the garden
          </h2>
          <p className="mt-4 text-muted-foreground">
            Instant cost and project tools for homeowners, plus reputation and admin
            tools for pros. Every tool runs in your browser — free, no signup.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {TOOLS.map((tool, i) => {
            const featured = i === 0;
            return (
              <div
                key={tool.name}
                className={[
                  "flex flex-col rounded-2xl border p-7 transition",
                  featured
                    ? "border-primary bg-card shadow-md lg:-translate-y-2"
                    : "border-border bg-card hover:shadow-sm",
                ].join(" ")}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-primary-foreground">
                  <tool.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-2xl text-foreground">
                  {tool.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tool.pitch}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {tool.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                    >
                      <ArrowRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tool.href}
                  className={[
                    "group mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
                    featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  Open tool
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/tools"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Browse all free tools
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
