import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { BusinessCard, type BusinessCardData } from "@/components/directory/BusinessCard";
import { MonetisationSlot } from "@/components/monetisation/MonetisationSlot";
import type { AffiliateUnitData } from "@/components/monetisation/AffiliateUnit";
import type { Candidate, RouterContext } from "@/lib/revenue-router";
import { gardeners } from "@config/verticals/gardeners";

// In production these come from golden records + the affiliate catalogue +
// server-side intent classification. Hard-coded here to demonstrate the
// answer-first + slot-based monetisation architecture running locally.
const SHORTLIST: BusinessCardData[] = [
  { name: "GreenThumb Gardens", qualityScore: 91, rating: 4.9, reviewCount: 412, locationName: "Manchester", topServices: ["lawn-care", "landscaping", "hedge-trimming"], featured: true },
  { name: "Urban Roots", qualityScore: 84, rating: 4.7, reviewCount: 188, locationName: "Manchester", topServices: ["garden-clearance", "lawn-care"] },
  { name: "Petal & Spade", qualityScore: 78, rating: 4.8, reviewCount: 96, locationName: "Manchester", topServices: ["landscaping", "tree-surgery"] },
];

const AFFILIATE_DATA: Record<string, AffiliateUnitData> = {
  "offer-liability": {
    offerId: "offer-liability",
    title: "Public liability cover for garden work",
    description: "Compare cover for hiring or being a gardener.",
    ctaLabel: "Compare cover",
    href: "/r/offer-liability", // server resolves → tracked partner deep-link
    disclosureRequired: true,
    relAttribute: "sponsored nofollow",
  },
};

export function LocationPage() {
  // Context the server would compute (intent classifier + supply lookup).
  const baseContext: Omit<RouterContext, "slot"> = {
    pageType: "location",
    intentStage: "research",
    intentValue: "medium",
    device: "desktop",
    verticalSlug: "gardeners",
    geoTier: 1,
    hasClaimedOperators: true,
    consent: { analytics: true, marketing: true },
    answerAlreadyRendered: true, // we render AnswerBlock first, below
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
        heading="Best gardeners in Manchester"
        answer="The top-rated gardeners in Manchester are GreenThumb Gardens, Urban Roots and Petal & Spade, ranked by our Quality Score from real reviews, verified credentials and portfolio quality. All three cover lawn care, clearance and landscaping."
        stat={{
          label: "37 verified gardeners in Manchester · median lawn-care £30–£55/visit",
          source: "LocalLens data",
          date: "Jun 2026",
        }}
      />

      <section aria-label="Ranked gardeners" className="space-y-3">
        {SHORTLIST.map((b) => (
          <BusinessCard key={b.name} data={b} />
        ))}
      </section>

      {/* Optimisable slot: the router decides affiliate vs lead vs nothing. */}
      <MonetisationSlot
        slot="inline-after-shortlist"
        context={baseContext}
        policy={gardeners.routerPolicy}
        candidates={candidates}
        resolveAffiliate={(ref) => AFFILIATE_DATA[ref]}
      />
    </main>
  );
}
