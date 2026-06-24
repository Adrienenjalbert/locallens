import Link from "next/link";
import { BrandMark } from "@/components/marketing/BrandMark";

const NAV = [
  { href: "/gardeners/manchester", label: "Find a gardener" },
  { href: "/#services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/tools", label: "Free tools" },
  { href: "/pricing", label: "For pros" },
];

/**
 * Sticky, translucent top nav. Server-rendered (no client JS) so it ships in the
 * static export and stays crawlable. Section anchors target homepage sections;
 * the directory, tools and pricing links go to live pages.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="GreenList — home">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-xl text-foreground">GreenList</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="hidden text-sm font-medium text-foreground transition hover:opacity-70 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/claim"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            List your business
          </Link>
        </div>
      </div>
    </header>
  );
}
