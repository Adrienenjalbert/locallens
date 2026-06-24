import Link from "next/link";
import { BrandMark } from "@/components/marketing/BrandMark";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "For homeowners",
    links: [
      { href: "/gardeners/manchester", label: "Find a gardener" },
      { href: "/#services", label: "Services we cover" },
      { href: "/tools", label: "Free cost tools" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "For pros",
    links: [
      { href: "/claim", label: "List your business" },
      { href: "/pricing", label: "Plans & pricing" },
      { href: "/app", label: "Owner dashboard" },
      { href: "/tools", label: "Free pro tools" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/#trust", label: "How we rank pros" },
      { href: "/#proof", label: "Reviews, decoded" },
      { href: "/#data", label: "Where our data comes from" },
      { href: "/gardeners/manchester", label: "Browse Manchester" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-2" aria-label="GreenList — home">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-xl text-foreground">GreenList</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The trusted way to find — and the easiest way to become — a sought-after
            garden professional. Proof of work, reviews decoded, real businesses only.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GreenList. All rights reserved.</p>
          <p>Not the cheapest list — the most honest one.</p>
        </div>
      </div>
    </footer>
  );
}
