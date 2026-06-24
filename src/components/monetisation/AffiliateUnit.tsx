import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AffiliateUnitData {
  offerId: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Server-resolved tracking URL (never a raw exposed affiliate link). */
  href: string;
  /** Trust-floor metadata — disclosure + rel are mandatory and data-driven. */
  disclosureRequired: boolean;
  relAttribute: string; // e.g. "sponsored nofollow"
}

/**
 * An affiliate offer. Renders ONLY when the RevenueRouter selected it (i.e. it
 * cleared the trust floor). It is always: clearly labelled "Partner", visually
 * distinct from organic results, accessible, and carries rel="sponsored
 * nofollow". Never styled to masquerade as an organic listing.
 */
export function AffiliateUnit({
  data,
  onClick,
  className,
}: {
  data: AffiliateUnitData;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <aside
      aria-label="Partner offer"
      className={cn("rounded-lg border border-dashed bg-muted/40 p-4", className)}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Partner offer
        </span>
      </div>
      <h3 className="mt-2 font-display text-base font-semibold text-foreground">
        {data.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
      <a
        href={data.href}
        rel={data.relAttribute}
        target="_blank"
        onClick={onClick}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        {data.ctaLabel}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
      {data.disclosureRequired && (
        <p className="mt-2 text-xs text-muted-foreground">
          We may earn a commission if you use this offer. This does not affect how we rank
          local businesses.
        </p>
      )}
    </aside>
  );
}
