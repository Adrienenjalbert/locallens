import { Phone, Star } from "lucide-react";
import { QualityScoreBadge } from "./QualityScoreBadge";

export interface BusinessCardData {
  name: string;
  qualityScore: number;
  rating: number;
  reviewCount: number;
  locationName: string;
  topServices: string[];
  featured?: boolean;
}

/** Core directory listing card. Featured units are clearly labelled. */
export function BusinessCard({ data }: { data: BusinessCardData }) {
  return (
    <article className="rounded-lg border bg-card p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {data.name}
            </h3>
            {data.featured && (
              <span className="rounded-sm bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                Featured
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
            <span className="font-medium text-foreground">{data.rating.toFixed(1)}</span>
            <span>({data.reviewCount} reviews)</span>
            <span aria-hidden>·</span>
            <span>{data.locationName}</span>
          </p>
        </div>
        <QualityScoreBadge score={data.qualityScore} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {data.topServices.slice(0, 3).join(" · ")}
      </p>
      <div className="mt-3 flex gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
          <Phone className="h-4 w-4" aria-hidden /> Contact
        </button>
      </div>
    </article>
  );
}
