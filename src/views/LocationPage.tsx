"use client";

import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { BusinessCard } from "@/components/directory/BusinessCard";
import { MonetisationSlot } from "@/components/monetisation/MonetisationSlot";
import type { AffiliateUnitData } from "@/components/monetisation/AffiliateUnit";
import type { Candidate, RouterContext } from "@/lib/revenue-router";
import { getVertical } from "@config/index";
import { gardeners } from "@config/verticals/gardeners";
import { withBasePath } from "@/lib/paths";
import { SHORTLIST } from "@/lib/directory/shortlist";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { projectsForLocation } from "@/lib/portfolio/projects";
import { titleCaseSlug } from "@/lib/format";

const AFFILIATE_DATA: Record<string, AffiliateUnitData> = {
  "offer-liability": {
    offerId: "offer-liability",
    title: "Public liability cover for garden work",
    description: "Compare cover for hiring or being a gardener.",
    ctaLabel: "Compare cover",
    // The static site links to the Supabase Edge Function that resolves the
    // tracked partner deep-link server-side (records a touch, mints a subid).
    href: withBasePath("/r/offer-liability"),
    disclosureRequired: true,
    relAttribute: "sponsored nofollow",
  },
};

export function LocationPage({
  vertical = "gardeners",
  location = "manchester",
  lastUpdatedLabel,
}: {
  vertical?: string;
  location?: string;
  /** Human "Updated …" label (freshness signal AI engines weight heavily). */
  lastUpdatedLabel?: string;
}) {
  const config = getVertical(vertical) ?? gardeners;
  const verticalName = config.name.toLowerCase();
  const placeName = titleCaseSlug(location);
  const recentWork = projectsForLocation(vertical, location).slice(0, 6);

  // Context the server would compute (intent classifier + supply lookup).
  const baseContext: Omit<RouterContext, "slot"> = {
    pageType: "location",
    intentStage: "research",
    intentValue: "medium",
    device: "desktop",
    verticalSlug: config.slug,
    geoTier: 1,
    hasClaimedOperators: true,
    consent: { analytics: true, marketing: true },
    answerAlreadyRendered: true, // we render AnswerBlock first, below
    slotIsOrganicList: false, // monetisation slots are dedicated, never the organic ranking
    featuredAboveFoldCount: 1, // the featured BusinessCard above
  };

  const candidates: Candidate[] = [
    {
      rail: "affiliate",
      ref: "offer-liability",
      expectedValue: 0.42, // EPC from learned data
      relevance: 0.72,
      featured: false,
      label: "Compare cover",
    },
    {
      rail: "lead",
      ref: "lead-slot",
      expectedValue: 0.3,
      relevance: 1,
      featured: false,
      label: "Get quotes from top-rated gardeners",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AnswerBlock
        heading={`Best ${verticalName} in ${placeName}`}
        answer={`The top-rated ${verticalName} in ${placeName} are GreenThumb Gardens, Urban Roots and Petal & Spade, ranked by our Quality Score from real reviews, verified credentials and portfolio quality. All three cover lawn care, clearance and landscaping.`}
        stat={{
          label: `37 verified ${verticalName} in ${placeName} · median lawn-care £30–£55/visit`,
          source: "LocalLens data",
          date: "Jun 2026",
        }}
      />

      <section aria-label={`Ranked ${verticalName}`} className="space-y-3">
        {SHORTLIST.map((b) => (
          <BusinessCard key={b.name} data={b} />
        ))}
      </section>

      {recentWork.length > 0 && (
        <section aria-labelledby="recent-work-heading" className="space-y-3">
          <h2
            id="recent-work-heading"
            className="font-display text-xl font-semibold text-foreground"
          >
            Recent work in {placeName}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {recentWork.map((p) => (
              <li key={`${p.business}-${p.slug}`}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {lastUpdatedLabel && (
        <p className="text-xs text-muted-foreground">
          Updated {lastUpdatedLabel} · rankings refresh as new reviews and verifications
          arrive.
        </p>
      )}

      {/* Optimisable slot: the router decides affiliate vs lead vs nothing.
          Renders with static candidates for SSG, then upgrades to live
          server-built candidates (EPC, relevance, resolved click URL) when a
          backend is configured. */}
      <MonetisationSlot
        slot="inline-after-shortlist"
        context={baseContext}
        policy={config.routerPolicy}
        candidates={candidates}
        fetchLive
        keywords={["insurance", "lawn", "maintenance"]}
        resolveAffiliate={(ref) => AFFILIATE_DATA[ref]}
      />
    </main>
  );
}
