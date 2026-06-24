"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { QualityScoreBadge } from "@/components/directory/QualityScoreBadge";
import { PortfolioEditor } from "@/views/PortfolioEditor";
import {
  computeQualityScore,
  type BusinessSignals,
  type ScoreBreakdown,
} from "@/lib/scoring/quality-score";
import type { ScoreWeights } from "@config/types";
import { gardeners } from "@config/verticals/gardeners";
import { cn } from "@/lib/utils";

const COMPONENT_LABELS: Record<keyof ScoreWeights, string> = {
  review_quality: "Review quality",
  portfolio_quality: "Portfolio",
  verification: "Verification",
  completeness: "Profile completeness",
  data_confidence: "Data confidence",
};

// Demo signals for an owner who has claimed but not yet completed their
// profile — this makes the "Improve your rank" checklist actionable. In
// production these are read from the golden record + CRM under RLS.
const DEMO_SIGNALS: BusinessSignals = {
  review: {
    rating: 4.6,
    reviewCount: 28,
    daysSinceLatest: 64,
    crossSourceConsistency: 0.8,
  },
  portfolioItems: 1,
  portfolioDaysSinceLatest: 40,
  claimed: true,
  verifiedContact: true,
  verifiedCredentials: 0,
  completeness: 0.55,
  dataConfidence: 0.7,
};

interface ChecklistItem {
  id: string;
  done: boolean;
  title: string;
  impact: string;
}

function buildChecklist(
  signals: BusinessSignals,
  weights: ScoreWeights,
  portfolioCount: number,
): ChecklistItem[] {
  const pct = (w: number) => Math.round(w * 100);
  return [
    {
      id: "services",
      done: signals.completeness >= 0.8,
      title: "Complete your services & profile details",
      impact: `Profile completeness is ${pct(weights.completeness)}% of your score — fill in services, hours and contact details to claim it in full.`,
    },
    {
      id: "portfolio",
      done: portfolioCount >= 3,
      title: `Add ${Math.max(0, 3 - portfolioCount)} more portfolio photo${
        Math.max(0, 3 - portfolioCount) === 1 ? "" : "s"
      }`,
      impact: `Portfolio is ${pct(weights.portfolio_quality)}% of your score — 3+ recent photos of real work move the needle most in a visual vertical.`,
    },
    {
      id: "credentials",
      done: signals.verifiedCredentials >= 1,
      title: "Verify a trade credential",
      impact: `Verification is ${pct(weights.verification)}% of your score — add insurance or an accreditation to earn a trust badge.`,
    },
    {
      id: "reviews",
      done: signals.review.reviewCount >= 50 && signals.review.daysSinceLatest <= 30,
      title: "Request fresh reviews from recent customers",
      impact: `Review quality is ${pct(weights.review_quality)}% of your score — recent reviews count for more than old ones.`,
    },
  ];
}

export function OwnerDashboard({ businessId }: { businessId?: string }) {
  const config = gardeners;
  const [portfolioCount, setPortfolioCount] = useState(DEMO_SIGNALS.portfolioItems);

  const breakdown: ScoreBreakdown = useMemo(
    () =>
      computeQualityScore(
        { ...DEMO_SIGNALS, portfolioItems: portfolioCount },
        config.scoreWeights,
      ),
    [config.scoreWeights, portfolioCount],
  );

  const checklist = useMemo(
    () => buildChecklist(DEMO_SIGNALS, config.scoreWeights, portfolioCount),
    [config.scoreWeights, portfolioCount],
  );

  const remaining = checklist.filter((c) => !c.done).length;

  const componentRows = (Object.keys(breakdown.components) as (keyof ScoreWeights)[])
    .map((key) => ({ key, ...breakdown.components[key] }))
    .sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Your profile &amp; rank
        </h1>
        <p className="mt-1 text-muted-foreground">
          This is exactly what visitors see — and a transparent, prioritised list of what
          will lift your ranking.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="score-heading">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="score-heading"
                className="font-display text-lg font-semibold text-foreground"
              >
                Your Quality Score
              </h2>
              <QualityScoreBadge score={breakdown.score} />
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                {componentRows.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {COMPONENT_LABELS[row.key]}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        +{row.contribution.toFixed(1)} pts ·{" "}
                        {Math.round(row.weight * 100)}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={Math.round(row.value * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${COMPONENT_LABELS[row.key]} sub-score`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(row.value * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>

        <section aria-labelledby="improve-heading">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                <h2
                  id="improve-heading"
                  className="font-display text-lg font-semibold text-foreground"
                >
                  Improve your rank
                </h2>
              </div>
              <Badge tone={remaining === 0 ? "success" : "primary"}>
                {remaining === 0 ? "All done" : `${remaining} to do`}
              </Badge>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                {checklist.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    {item.done ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-success"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.done
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.impact}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      </div>

      <PortfolioEditor businessId={businessId} onCountChange={setPortfolioCount} />
    </div>
  );
}
