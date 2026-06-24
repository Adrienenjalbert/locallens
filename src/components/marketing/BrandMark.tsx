import { cn } from "@/lib/utils";

/**
 * The GreenList logomark — a rounded green→leaf gradient tile with a leaf glyph.
 * Inline SVG (no asset request) so it renders crisply at any size and matches
 * the brand gradient defined in styles/index.css.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} role="img" aria-hidden>
      <defs>
        <linearGradient id="greenlist-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(152 55% 34%)" />
          <stop offset="100%" stopColor="hsl(84 60% 45%)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#greenlist-mark)" />
      <path
        d="M23 8c-7.5 0-12 4.2-12 10.2 0 1.6.4 3 1.1 4.2 1.7-3.9 4.7-6.6 9-7.9-3.3 1.8-5.6 4.6-6.8 8.2.9.3 1.9.5 3 .5 6 0 9.7-4.4 9.7-11.4 0-1.4-.1-2.7-.3-3.8Z"
        fill="hsl(0 0% 100%)"
      />
    </svg>
  );
}
