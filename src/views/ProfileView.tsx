"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { QualityScoreBadge } from "@/components/directory/QualityScoreBadge";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { projectsForBusiness } from "@/lib/portfolio/projects";
import { titleCaseSlug } from "@/lib/format";
import { computeQualityScore, type ScoreBreakdown } from "@/lib/scoring/quality-score";
import type { ScoreWeights } from "@config/types";
import { getVertical } from "@config/index";
import { gardeners } from "@config/verticals/gardeners";
import { cn } from "@/lib/utils";

// Human-readable labels + plain-English "what this measures" copy for each
// Quality Score component. Keyed by the score-weight keys so the panel stays in
// sync with the scoring contract.
const COMPONENT_META: Record<keyof ScoreWeights, { label: string; blurb: string }> = {
  review_quality: {
    label: "Review quality",
    blurb: "Bayesian-adjusted rating across sources, weighted for recency and volume.",
  },
  portfolio_quality: {
    label: "Portfolio",
    blurb: "Depth and freshness of real, completed work shown on the profile.",
  },
  verification: {
    label: "Verification",
    blurb: "Claimed ownership, verified contact details and trade credentials.",
  },
  completeness: {
    label: "Profile completeness",
    blurb: "How fully the profile is filled in: services, hours, contact and media.",
  },
  data_confidence: {
    label: "Data confidence",
    blurb: "How confident our pipeline is in the underlying record.",
  },
};

interface VerificationFlag {
  label: string;
  verified: boolean;
}

export function ProfileView({
  vertical = "gardeners",
  location = "manchester",
  business = "greenthumb-gardens",
  lastUpdatedLabel,
}: {
  vertical?: string;
  location?: string;
  business?: string;
  /** Human "Updated …" label (freshness signal AI engines weight heavily). */
  lastUpdatedLabel?: string;
}) {
  const config = getVertical(vertical) ?? gardeners;
  const businessName = titleCaseSlug(business);
  const placeName = titleCaseSlug(location);
  const verticalName = config.name.toLowerCase();
  const projects = projectsForBusiness(vertical, location, business);

  // Demo signals — in production these come from the golden record + reviews +
  // portfolio + credentials. Here they drive a real, explainable breakdown so
  // the "Why ranked here" panel mirrors production behaviour exactly.
  const breakdown: ScoreBreakdown = computeQualityScore(
    {
      review: {
        rating: 4.9,
        reviewCount: 412,
        daysSinceLatest: 12,
        crossSourceConsistency: 0.93,
      },
      portfolioItems: 18,
      portfolioDaysSinceLatest: 24,
      claimed: true,
      verifiedContact: true,
      verifiedCredentials: 2,
      completeness: 0.88,
      dataConfidence: 0.82,
    },
    config.scoreWeights,
  );

  const verifications: VerificationFlag[] = [
    { label: "Identity verified", verified: true },
    { label: "Contact verified", verified: true },
    { label: "Public liability insurance", verified: true },
    { label: "RHS-accredited", verified: false },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/${vertical}/${location}`}
            className="hover:text-foreground hover:underline"
          >
            {config.name} in {placeName}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            {businessName}
          </h1>
          <QualityScoreBadge score={breakdown.score} />
        </div>
        <p className="text-muted-foreground">
          A {verticalName.replace(/s$/, "")} in {placeName} covering lawn care,
          landscaping and hedge trimming. Ranked honestly by the LocalLens Quality Score —
          never pay-to-rank.
        </p>
        {lastUpdatedLabel && (
          <p className="text-xs text-muted-foreground">Updated {lastUpdatedLabel}</p>
        )}
      </header>

      <WhyRankedHere breakdown={breakdown} />

      <section aria-labelledby="verification-heading">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <h2
              id="verification-heading"
              className="font-display text-lg font-semibold text-foreground"
            >
              Verification
            </h2>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {verifications.map((v) => (
                <li key={v.label}>
                  <Badge tone={v.verified ? "success" : "muted"}>
                    {v.verified ? (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                    ) : null}
                    {v.label}
                    {!v.verified ? " — not verified" : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="portfolio-heading">
        <Card>
          <CardHeader>
            <h2
              id="portfolio-heading"
              className="font-display text-lg font-semibold text-foreground"
            >
              Portfolio
            </h2>
          </CardHeader>
          <CardBody>
            {projects.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {projects.map((p) => (
                  <li key={p.slug}>
                    <ProjectCard project={p} aspect="square" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Photos of completed work appear here once the owner adds them.
              </p>
            )}
          </CardBody>
        </Card>
      </section>

      <section
        aria-labelledby="claim-heading"
        className="rounded-lg border border-primary/30 bg-primary/5 p-5"
      >
        <h2
          id="claim-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          Is this your business?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Claim this listing to add photos, verify your credentials and respond to
          enquiries — and see exactly how to climb the rankings.
        </p>
        <Link
          href={`/claim?business=${business}`}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Claim this listing
        </Link>
      </section>
    </main>
  );
}

function WhyRankedHere({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows = (Object.keys(breakdown.components) as (keyof ScoreWeights)[])
    .map((key) => ({ key, ...breakdown.components[key] }))
    .sort((a, b) => b.contribution - a.contribution);

  const maxContribution = Math.max(...rows.map((r) => r.contribution), 1);

  return (
    <section aria-labelledby="why-ranked-heading">
      <Card>
        <CardHeader>
          <h2
            id="why-ranked-heading"
            className="font-display text-lg font-semibold text-foreground"
          >
            Why ranked here
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The Quality Score is {breakdown.score}/100. Every factor is shown — no hidden
            weighting, no pay-to-rank.
          </p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-4">
            {rows.map((row) => {
              const meta = COMPONENT_META[row.key];
              const pct = Math.round(row.value * 100);
              return (
                <li key={row.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      +{row.contribution.toFixed(1)} pts
                      <span className="ml-1 text-xs">
                        ({Math.round(row.weight * 100)}% weight)
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${meta.label}: ${pct} out of 100`}
                  >
                    <div
                      className={cn("h-full rounded-full bg-primary")}
                      style={{ width: `${(row.contribution / maxContribution) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{meta.blurb}</p>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
